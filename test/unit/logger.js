const sinon = require('sinon');
const c = require('ansi-colors');

const logger = require('../../src/logger');

describe('logger', function() {
    beforeEach(function() {
        sinon.stub(console, 'log');
        this.indent = '    │ ';
        logger.maxDepth = 10;
    });

    afterEach(function() {
        sinon.restore();
    });

    it('logs a string on depth 0', function() {
        logger.log(0, 'I am a string');

        expect(console.log).to.have.been.calledOnce;
        expect(console.log).to.have.been.calledWithExactly('I am a string');
    });

    it('logs a string on depth 1 with a single indentation', function() {
        logger.log(1, 'I am a string');

        expect(console.log).to.have.been.calledOnce;
        expect(console.log).to.have.been.calledWithExactly(
            c.grey(this.indent.repeat(1)) + 'I am a string');
    });

    it('logs a string on depth 2 with two indentations', function() {
        logger.log(2, 'I am a string');

        expect(console.log).to.have.been.calledOnce;
        expect(console.log).to.have.been.calledWithExactly(
            c.grey(this.indent.repeat(2)) + 'I am a string');
    });

    it('does not log if the depth > maxdepth', function() {
        logger.maxDepth = 1;
        logger.log(2, 'I am a string');

        expect(console.log).to.not.have.been.called;
    });

    it('does not log if the depth == maxdepth', function() {
        logger.maxDepth = 2;
        logger.log(2, 'I am a string');

        expect(console.log).to.not.have.been.called;
    });

    it('logs a multiline string with proper indentation', function() {
        logger.log(1, 'I am a\nmultiline string');

        expect(console.log).to.have.been.calledTwice;
        expect(console.log).to.have.been.calledWithExactly(
            c.grey(this.indent) + 'I am a');
        expect(console.log).to.have.been.calledWithExactly(
            c.grey(this.indent) + 'multiline string');
    });
});
