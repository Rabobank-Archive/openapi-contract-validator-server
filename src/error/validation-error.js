const _ = require('lodash');
const Problem = require('api-problem');

class ValidationError extends Error {
    // TODO: AJV error formatting
    constructor(title, parameters={}) {
        super(title);

        this.problem = new Problem(417, title, _.defaults({
            type: 'about:blank',
        }, parameters));
    }
}
module.exports = ValidationError;
