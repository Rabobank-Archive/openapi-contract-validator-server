const validatorConfig = require('openapi-contract-validator/src/default-config');

/**
 * @type {serverConfig}
 * @memberof module:config
 */
const serverConfig = {
    port: '3000',
    targetUrl: 'http://localhost:8080',
    logDepth: 1,
    endpointDefinitionPath: './endpoints.js',
    allowRequestsWithoutEndpoint: false,
    contractResolutionStrategy: 'lazy',
    apiary: {
        tokenEnvironmentVariable: 'APIARY_TOKEN',
    },
    validator: validatorConfig,
};
module.exports = serverConfig;
