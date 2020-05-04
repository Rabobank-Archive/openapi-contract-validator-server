const fs = require('fs').promises;
const path = require('path');
const {COPYFILE_EXCL} = require('fs').constants;
const c = require('ansi-colors');

const configResolver = require('../config/resolver');
const defaultConfig = require('../config/server-config.default');

/**
 * Initialize server configuration
 */
async function init() {
    await createConfigFile();
    await copyEndpointDefinitionFile();
    await copyTsConfig();
}
module.exports = init;

/**
 * Create config file with all default values
 */
async function createConfigFile() {
    const configFileContent = ''
        + `/**\n`
        + ` * @type {serverConfig}\n`
        + ` */\n`
        + `module.exports = ${JSON.stringify(defaultConfig, null, 4)};\n`;
    const configFilePath = path.join(
        process.cwd(),
        configResolver.cosmiconfigOptions.searchPlaces[0]);

    await fs.writeFile(configFilePath, configFileContent);
}

/**
 * Copy the default endpoint definition file
 */
async function copyEndpointDefinitionFile() {
    const sourceFilePath = path.join(
        __dirname,
        defaultConfig.endpointDefinitionPath);
    const targetFilePath = path.join(
        process.cwd(),
        defaultConfig.endpointDefinitionPath);

    await fs.copyFile(sourceFilePath, targetFilePath);
}

/**
 * Create a new tsconfig file if none exists to enable autocompletion in the config files
 */
async function copyTsConfig() {
    const sourceFilePath = path.join(
        __dirname,
        './_tsconfig.json');
    const targetFilePath = path.join(
        process.cwd(),
        './tsconfig.json');

    await fs.copyFile(sourceFilePath, targetFilePath, COPYFILE_EXCL)
        .catch(() => {
            console.warn(c.yellowBright(`Could not create new 'tsconfig.json' at `
                + targetFilePath));
            console.warn(`This is probably because you already have an existing tsconfig. I don't `
                + `want to risk messing up your build. You should probably add `
                + `'openapi-contract-validator-server' to 'tsconfig.json#compilerOptions/types' `
                + `manually.`);
        });
}

