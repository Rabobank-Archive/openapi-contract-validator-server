/**
 * @type {serverConfig}
 */
const serverConfig = {
    port: '3000',
    targetUrl: 'http://localhost:4000',
    logDepth: 1,
    endpointDefinitionPath: './endpoints.js',
    allowRequestsWithoutEndpoint: false,
    validator: {},
};
module.exports = serverConfig;
