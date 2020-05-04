const config = require('../../../src/config');

bundle('Config', function() {
    it(`exposes resolver`, async function() {
        expect(config.resolver).to.not.be.undefined;
        expect(config.resolver.constructor.name).to.equal('ConfigResolver');
    });
});
