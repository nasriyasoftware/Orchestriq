class Environment {
    #_environment: Record<string, string> = {};

    /**
     * Gets the environment variables for the service.
     * @returns {Record<string, string>} An object containing the environment variables.
     */
    get list(): Record<string, string> { return this.#_environment; }

    /**
     * Adds a set of key-value pairs to the environment.
     * @param value A record of key-value pairs to add to the environment.
     * @throws {TypeError} If the provided value is not a non-empty object of key-value pairs.
     */
    add(value: Record<string, string>) {
        if (typeof value === 'object' && Object.keys(value).length > 0) {
            for (const [key, val] of Object.entries(value)) {
                this.#_environment[key] = String(val);
            }
        } else {
            throw new TypeError('Environment must be an object of key-value pairs.');
        }
    }
}

export default Environment;