const _ = require('lodash');

const downloader = require('../../../../src/endpoint/contract-downloader');

bundle('Contract downloader', function() {
    it(`exposes download`, async function() {
        expect(downloader.download).to.not.be.undefined;
        expect(_.isFunction(downloader.download)).to.be.true;
    });
});
