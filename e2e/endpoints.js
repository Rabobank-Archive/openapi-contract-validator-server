const path = require('path');

module.exports = [
    {
        endpoint: '/pets',
        contract: path.join(__dirname, 'contracts/petstore.yaml'),
        validate: true,
    },
    {
        endpoint: '/',
        validate: false,
    },
];
