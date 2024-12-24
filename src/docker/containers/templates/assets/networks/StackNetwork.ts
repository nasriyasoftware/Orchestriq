import helpers from "../../../../../utils/helpers";
import { IPAMOptions, NetworkDriver, StackNetworkData } from "../../../../../docs/docs";
import ContainerTemplate from "../../ContainerTemplate";
import IPAM from "./IPAM";

class StackNetwork {
    #_container: ContainerTemplate | undefined;
    #_data: StackNetworkData = {}

    /**
     * Creates a new instance of the StackNetwork class.
     * @param container The container the network is part of.
     */
    constructor(options: StackNetworkData, container?: ContainerTemplate) {
        if (container) { this.#_container = container; }
        this.#_data.ipam = new IPAM();

        if (typeof options === 'object' && Object.keys(options).length > 0) {
            if ('name' in options && options.name) { this.name = options.name; } else { throw new Error('A network name must be provided.'); }
            if ('driver' in options && options.driver) { this.driver = options.driver; }
            if ('driverOpts' in options && options.driverOpts) { this.driverOpts = options.driverOpts }
            if ('ipam' in options && options.ipam) { this.ipam = options.ipam }
            if ('internal' in options && options.internal) { this.internal = options.internal; }
            if ('enableIpv6' in options && options.enableIpv6) { this.enableIpv6 = options.enableIpv6; }
            if ('external' in options && options.external) { this.external = options.external; }
            if ('labels' in options && options.labels) { this.labels = options.labels; }
            if ('attachable' in options && options.attachable) { this.attachable = options.attachable; }
            if ('scope' in options && options.scope) { this.scope = options.scope; }
            if ('options' in options && options.options) { this.options = options.options; }
        } else {
            throw new TypeError('options must be an object.');
        }
    }

    /**
     * Converts the network configuration to a JSON object.
     * @param type The type of JSON object to return. 'regular' returns the network configuration as a plain object, while 'api' returns the network configuration in the format required by the Docker API.
     * @returns A JSON object representing the network configuration.
     * 
     * If the 'regular' type is used, the returned object will contain the following properties:
     * - name: The name of the network.
     * - driver: The network driver.
     * - driverOpts: An object containing any options for the network driver.
     * - ipam: An object containing the IPAM configuration.
     * - internal: A boolean indicating whether the network is internal.
     * - enableIpv6: A boolean indicating whether IPv6 is enabled for the network.
     * - labels: An object containing any labels set for the network.
     * - attachable: A boolean indicating whether the network is attachable.
     * - options: An object containing any options set for the network.
     * - scope: The scope of the network.
     * 
     * If the 'api' type is used, the returned object will contain the following properties:
     * - Name: The name of the network.
     * - Driver: The network driver.
     * - DriverOpts: An object containing any options for the network driver.
     * - IPAM: An object containing the IPAM configuration.
     * - EnableIPv6: A boolean indicating whether IPv6 is enabled for the network.
     * - Internal: A boolean indicating whether the network is internal.
     * - Labels: An object containing any labels set for the network.
     * - Options: An object containing any options set for the network.
     * - Attachable: A boolean indicating whether the network is attachable.
     */
    toJSON(type: 'regular' | 'api' = 'regular'): Record<string, any> {
        if (type === 'regular') {
            return helpers.deepClone(this.#_data);
        } else {
            const json: Record<string, any> = { Name: this.name };
            if (this.driver) { json.Driver = this.driver; }
            if (this.driverOpts && Object.keys(this.driverOpts).length > 0) { json.DriverOpts = { ...this.driverOpts } }
            if (this.labels && Object.keys(this.labels).length > 0) { json.Labels = { ...this.labels }; }
            if (this.options && Object.keys(this.options).length > 0) { json.Options = { ...this.options } }

            if (this.ipam && (this.ipam.config || this.ipam.driver)) {
                json.IPAM = {
                    Driver: this.ipam.driver,
                    Config: this.ipam.config?.map(_config => {
                        const config: Record<string, any> = {}
                        for (const [key, value] of Object.entries(_config)) {
                            const upperKey = key[0].toUpperCase() + key.slice(1);
                            config[upperKey] = value;
                        }

                        return config;
                    })
                }
            }

            if (typeof this.enableIpv6 === 'boolean') { json.EnableIPv6 = this.enableIpv6; }
            if (typeof this.internal === 'boolean') { json.Internal = this.internal; }
            if (typeof this.attachable === 'boolean') { json.Attachable = this.attachable; }

            return json;
        }
    }

    /**
     * Retrieves the options for the network.
     * 
     * The options are a set of key-value pairs that can be used to configure
     * the network. The keys are strings and the values are strings.
     * 
     * @returns {Record<string, string> | undefined} An object representing the options,
     * or undefined if no options are set.
     */
    get options(): Record<string, string> | undefined { return this.#_data.options }

    /**
     * Sets the options for the network.
     * The options are a set of key-value pairs that can be used to configure
     * the network. The keys are strings and the values are strings.
     * @param value An object representing the options.
     * @throws {TypeError} If the provided value is not an object.
     */
    set options(value: Record<string, string>) {
        if (!(typeof value === 'object' && Object.keys(value).length > 0)) { throw new TypeError('options must be an object.'); }
        this.#_data.options = value;
    }

    /**
     * Returns the scope of the network.
     * The scope determines the visibility and lifetime of the network.
     * A 'global' scope allows the network to be visible across all nodes,
     * whereas a 'local' scope restricts the network to a single node.
     * If not set, the default value is undefined.
     * @returns {'global' | 'local' | undefined} The scope of the network, or undefined if not set.
     */
    get scope(): 'global' | 'local' | undefined { return this.#_data.scope }

    /**
     * Sets the scope of the network.
     * The scope determines the visibility and lifetime of the network.
     * A 'global' scope allows the network to be visible across all nodes,
     * whereas a 'local' scope restricts the network to a single node.
     * If not set, the default value is undefined.
     * 
     * @param value A string indicating the scope of the network, either 'global' or 'local'.
     * @throws {TypeError} If the provided value is not 'global' or 'local'.
     */
    set scope(value: 'global' | 'local') {
        if (!['global', 'local'].includes(value)) { throw new TypeError("The 'scope' property must be either 'global' or 'local'."); }
        this.#_data.scope = value;
    }

    /**
     * Indicates whether the network is attachable or not.
     * If the network is attachable, it can be used by multiple containers.
     * If not set, the default value is true.
     */
    get attachable(): boolean | undefined { return this.#_data.attachable }

    /**
     * Sets whether the network is attachable or not.
     * If the network is attachable, it can be used by multiple containers.
     * If not set, the default value is true.
     * @param value A boolean indicating whether the network is attachable.
     */
    set attachable(value: boolean) {
        if (typeof value !== 'boolean') { throw new TypeError("The 'attachable' property must be a boolean."); }
        this.#_data.attachable = value;
    }

    /**
     * Returns the name of the network.
     * 
     * @returns {string} The name of the network.
     */
    get name(): string { return this.#_data.name || 'default' }

    /**
     * Sets the name of the network.
     * The name must be a string and unique among all networks in the container.
     * If the name is already set, this method will throw an error.
     * @param value The name of the network.
     * @throws {TypeError} If the provided value is not a string.
     * @throws {Error} If the name is already set or if a network with the same name already exists.
     */
    set name(value: string) {
        if (typeof value !== 'string') { throw new TypeError("The 'name' property must be a string."); }
        if (typeof this.#_data.name === 'string') { throw new Error("The 'name' property cannot be changed."); }

        if (this.#_container) {
            const networks = this.#_container.networks.list;
            if (value in networks) { throw new Error(`Network with name ${value} already exists.`) }
        }

        this.#_data.name = value;
    }

    /**
     * Returns the network driver.
     * 
     * @returns {string} The network driver.
     */
    get driver(): string { return this.#_data.driver || 'bridge' }

    /**
     * Sets the network driver for the network.
     * The driver can be any valid Docker network driver (e.g., 'bridge', 'host', 'overlay', etc.).
     * If not set, the default driver is 'bridge'.
     * @param value A string representing the network driver.
     * @throws {TypeError} If the provided value is not a string.
     */
    set driver(value: NetworkDriver | string) {
        if (typeof value !== 'string') { throw new TypeError("The 'driver' property must be a string."); }
        this.#_data.driver = value;
    }

    /**
     * Returns the driver options for the network.
     * 
     * @returns {Record<string, string>} An object containing key-value pairs of the driver options.
     */
    get driverOpts(): Record<string, string> { return this.#_data.driverOpts || {} }

    /**
     * Sets the driver options for the network.
     * The driver options are additional options specific to the network driver.
     * If not set, the default driver options are used.
     * @param value An object containing key-value pairs of the driver options.
     * @throws {TypeError} If the provided value is not an object.
     */
    set driverOpts(value: Record<string, string>) {
        if (!(typeof value === 'object' && Object.keys(value).length > 0)) { throw new TypeError("The 'driverOpts' property must be an object."); }
        this.#_data.driverOpts = value;
    }

    /**
     * Returns the IPAM configuration for the network.
     * 
     * @returns {IPAM} An instance of the IPAM class, providing APIs to manage IP addresses.
     */
    get ipam(): IPAM | undefined { return this.#_data.ipam as IPAM }

    /**
     * Sets the IPAM configuration for the network.
     * The IPAM configuration is used to manage IP addresses for the network.
     * The configuration is an object with the following properties:
     * - `driver`: The IPAM driver to use.
     * - `config`: An array of objects representing the IPAM configuration.
     * The properties of each object are as follows:
     * - `subnet`: The subnet for the IPAM configuration. A string in the format of an IP address.
     * - `gateway`: The gateway for the IPAM configuration. A string in the format of an IP address.
     * - `ipRange`: The IP range for the IPAM configuration. A string in the format of an IP address.
     * - `auxAddress`: Auxiliary IP addresses used by the IPAM configuration. An object where each key is the name of the auxiliary address and each value is the address itself (in the format of an IP address).
     * @throws {TypeError} If the provided value is not an object or if any of the objects in the array do not have the required properties.
     */
    set ipam(ipam: IPAMOptions) {
        if (!ipam || typeof ipam !== 'object') { throw new TypeError("The 'ipam' property must be an object."); }
        this.#_data.ipam = new IPAM().set(ipam);
    }
    /**
     * Returns whether the network is internal.
     * 
     * @returns {boolean} A boolean indicating whether the network is internal.
     */
    get internal(): boolean { return this.#_data.internal === undefined ? false : this.#_data.internal }

    /**
     * Sets whether the network is internal or not.
     * If the network is internal, it will not be created on the host and will not be accessible from outside the container.
     * If not set, the default value is false.
     * @param value A boolean indicating whether the network is internal.
     * @throws {TypeError} If the provided value is not a boolean.
     */
    set internal(value: boolean) {
        if (typeof value !== 'boolean') { throw new TypeError("The 'internal' property must be a boolean."); }
        this.#_data.internal = value;
    }

    /**
     * Returns whether to enable IPv6 on the network.
     * If not set, the default value is false.
     * @returns {boolean} A boolean indicating whether to enable IPv6.
     */
    get enableIpv6(): boolean { return this.#_data.enableIpv6 === undefined ? false : this.#_data.enableIpv6 }

    /**
     * Sets whether to enable IPv6 on the network.
     * If not set, the default value is false.
     * @param value A boolean indicating whether to enable IPv6.
     * @throws {TypeError} If the provided value is not a boolean.
     */
    set enableIpv6(value: boolean) {
        if (typeof value !== 'boolean') { throw new TypeError("The 'enableIpv6' property must be a boolean."); }
        this.#_data.enableIpv6 = value;
    }

    /**
     * Returns whether the network is external.
     * If not set, the default value is false.
     * @returns {boolean} A boolean indicating whether the network is external.
     */
    get external(): boolean | { name: string } { return this.#_data.external === undefined ? false : this.#_data.external }

    /**
     * Sets whether the network is external or not.
     * If the network is external, it is not created by the stack and must already exist.
     * If the network is external and a name is provided, it will be used as the name of the network.
     * If not set, the default value is false.
     * @param value A boolean indicating whether the network is external, or an object with a 'name' property indicating the name of the network.
     * @throws {TypeError} If the provided value is not a boolean or an object.
     */
    set external(value: boolean | { name: string }) {
        if (typeof value !== 'boolean' && typeof value !== 'object') { throw new TypeError("The 'external' property must be a boolean or an object."); }
        this.#_data.external = value;
    }

    /**
     * Returns the labels associated with the network.
     * If not set, the default value is an empty object.
     * @returns {Record<string, string>} An object containing key-value pairs of the labels.
     */
    get labels(): Record<string, string> { return this.#_data.labels || {} }

    /**
     * Sets the labels for the network.
     * The labels are additional metadata for the network and can be used to filter networks.
     * If not set, the default labels are used.
     * @param value An object containing key-value pairs of the labels.
     * @throws {TypeError} If the provided value is not an object.
     */
    set labels(value: Record<string, string>) {
        if (!(typeof value === 'object' && Object.keys(value).length > 0)) { throw new TypeError("The 'labels' property must be an object."); }
        this.#_data.labels = value;
    }
}

export default StackNetwork;