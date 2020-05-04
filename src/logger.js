/**
 * @module logger
 */

const c = require('ansi-colors');

const INDENT = '    │ ';
exports.maxDepth = 10;

/**
 * @param {number} depth
 * @param {string} message
 */
function log(depth, message) {
    if (depth >= exports.maxDepth) {
        return;
    }
    message.split('\n')
        .forEach((line) => {
            console.log(c.grey(INDENT.repeat(depth)) + line);
        });
}
exports.log = log;
