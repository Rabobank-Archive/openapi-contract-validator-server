const _ = require('lodash');
const got = require('got');
const yaml = require('js-yaml');

const apiaryToken = require('./token');

/**
 * Fetch a contract from Apiary
 *
 * @memberof module:endpoint/contract-downloader
 *
 * @param {string} apiaryId
 * @param {serverConfig.apiary} config
 * @return {Promise.<object>}
 */
async function fetchFromApiary(apiaryId, config) {
    const result = await got.get(`https://api.apiary.io/blueprint/get/${apiaryId}`, {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'text/plain',
            'Authentication': `Token ${apiaryToken.get(config)}`,
        },
        responseType: 'json',
    })
        .catch(errorDecorator);

    const response = result.body;
    if (response.error) {
        throw new Error(`Apiary responded with an error: ${response.message}`);
    }

    const contract = response.code;
    if (!_.isString(contract)) {
        throw new TypeError('Contract in API response is not a string');
    }
    if (_.isEmpty(contract)) {
        throw new TypeError('Contract in API response is empty');
    }

    const parsed = yaml.safeLoad(contract);
    if (_.isString(parsed)) {
        throw new TypeError('Contract in API response could not be parsed as JSON or YAML');
    }
    return parsed;
};
module.exports = _.memoize(fetchFromApiary);


/**
 * @param {HTTPError} apiError
 */
function errorDecorator(apiError) {
    const error = new Error('Could not fetch valid contract from Apiary');
    error.message += `: ${apiError.response.statusCode}`;

    const body = apiError.response.body;
    if (_.isEmpty(body.message)) {
        throw error;
    }

    error.message += `: ${body.message}`;

    if (apiError.response.statusCode === 403) {
        error.message += '\n'
            + 'Probable reasons for this failure:\n'
            + '1. You have not provided a (valid) Apiary token\n'
            + '   Note: You can generate a token @ https://login.apiary.io/tokens\n'
            + '2. The token provided does not have read permissions\n'
            + '3. Your account is not allowed to access the contract';
    }
    throw error;
}
