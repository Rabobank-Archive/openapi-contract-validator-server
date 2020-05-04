const sinon = require('sinon');

const Endpoint = require('../../../src/endpoint/endpoint');
const downloader = require('../../../src/endpoint/contract-downloader');

bundle('Endpoint', function() {
    describe('Class: Endpoint', function() {
        describe('constructor()', function() {
            beforeEach(function() {
                this.parseContractUriStub = sinon.stub(Endpoint.prototype, '_parseContractUri')
                    .returns({parsed: true});
                this.downloadContractStub = sinon.stub(downloader, 'download')
                    .resolves({downloaded: true});
            });

            afterEach(function() {
                sinon.restore();
            });

            it('initializes', function() {
                const result = new Endpoint({});
                expect(result instanceof Endpoint).to.be.true;
            });

            it('sets the endpoint from the raw object', function() {
                const result = new Endpoint({
                    endpoint: 'foo/bar',
                });

                expect(result.endpoint).to.equal('foo/bar');
            });

            it('sets validate from the raw object', function() {
                const result = new Endpoint({
                    validate: false,
                });

                expect(result.validate).to.be.false;
            });

            it('defaults validate to true', function() {
                const result = new Endpoint({});

                expect(result.validate).to.be.true;
            });

            it('does not set the contract if none is provided', function() {
                const result = new Endpoint({});

                expect(result.contract).to.be.undefined;
            });

            it('parses the contract when one is provided', async function() {
                const endpoint = new Endpoint({
                    contract: 'foo',
                }, {
                    config: true,
                });

                expect(this.parseContractUriStub).to.have.been.calledOnce;
                expect(this.parseContractUriStub).to.have.been.calledWithExactly('foo');

                expect(this.downloadContractStub).to.not.have.been.called;

                await endpoint.contract.full();

                expect(this.downloadContractStub).to.have.been.calledOnce;
                expect(this.downloadContractStub).to.have.been.calledWithExactly(
                    {parsed: true}, {config: true});
            });
        });

        describe('_parseContractUri()', function() {
            beforeEach(function() {
                this.endpoint = new Endpoint({}, {});
            });

            describe('http', function() {
                it('parses an http uri', function() {
                    const uri = 'http://foo.bar.io/hello/world?language=en-us';
                    const result = this.endpoint._parseContractUri(uri);

                    expect(result).to.deep.equal({
                        protocol: 'http',
                        uri: uri,
                        location: uri,
                    });
                });

                it('parses an https uri', function() {
                    const uri = 'https://foo.bar.io/hello/world?language=en-us';
                    const result = this.endpoint._parseContractUri(uri);

                    expect(result).to.deep.equal({
                        protocol: 'http',
                        uri: uri,
                        location: uri,
                    });
                });
            });

            describe('file', function() {
                it('parses a windows file uri', function() {
                    const uri = 'c:/data/path/file.ext';
                    const result = this.endpoint._parseContractUri(uri);

                    expect(result).to.deep.equal({
                        protocol: 'file',
                        uri: `file://${uri}`,
                        location: uri,
                    });
                });

                it('parses a linux file uri', function() {
                    const uri = '~/data/path/file.ext';
                    const result = this.endpoint._parseContractUri(uri);

                    expect(result).to.deep.equal({
                        protocol: 'file',
                        uri: `file://${uri}`,
                        location: uri,
                    });
                });
            });

            describe('apiary', function() {
                /* eslint-disable-next-line mocha/no-setup-in-describe */
                [
                    {
                        name: 'editor',
                        uri: 'https://app.apiary.io/apiaryid/editor',
                    },
                    {
                        name: 'tests',
                        uri: 'https://app.apiary.io/apiaryid/tests/runs',
                    },
                    {
                        name: 'inspector',
                        uri: 'http://apiaryid.docs.apiary.io/traffic',
                    },
                    {
                        name: 'documentation',
                        uri: 'https://apiaryid.docs.apiary.io',
                    },
                ].forEach(({name, uri}) => {
                    it(`parses an Apiary ${name} uri`, function() {
                        const result = this.endpoint._parseContractUri(uri);

                        expect(result).to.deep.equal({
                            protocol: 'apiary',
                            uri: `apiary://apiaryid`,
                            location: 'apiaryid',
                        });
                    });
                });

                it(`throws when it can't parse the apiary uri`, function() {
                    const uri = 'http://apiary.io?id=apiaryid';

                    expect(() => {
                        this.endpoint._parseContractUri(uri);
                    }).to.throw(`Apiary url format not supported for url '${uri}'`);
                });
            });
        });
    });
});
