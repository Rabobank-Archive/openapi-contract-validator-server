const token = require('../../../../../src/endpoint/contract-downloader/apiary/token');

bundle('Endpoint/Apiary', function() {
    describe('token', function() {
        beforeEach(function() {
            this.config = {
                tokenEnvironmentVariable: 'SOME_VAR_NAME',
            };
            delete token.cache;
        });

        afterEach(function() {
            delete process.env[this.config.tokenEnvironmentVariable];
        });

        it('gets the token from the environment variable defined in the config', function() {
            process.env[this.config.tokenEnvironmentVariable] = 'dummy-token';

            const result = token.get(this.config);

            expect(result).to.equal('dummy-token');
        });

        it('throws when it cant find a token', function() {
            expect(() => {
                token.get(this.config);
            }).to.throw(`Could not find an Apiary token in the environment variable `
                + `'SOME_VAR_NAME'. Without token it's impossible to talk to the Apiary server.`);
        });

        it('gets the token from the cache the second time', function() {
            process.env[this.config.tokenEnvironmentVariable] = 'dummy-token';

            const firstResult = token.get(this.config);
            expect(firstResult).to.equal('dummy-token');

            process.env[this.config.tokenEnvironmentVariable] = 'changed-token';

            const secondResult = token.get(this.config);
            expect(secondResult).to.equal(firstResult);
        });
    });
});
