const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');
const memfs = require('memfs');
const sinon = require('sinon');
const outdent = require('outdent');
const c = require('ansi-colors');

const {COPYFILE_EXCL} = require('fs').constants;

const init = require('../../../src/init');

const defaultConfig = require('../../../src/config/server-config.default');

describe('Command init', function() {
    beforeEach(async function() {
        this.cwdStub = sinon.stub(process, 'cwd')
            .returns('/root');
        await memfs.fs.promises.mkdir(process.cwd(), {
            recursive: true,
        });

        this.writeFileStub = sinon.stub(fs, 'writeFile')
            .resolves();
        this.copyFileStub = sinon.stub(fs, 'copyFile')
            .resolves();

        this.endpointsSourceFilePath = path.join(__dirname, '../../../src/init/endpoints.js');
        this.tsconfigSourceFilePath = path.join(__dirname, '../../../src/init/_tsconfig.json');
        this.sourceFiles = {
            [this.endpointsSourceFilePath]: '',
            [this.tsconfigSourceFilePath]: '',
        };
        memfs.vol.fromJSON(this.sourceFiles, process.cwd());
    });

    afterEach(function() {
        sinon.restore();
        memfs.vol.reset();
    });

    describe('Server config file', function() {
        beforeEach(function() {
            this.writeFileStub.callsFake(memfs.fs.promises.writeFile);
        });

        it('creates a new file', async function() {
            const files = {};
            memfs.vol.fromJSON(files, process.cwd());

            await init();

            expect(this.writeFileStub).to.have.been.called;
            const volume = memfs.vol.toJSON();
            expect(volume['/root/openapi-contract-validator-server.config.js'].trim())
                .to.equal(outdent`
                    /**
                     * @type {serverConfig}
                     */
                    module.exports = ${JSON.stringify(defaultConfig, null, 4)};
                `);
        });

        it('overwrites an existing file', async function() {
            const files = {
                '/root/openapi-contract-validator-server.config.js': 'empty',
            };
            memfs.vol.fromJSON(files, process.cwd());

            await init();

            expect(this.writeFileStub).to.have.been.called;
            const volume = memfs.vol.toJSON();
            expect(volume['/root/openapi-contract-validator-server.config.js'])
                .to.contain('@type {serverConfig}');
        });
    });

    describe('Endpoint definition file', function() {
        beforeEach(function() {
            this.copyFileStub.callsFake(memfs.fs.promises.copyFile);
        });

        it('has the expected content in the source file', async function() {
            const contents = await fs.readFile(this.endpointsSourceFilePath, 'utf-8')
                .then((content) => {
                    // normalize whitespace characters. We don't really care about the
                    // specifics of those.
                    return content.trim().replace(/\r\n/g, '\n');
                })
                .then((content) => {
                    // Remove any code inserted by Stryker
                    return '/**\n' + _.last(content.split('/**\n'));
                });

            expect(contents).to.equal(outdent`
                /**
                 * All endpoints you want for which you want to validate the HTTP interaction
                 * must be defined in this file.
                 *
                 * Contracts can be defined as:
                 * 1. Absolute file path
                 * 2. Apiary url
                 *
                 * @type {endpointDefinition[]}
                 */
                module.exports = [
                    {
                        endpoint: '/',
                        validate: false,
                    },
                ];
            `);
        });

        it('creates a new file', async function() {
            const files = {
                [this.endpointsSourceFilePath]: 'empty source file',
            };
            memfs.vol.fromJSON(files, process.cwd());

            await init();

            expect(this.copyFileStub).to.have.been.called;
            expect(this.copyFileStub).to.have.been.calledWithExactly(
                this.endpointsSourceFilePath,
                path.normalize('/root/endpoints.js'));

            const volume = memfs.vol.toJSON();
            expect(volume['/root/endpoints.js'].trim())
                .to.equal('empty source file');
        });

        it('overwrites an existing file', async function() {
            const files = {
                [this.endpointsSourceFilePath]: 'copied source file',
                '/root/endpoints.js': 'existing file',
            };
            memfs.vol.fromJSON(files, process.cwd());

            await init();

            expect(this.copyFileStub).to.have.been.called;
            const volume = memfs.vol.toJSON();
            expect(volume['/root/endpoints.js'].trim())
                .to.equal('copied source file');
        });
    });

    describe('tsconfig file', function() {
        beforeEach(function() {
            this.copyFileStub.callsFake(memfs.fs.promises.copyFile);
        });

        it('has the expected content in the source file', async function() {
            const contents = await fs.readFile(this.tsconfigSourceFilePath, 'utf-8')
                .then((content) => {
                    // normalize whitespace characters. We don't really care about the
                    // specifics of those.
                    return content.trim().replace(/\r\n/g, '\n');
                });

            expect(contents).to.equal(outdent`
                {
                    "compilerOptions": {
                        "allowJs": true,
                        "types": [
                            "openapi-contract-validator-server"
                        ],
                        "outDir": "dummyFolder"
                    }
                }
            `);
        });

        it('creates a new file', async function() {
            const files = {
                [this.tsconfigSourceFilePath]: 'empty source file',
            };
            memfs.vol.fromJSON(files, process.cwd());

            await init();

            expect(this.copyFileStub).to.have.been.called;
            expect(this.copyFileStub).to.have.been.calledWithExactly(
                this.tsconfigSourceFilePath,
                path.normalize('/root/tsconfig.json'),
                COPYFILE_EXCL);

            const volume = memfs.vol.toJSON();
            expect(volume['/root/tsconfig.json'].trim())
                .to.equal('empty source file');
        });

        it('does not overwrite an existing file', async function() {
            const consoleWarnStub = sinon.stub(console, 'warn');

            const files = {
                [this.tsconfigSourceFilePath]: 'copied source file',
                '/root/tsconfig.json': 'existing file',
            };
            memfs.vol.fromJSON(files, process.cwd());

            await init();

            expect(this.copyFileStub).to.have.been.called;
            const volume = memfs.vol.toJSON();
            expect(volume['/root/tsconfig.json'].trim())
                .to.equal('existing file');

            expect(consoleWarnStub).to.have.been.called;
            expect(consoleWarnStub).to.have.been.calledWithExactly(
                c.yellowBright(`Could not create new 'tsconfig.json' at `
                    + path.normalize(`/root/tsconfig.json`)));
            expect(consoleWarnStub).to.have.been.calledWithExactly(
                `This is probably because you already have an existing tsconfig. I don't `
                + `want to risk messing up your build. You should probably add `
                + `'openapi-contract-validator-server' to 'tsconfig.json#compilerOptions/types' `
                + `manually.`);
        });
    });
});
