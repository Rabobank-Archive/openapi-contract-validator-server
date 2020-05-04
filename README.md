# OpenAPI Contract validator server

Validate HTTP interactions against an OpenAPI Schema via an HTTP proxy.

## Installation

```shell
npm install -g openapi-contract-validator-server
```

## Getting started

Make sure you've installed the package like described above.

You'll need a few config files. Open a command line in the folder you want to store the config files and execute:

```shell
openapi-contract-validator-server init
```

A few files have been generated for you:

- `endpoints.js` is the place where you'll define all your endpoints and their corresponding contracts
- `openapi-contract-validator-server.config.js` is the place where you can configure the server itself

All files contain default values. You can now start the server:

```shell
openapi-contract-validator-server start
```

Make a request to `http://localhost:3000/` to see the server work.

## Command line interface

```text
> openapi-contract-validator-server --help
Usage: openapi-contract-validator-server <command> [options]

Options:
  -V, --version    output the version number
  -h, --help       display help for command

Commands:
  start [options]  Start a OpenAPI Schema validation proxy server.
  init             Copy default configuration to get started quickly
  help [command]   display help for command
```

### `start`

You can overwrite some bits of server configuration by supplying them as command line flags.

```text
> openapi-contract-validator-server start --help
Usage: openapi-contract-validator-server start [options]

Start a OpenAPI Schema validation proxy server.

Options:
  -p, --port <port number>  Start the server on this port
  -t, --target <url>        Target base URL
  -l, --log <depth>         Numeric level of log detail
  -c, --config-file <path>  Path to the config file that should be used
  -h, --help                display help for command
```

```text
openapi-contract-validator-server start --target http://localhost:4200 -l 2
```

## Contributing

Contributors are always welcome! I really don't care if you are a beginner or an expert, all help is welcome. Help includes code contributions, fixing one of my many typos, helping others, etc.
