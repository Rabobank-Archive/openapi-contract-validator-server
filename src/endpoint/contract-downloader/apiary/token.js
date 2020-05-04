/**
 * Apiary requires a token for the script to access the OASs. Tokens can be generated at the
 * link below.
 *
 * The token is stored in an environment variable (as defined in the config) to prevent you from
 * accidentially committing it.
 *
 * @see https://login.apiary.io/tokens
 * @memberof module:endpoint/contract-downloader
 *
 * @param {serverConfig.apiary} config
 * @return {string} Apiary access token
 */
function getApiaryToken(config) {
    if (exports.cache) {
        return exports.cache;
    }

    const token = process.env[config.tokenEnvironmentVariable];

    if (!token) {
        throw new Error(`Could not find an Apiary token in the environment variable `
            + `'${config.tokenEnvironmentVariable}'. Without token it's impossible to talk `
            + `to the Apiary server.`);
    }

    exports.cache = token;
    return token;
};

exports.get = getApiaryToken;
exports.cache;
