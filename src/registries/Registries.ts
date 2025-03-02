import { Registry } from "./docs";
import helpers from "../utils/helpers";

class Registries {
    #_registries: Record<string, Registry> = {};

    /**
     * Defines a new registry with the given name and details.
     *
     * The given details object may contain the following properties:
     * - `serveraddress`: The URL of the registry to use. If not provided, the default registry (index.docker.io) is used.
     * - `authentication`: An object with the following properties:
     *   - `username`: The username to use for the registry. If not provided, the default username is used.
     *   - `password`: The password to use for the registry. If not provided, the default password is used.
     *   - `email`: The email address to use for the registry. If not provided, the default email address is used.
     *
     * If the given name already exists in the registries map, an Error is thrown.
     * If the given details object is invalid (e.g. missing required properties), a TypeError is thrown.
     *
     * @param {string} name - The name of the registry to define.
     * @param {{ serveraddress: string, authentication: { username: string, password: string, email: string } }} details - The details of the registry to define.
     * @throws {Error} If the given name already exists in the registries map.
     * @throws {TypeError} If the given details object is invalid.
     */
    define(name: string, details: Omit<Registry, 'name' | 'xAuthHeader'>) {
        try {
            if (typeof name !== 'string') throw new TypeError('Name must be a string');
            if (name.length === 0) throw new RangeError('Registry name must not be empty');

            if (name in this.#_registries) { throw new Error(`Registry with name ${name} already exists`); }

            if ('authentication' in details && details.authentication) {
                const auth = details.authentication;

                if (helpers.hasOwnProperty(auth, 'username')) {
                    if (typeof auth.username !== 'string' || auth.username.length === 0) { throw new TypeError(`The registry "username" option must be a non-empty string.`); }
                }

                if (helpers.hasOwnProperty(auth, 'password')) {
                    if (typeof auth.password !== 'string' || auth.password.length === 0) { throw new TypeError(`The registry "password" option must be a non-empty string.`); }
                }

                if (helpers.hasOwnProperty(auth, 'email')) {
                    if (typeof auth.email !== 'string' || auth.email.length === 0) { throw new TypeError(`The registry "email" option (when provided) must be a non-empty string.`); }
                    if (!helpers.isValidEmail(auth.email)) { throw new TypeError(`The registry "email" you provided (${auth.email}) must be a valid email address.`); }
                }
            }

            if (helpers.hasOwnProperty(details, 'serveraddress')) {
                if (typeof details.serveraddress !== 'string' || details.serveraddress.length === 0) { throw new TypeError(`The "serveraddress" option (when provided) must be a non-empty string.`); }
                if (!helpers.isURL(details.serveraddress)) { throw new TypeError(`The "serveraddress" you provided (${details.serveraddress}) must be a valid URL.`); }
            } else {
                details.serveraddress = 'https://index.docker.io/v1';
            }

            const registry: Registry = {
                name,
                authentication: details.authentication,
                serveraddress: details.serveraddress,
                get xAuthHeader(): string | undefined {
                    if (this.authentication) {
                        return Buffer.from(JSON.stringify({ ...this.authentication, serveraddress: this.serveraddress })).toString('base64');
                    } else {
                        return undefined;
                    }
                }
            };
            this.#_registries[name] = registry;
        } catch (error) {
            if (error instanceof Error) { error.message = `Failed to define registry: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Returns a list of all registries that have been defined.
     * @returns {Registry[]} A list of all registries that have been defined.
     */
    list(): Registry[] {
        const registries: Registry[] = [];
        for (const registry of Object.values(this.#_registries)) {
            registries.push({ ...registry });
        }

        return registries;
    }

    /**
     * Removes a registry with the given name.
     * @param name The name of the registry to remove. Must be a non-empty string.
     * @throws TypeError If the name is not a string.
     * @throws RangeError If the name is an empty string.
     * @throws Error If a registry with the given name does not exist.
     */
    remove(name: string) {
        try {
            if (typeof name !== 'string') throw new TypeError('Registry name must be a string');
            if (name.length === 0) throw new RangeError('Registry name must not be empty');

            if (!(name in this.#_registries)) { throw new Error(`Registry with name ${name} does not exist`); }

            delete this.#_registries[name];
        } catch (error) {
            if (error instanceof Error) { error.message = `Failed to remove registry: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Retrieves a registry with the specified name.
     * 
     * @param name - The name of the registry to retrieve.
     * @returns {Registry | undefined} The registry object if found, otherwise undefined.
     */
    get(name: string): Registry | undefined {
        return { ...this.#_registries[name] };
    }
}

const registeries = new Registries();
export default registeries;