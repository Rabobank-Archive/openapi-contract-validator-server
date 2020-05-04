const supertest = require('supertest');

bundle('E2E', function() {
    describe('Petstore', function() {
        before(function() {
            this.request = supertest('http://localhost:3000');
        });

        // SKIP: pending fix in oas-validator #1386176
        it.skip('validates a valid POST request', async function() {
            await this.request
                .post('/pets')
                .set({
                    'Accept': 'application/json',
                })
                .send('')
                .expect('Content-Type', /json/)
                .expect((result) => expectStatusCode(result, 200));
        });


        it('validates a valid GET request', async function() {
            await this.request
                .get('/pets')
                .set({
                    'Accept': 'application/json',
                })
                .expect('Content-Type', /json/)
                .expect((result) => expectStatusCode(result, 200));
        });

        it('validates an invalid POST request', async function() {
            await this.request
                .post('/not/a/valid/endpoint')
                .set({
                    'Accept': 'application/json',
                })
                .send('')
                .expect('Content-Type', /json/)
                .expect(417)
                .then((result) => {
                    const response = result.body;

                    expect(response.title).to.equal('Contract validation failed');
                    expect(response.detail).to.equal('Endpoint not defined');
                });
        });

        it('does not validate an invalid POST request when the '
                + 'contract-validation request header is set to false', async function() {
            await this.request
                .post('/not/a/valid/endpoint')
                .set({
                    'Accept': 'application/json',
                    'contract-validation': 'false',
                })
                .send('')
                .expect((result) => expectStatusCode(result, 404));
        });

        it('validates an invalid GET request', async function() {
            await this.request
                .get('/not/a/valid/endpoint')
                .set({
                    'Accept': 'application/json',
                })
                .expect('Content-Type', /json/)
                .expect(417)
                .then((result) => {
                    const response = result.body;

                    expect(response.title).to.equal('Contract validation failed');
                    expect(response.detail).to.equal('Endpoint not defined');
                });
        });

        it('does not validate an invalid GET request when the '
                + 'contract-validation request header is set to false', async function() {
            await this.request
                .get('/not/a/valid/endpoint')
                .set({
                    'Accept': 'application/json',
                    'contract-validation': 'false',
                })
                .expect((result) => expectStatusCode(result, 404));
        });
    });
});


/**
 * @param {object} result
 * @param {number} code
 */
function expectStatusCode(result, code) {
    if (result.statusCode === 417) {
        console.log(result.body);
    }
    expect(result.statusCode, 'Response status code').to.equal(code);
}
