const sinon = require('sinon');

const apiaryio = require('apiaryio');
const token = require('../../../../../src/endpoint/contract-downloader/apiary/token');
const logger = require('../../../../../src/logger');

const fetch = require('../../../../../src/endpoint/contract-downloader/apiary/fetch');

bundle('Endpoint/Apiary', function() {
    describe('fetch', function() {
        beforeEach(function() {
            this.token = 'dummy-token';
            this.tokenStub = sinon.stub(token, 'get')
                .returns(this.token);
            this.fetchStub = sinon.stub(apiaryio, 'fetch');
            this.loggerStub = sinon.stub(logger, 'log');

            this.config = {
                tokenEnvironmentVariable: 'SOME_VAR_NAME',
            };

            fetch.cache.clear();
        });

        afterEach(function() {
            sinon.restore();
        });

        it('returns the parsed yaml result of the api call', async function() {
            const apiaryId = 'foobar';
            this.fetchStub.callsFake((apiaryId, apiaryToken, callback, errorCallback) => {
                expect(apiaryId).to.equal('foobar');
                expect(apiaryToken).to.equal(this.token);

                callback(`some:\n  yaml: content`);
            });

            const result = await fetch(apiaryId, this.config);

            expect(this.fetchStub).to.be.calledOnce;
            expect(result).to.deep.equal({
                some: {
                    yaml: 'content',
                },
            });
        });

        it('returns the parsed json result of the api call', async function() {
            const apiaryId = 'foobar';
            this.fetchStub.callsFake((apiaryId, apiaryToken, callback, errorCallback) => {
                expect(apiaryId).to.equal('foobar');
                expect(apiaryToken).to.equal(this.token);

                callback(`{"some":{"json":"content"}}`);
            });

            const result = await fetch(apiaryId, this.config);

            expect(this.fetchStub).to.be.calledOnce;
            expect(result).to.deep.equal({
                some: {
                    json: 'content',
                },
            });
        });

        it('returns the raw result of the api call when it\'s not yaml or json', async function() {
            const apiaryId = 'foobar';
            this.fetchStub.callsFake((apiaryId, apiaryToken, callback, errorCallback) => {
                expect(apiaryId).to.equal('foobar');
                expect(apiaryToken).to.equal(this.token);

                callback(`some plain text`);
            });

            const result = await fetch(apiaryId, this.config);

            expect(this.fetchStub).to.be.calledOnce;
            expect(result).to.deep.equal('some plain text');
        });

        it('logs a warning when the result of the api call is not yaml or json', async function() {
            const apiaryId = 'foobar';
            this.fetchStub.callsFake((apiaryId, apiaryToken, callback, errorCallback) => {
                callback(`some plain text`);
            });

            await fetch(apiaryId, this.config);

            expect(this.loggerStub).to.be.calledWithExactly(0,
                `Could not fetch valid contract from Apiary: `
                + `Response could not be parsed as JSON or YAML`);
        });

        it('throws when the result of the api call is empty', async function() {
            const apiaryId = 'foobar';
            this.fetchStub.callsFake((apiaryId, apiaryToken, callback, errorCallback) => {
                callback(``);
            });

            await expect(fetch(apiaryId, this.config))
                .to.eventually.be.rejectedWith('API response is empty');
        });

        it('throws when the result of the api call is not a string', async function() {
            const apiaryId = 'foobar';
            this.fetchStub.callsFake((apiaryId, apiaryToken, callback, errorCallback) => {
                callback();
            });

            await expect(fetch(apiaryId, this.config))
                .to.eventually.be.rejectedWith('API response is not a string');
        });

        it('throws when the api throws without a reason', async function() {
            const apiaryId = 'foobar';
            this.fetchStub.callsFake((apiaryId, apiaryToken, callback, errorCallback) => {
                errorCallback();
            });

            await expect(fetch(apiaryId, this.config))
                .to.eventually.be.rejectedWith(
                    'Could not fetch valid contract from Apiary for an unkown reason\n'
                    + 'Possible reasons for this failure:\n'
                    + '1. You have not provided a (valid) Apiary token\n'
                    + '   Note: You can generate a token @ https://login.apiary.io/tokens\n'
                    + '2. The token provided does not have read permissions\n'
                    + '3. You can\'t reach Apiary');
        });

        it('throws when the api throws without a reason, but with a body', async function() {
            const apiaryId = 'foobar';
            this.fetchStub.callsFake((apiaryId, apiaryToken, callback, errorCallback) => {
                errorCallback({
                    body: '{"foo":"bar"}',
                });
            });

            await expect(fetch(apiaryId, this.config))
                .to.eventually.be.rejectedWith(
                    'Could not fetch valid contract from Apiary for an unkown reason\n'
                    + 'Possible reasons for this failure:\n'
                    + '1. You have not provided a (valid) Apiary token\n'
                    + '   Note: You can generate a token @ https://login.apiary.io/tokens\n'
                    + '2. The token provided does not have read permissions\n'
                    + '3. You can\'t reach Apiary');
        });

        it('throws when the api throws with a reason', async function() {
            const apiaryId = 'foobar';
            this.fetchStub.callsFake((apiaryId, apiaryToken, callback, errorCallback) => {
                errorCallback({
                    body: '{"message":"A good reason"}',
                });
            });

            await expect(fetch(apiaryId, this.config))
                .to.eventually.be.rejectedWith(
                    'Could not fetch valid contract from Apiary: A good reason');
        });
    });
});
