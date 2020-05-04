type uri = string;

declare interface endpointDefinition {
    /**
     * The parial uri of the resource you want validated
     */
    endpoint: uri;

    /**
     * Where does the OpenAPI Schema contract come from
     *
     * @example // Apiary url
     * `https://app.apiary.io/mycontract/editor`
     * @example // Absolute file path
     * path.join(__dirname, './contract/my-contract.yaml')
     */
    contract: uri|path;

    /**
     * Do you want this endpoint to be validated?
     *
     * @default true
     */
    validate: boolean;
};
