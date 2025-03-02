import helpers from "../../../../../utils/helpers";
import { StackConfigsData } from "../../docs";
import fs from "fs";

class StackConfigs {
    #_configs: Record<string, StackConfigsData> = {};

    #_helpers = {
        /**
         * Validates the container's 'configs' property.
         * If the config is invalid, an error is thrown.
         * @param value The value of the container's 'configs' property.
         * @throws {TypeError} If the container's 'configs' property is not a non-empty object.
         * @throws {SyntaxError} If the container's 'configs.name' property is not a string, is empty, or is already defined.
         * @throws {SyntaxError} If the container's 'configs.filePath' property is not a string, is empty, or does not exist.
         */
        validateConfig: (value: StackConfigsData) => {
            if (!(typeof value === 'object' && Object.keys(value).length > 0)) { throw new TypeError("The container's 'configs' property must be a non-empty object."); }

            if (helpers.hasOwnProperty(value, 'name')) {
                if (typeof value.name !== 'string') { throw new TypeError("The container's 'configs.name' property must be a string."); }
                if (value.name.length === 0) { throw new SyntaxError("The container's 'configs.name' property must be defined."); }
                if (value.name in this.#_configs) { throw new SyntaxError(`The container's 'configs.name' property must be unique, but '${value.name}' is already defined.`); }
            } else {
                throw new SyntaxError("The container's 'configs.name' property must be defined.");
            }

            if (helpers.hasOwnProperty(value, 'filePath')) {
                if (typeof value.filePath !== 'string') { throw new TypeError("The container's 'configs.filePath' property must be a string."); }
                if (value.filePath.length === 0) { throw new SyntaxError("The container's 'configs.filePath' property must be defined."); }
                if (!fs.existsSync(value.filePath)) { throw new SyntaxError(`The container's 'configs.filePath' property must be a valid path, but '${value.filePath}' does not exist.`); }
            } else {
                throw new SyntaxError("The container's 'configs.filePath' property must be defined.");
            }
        }
    }

    /**
     * Gets the list of configuration files associated with the container.
     * The key of each property is the name of the config file and the value is the config file object.
     * @returns {Record<string, StackConfigsData>} An object containing the name of the config file as the key and the config file object as the value.
    */
    get list(): Record<string, StackConfigsData> { return this.#_configs }

    /**
     * Sets the config files for the container.
     * The config files are validated and assigned to the internal configuration.
     * @param value An object representing the config file to be added or an array of such objects.
     * @throws {TypeError} If the provided value is not an array or if any of the objects in the array do not meet the required structure.
     * @throws {SyntaxError} If any of the config file names already exist in the container or if any of the config file paths do not exist.
     */
    set(value: StackConfigsData | StackConfigsData[]) {
        if (!Array.isArray(value)) { value = [value]; }

        const configs: Record<string, StackConfigsData> = {};
        for (const config of value) {
            this.#_helpers.validateConfig(config);
            configs[config.name] = config;
        }

        this.#_configs = configs;
    }

    /**
     * Adds a config file to the container.
     * If the config name already exists, an error will be thrown.
     * @param config The config file to be added.
     * @throws {TypeError} If the provided config is not a non-empty object.
     * @throws {SyntaxError} If the provided config does not meet the required structure.
     */
    add(config: StackConfigsData) {
        this.#_helpers.validateConfig(config);
        this.#_configs[config.name] = config;
    }
}

export default StackConfigs;