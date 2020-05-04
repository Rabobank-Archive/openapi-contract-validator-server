const concurrently = require('concurrently');

const forbidOnly = process.argv.includes('--forbid-only')
    ? ' -- --forbid-only'
    : '';

concurrently([
    {
        // SUT
        command: `npm run test:e2e:server`,
        name: 'Server',
        prefixColor: 'yellow',
    },
    {
        // Mock server
        command: 'npm run test:e2e:stub',
        name: 'Target',
        prefixColor: 'magenta',
    },
    {
        // Tests
        command: `npm run test:e2e:test ${forbidOnly}`,
        name: 'Test',
        prefixColor: 'blueBright',
    },
], {
    prefix: 'name',
    killOthers: ['failure', 'success'],
    successCondition: 'first',
})
    .catch((error) => {
        console.error(error.stack);
        /* eslint-disable-next-line unicorn/no-process-exit */
        process.exit(1);
    });
