const sinon = require('sinon');
const got = require('got');

const token = require('../../../../../src/endpoint/contract-downloader/apiary/token');
const logger = require('../../../../../src/logger');

const fetch = require('../../../../../src/endpoint/contract-downloader/apiary/fetch');

bundle('Endpoint/Apiary', function() {
    describe('fetch', function() {
        beforeEach(function() {
            this.token = 'dummy-token';
            this.tokenStub = sinon.stub(token, 'get')
                .returns(this.token);
            this.gotGetStub = sinon.stub(got, 'get');
            this.loggerStub = sinon.stub(logger, 'log');

            this.config = {
                tokenEnvironmentVariable: 'SOME_VAR_NAME',
            };

            fetch.cache.clear();
        });

        afterEach(function() {
            sinon.restore();
        });

        it('calls the correct endpoint', async function() {
            const apiaryId = 'foobar';
            this.gotGetStub.resolves({
                body: {
                    code: 'some:\n  yaml: content',
                },
            });

            await fetch(apiaryId, this.config);

            expect(this.gotGetStub).to.be.calledOnce;

            const calledWith = this.gotGetStub.getCall(0).args;
            expect(calledWith[0]).to.endWith(apiaryId);
            expect(calledWith[1]).to.deep.equal({
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'text/plain',
                    'Authentication': `Token ${this.token}`,
                },
                responseType: 'json',
            });
        });

        it('returns the parsed yaml result of the api call', async function() {
            const apiaryId = 'foobar';
            this.gotGetStub.resolves({
                body: {
                    code: 'some:\n  yaml: content',
                },
            });

            const result = await fetch(apiaryId, this.config);

            expect(this.gotGetStub).to.be.calledOnce;

            const calledWith = this.gotGetStub.getCall(0).args;
            expect(calledWith[0]).to.endWith(apiaryId);
            expect(calledWith[1].headers.Authentication).to.equal(`Token ${this.token}`);

            expect(result).to.deep.equal({
                some: {
                    yaml: 'content',
                },
            });
        });

        it('returns the parsed json result of the api call', async function() {
            const apiaryId = 'foobar';
            this.gotGetStub.resolves({
                body: {
                    code: '{"some":{"json":"content"}}',
                },
            });

            const result = await fetch(apiaryId, this.config);

            expect(this.gotGetStub).to.be.calledOnce;

            const calledWith = this.gotGetStub.getCall(0).args;
            expect(calledWith[0]).to.endWith(apiaryId);
            expect(calledWith[1].headers.Authentication).to.equal(`Token ${this.token}`);

            expect(result).to.deep.equal({
                some: {
                    json: 'content',
                },
            });
        });

        it('throws when the API response is not yaml or json', async function() {
            const apiaryId = 'foobar';
            this.gotGetStub.resolves({
                body: {
                    code: 'some plain text',
                },
            });

            await expect(fetch(apiaryId, this.config)).to.eventually.be.rejectedWith(
                'Contract in API response could not be parsed as JSON or YAML');
        });

        it('throws when the result of the api call is empty', async function() {
            const apiaryId = 'foobar';
            this.gotGetStub.resolves({
                body: {
                    code: '',
                },
            });

            await expect(fetch(apiaryId, this.config))
                .to.eventually.be.rejectedWith('Contract in API response is empty');
        });

        it('throws when the result of the api call is not a string', async function() {
            const apiaryId = 'foobar';
            this.gotGetStub.resolves({
                body: {
                    code: null,
                },
            });

            await expect(fetch(apiaryId, this.config))
                .to.eventually.be.rejectedWith('Contract in API response is not a string');
        });

        it('throws when the api throws with message', async function() {
            const apiaryId = 'foobar';
            this.gotGetStub.resolves({
                body: {
                    error: true,
                    message: 'Awesome message',
                },
            });

            await expect(fetch(apiaryId, this.config)).to.eventually.be.rejectedWith(
                'Apiary responded with an error: Awesome message');
        });

        it('throws when Apiary responds with 403', async function() {
            const apiaryId = 'foobar';
            this.gotGetStub.rejects({
                response: {
                    statusCode: 403,
                    body: {
                        message: 'Amazing message mate',
                    },
                },
            });

            await expect(fetch(apiaryId, this.config)).to.eventually.be.rejectedWith(
                'Could not fetch valid contract from Apiary: 403: Amazing message mate\n'
                + 'Probable reasons for this failure:\n'
                + '1. You have not provided a (valid) Apiary token\n'
                + '   Note: You can generate a token @ https://login.apiary.io/tokens\n'
                + '2. The token provided does not have read permissions\n'
                + '3. Your account is not allowed to access the contract');
        });

        it('throws when Apiary responds with 500 without message', async function() {
            const apiaryId = 'foobar';
            this.gotGetStub.rejects({
                response: {
                    statusCode: 500,
                    body: {},
                },
            });

            try {
                await fetch(apiaryId, this.config);
                throw new Error('Expected error to be thrown');
            }
            catch (error) {
                expect(error.message).to.equal('Could not fetch valid contract from Apiary: 500');
            }
        });

        it('throws when Apiary responds with 500 with message', async function() {
            const apiaryId = 'foobar';
            this.gotGetStub.rejects({
                response: {
                    statusCode: 500,
                    body: {
                        message: 'Oh noes!',
                    },
                },
            });

            try {
                await fetch(apiaryId, this.config);
                throw new Error('Expected error to be thrown');
            }
            catch (error) {
                expect(error.message).to.equal(
                    'Could not fetch valid contract from Apiary: 500: Oh noes!');
            }
        });
    });
});
