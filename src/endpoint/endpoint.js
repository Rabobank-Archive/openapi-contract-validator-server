/**
 * @memberof module.endpoint
 * @typedef {{
 *     protocol: string,
 *     location: string,
 *     uri: string,
 *     full: openApiSchema
 * }} contract
 */

const _ = require('lodash');

const contractDownloader = require('./contract-downloader');

/**
 * An endpoint definition.
 *
 * @memberof module:endpoint
 */
class Endpoint {
    /**
     * @param {object} raw
     * @param {serverConfig} config
     */
    constructor(raw, config) {
        this.endpoint = raw.endpoint;
        this.validate = _.defaultTo(raw.validate, true);

        if (!_.isEmpty(raw.contract)) {
            this.contract = this._parseContractUri(raw.contract);
            this.contract.full = _.memoize(() => {
                return contractDownloader.download(_.omit(this.contract, ['full']), config);
            });
        }
    }

    /**
     * Parse the contract uri into its properties
     *
     * @param {string} uri
     * @return {contract}
     */
    _parseContractUri(uri) {
        if (/^https?:\/\//.test(uri)) {
            if (uri.includes('apiary.io')) {
                return this._parseContractApiaryUri(uri);
            }

            return {
                protocol: 'http',
                uri: uri,
                location: uri,
            };
        }

        return {
            protocol: 'file',
            uri: `file://${uri}`,
            location: uri,
        };
    }

    /**
     * Extra parsing for Apiary URIs
     *
     * @param {string} uri
     * @throws {Error} when given an unsupported Apiary URI
     * @return {contract}
     */
    _parseContractApiaryUri(uri) {
        const contract = {
            protocol: 'apiary',
        };

        if (uri.includes('://app.apiary.io')) {
            const id = /^\w+:\/\/app\.apiary\.io\/(\w+)\/.+$/.exec(uri)[1];
            contract.location = id;
        }
        else if (uri.includes('.docs.apiary.io')) {
            const id = /^\w+:\/\/(\w+)\.docs\.apiary\.io.*$/.exec(uri)[1];
            contract.location = id;
        }
        else {
            throw new Error(`Apiary url format not supported for url '${uri}'`);
        }

        contract.uri = `${contract.protocol}://${contract.location}`;
        return contract;
    }
}
module.exports = Endpoint;
