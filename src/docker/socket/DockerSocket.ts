import os from 'os';
import fs from 'fs';
import undici from 'undici';
import { BasicAuth, BearerAuth, DockerOptions, SocketConfig } from "../../docs/docs";

const isWindows = os.platform() === 'win32';

class DockerSocket {
    #_configs: SocketConfig = undefined as unknown as SocketConfig;
    #_dispatcher = new undici.Agent({ socketPath: 'unix:/var/run/docker.sock' });

    constructor(configs?: DockerOptions) {
        this.update(configs);
    }

    #_helpers = {
        createURL: (str: string): URL | undefined => {
            try {
                const url = new URL(str);
                return url;
            } catch (error) {
                return undefined;
            }
        },
        validateAuthOptions: (options: BasicAuth | BearerAuth | 'none' | undefined) => {
            if (options === 'none') { return; }
            if (!(options && typeof options === 'object' && Object.keys(options).length > 0)) { throw new TypeError("The 'options' parameter must be an object.") }
            if (!('type' in options)) { throw new Error(`The authorization type must be specified.`); }

            switch (options.type) {
                case 'Basic': {
                    if (!('username' in options)) { throw new Error(`The 'username' option is required when the 'type' is set to 'basic'.`); }
                    if (typeof options.username !== 'string') { throw new Error(`The 'username' option must be a string when the 'type' is set to 'basic'.`); }
                    if (options.username.length === 0) { throw new Error(`The 'username' option must not be empty when the 'type' is set to 'basic'.`); }

                    if (!('password' in options)) { throw new Error(`The 'password' option is required when the 'type' is set to 'basic'.`); }
                    if (typeof options.password !== 'string') { throw new Error(`The 'password' option must be a string when the 'type' is set to 'basic'.`); }
                    if (options.password.length === 0) { throw new Error(`The 'password' option must not be empty when the 'type' is set to 'basic'.`); }
                    break;
                }
                case 'Bearer': {
                    if (!('token' in options)) { throw new Error(`The 'token' option is required when the 'type' is set to 'bearer'.`); }
                    if (typeof options.token !== 'string') { throw new Error(`The 'token' option must be a string when the 'type' is set to 'bearer'.`); }
                    if (options.token.length === 0) { throw new Error(`The 'token' option must not be empty when the 'type' is set to 'bearer'.`); }
                    break;
                }
                default: {
                    throw new Error(`The 'type' option must be one of 'basic' or 'bearer'.`);
                }
            }
        },
        changeConfigs: (options: SocketConfig) => {
            this.#_configs = options;
            if (this.#_configs.hostType === 'local') {
                this.#_dispatcher = new undici.Agent({ socketPath: this.#_configs.socketPath });
            }
        },
        request: {
            getURL: (endpoint: string) => {
                const url = new URL(this.#_configs.url.toString());
                const [path, query] = endpoint.split('?');
                url.pathname += path;
                url.pathname = url.pathname.replace(/\/+/g, '/');

                if (query) {
                    const params = new URLSearchParams(query);
                    params.forEach((value, key) => {
                        url.searchParams.set(key, value);
                    });
                }

                return url;
            },
            getFetchOptions: (options: Record<string, any> = { method: 'GET' }): RequestInit => {
                const hostType = this.#_configs.hostType;
                const headers: Record<string, string> = {}

                if (hostType === 'local') {
                    options.dispatcher = this.#_dispatcher
                }

                if (hostType === 'network' || hostType === 'remote') {
                    if (this.#_configs.authentication && this.#_configs.authentication !== 'none') {
                        if (!options.headers) { options.headers = {} }
                        switch (this.#_configs.authentication.type) {
                            case 'Basic': {
                                headers['Authorization'] = `Basic ${Buffer.from(`${this.#_configs.authentication.username}:${this.#_configs.authentication.password}`).toString('base64')}`;
                                break;
                            }

                            case 'Bearer': {
                                headers['Authorization'] = `Bearer ${this.#_configs.authentication.token}`;
                                break;
                            }
                        }
                    }
                }

                options.headers = { ...options.headers, ...headers };
                return options;
            },
        },
        response: {
            parseJSON: async (response: any) => {
                try {
                    const json = await response.json();
                    return json;
                } catch (error) {
                    return undefined;
                }
            },
        }
    }

    update(options?: DockerOptions) {
        const baseHeaders = {}

        if (options === undefined || options?.hostType === 'local') {
            let socketPath = isWindows ? '//./pipe/docker_engine' : '/var/run/docker.sock'
            if (options && 'socketPath' in options) {
                if (typeof options.socketPath !== 'string') { throw new Error(`The 'socketPath' option must be a string when the 'hostType' is set to 'local'.`); }
                if (options.socketPath.length === 0) { throw new Error(`The 'socketPath' option must not be empty when the 'hostType' is set to 'local'.`); }
                if (!fs.existsSync(options.socketPath)) { throw new Error(`The 'socketPath' option must point to a valid socket when the 'hostType' is set to 'local'.`); }
                socketPath = options.socketPath;
            }

            this.#_helpers.changeConfigs({ hostType: 'local', socketPath, url: new URL(`http://localhost:2375`) });
        } else {
            if (!(typeof options === 'object' && Object.keys(options).length > 0)) { throw new TypeError("The 'options' parameter must be an object."); }
            if (!('host' in options)) { throw new Error(`The 'host' option is required when the 'hostType' is set to external ('network' or 'remote').`); }
            if (typeof options.host !== 'string') { throw new Error(`The 'host' option must be a string when the 'hostType' is set to 'network' or 'remote'.`); }
            if (options.host.length === 0) { throw new Error(`The 'host' option must not be empty when the 'hostType' is set to 'network' or 'remote'.`); }
            const url = this.#_helpers.createURL(options.host);
            if (!url) { throw new Error(`The 'host' option must be a valid URL when the 'hostType' is set to 'network'.`); }

            let authentication;
            if ('credentials' in options && options.credentials) {
                this.#_helpers.validateAuthOptions({ type: 'Basic', ...options.credentials });
                url.username = encodeURIComponent(options.credentials.username);
                url.password = encodeURIComponent(options.credentials.password);
            }

            if ('authentication' in options) {
                this.#_helpers.validateAuthOptions(options.authentication);
                if (options?.authentication !== 'none') {
                    authentication = options.authentication;
                }
            }

            const baseOptions = { url, authentication, headers: baseHeaders }
            switch (options.hostType) {
                case 'network': {
                    if ('protocol' in options) {
                        if (options.protocol !== 'http' && options.protocol !== 'https' && options.protocol !== 'tcp') { throw new Error(`The 'protocol' option for a 'network' host must be one of 'http', 'https' or 'tcp'.`); }
                        url.protocol = options.protocol;
                    } else {
                        url.protocol = 'tcp';
                    }

                    if ('port' in options) {
                        if (typeof options.port !== 'number') { throw new Error(`The 'port' option for a 'network' host must be a number.`); }
                        url.port = options.port.toString();
                    } else {
                        url.port = '2375';
                    }

                    this.#_helpers.changeConfigs({ hostType: 'network', ...baseOptions });
                    return;
                }

                case 'remote': {
                    if ('protocol' in options) {
                        if (options.protocol !== 'https') { throw new Error(`The 'protocol' option for a 'remote' host must always a secure connection ('https').`); }
                        url.protocol = 'https';
                    } else {
                        url.protocol = 'https';
                    }

                    if ('port' in options) {
                        if (typeof options.port !== 'number') { throw new Error(`The 'port' option for a 'remote' host must be a number.`); }
                        url.port = options.port.toString();
                    }

                    this.#_helpers.changeConfigs({ hostType: 'remote', ...baseOptions });
                    return
                }

                default: {
                    throw new Error(`The 'hostType' option must be one of 'local', 'network' or 'remote'.`);
                }
            }
        }
    }

    /**
     * Makes a request to the Docker Engine API.
     * 
     * @param {string} endpoint - The path to the Docker Engine API endpoint.
     * @param {RequestInit & { returnJSON?: boolean }} [options] - Optional parameters for the request.
     * @param {boolean} [options.returnJSON=true] - If true, automatically parses the response as JSON and returns the parsed object.
     * @returns {Promise<any>} - A promise that resolves with the response, or the parsed JSON object if `returnJSON` is true.
     * @throws {Error} - Throws an error if the request fails, or if the response is not a valid JSON object when `returnJSON` is true.
     */
    async fetch(endpoint: string, options: RequestInit & { returnJSON?: boolean } = { method: 'GET', returnJSON: true }): Promise<any> {
        try {
            const url = this.#_helpers.request.getURL(endpoint);
            const fetchOptions = this.#_helpers.request.getFetchOptions(options);
            const returnJSON = options?.returnJSON === true;

            const proxy = this.#_configs.hostType === 'local' ? undici.fetch : fetch;

            const response = await proxy(url, fetchOptions as Record<string, any>);
            const json = returnJSON ? await this.#_helpers.response.parseJSON(response) : undefined;
            if (returnJSON && !response.ok) {
                const message = json?.message ?? `Failed to fetch: ${response.statusText}`;
                throw new Error(message);
            }

            return returnJSON ? json : response;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    /**
     * Retrieves the current socket configuration.
     * 
     * @returns {SocketConfig} The socket configuration object.
     */
    get configs(): SocketConfig { return this.#_configs; }
}

export default DockerSocket;