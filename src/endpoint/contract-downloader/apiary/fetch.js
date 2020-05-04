const apiary = require('apiaryio');
const _ = require('lodash');
const yaml = require('js-yaml');

const apiaryToken = require('./token');
const logger = require('../../../logger');

/**
 * Fetch a contract from Apiary
 *
 * @memberof module:endpoint/contract-downloader
 *
 * @param {string} apiaryId
 * @param {serverConfig.apiary} config
 * @return {Promise.<object>}
 */
function fetchFromApiary(apiaryId, config) {
    return new Promise((resolve, reject) => {
        apiary.fetch(apiaryId, apiaryToken.get(config),
            (response) => {
                if (!_.isString(response)) {
                    reject(new TypeError('API response is not a string'));
                    return;
                }
                if (_.isEmpty(response)) {
                    reject(new TypeError('API response is empty'));
                    return;
                }

                try {
                    const parsed = yaml.safeLoad(response);
                    if (_.isString(parsed)) {
                        throw new TypeError('Response could not be parsed as JSON or YAML');
                    }

                    resolve(parsed);
                }
                catch (error) {
                    logger.log(0, `Could not fetch valid contract from Apiary: `
                        + error.message);
                    resolve(response);
                }
            },
            (errorResponse) => {
                try {
                    const error = new Error('Could not fetch valid contract from Apiary');

                    const body = JSON.parse(errorResponse.body);
                    if (_.isEmpty(body.message)) {
                        throw error;
                    }

                    error.message += `: ${body.message}`;
                    reject(error);
                }
                catch (error) {
                    reject(new Error(
                        'Could not fetch valid contract from Apiary for an unkown reason\n'
                        + 'Possible reasons for this failure:\n'
                        + '1. You have not provided a (valid) Apiary token\n'
                        + '   Note: You can generate a token @ https://login.apiary.io/tokens\n'
                        + '2. The token provided does not have read permissions\n'
                        + '3. You can\'t reach Apiary'));
                }
            },
        );
    });
};
module.exports = _.memoize(fetchFromApiary);
