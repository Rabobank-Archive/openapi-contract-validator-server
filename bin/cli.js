#! /usr/bin/env node
require('make-promises-safe');
const commander = require('commander');
const c = require('ansi-colors');

const configResolver = require('../src/config/resolver');
const logger = require('../src/logger');
const server = require('../src/server');
const init = require('../src/init');

const packageJson = require('../package.json');

const program = new commander.Command();
program.version(packageJson.version)
    .name('openapi-contract-validator-server')
    .usage('<command> [options]');

program
    .command('start')
    .description('Start a OpenAPI Schema validation proxy server.')
    .option('-p, --port <port number>',
        'Start the server on this port')
    .option('-t, --target <url>',
        'Target base URL')
    .option('-l, --log <depth>',
        'Numeric level of log detail')
    .option('-c, --config-file <path>',
        'Path to the config file that should be used')
    .action(async (options) => {
        const config = await configResolver.resolve(options);
        logger.maxDepth = config.logDepth;

        server.start(config);
    });

program
    .command('init')
    .description('Copy default configuration to get started quickly')
    .action(() => {
        return init();
    });

program.on('command:*', function() {
    console.error(c.bold.red(`Invalid command: ${program.args.join(' ')}\n`));

    program.outputHelp();
    process.exit(1);
});

program.parse(process.argv);
if (program.args.length === 0) {
    console.error(c.bold.red(`No command provided\n`));

    program.outputHelp();
    process.exit(1);
}
