const endpoint = require('../../../src/endpoint');

bundle('Endpoint', function() {
    it(`exposes resolver`, async function() {
        expect(endpoint.resolver).to.not.be.undefined;
        expect(endpoint.resolver.constructor.name).to.equal('EndpointResolver');
    });
});
