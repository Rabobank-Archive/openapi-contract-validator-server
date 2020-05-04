const _ = require('lodash');
const Problem = require('api-problem');

class TargetResponseError extends Error {
    constructor(message, statusCode, parameters={}) {
        super(message);

        this.code = statusCode;
        this.problem = new Problem(this.code, message, _.defaults({
            type: 'about:blank',
        }, parameters));
    }
}
module.exports = TargetResponseError;
