const path = require('path');
const {cosmiconfig, defaultLoaders} = require('cosmiconfig');
const _ = require('lodash');

const logger = require('../logger');

const defaultConfig = require('./server-config.default');
const packageJson = require('../../package.json');
const packageName = packageJson.name.replace(/@[\w-]+\//, '');

/**
 * Resolve the full parsed config file
 *
 * Singleton
 *
 * @memberof module:config
 */
class ConfigResolver {
    constructor() {
        this.cosmiconfigOptions = {
            searchPlaces: [
                `${packageName}.config.js`,
                `${packageName}.config`,
                `.${packageName}rc.js`,
                `.${packageName}rc`,
            ],
            loaders: {
                '.js': defaultLoaders['.js'],
                '.config': defaultLoaders['.js'],
                'noExt': defaultLoaders['.js'],
            },
        };

        /**
         * The package that will resolve the config file for us
         */
        this.cosmiconfig = cosmiconfig(packageName, this.cosmiconfigOptions);

        /**
         * Cache the parsed config after the first time resolving it to increase performance
         * of future calls.
         */
        this.cache = null;
    }

    /**
     * Get the full parsed config object. The first time it will be resolved from the config file
     * and provided command line options. After that the full parsed config object will be returned
     * from memory
     *
     * @param {object} cliOptions
     * @return {serverConfig}
     */
    async resolve(cliOptions) {
        if (this.cache) {
            return _.cloneDeep(this.cache);
        }

        let configFileResolver;
        if (cliOptions.configFile) {
            configFileResolver = this._resolveByPath(cliOptions.configFile);
        }
        else {
            configFileResolver = this._resolveBySearch();
        }

        return configFileResolver
            .then((config) => {
                config.config = _.defaultsDeep(config.config, defaultConfig);
                return this.applyCliOptions(
                    config.config,
                    path.dirname(config.filepath),
                    cliOptions);
            })
            .then((config) => {
                this.cache = _.cloneDeep(config);
                return config;
            });
    };

    /**
     * Apply command line options to the config object. Command line options have precidence.
     * Some entries will be enriched or otherwise altered as part of this process.
     *
     * @param {serverConfig} config
     * @param {string} configDirectory
     * @param {object} cliOptions
     * @return {serverConfig}
     */
    applyCliOptions(config, configDirectory, cliOptions) {
        config = _.cloneDeep(config);
        cliOptions = _.cloneDeep(cliOptions);

        if (!_.isUndefined(cliOptions.port)) {
            config.port = cliOptions.port;
        }
        if (!_.isUndefined(cliOptions.target)) {
            config.targetUrl = cliOptions.target;
        }
        if (!_.isUndefined(cliOptions.log)) {
            config.logDepth = Number(cliOptions.log);
        }

        this.normalizePath(config, configDirectory, 'endpointDefinitionPath');

        if (_.isEmpty(config.packageName)) {
            config.packageName = packageName;
        }

        return config;
    }

    /**
     * Make the path at the key absolute so all paths are the same.
     *
     * @param {serverConfig} config
     * @param {string} configDirectory
     * @param {string} key
     */
    normalizePath(config, configDirectory, key) {
        if (!_.isString(config[key])) {
            throw new TypeError(`Configuration for ${key} is invalid: Path must be a string`);
        }

        if (!path.isAbsolute(config[key])) {
            config[key] = path.join(configDirectory, config[key]);
        }
    }

    /**
     * Resolve a config file by a specified path.
     *
     * @param {string} path
     * @return {Promise.<{config: Partial<config>, filepath: string}>}
     */
    async _resolveByPath(path) {
        return this.cosmiconfig.load(path)
            .then((config) => {
                if (_.isNull(config)) {
                    throw new TypeError(config);
                }
                return config;
            })
            .catch(() => {
                throw new Error(`Could not find config file at ${path}`);
            });
    }

    /**
     * Search for a config file in the current working directory or it's parent directories.
     *
     * @return {Promise.<{config: Partial<config>, filepath: string}>} The first config file found
     */
    async _resolveBySearch() {
        return this.cosmiconfig.search()
            .then((config) => {
                if (!_.isNull(config)) {
                    return config;
                }

                logger.log(0, `Could not find config file. `
                    + `Proceding with default configuration.`);
                return {
                    config: {},
                    filepath: path.join(process.cwd(), 'server-config.default'),
                };
            });
    }
}
module.exports = new ConfigResolver();
