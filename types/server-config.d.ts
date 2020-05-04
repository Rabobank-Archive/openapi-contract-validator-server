type url = string;
type path = string;

declare interface serverConfig {
    /**
     * The port on which the server should start
     */
    port: string;

    /**
     * The base URL to the target
     */
    targetUrl: url;

    /**
     * Numeric level of log detail
     */
    logDepth: number;

    /**
     * The package name of the server.
     *
     * Defaults to the name in package.json without namespace.
     */
    packageName: string;

    /**
     * Absolute or relative path to the endpoint definition file.
     */
    endpointDefinitionPath: path;

    /**
     * Set true to not fail when requesting an undefined endpoint.
     */
    allowRequestsWithoutEndpoint: boolean;

    /**
     * When to resolve the contract
     *
     * - `eager`: Resolve all contracts when starting the server
     * - `lazy`: Resolve a contract when we actually need it for verification
     */
    contractResolutionStrategy: 'lazy'|'eager',

    apiary: {
        /**
         * Environment variable where the Apiary token with read access is stored.
         *
         * Note: The token is stored in an environment variable to prevent you from
         * accidentially committing it. Always treat this token as a secret.
         *
         * @see https://login.apiary.io/tokens to generate a token with read access.
         */
        tokenEnvironmentVariable: string;
    };

    /**
     * Configuration passed to the validator
     *
     * See OAS validator package for details
     */
    validator: oasValidatorConfig;
};
