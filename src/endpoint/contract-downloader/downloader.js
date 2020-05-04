const c = require('ansi-colors');

const apiary = require('./apiary');
const logger = require('../../logger');

/**
 * Download and parse a contract from any source.
 *
 * @memberof module:endpoint/contract-downloader
 *
 * @param {contract} contract
 * @param {serverConfig} config
 * @throws {Error} when the protocol is not supported
 * @return {openApiSchema}
 */
async function download(contract, config) {
    logger.log(1, `Loading contract ${c.gray(contract.uri)}`);

    try {
        if (contract.protocol === 'apiary') {
            return await apiary.fetch(contract.location, config.apiary);
        }
        if (contract.protocol === 'file') {
            // We'll let oas-validator resolve the file
            return contract.location;
        }
    }
    catch (error) {
        error.message = `Something went wrong while loading the contract: ${error.message}`;
        throw error;
    }

    throw new Error(`Could not load contract using unsupported protocol `
        + `'${contract.protocol}'`);
}
module.exports = download;
