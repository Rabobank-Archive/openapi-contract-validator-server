const sinon = require('sinon');
const c = require('ansi-colors');

const logger = require('../../../../src/logger');
const apiary = require('../../../../src/endpoint/contract-downloader/apiary');
const download = require('../../../../src/endpoint/contract-downloader/downloader');

bundle('Contract downloader', function() {
    describe('download()', function() {
        beforeEach(function() {
            this.loggerStub = sinon.stub(logger, 'log');
            this.apiaryFetchStub = sinon.stub(apiary, 'fetch')
                .resolves({
                    openapi: true,
                    source: 'apiary',
                });
        });

        afterEach(function() {
            sinon.restore();
        });

        it(`logs which contract its downloading`, async function() {
            const contract = {
                protocol: 'file',
                uri: 'my/awesome/uri',
            };
            const config = {};

            await download(contract, config);

            expect(this.loggerStub).to.have.been.calledOnce;
            expect(this.loggerStub).to.have.been.calledWithExactly(
                1, `Loading contract ${c.gray('my/awesome/uri')}`);
        });

        it(`calls the apiary downloader to download the contract for protocol `
                + `apiary`, async function() {
            const contract = {
                protocol: 'apiary',
                location: 'foobarapiaryid',
            };
            const config = {
                apiary: {apiaryConfig: true},
            };

            const result = await download(contract, config);

            expect(this.apiaryFetchStub).to.have.been.calledOnce;
            expect(this.apiaryFetchStub)
                .to.have.been.calledWithExactly('foobarapiaryid', {apiaryConfig: true});

            expect(result).to.deep.equal({
                openapi: true,
                source: 'apiary',
            });
        });

        it(`returns the file path for protocol file`, async function() {
            const contract = {
                protocol: 'file',
                location: __filename,
            };
            const config = {};

            const result = await download(contract, config);

            expect(this.apiaryFetchStub).to.not.have.been.called;
            expect(result).to.deep.equal(__filename);
        });

        it(`throws for an unsupported protocol`, async function() {
            const contract = {
                protocol: 'iAmNotSupported',
            };
            const config = {};

            await expect(download(contract, config))
                .to.be.rejectedWith('Could not load contract using unsupported protocol '
                    + `'iAmNotSupported'`);
        });

        it(`rethrows an error thrown by a downloader with context added to the `
                + `error message`, async function() {
            this.apiaryFetchStub.rejects(new Error('Halp!'));

            const contract = {
                protocol: 'apiary',
            };
            const config = {};

            await expect(download(contract, config))
                .to.be.rejectedWith('Something went wrong while loading the contract: Halp!');
        });
    });
});
