const sinon = require('sinon');
const _module = require('module');

const logger = require('../../../src/logger');
const endpointResolver = require('../../../src/endpoint').resolver;
const Endpoint = require('../../../src/endpoint/endpoint');

bundle('Endpoint', function() {
    describe('Singleton class: EndpointResolver', function() {
        afterEach(function() {
            sinon.restore();
        });

        it('is an instance of EndpointResolver', function() {
            expect(endpointResolver.constructor.name).to.equal('EndpointResolver');
        });

        it('prepares the cache', function() {
            expect(endpointResolver.cache).to.be.null;
        });

        describe('async resolve()', function() {
            beforeEach(function() {
                this.config = {
                    endpointDefinitionPath: './some/path',
                };
                this.endpoints = [
                    {endpoint: 'a'},
                    {endpoint: 'b'},
                    {endpoint: 'c'},
                ];

                this.resolveAllContractsStub = sinon.stub(endpointResolver, '_resolveAllContracts');
                this.requireStub = sinon.stub(_module, '_load')
                    .callsFake(() => this.endpoints);

                delete endpointResolver.cache;
            });

            it('resolves the endpoint definitions from the file definined in the '
                    + 'config', async function() {
                const result = await endpointResolver.resolve(this.config);

                expect(this.requireStub).to.have.been.calledOnce;
                expect(this.requireStub)
                    .to.have.been.calledWith(this.config.endpointDefinitionPath);

                result.forEach((endpoint, i) => {
                    expect(endpoint instanceof Endpoint).to.be.true;
                    expect(endpoint.endpoint).to.equal(this.endpoints[i].endpoint);
                });
            });

            it('resolves the endpoint definitions out of memory the second time', async function() {
                const resultOne = await endpointResolver.resolve(this.config);

                expect(this.requireStub).to.have.been.calledOnce;

                this.endpoints = [];
                const resultTwo = await endpointResolver.resolve(this.config);

                expect(this.requireStub).to.have.been.calledOnce;
                expect(resultTwo).to.deep.equal(resultOne);
                expect(resultTwo).to.not.equal(resultOne);
            });

            it('always returns a new object containing the endpoint definitions', async function() {
                let results = [];
                results.push(endpointResolver.resolve(this.config));
                results.push(endpointResolver.resolve(this.config));
                results.push(endpointResolver.resolve(this.config));
                results.push(endpointResolver.resolve(this.config));
                results.push(endpointResolver.resolve(this.config));
                results = await Promise.all(results);

                expect(this.requireStub).to.have.been.calledOnce;

                for (let i=0; i<results.length; i++) {
                    for (let j=0; j<results.length; j++) {
                        if (i === j) continue;

                        expect(results[i]).to.deep.equal(results[j]);
                        expect(results[i]).to.not.equal(results[j]);
                    }
                }
            });

            it('throws an error when it can\'t find the definition file', async function() {
                this.requireStub.restore();

                await expect(endpointResolver.resolve({
                    endpointDefinitionPath: 'i/do/not/exist',
                })).to.be.rejectedWith(`Cannot find module 'i/do/not/exist'`);
            });

            it(`eagerly resolves all contracts if `
                    + `config.contractResolutionStrategy='eager'`, async function() {
                this.config.contractResolutionStrategy = 'eager';

                const result = await endpointResolver.resolve(this.config);

                expect(this.resolveAllContractsStub).to.have.been.calledOnce;
                expect(this.resolveAllContractsStub)
                    .to.have.been.calledWith(result);
            });
        });

        describe('async _resolveAllContracts()', function() {
            beforeEach(function() {
                this.endpoints = [
                    {endpoint: 'a'},
                    {endpoint: 'b'},
                    {endpoint: 'c'},
                ];

                this.loggerStub = sinon.stub(logger, 'log');
            });

            it('logs that it is going to load the contracts', async function() {
                await endpointResolver._resolveAllContracts([]);

                expect(this.loggerStub).to.have.been.calledOnce;
                expect(this.loggerStub)
                    .to.have.been.calledWithExactly(0, 'Eagerly loading contracts');
            });

            it('loads all defined contracts', async function() {
                const endpoints = [
                    {
                        contract: {full: sinon.fake()},
                    },
                    {
                        contract: {full: sinon.fake()},
                    },
                    {
                        contract: {full: sinon.fake()},
                    },
                ];

                await endpointResolver._resolveAllContracts(endpoints);

                endpoints.forEach((endpoint) => {
                    expect(endpoint.contract.full).to.have.been.calledOnce;
                    expect(endpoint.contract.full).to.have.been.calledWithExactly();
                });
            });

            it('does not attempt to load undefined contracts', async function() {
                const endpoints = [
                    {},
                    {},
                    {},
                ];

                await endpointResolver._resolveAllContracts(endpoints);

                endpoints.forEach((endpoint) => {
                    expect(endpoint).to.deep.equal({});
                });
            });

            it('handles a mix of defined and undefined contracts', async function() {
                const endpoints = [
                    {
                        contract: {full: sinon.fake()},
                    },
                    {},
                    {
                        contract: {full: sinon.fake()},
                    },
                ];

                await endpointResolver._resolveAllContracts(endpoints);

                endpoints.forEach((endpoint, i) => {
                    if (i === 1) {
                        expect(endpoint).to.deep.equal({});
                        return;
                    }

                    expect(endpoint.contract.full).to.have.been.calledOnce;
                    expect(endpoint.contract.full).to.have.been.calledWithExactly();
                });
            });
        });
    });
});
