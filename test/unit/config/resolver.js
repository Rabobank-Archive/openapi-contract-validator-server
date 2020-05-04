const path = require('path');
const cosmiconfig = require('cosmiconfig');
const sinon = require('sinon');
const _ = require('lodash');

const logger = require('../../../src/logger');
const configResolver = require('../../../src/config/resolver');
const defaultConfig = require('../../../src/config/server-config.default');

const parsedDefaultConfig = configResolver.applyCliOptions(defaultConfig, process.cwd(), {});

bundle('Config', function() {
    describe('Singleton class: ConfigResolver', function() {
        it('is an instance of ConfigResolver', function() {
            expect(configResolver.constructor.name).to.equal('ConfigResolver');
        });

        it('defines the correct places where the config file can live', function() {
            expect(configResolver.cosmiconfigOptions.searchPlaces).to.deep.equal([
                'openapi-contract-validator-server.config.js',
                'openapi-contract-validator-server.config',
                '.openapi-contract-validator-serverrc.js',
                '.openapi-contract-validator-serverrc',
            ]);
        });

        it('uses the .js file loader for all file extentions', function() {
            expect(configResolver.cosmiconfigOptions.loaders).to.deep.equal({
                '.js': cosmiconfig.defaultLoaders['.js'],
                '.config': cosmiconfig.defaultLoaders['.js'],
                'noExt': cosmiconfig.defaultLoaders['.js'],
            });
        });

        it('contains an initialized cosmiconfig', function() {
            expect(configResolver.cosmiconfig.search).to.not.be.undefined;
            expect(configResolver.cosmiconfig.load).to.not.be.undefined;
        });

        it('prepares the cache', function() {
            expect(configResolver.cache).to.be.null;
        });

        describe('resolve()', function() {
            beforeEach(function() {
                this.cosmiconfigSearchStub = sinon.stub(configResolver.cosmiconfig, 'search')
                    .callsFake(async () => null);
                this.loggerStub = sinon.stub(logger, 'log');

                delete configResolver.cache;
            });

            afterEach(function() {
                this.cosmiconfigSearchStub.restore();
                this.loggerStub.restore();
                sinon.restore();
            });

            it('resolves the default config if no config file is found', async function() {
                await expect(configResolver.resolve({}))
                    .to.eventually.deep.equal(parsedDefaultConfig);

                expect(this.loggerStub).to.have.been.calledOnce;
                expect(this.loggerStub).to.have.been.calledWithExactly(0,
                    `Could not find config file. Proceding with default configuration.`);
            });

            it('resolves the config out of memory the second time', async function() {
                await expect(configResolver.resolve({}))
                    .to.eventually.deep.equal(parsedDefaultConfig);

                expect(this.loggerStub).to.have.been.calledOnce;

                await expect(configResolver.resolve({}))
                    .to.eventually.deep.equal(parsedDefaultConfig);

                expect(this.loggerStub).to.have.been.calledOnce;
            });

            it('always returns a new object containing the config', async function() {
                let results = [];
                results.push(configResolver.resolve({}));
                results.push(configResolver.resolve({}));
                results.push(configResolver.resolve({}));
                results.push(configResolver.resolve({}));
                results.push(configResolver.resolve({}));
                results = await Promise.all(results);

                for (let i=0; i<results.length; i++) {
                    for (let j=0; j<results.length; j++) {
                        if (i === j) continue;

                        expect(results[i]).to.deep.equal(results[j]);
                        expect(results[i]).to.not.equal(results[j]);
                    }
                }
            });

            it('resolves the config from file extended with defaults', async function() {
                const configOptions = _.cloneDeep(configResolver.configOptions);
                this.cosmiconfigSearchStub.resolves({
                    config: {
                        foo: 123,
                    },
                    filepath: `${process.cwd()}/foo.js`,
                });

                const result = await configResolver.resolve({});

                expect(this.cosmiconfigSearchStub).to.be.calledOnce;
                expect(result)
                    .to.deep.equal(_.defaultsDeep(_.cloneDeep(parsedDefaultConfig), {
                        foo: 123,
                    }));

                configResolver.configOptions = configOptions;
            });

            context('Config file CLI flag', function() {
                beforeEach(function() {
                    this.cosmiconfigLoadStub = sinon.stub(configResolver.cosmiconfig, 'load')
                        .callsFake(async () => null);
                });

                afterEach(function() {
                    this.cosmiconfigLoadStub.restore();
                });

                it('loads the given config file', async function() {
                    this.cosmiconfigLoadStub.resolves({
                        config: {},
                        filepath: `${process.cwd()}/foo.js`,
                    });

                    const result = await configResolver.resolve({
                        configFile: 'lorum/ipsum/foo/bar.ext',
                    });

                    expect(this.cosmiconfigSearchStub).to.not.have.been.called;
                    expect(this.cosmiconfigLoadStub).to.be.calledOnce;
                    expect(this.cosmiconfigLoadStub)
                        .to.be.calledWithExactly('lorum/ipsum/foo/bar.ext');
                    expect(result)
                        .to.deep.equal(_.cloneDeep(parsedDefaultConfig));
                });

                it('throws when the given config file can\'t be found', async function() {
                    this.cosmiconfigLoadStub.callThrough();

                    await expect(configResolver.resolve({
                        configFile: 'lorum/ipsum/foo/bar.ext',
                    })).to.eventually.be.rejectedWith(
                        'Could not find config file at lorum/ipsum/foo/bar.ext');

                    expect(this.cosmiconfigSearchStub).to.not.have.been.called;
                });
            });
        });

        describe('applyCliOptions()', function() {
            it(`adds the package name to the config when it's not set`, function() {
                const config = _.defaultsDeep({
                    packageName: undefined,
                }, defaultConfig);

                const result = configResolver.applyCliOptions(config, '', {});

                expect(result.packageName).to.equal('openapi-contract-validator-server');
            });

            it(`does not change the package name to the config when it's set`, function() {
                const config = _.defaultsDeep({
                    packageName: 'foo',
                }, defaultConfig);

                const result = configResolver.applyCliOptions(config, '', {});

                expect(result.packageName).to.equal('foo');
            });

            describe('normalize a path by making it absolute', function() {
                /* eslint-disable-next-line mocha/no-setup-in-describe */
                [
                    'endpointDefinitionPath',
                ].forEach((configKey) => {
                    it(`normalizes the relative path of ${configKey}`, function() {
                        const config = _.defaultsDeep({
                            [configKey]: './foo/bar',
                        }, defaultConfig);

                        const result = configResolver.applyCliOptions(config, __dirname, {});

                        expect(result[configKey]).to.equal(path.join(__dirname, './foo/bar'));
                    });

                    it(`throws an error when ${configKey} is null`, function() {
                        const config = _.defaultsDeep({
                            [configKey]: null,
                        }, defaultConfig);

                        expect(() => {
                            configResolver.applyCliOptions(config, __dirname, {});
                        }).to.throw('Configuration for endpointDefinitionPath is invalid: '
                            + 'Path must be a string');
                    });

                    it(`throws an error when ${configKey} is a number`, function() {
                        const config = _.defaultsDeep({
                            [configKey]: 123456,
                        }, defaultConfig);

                        expect(() => {
                            configResolver.applyCliOptions(config, __dirname, {});
                        }).to.throw('Configuration for endpointDefinitionPath is invalid: '
                            + 'Path must be a string');
                    });

                    it(`does nothing when ${configKey} is already an absolute path`, function() {
                        const config = _.defaultsDeep({
                            [configKey]: path.join(__dirname, '../bar/foo'),
                        }, defaultConfig);

                        const result = configResolver.applyCliOptions(config, __dirname, {});

                        expect(result[configKey]).to.equal(path.join(__dirname, '../bar/foo'));
                    });
                });
            });

            describe('apply given CLI option to the existing config', function() {
                /* eslint-disable-next-line mocha/no-setup-in-describe */
                [
                    {
                        cli: {port: '9999'},
                        config: {port: '3000'},
                    },
                    {
                        cli: {target: 'foo.bar'},
                        config: {targetUrl: 'http://localhost:8080'},
                    },
                    {
                        cli: {log: 2},
                        config: {logDepth: 1},
                    },
                ].forEach(({config, cli}) => {
                    const configKey = _.first(_.keys(config));
                    const cliKey = _.first(_.keys(cli));

                    config = _.defaultsDeep(config, defaultConfig);

                    it(`applies CLI option ${cliKey} to config ${configKey}`, function() {
                        const result = configResolver.applyCliOptions(config, '', cli);

                        expect(result[configKey]).to.equal(cli[cliKey]);
                    });

                    it(`does not apply the CLI option ${cliKey} when it's not set`, function() {
                        const result = configResolver.applyCliOptions(config, '', {});

                        expect(result[configKey]).to.not.equal(cli[cliKey]);
                        expect(result[configKey]).to.equal(config[configKey]);
                    });
                });
            });
        });
    });
});
