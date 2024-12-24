import ContainerTemplate from "../../../ContainerTemplate";

class ServiceBuild {
    #_container: ContainerTemplate

    // Private properties
    #_context: string | undefined = undefined;
    #_dockerfile: string | undefined = undefined;
    #_args: Record<string, string> = {};
    #_labels: Record<string, string> = {};
    #_target: string | undefined = undefined;
    #_cache_from: string[] = [];
    #_shm_size: string | undefined = undefined;
    #_extra_hosts: string[] = [];
    #_squash: boolean = false;
    #_network: string | undefined = undefined;

    constructor(container: ContainerTemplate) {
        this.#_container = container;
    }

    readonly add = Object.freeze({
        args: (args: Record<string, any>) => {
            if (!(typeof args === 'object' && Object.keys(args).length > 0)) { throw new TypeError('args must be a non-empty object.') }

            for (const [key, value] of Object.entries(args)) {
                this.#_args[key] = String(value);
            }
        },
        labels: (labels: Record<string, any>) => {
            if (!(typeof labels === 'object' && Object.keys(labels).length > 0)) { throw new TypeError('labels must be a non-empty object.') }

            for (const [key, value] of Object.entries(labels)) {
                this.#_labels[key] = String(value);
            }
        }
    });

    /**
     * Checks if the ServiceBuild instance is empty.
     *
     * This method evaluates whether all properties of the ServiceBuild instance are either undefined,
     * empty, or contain no entries. If all properties are in such a state, the method returns true,
     * indicating that the ServiceBuild is empty. Otherwise, it returns false.
     *
     * @returns {boolean} True if the ServiceBuild instance has no defined or non-empty properties; otherwise, false.
     */
    isEmpty(): boolean {
        return (
            !this.context &&
            !this.dockerfile &&
            !this.target &&
            !this.shm_size &&
            !this.network &&
            (!this.args || Object.keys(this.args).length === 0) &&
            (!this.labels || Object.keys(this.labels).length === 0) &&
            (!this.cache_from || this.cache_from.length === 0) &&
            (!this.extra_hosts || Object.keys(this.extra_hosts).length === 0)
        );
    }

    /**
     * Get the network to use for the build. If not set, the default value is undefined.
     * @returns {string | undefined} The network to use for the build.
     */
    get network(): string | undefined {
        return this.#_network;
    }

    /**
     * Sets the network to use for the build.
     * If not set, the default value is undefined.
     * @param value The network to use for the build.
     * @throws {TypeError} If the provided value is not a string.
     * @throws {Error} If the provided value is empty.
     * @throws {Error} If the provided value is not a valid network name.
     */
    set network(value: string) {
        if (typeof value !== 'string') { throw new TypeError('network must be a string.') }
        if (value.length === 0) { throw new Error('network must not be empty.') }

        if (value === 'host' || value === 'bridge') {
            if (value === 'bridge') { this.#_network = undefined }
        } else {
            if (!(value in this.#_container.networks.list)) { throw new Error(`Network ${value} does not exist.`) }
            this.#_network = value;
        }
    }

    /**
     * Get the build context, which is the directory containing the `Dockerfile`.
     * @returns {string | undefined} The build context path.
     */
    get context(): string | undefined {
        return this.#_context;
    }

    /**
     * Sets the build context, which is the directory containing the `Dockerfile`.
     * @param value A string representing the build context path.
     * @throws {TypeError} If the provided value is not a string.
     */
    set context(value: string) {
        if (typeof value !== 'string') { throw new TypeError('context must be a string.') }
        this.#_context = value;
    }

    /**
     * Get the Dockerfile location.
     * @returns {string | undefined} The location of the Dockerfile.
     */
    get dockerfile(): string | undefined {
        return this.#_dockerfile;
    }

    /**
     * Sets the location of the Dockerfile.
     * The Dockerfile is a text document that contains all the instructions for building an image.
     * @param value A string representing the location of the Dockerfile.
     * @throws {TypeError} If the provided value is not a string.
     */
    set dockerfile(value: string) {
        if (typeof value !== 'string') { throw new TypeError('dockerfile must be a string.') }
        this.#_dockerfile = value;
    }


    /**
     * Gets the build arguments passed to the Dockerfile.
     * @returns {Record<string, string>} An object containing key-value pairs of the build arguments.
     */
    get args(): Record<string, string> {
        return this.#_args;
    }

    /**
     * Get the build stage to stop at in a multi-stage build.
     * @returns {string | undefined} The build stage name.
     */
    get target(): string | undefined {
        return this.#_target;
    }

    /**
     * Sets the build stage to stop at in a multi-stage build.
     * @param value A string representing the build stage name.
     * @throws {TypeError} If the provided value is not a string.
     */
    set target(value: string) {
        if (typeof value !== 'string') { throw new TypeError('target must be a string.') }
        this.#_target = value;
    }

    /**
     * Get the list of cache sources to speed up the build.
     * @returns {string[]} List of image names to use as cache sources.
     */
    get cache_from(): string[] {
        return this.#_cache_from;
    }

    set cache_from(value: string | string[]) {
        if (!Array.isArray(value)) { value = [value] }

        value = Array.from(new Set(value));

        for (const image of value) {
            if (typeof image !== 'string') {
                throw new TypeError('cache_from must be a list of image names.');
            }
        }

        this.#_cache_from = value;
    }


    /**
     * Gets the list of build-time labels that are passed to the Dockerfile.
     * @returns {Record<string, string>} List of key-value pairs representing the labels.
     */
    get labels(): Record<string, string> {
        return this.#_labels;
    }

    /**
     * Get the size of the `/dev/shm` shared memory filesystem for the container.
     * @returns {string | undefined} The size string (e.g., `256m`, `1g`).
     */
    get shm_size(): string | undefined {
        return this.#_shm_size;
    }

    /**
     * Sets the size of the `/dev/shm` shared memory filesystem for the container.
     * @param value A string representing the size (e.g., `"256m"`, `"1g"`).
     * @throws {TypeError} If the provided value is not a string.
     */
    set shm_size(value: string) {
        if (typeof value !== 'string') { throw new TypeError('shm_size must be a string.') }
        this.#_shm_size = value;
    }

    /**
     * Get the additional host-to-IP mappings for the container.
     * @returns {string[]} List of strings in the format `"hostname:ip"`.
     */
    get extra_hosts(): string[] {
        return this.#_extra_hosts;
    }

    /**
     * Sets the additional host-to-IP mappings for the container.
     * @param value A list of strings in the format `"hostname:ip"`.
     * @throws {TypeError} If any of the values in the list are not strings.
     */
    set extra_hosts(value: string | string[]) {
        if (!Array.isArray(value)) { value = [value] }
        for (const host of value) {
            if (typeof host !== 'string') {
                throw new TypeError('extra_hosts must be a list of strings.');
            }
        }
        this.#_extra_hosts = value;
    }

    /**
     * Get the flag indicating whether to flatten the layers to reduce image size.
     * @returns {boolean} Whether to squash the image layers.
     */
    get squash(): boolean {
        return this.#_squash;
    }

    /**
     * Sets the flag indicating whether to flatten the layers to reduce image size.
     * @param value Whether to squash the image layers.
     * @throws {TypeError} If the provided value is not a boolean.
     */
    set squash(value: boolean) {
        if (typeof value !== 'boolean') { throw new TypeError('squash must be a boolean.') }
        this.#_squash = value;
    }
}

export default ServiceBuild;