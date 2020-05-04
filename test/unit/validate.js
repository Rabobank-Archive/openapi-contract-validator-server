const sinon = require('sinon');
const oasValidator = require('openapi-contract-validator');
const c = require('ansi-colors');

const configResolver = require('../../src/config/resolver');
const endpointResolver = require('../../src/endpoint/resolver');
const validate = require('../../src/validate');
const logger = require('../../src/logger');
const ValidationError = require('../../src/error/validation-error');

bundle('validate', function() {
    describe('validate()', function() {
        beforeEach(function() {
            this.loggerStub = sinon.stub(logger, 'log');
            this.configResolverStub = sinon.stub(configResolver, 'resolve')
                .resolves({
                    config: true,
                    validator: {validatorConfig: true},
                });
            this.validatorValidateStub = sinon.stub(oasValidator.Validator.prototype, 'validate')
                .resolves();
            this.shouldValidateStub = sinon.stub(validate, 'shouldValidate')
                .returns(true);
            this.endpointResolverStub = sinon.stub(endpointResolver, 'resolve')
                .resolves([{
                    endpoint: '/',
                    contract: {
                        uri: 'contract/uri',
                        full: () => ({contract: 'full'}),
                    },
                }]);

            this.source = {
                request: {
                    url: '/',
                    headers: {
                        accept: '*/*',
                    },
                    body: {},
                },
                response: {
                    headers: {
                        'content-type': 'application/json',
                    },
                    body: '',
                    statusCode: 200,
                },
            };
        });

        afterEach(function() {
            sinon.restore();
        });

        it('does not validate when shouldValidate() returns false', async function() {
            this.shouldValidateStub.returns(false);

            await validate.validate(this.source);

            expect(this.validatorValidateStub).to.not.have.been.called;
            expect(this.loggerStub).to.have.been.calledWithExactly(1, 'Skip validation');
        });

        it('calls validator.validate with the contract, http interaction, and '
                + 'validator config', async function() {
            await validate.validate(this.source);

            expect(this.validatorValidateStub).to.have.been.calledOnce;
            const calledWith = this.validatorValidateStub.getCall(0).args;
            expect(calledWith).to.be.lengthOf(3);
            expect(calledWith[0]).to.deep.equal({contract: 'full'});
            expect(calledWith[1] instanceof oasValidator.Http).to.be.true;
            expect(calledWith[2]).to.deep.equal({validatorConfig: true});

            expect(this.loggerStub).to.have.been.calledWithExactly(
                1, `Validating interaction using OpenAPI Schema ${c.grey('contract/uri')}`);
            expect(this.loggerStub).to.have.been.calledWithMatch(
                2, `Passed`);
        });

        it('throws a ValidationError when the validator throws', async function() {
            this.validatorValidateStub.rejects(new Error('Rejection'));

            try {
                await validate.validate(this.source);
                throw new Error('Expected error to be thrown');
            }
            catch (error) {
                expect(this.loggerStub).to.have.been.calledWithExactly(
                    1, `Rejection`);

                expect(error instanceof ValidationError).to.be.true;
                expect(error.message).to.equal('Contract validation failed');
                expect(error.problem.detail).to.equal('Rejection');
                expect(error.problem.instance).to.be.undefined;
                expect(error.problem.request.constructor.name).to.equal('Request');
                expect(error.problem.response.constructor.name).to.equal('Response');
                expect(error.problem.contract).to.deep.equal({
                    uri: 'contract/uri',
                });
            }
        });

        it('throws a ValidationError when the endpointResolver throws', async function() {
            this.endpointResolverStub.rejects(new Error('Rejection'));

            try {
                await validate.validate(this.source);
                throw new Error('Expected error to be thrown');
            }
            catch (error) {
                expect(this.loggerStub).to.have.been.calledWithExactly(
                    1, `Rejection`);

                expect(error instanceof ValidationError).to.be.true;
                expect(error.message).to.equal('Contract validation failed');
                expect(error.problem.detail).to.equal('Rejection');
                expect(error.problem.instance).to.be.undefined;
                expect(error.problem.request.constructor.name).to.equal('Request');
                expect(error.problem.response.constructor.name).to.equal('Response');
                expect(error.problem.contract).to.be.undefined;
            }
        });

        it('throws a ValidationError when the Http throws', async function() {
            this.source.request.headers = {};

            try {
                await validate.validate(this.source);
                throw new Error('Expected error to be thrown');
            }
            catch (error) {
                expect(error instanceof ValidationError).to.be.true;
                expect(error.message).to.equal('Contract validation failed');
                expect(error.problem.instance).to.be.undefined;
                expect(error.problem.request).to.be.undefined;
                expect(error.problem.response).to.be.undefined;
                expect(error.problem.contract).to.be.undefined;
            }
        });
    });

    describe('shouldValidate()', function() {
        beforeEach(function() {
            this.logStub = sinon.stub(logger, 'log');
        });

        afterEach(function() {
            sinon.restore();
        });

        it('returns false & logs a warning when the request has the '
                + '`contract-validation: false` header', function() {
            const http = {
                request: {
                    headers: {
                        'contract-validation': 'false',
                    },
                },
            };
            const endpoint = {};
            const config = {};

            const result = validate.shouldValidate(http, endpoint, config);

            expect(result).to.be.false;
            expect(this.logStub).to.have.been.calledOnce;
            expect(this.logStub).to.have.been.calledWithExactly(
                2, `Disabled validation via the request header 'contract-validation'.`);
        });

        it('returns false when the endpoint is not defined and config '
                + '`allowRequestsWithoutEndpoint: true`', function() {
            const http = {
                request: {
                    headers: {
                        'contract-validation': 'true',
                    },
                },
            };
            const endpoint = {};
            const config = {
                allowRequestsWithoutEndpoint: true,
            };

            const result = validate.shouldValidate(http, endpoint, config);

            expect(result).to.be.false;
            expect(this.logStub).to.have.been.calledOnce;
            expect(this.logStub).to.have.been.calledWithExactly(
                2, `No endpoint definition found. This is allowed by the config.`);
        });

        it('throws when the endpoint is not defined and config '
                + '`allowRequestsWithoutEndpoint: false`', function() {
            const http = {
                request: {
                    endpoint: '/my/endpoint',
                    headers: {
                        'contract-validation': 'true',
                    },
                },
            };
            const endpoint = {};
            const config = {
                allowRequestsWithoutEndpoint: false,
            };

            try {
                validate.shouldValidate(http, endpoint, config);
                throw new Error('Expected function to throw');
            }
            catch (error) {
                expect(error.message).to.equal('Endpoint not defined');
                expect(error.problem.detail).to.equal(
                    `Add the HTTP header \`contract-validation: false\` to the request, `
                    + `add an endpoint definition for endpoint '/my/endpoint', or `
                    + `set config \`allowRequestsWithoutEndpoint: true\`.`);
                expect(error.problem.instance).to.equal('/my/endpoint');
                expect(error.problem.request).to.deep.equal(http.request);
            }
        });

        it('returns false when the endpoint config `validate: false`', function() {
            const http = {
                request: {
                    headers: {},
                },
            };
            const endpoint = {
                validate: false,
            };
            const config = {};

            const result = validate.shouldValidate(http, endpoint, config);

            expect(result).to.be.false;
            expect(this.logStub).to.have.been.calledOnce;
            expect(this.logStub).to.have.been.calledWithExactly(
                2, `Disabled validation via the endpoint config.`);
        });

        it('throws when the endpoint config `validate: true`, but no contract is '
                + 'defined', function() {
            const http = {
                request: {
                    endpoint: '/foo',
                    headers: {},
                },
            };
            const endpoint = {
                validate: true,
            };
            const config = {};

            try {
                validate.shouldValidate(http, endpoint, config);
                throw new Error('Expected function to throw');
            }
            catch (error) {
                expect(error.message).to.equal('Contract not defined');
                expect(error.problem.detail).to.equal(`The interaction should be validated, but `
                    + `there is no contract to perform the validation with. `
                    + `Add the HTTP header \`contract-validation: false\` to the request, `
                    + `set endpoint config \`validate: false\`, or `
                    + `add a contract to the endpoint config.`);
                expect(error.problem.instance).to.equal('/foo');
                expect(error.problem.request).to.deep.equal(http.request);
            }
        });

        it('returns true when everything is in place for validation', function() {
            const http = {
                request: {
                    endpoint: '/foo',
                    headers: {},
                },
            };
            const endpoint = {
                validate: true,
                contract: {
                    full: {},
                },
            };
            const config = {};

            const result = validate.shouldValidate(http, endpoint, config);

            expect(result).to.be.true;
            expect(this.logStub).to.not.have.been.called;
        });
    });
});
