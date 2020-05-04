const _ = require('lodash');
const apiary = require('../../../../../src/endpoint/contract-downloader/apiary');

bundle('Endpoint/Apiary', function() {
    it('exposes the function fetch', function() {
        expect(apiary.fetch).to.not.be.undefined;
        expect(_.isFunction(apiary.fetch)).to.be.true;
    });
});
