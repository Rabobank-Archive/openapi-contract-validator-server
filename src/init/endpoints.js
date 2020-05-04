/**
 * All endpoints you want for which you want to validate the HTTP interaction
 * must be defined in this file.
 *
 * Contracts can be defined as:
 * 1. Absolute file path
 * 2. Apiary url
 *
 * @type {endpointDefinition[]}
 */
module.exports = [
    {
        endpoint: '/',
        validate: false,
    },
];
