const _ = require('lodash');

const Endpoint = require('./endpoint');
const logger = require('../logger');

/**
 * Resolve all parsed endpoint defintions
 *
 * Singleton
 *
 * @memberof module:endpoint
 */
class EndpointResolver {
    constructor() {
        /**
         * Cache the parsed endpoint definitions after the first time resolving it to increase
         * performance of future calls.
         */
        this.cache = null;
    }

    /**
     * Get the full parsed endpoint objects. The first time it will be resolved from the endpoint
     * definition file. After that the full parsed endpoint objects will be returned from memory.
     *
     * @param {serverConfig} config
     * @return {Endpoint[]}
     */
    async resolve(config) {
        if (this.cache) {
            return _.cloneDeep(this.cache);
        }

        const endpoints = require(config.endpointDefinitionPath)
            .map((endpoint) => {
                return new Endpoint(endpoint, config);
            });

        if (config.contractResolutionStrategy === 'eager') {
            await this._resolveAllContracts(endpoints);
        }

        this.cache = _.cloneDeep(endpoints);
        return endpoints;
    }

    /**
     * @private
     * @param {Endpoint[]} endpoints
     */
    async _resolveAllContracts(endpoints) {
        logger.log(0, 'Eagerly loading contracts');
        for (const endpoint of endpoints) {
            if (endpoint.contract) {
                // This is memoized function. Simply calling it will cache the contract.
                await endpoint.contract.full();
            }
        }
    }
}
module.exports = new EndpointResolver();
