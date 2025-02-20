export interface RegistryOptions {
    /**An image tag */
    tag?: string;
    /**The registry URL to be used */
    registryURL?: string;
    /**The authentication to use when connecting to the registry */
    authentication?: RegistryAuth;
    /**
     * The name of a defined registry to use.
     * If provided, the `registryURL` and `authentication` options will be ignored,
     * and the default values for the specified registry will be used.
    */
    registry?: string;
    verbose?: boolean;
}

export interface Registry {
    /**A unique name for the registry. Serves as an identifier */
    name: string;
    /**The server address of the registry.*/
    serveraddress?: string;
    /**The authentication to use when connecting to the registry */
    authentication?: RegistryAuth;
    /**
     * A getter that returns a base64-encoded JSON string representing the authorization configuration of this registry.
     * The JSON string is of the form:
     * {
     *     "username": string,
     *     "password": string,
     *     "serveraddress": string,
     *     "email": string (optional)
     * }
     * This is used to set the X-Registry-Auth header in requests to the registry.
     */
    xAuthHeader: string | undefined;
}

export interface RegistryAuth {
    /**The username to use when accessing the registry. */
    username: string;
    /**The password to use when accessing the registry. */
    password: string;
    /**The email to use when accessing the registry. */
    email?: string;
}