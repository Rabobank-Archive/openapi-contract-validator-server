/**
 * @module server
 */

// TODO: ?? Make this file a reusable module for other types of HTTP proxy things

const express = require('express');
const proxy = require('express-http-proxy');
const c = require('ansi-colors');
const Diagram = require('cli-diagram');

const logger = require('./logger');
const {validate} = require('./validate');
const TargetResponseError = require('./error/target-response-error');
const endpointResolver = require('./endpoint').resolver;

const connectionErrors = [
    'ECONNRESET',
    'ENOTFOUND',
    'ESOCKETTIMEDOUT',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'EPIPE',
    'EAI_AGAIN',
];

/**
 * @param {serverConfig} config
 */
async function startServer(config) {
    const app = express();
    app.use(express.json());
    app.use('/', proxy(config.targetUrl, {
        filter: (sourceRequest) => {
            logger.log(0, `◄── Received request ` + c.grey(`@ ${sourceRequest.originalUrl}`));

            // TODO: Find endpoint definition here and add it to the request/response object
            // TODO: Add option to bail & throw on endpoints without contract
            return true;
        },

        /* eslint-disable-next-line unicorn/prevent-abbreviations */
        proxyReqOptDecorator: (targetRequestOptions, sourceRequest) => {
            targetRequestOptions.headers['proxy-name'] = 'openapi-contract-validator-server';

            logger.log(1, `◄── Forward request to target `
                + c.grey(`@ ${config.targetUrl}${sourceRequest.originalUrl}`));
            logger.log(2, `Headers: ${JSON.stringify(targetRequestOptions.headers, null, 2)}`);
            logger.log(2, `Body: ${JSON.stringify(sourceRequest.body, null, 2)}`);

            return targetRequestOptions;
        },

        /* eslint-disable-next-line unicorn/prevent-abbreviations */
        userResDecorator: (...args) => {
            try {
                return userResponseDecorator(...args);
            }
            catch (error) {
                console.error(error.stack);
                throw error;
            }
        },

        proxyErrorHandler: (error, response, next) => {
            if (connectionErrors.includes(error.code)) {
                error.target = config.targetUrl + response.req.url;
                error.message = 'Could not connect to target: ' + error.message;
                error.method = response.req.method;

                logger.log(0, c.red(`X── ${error.message}`)
                    + ` ${error.method} ${error.target}`);
                return response
                    .status(502)
                    .send(buildErrorResponse(error, {response}));
            }

            next();
        },
    }));

    await endpointResolver.resolve(config);

    app.listen(config.port);
    logger.log(0, drawSchematic(config) + '\n');
}
exports.start = startServer;


/**
 * source.request:
 * [ Target ]<--[ this ]<--[ Source ]
 *
 * source.response:
 * [ Target ]-->[ this ]-->[ Source ]
 *
 * @param {*} source
 * @return {Promise}
 */
function handleHttpInteraction(source) {
    return validate(source)
        .then(() => {
            const code = source.response.statusCode;
            logger.log(0, formatByStatusCode(code, `──► Responded with ${code}`));

            return source.response.body;
        })
        .catch((error) => {
            const response = buildErrorResponse(error, source);

            const code = source.response.statusCode;
            logger.log(0, formatByStatusCode(code, `──► Responded with ${code}`)
                + ` ${error.message}`);
            return response;
        });
}


/**
 * @param {*} targetResponse
 * @param {*} targetResponseData
 * @param {*} sourceRequest
 * @param {*} sourceResponse
 * @return {object|string|Buffer} source response
 */
function userResponseDecorator(targetResponse, targetResponseData, sourceRequest, sourceResponse) {
    const target = {
        request: sourceRequest,
        response: targetResponse,
    };
    target.response.body = targetResponseData;

    const code = target.response.statusCode;
    logger.log(1, formatByStatusCode(code, `──► Target responded with ${code}`));

    const source = {
        request: sourceRequest,
        response: sourceResponse,
    };
    source.response.body = target.response.body;

    try {
        validateTargetResponse(target);
    }
    catch (error) {
        logger.log(2, `Headers: ${JSON.stringify(target.response.headers, null, 2)}`);
        logger.log(2, `Body: ${target.response.body}`);
        logger.log(0, formatByStatusCode(error.code, `──► Responded with ${error.code}`)
            + ` ${error.message}`);

        return buildErrorResponse(error, source);
    }

    logger.log(2, `Headers: ${JSON.stringify(target.response.headers, null, 2)}`);
    logger.log(2, `Body: ${JSON.stringify(JSON.parse(target.response.body), null, 2)}`);
    return handleHttpInteraction(source);
}

/**
 * @param {object} target
 * @throws {TargetResponseError}
 */
function validateTargetResponse(target) {
    if (target.response.body.length === 0) {
        target.response.body = '{}';
    }

    try {
        JSON.stringify(JSON.parse(target.response.body));
    }
    catch (error) {
        error.code = target.response.statusCode;

        if (/Unexpected token . in JSON at position/.test(error.message)) {
            error = new TargetResponseError(
                'Target responded with something that is not valid JSON',
                502, {
                    detail: error.message,
                    targetResponse: {
                        header: target.response.headers,
                        body: target.response.body.toString(),
                    },
                },
            );
        }
        throw error;
    }
}

/**
 * @param {Error} error
 * @param {*} source
 * @return {object}
 */
function buildErrorResponse(error, source) {
    source.response.statusCode = 502;
    source.response.setHeader('content-type', 'application/json');
    error.origin = 'openapi-contract-validator-server';

    if (error.problem) {
        source.response.header('Content-type', 'application/problem+json');
        source.response.statusCode = error.problem.status;

        return error.problem;
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        return {
            error: error.message,
            origin: error.origin,
            target: error.target,
        };
    }

    return {
        error: 'Unexpected error: ' + error.message,
        origin: error.origin,
        detail: `This should never happen during normal operation. `
            + `Are you actively developing ${error.origin} right now?`,
    };
}


/**
 * @param {number} code
 * @param {string} string
 * @return {string}
 */
function formatByStatusCode(code, string=code) {
    if (code >= 200 && code < 300) {
        return c.green(string);
    }
    else if (code >= 300 && code < 400) {
        return c.yellow(string);
    }
    else if (code >= 400) {
        return c.red(string);
    }
    return string;
}


/**
 * @param {serverConfig} config
 * @return {string}
 */
function drawSchematic(config) {
    const target = new Diagram()
        .box(`Target\n${config.targetUrl}`, {color: 'grey'})
        .arrow(['<--', '-->']);
    const requestor = new Diagram()
        .arrow(['<--:request', '-->:response'])
        .box(`Requestor\n`, {color: 'grey'});

    return new Diagram({size: 3})
        .container('\n\n' + target)
        .box(`${config.packageName}\nhttp://localhost:${config.port}`)
        .container('\n\n' + requestor)
        .draw();
}
