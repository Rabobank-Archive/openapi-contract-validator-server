const defaultConfig = require('../../../src/config/server-config.default');

bundle('Config', function() {
    describe('Default config', function() {
        it('sets default values', function() {
            expect(defaultConfig).to.deep.equal({
                port: '3000',
                targetUrl: 'http://localhost:8080',
                logDepth: 1,
                endpointDefinitionPath: './endpoints.js',
                allowRequestsWithoutEndpoint: false,
                contractResolutionStrategy: 'lazy',
                apiary: {
                    tokenEnvironmentVariable: 'APIARY_TOKEN',
                },
                validator: {
                    requireAllFields: false,
                    concatArrays: false,
                    allowEmptyString: false,
                },
            });
        });
    });
});
