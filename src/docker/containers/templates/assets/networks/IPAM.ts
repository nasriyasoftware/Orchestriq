import { IPAMConfig, IPAMOptions, NetworkDriver } from "./docs";

class IPAM {
    #_data: IPAMOptions = {}
    /**
     * Returns the network driver.
     * 
     * @returns {NetworkDriver | string | undefined} The network driver, or undefined if no driver is set.
     */
    get driver(): NetworkDriver | string | undefined { return this.#_data.driver }

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
     * Returns the IPAM configuration for the network.
     * 
     * @returns {IPAMConfig[] | undefined} An array of objects representing the IPAM configuration, or undefined if no configuration is set.
     */
    get config(): IPAMConfig[] | undefined { return this.#_data.config }

    /**
     * Sets the IPAM configuration for the network.
     * The configuration is an array of objects, where each object represents a subnet.
     * The properties of each object are as follows:
     * - `subnet`: The subnet for the IPAM configuration. A string in the format of an IP address.
     * - `gateway`: The gateway for the IPAM configuration. A string in the format of an IP address.
     * - `ipRange`: The IP range for the IPAM configuration. A string in the format of an IP address.
     * - `auxAddress`: Auxiliary IP addresses used by the IPAM configuration. An object where each key is the name of the auxiliary address and each value is the address itself (in the format of an IP address).
     * @param value An array of objects representing the IPAM configuration.
     * @throws {TypeError} If the provided value is not an array or if any of the objects in the array do not have the required properties.
     */
    set config(value: IPAMConfig[]) {
        if (!Array.isArray(value)) { throw new TypeError("The 'config' property must be an array."); }

        const areAllObjects = value.every(config => typeof config === 'object' && Object.keys(config).length > 0);
        if (!areAllObjects) { throw new TypeError("The 'config' property must be an array of objects."); }

        for (const config of value) {
            if (helpers.hasOwnProperty(config, 'subnet')) {
                if (typeof config.subnet !== 'string') { throw new TypeError("The 'subnet' property (when defined) must be a string."); }
            }

            if (helpers.hasOwnProperty(config, 'gateway')) {
                if (typeof config.gateway !== 'string') { throw new TypeError("The 'gateway' property (when defined) must be a string."); }
            }

            if (helpers.hasOwnProperty(config, 'ipRange')) {
                if (typeof config.ipRange !== 'string') { throw new TypeError("The 'ipRange' property (when defined) must be a string."); }
            }

            if (helpers.hasOwnProperty(config, 'auxAddress')) {
                if (!(typeof config.auxAddress === 'object' && Object.keys(config.auxAddress).length > 0)) { throw new TypeError("The 'auxAddress' property (when defined) must be an object."); }
                if (Object.keys(config.auxAddress).length === 0) { throw new TypeError("The 'auxAddress' object must not be empty."); }
            }
        }

        this.#_data.config = value;
    }

    set(options: IPAMOptions) {
        if (!(typeof options === 'object' && Object.keys(options).length > 0)) { throw new TypeError("The 'options' parameter must be an object."); }

        if (helpers.hasOwnProperty(options, 'driver')) {
            this.#_data.driver = options.driver;
        }

        if (helpers.hasOwnProperty(options, 'config')) {
            this.#_data.config = options.config;
        }

        return this;
    }
}

export default IPAM;
