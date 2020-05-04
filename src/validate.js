/**
 * @module validate
 */

const _ = require('lodash');
const c = require('ansi-colors');
const oasValidator = require('openapi-contract-validator');

const logger = require('./logger');
const ValidationError = require('./error/validation-error');
const configResolver = require('./config').resolver;
const endpointResolver = require('./endpoint').resolver;

const validator = new oasValidator.Validator();

/**
 * @param {{request: Request, response: Response}} source
 * @throws {ValidationError}
 */
async function validate(source) {
    const config = await configResolver.resolve();

    let http = {};
    let endpoint;
    try {
        http = toHttp(source.request, source.response);
        endpoint = await findEndpointDefinition(http.request, config);

        if (!exports.shouldValidate(http, endpoint, config)) {
            logger.log(1, `Skip validation`);
            return;
        }

        const contract = await endpoint.contract.full();

        logger.log(1, `Validating interaction using OpenAPI Schema `
            + c.grey(`${endpoint.contract.uri}`));
        await validator.validate(
            contract,
            http,
            config.validator);
        logger.log(2, c.green(`└─ Passed`));
    }
    catch (error) {
        logger.log(1, error.message);

        throw new ValidationError('Contract validation failed', {
            detail: c.unstyle(error.message),
            instance: error.schemaPath,
            request: http.request,
            response: http.response,
            contract: _.isObject(endpoint) ? _.omit(endpoint.contract, 'full') : undefined,
        });
    }
}
exports.validate = validate;


/**
 * @param {Http} http
 * @param {object} endpoint
 * @param {serverConfig} config
 * @return {boolean}
 */
function shouldValidate(http, endpoint, config) {
    const suggestions = [];

    if (http.request.headers['contract-validation'] == 'false') {
        logger.log(2, `Disabled validation via the request header 'contract-validation'.`);
        return false;
    }
    suggestions.push('add the HTTP header `contract-validation: false` to the request');

    if (_.isEmpty(endpoint)) {
        if (config.allowRequestsWithoutEndpoint) {
            logger.log(2, `No endpoint definition found. This is allowed by the config.`);
            return false;
        }

        suggestions.push(`add an endpoint definition for endpoint '${http.request.endpoint}'`);
        suggestions.push('set config `allowRequestsWithoutEndpoint: true`');
        throw new ValidationError('Endpoint not defined', {
            detail: createSumSentence(suggestions),
            instance: http.request.endpoint,
            request: http.request,
        });
    }

    if (endpoint.validate !== true) {
        logger.log(2, 'Disabled validation via the endpoint config.');
        return false;
    }
    suggestions.push('set endpoint config `validate: false`');
    suggestions.push('add a contract to the endpoint config');

    if (_.isEmpty(endpoint.contract)) {
        throw new ValidationError('Contract not defined', {
            detail: 'The interaction should be validated, but there is no contract to perform '
                + 'the validation with. '
                + createSumSentence(suggestions),
            instance: http.request.endpoint,
            request: http.request,
        });
    }

    return true;
}
exports.shouldValidate = shouldValidate;

/**
 * @param {string[]} items
 * @return {string}
 */
function createSumSentence(items) {
    items = _.cloneDeep(items);
    items[0] = items[0].slice(0, 1).toUpperCase() + items[0].slice(1);
    items.push(`or ${items.pop()}`);
    return items.join(', ') + '.';
}

/**
 * @param {Request} request
 * @param {Response} response
 * @return {oasValidator.Http}
 */
function toHttp(request, response) {
    const http = new oasValidator.Http();
    http.request.endpoint = request.url;
    http.request.headers = request.headers;
    http.request.method = request.method;
    http.request.body = request.body;

    http.response.statusCode = response.statusCode;
    http.response.headers = response.headers;
    if (response.body.length > 0) {
        try {
            http.response.body = JSON.parse(response.body);
        }
        catch (error) {
            http.response.body = response.body.toString();
        }
    }
    return http;
}


/**
 * @param {Request} request
 * @param {serverConfig} config
 * @return {string}
 */
async function findEndpointDefinition(request, config) {
    const definitions = await endpointResolver.resolve(config);

    // TODO: Make glob patterns a thing here #1321970
    return definitions.find((endpoint) => {
        return endpoint.endpoint === request.endpoint.split('?', 1)[0];
    });
}
