import { StackVolumOptions, VolumeDriver, VolumeDriverOptionsUnion } from "./docs";
import helpers from "../../../../../utils/helpers";
import ContainerTemplate from "../../ContainerTemplate";

class StackVolume {
    #_container: ContainerTemplate | undefined;
    #_data: StackVolumOptions = { name: '' }

    constructor(options: StackVolumOptions, container?: ContainerTemplate) {
        if (container) { this.#_container = container; }

        if (typeof options === 'object' && Object.keys(options).length > 0) {
            if ('name' in options) { this.#_data.name = options.name; } else { throw new Error('A volume name must be provided.'); }
            if ('driver' in options) { this.#_data.driver = options.driver; }
            if ('driverOpts' in options) { this.#_data.driverOpts = options.driverOpts }
            if ('external' in options) { this.#_data.external = options.external; }
            if ('labels' in options) { this.#_data.labels = options.labels; }
            if ('scope' in options) { this.#_data.scope = options.scope; }
            if ('accessMode' in options) { this.#_data.accessMode = options.accessMode; }
            if ('tmpfs' in options) { this.#_data.tmpfs = options.tmpfs; }
            if ('size' in options) { this.#_data.size = options.size; }
        } else {
            throw new TypeError('options must be an object.');
        }
    }

    /**
     * Converts the volume to a JSON object.
     * @param type The type of the JSON object to be returned. The default value is 'regular'.
     * @returns A JSON object representing the volume.
     */
    toJSON(type: 'regular' | 'api' = 'regular'): Record<string, any> {
        if (type === 'regular') {
            return helpers.deepClone(this.#_data);
        } else {
            const json: Record<string, any> = { Name: this.name };
            if (this.driver) { json.Driver = this.driver; }
            if (this.driverOpts && Object.keys(this.driverOpts).length > 0) { json.DriverOpts = helpers.deepClone(this.driverOpts); }
            if (this.labels && Object.keys(this.labels).length > 0) { json.Labels = { ...this.labels }; }
            return json;
        }
    }

    /**
     * Returns the name of the volume.
     * @returns {string} The name of the volume.
     */
    get name(): string { return this.#_data.name; }

    /**
     * Sets the name of the volume.
     * The name must be a string and unique among all volumes in the container.
     * If the name is already set, this method will throw an error.
     * @param value A string representing the name of the volume.
     * @throws {TypeError} If the provided value is not a string.
     * @throws {Error} If the name is already set or if a volume with the same name already exists.
     */
    set name(value: string) {
        if (typeof value !== 'string') { throw new TypeError("The volume's 'name' property must be a string."); }
        if (value.length === 0) { throw new RangeError("The volume's 'name' property must not be empty."); }

        if (this.#_container) {
            if (value in this.#_container.volumes.list) { throw new Error(`Volume with name "${value}" already exists.`); }
        }

        this.#_data.name = value;
    }

    /**
     * Returns the volume driver.
     * 
     * @returns {VolumeDriver | undefined} The volume driver, or undefined if no driver is set.
     */
    get driver(): VolumeDriver | undefined { return this.#_data.driver; }

    /**
     * Sets the volume driver.
     * The volume driver determines how the volume is handled.
     * If not set, the default driver is used.
     * @param value A string representing the volume driver.
     * @throws {TypeError} If the provided driver is not a valid string.
     * @throws {Error} If the volume driver is already set.
     */
    set driver(value: VolumeDriver) {
        if (typeof value !== 'string') { throw new TypeError("The volume's 'driver' property (when defined) must be a string."); }
        if (value.length === 0) { throw new RangeError("The volume's 'driver' property must not be empty."); }
        this.#_data.driver = value;
    }

    /**
     * Returns the driver options for the volume.
     * The driver options provide additional configuration specific to the volume driver.
     * If not set, the default driver options are used.
     * @returns {VolumeDriverOptionsUnion | undefined} An object representing the driver options, or undefined if no options are set.
     */
    get driverOpts(): VolumeDriverOptionsUnion | undefined { return this.#_data.driverOpts; }

    /**
     * Sets the driver options for the volume.
     * The driver options provide additional configuration specific to the volume driver.
     * 
     * @param value An object representing the driver options, which must include:
     *              - `type`: A non-empty string indicating the driver type. Valid types include 'local', 'nfs', 'tmpfs', 'azurefile', 'rexray', 'glusterfs', 'ceph', and 'digitalocean'.
     *              Additional properties depend on the driver `type`:
     *              - For 'local': May include `device` (string).
     *              - For 'nfs': Must include `device` (string), may include `nfsVersion` ('4').
     *              - For 'tmpfs': May include `device`, `size`, `mode` (strings).
     *              - For 'azurefile': Must include `shareName`, `storageAccountName` (strings), may include `device`.
     *              - For 'rexray': Must include `volumeID` (string), may include `device`, `fsType` (string), `iops` (number), `mountOptions` (array of strings).
     *              - For 'glusterfs': Must include `device` (string).
     *              - For 'ceph': Must include `device`, `secret`, `fsid` (strings).
     *              - For 'digitalocean': Must include `access` ('readwrite' | 'readonly'), `size` (number > 0), `region` (string), may include `device`.
     *              Common properties for any type may include:
     *              - `mountpoint`: A string representing the mount point.
     *              - `o`: A string or array of strings representing mount options.
     * 
     * @throws {TypeError} If `value` is not an object or if any property has an incorrect type.
     * @throws {SyntaxError} If required properties are missing or have invalid values.
     */
    set driverOpts(value: VolumeDriverOptionsUnion) {
        if (!(typeof value === 'object' && Object.keys(value).length > 0)) {
            throw new TypeError("The volume's 'driverOpts' property (when defined) must be an object.");
        }

        if (!('type' in value) || typeof value.type !== 'string' || value.type.length === 0) {
            throw new SyntaxError("The volume's 'driverOpts' property must include a 'type' property of type non-empty string.");
        }

        const driverTypes = ['local', 'nfs', 'tmpfs', 'azurefile', 'rexray', 'glusterfs', 'ceph', 'digitalocean'];
        if (!driverTypes.includes(value.type)) {
            throw new SyntaxError(`The volume's 'driverOpts' property must have a 'type' property from: ${driverTypes.join(', ')}.`);
        }

        // Validation functions
        const validateProperty = (prop: string, type: string, isRequired = false, additionalCheck?: (v: any) => boolean, errorMessage?: string) => {
            const objectValue = value as any;
            if (!(prop in objectValue)) {
                if (isRequired) throw new SyntaxError(`The volume's 'driverOpts' must include the '${prop}' property.`);
                return;
            }
            const propValue = objectValue[prop];
            if (typeof propValue !== type) {
                throw new TypeError(`The '${prop}' property must be of type ${type}.`);
            }
            if (additionalCheck && !additionalCheck(propValue)) {
                throw new SyntaxError(errorMessage || `The '${prop}' property is invalid.`);
            }
        };

        const typeValidators = {
            local: () => validateProperty('device', 'string'),
            nfs: () => {
                validateProperty('device', 'string', true);
                validateProperty('nfsVersion', 'string', false, v => v === '4', "The 'nfsVersion' property must be '4'.");
            },
            tmpfs: () => {
                validateProperty('device', 'string');
                validateProperty('size', 'string');
                validateProperty('mode', 'string');
            },
            azurefile: () => {
                validateProperty('device', 'string');
                validateProperty('shareName', 'string', true);
                validateProperty('storageAccountName', 'string', true);
            },
            rexray: () => {
                validateProperty('device', 'string');
                validateProperty('volumeID', 'string', true);
                validateProperty('fsType', 'string');
                validateProperty('iops', 'number');
                validateProperty('mountOptions', 'object', false, v => Array.isArray(v) && v.every(i => typeof i === 'string'), "The 'mountOptions' property must be an array of strings.");
            },
            glusterfs: () => validateProperty('device', 'string', true),
            ceph: () => {
                validateProperty('device', 'string', true);
                validateProperty('secret', 'string', true);
                validateProperty('fsid', 'string', true);
            },
            digitalocean: () => {
                validateProperty('device', 'string');
                validateProperty('access', 'string', true, v => ['readwrite', 'readonly'].includes(v), "The 'access' property must be 'readwrite' or 'readonly'.");
                validateProperty('size', 'number', true, v => v > 0, "The 'size' property must be greater than 0.");
                validateProperty('region', 'string', true);
            },
        };

        // Common validators
        validateProperty('mountpoint', 'string');
        validateProperty('o', 'object', false, v => Array.isArray(v) || typeof v === 'string', "The 'o' property must be a string or an array of strings.");

        // Apply type-specific validation
        typeValidators[value.type]();

        this.#_data.driverOpts = value;
    }

    /**
     * Returns whether the volume is external.
     * If not set, the default value is undefined.
     * If set to a boolean, the volume is marked as external or not.
     * If set to an object, the volume is marked as external and uses the object's 'name' property as the external volume name.
     * @returns {boolean | { name: string } | undefined} A boolean indicating whether the volume is external, or an object with a 'name' property if set to an object.
     */
    get external(): boolean | { name: string } | undefined { return this.#_data.external; }


    /**
     * Sets whether the volume is external.
     * If the volume is external, it will not be created on the host and will not be accessible from outside the container.
     * If not set, the default value is undefined.
     * If set to a boolean, the volume is marked as external or not.
     * If set to an object, the volume is marked as external and uses the object's 'name' property as the external volume name.
     * @param value A boolean indicating whether the volume is external, or an object with a 'name' property if set to an object.
     * @throws {TypeError} If the provided value is not a boolean or an object.
     */
    set external(value: boolean | { name: string }) {
        if (typeof value === 'boolean') {
            this.#_data.external = value;
        } else if (!(typeof value === 'object' && Object.keys(value).length > 0)) {
            if ('name' in value) {
                if (!(typeof value.name === 'string' && value.name.length > 0)) {
                    throw new TypeError("The external volume's 'name' property must be a non-empty string.");
                }
            } else {
                throw new TypeError("The external volume must have a 'name' property when defined as an object.");
            }

            this.#_data.external = value;
        } else {
            throw new TypeError("The external volume must be a boolean or an object.");
        }
    }

    /**
     * Returns the labels associated with the volume.
     * If not set, the default value is undefined.
     * The labels are a set of key-value pairs that can be used to identify or categorize the volume.
     * The keys must be strings and the values must be strings.
     * The labels must be non-empty.
     * @returns {Record<string, string> | undefined} An object containing key-value pairs of labels, or undefined if not set.
     */
    get labels(): Record<string, string> | undefined { return this.#_data.labels }

    /**
     * Sets the labels for the volume.
     * The labels are a set of key-value pairs that can be used to identify or categorize the volume.
     * The keys must be strings and the values must be strings.
     * The labels must be non-empty.
     * @param value A non-empty object containing key-value pairs of labels.
     * @throws {TypeError} If the labels are not a non-empty object or if the values are not strings.
     * @throws {RangeError} If any of the values are empty.
     */
    set labels(value: Record<string, string>) {
        if (!(typeof value === 'object' && Object.keys(value).length > 0)) { throw new TypeError("The volume's 'labels' property must be a non-empty object.") }
        for (const [key, val] of Object.entries(value)) {
            if (typeof val !== 'string') { throw new TypeError(`The volume's label '${key}' must be a string, instead of ${typeof val}.`) }
            if (val.length === 0) { throw new RangeError(`The volume's label '${key}' must not be empty.`) }
        }

        this.#_data.labels = value
    }

    /**
     * Returns the scope of the volume.
     * The scope determines the lifetime of the volume.
     * If the scope is 'global', the volume is created once and is shared across all containers in all services.
     * If the scope is 'local', a new volume is created for each container in each service.
     * If not set, the default scope is 'local'.
     * @returns {'global' | 'local' | undefined} The scope of the volume, or undefined if not set.
     */
    get scope(): 'global' | 'local' | undefined { return this.#_data.scope; }

    /**
     * Sets the scope of the volume.
     * The scope of the volume determines its lifetime.
     * If the scope is 'global', the volume is created once and is shared across all containers in all services.
     * If the scope is 'local', a new volume is created for each container in each service.
     * If not set, the default value is undefined.
     * @param value A string indicating the scope of the volume, either 'global' or 'local'.
     * @throws {SyntaxError} If the provided value is not 'global' or 'local'.
     */
    set scope(value: 'global' | 'local') {
        if (value !== 'global' && value !== 'local') { throw new SyntaxError("The volume's 'scope' property must be either 'global' or 'local'.") }
        this.#_data.scope = value;
    }

    /**
     * Returns the access mode for the volume.
     * The access mode determines how the volume is used.
     * If the access mode is 'read-write', the volume is read-write.
     * If the access mode is 'read-only', the volume is read-only.
     * If not set, the default value is undefined.
     * @returns {'read-write' | 'read-only' | undefined} A string indicating the access mode of the volume, either 'read-write' or 'read-only', or undefined if not set.
     */
    get accessMode(): 'read-write' | 'read-only' | undefined { return this.#_data.accessMode; }

    /**
     * Sets the access mode for the volume.
     * The access mode determines how the volume is used.
     * If the access mode is 'read-write', the volume is read-write.
     * If the access mode is 'read-only', the volume is read-only.
     * If not set, the default value is undefined.
     * @param value A string indicating the access mode of the volume, either 'read-write' or 'read-only'.
     * @throws {SyntaxError} If the provided value is not 'read-write' or 'read-only'.
     */
    set accessMode(value: 'read-write' | 'read-only') {
        if (value !== 'read-write' && value !== 'read-only') { throw new SyntaxError("The volume's 'accessMode' property must be either 'read-write' or 'read-only'.") }
        this.#_data.accessMode = value;
    }

    /**
     * Returns whether the volume is a temporary filesystem.
     * A temporary filesystem is deleted when the container is deleted.
     * If not set, the default value is undefined.
     * @returns {boolean | undefined} A boolean indicating if the volume is a temporary filesystem, or undefined if not set.
     */
    get tmpfs(): boolean | undefined { return this.#_data.tmpfs; }

    /**
     * Sets the flag indicating whether the volume is a temporary filesystem.
     * The volume is deleted when the container is deleted.
     * If not set, the default value is undefined.
     * @param value A boolean indicating whether the volume is a temporary filesystem.
     * @throws {TypeError} If the provided value is not a boolean.
     */
    set tmpfs(value: boolean) {
        if (typeof value !== 'boolean') { throw new TypeError("The volume's 'tmpfs' property must be a boolean.") }
        this.#_data.tmpfs = value;
    }

    /**
     * Returns the size of the volume.
     * The size property is optional and must be a string if provided.
     * If provided, it must be a size string (e.g., '10m', '1g', etc.).
     * If not provided, the volume size is determined by the driver.
     * @returns {string | undefined} A size string indicating the size of the volume, or undefined if not set.
     */
    get size(): string | undefined { return this.#_data.size; }

    /**
     * Sets the size of the volume.
     * The size property is optional and must be a string if provided.
     * If provided, it must be a size string (e.g., '10m', '1g', etc.).
     * If not provided, the volume size is determined by the driver.
     * 
     * @param value A non-empty string representing the size of the volume.
     * @throws {TypeError} If the provided value is not a non-empty string.
     */
    set size(value: string) {
        if (!(typeof value === 'string' && value.length > 0)) { throw new TypeError("The volume's 'size' property must be a non-empty string.") }
        this.#_data.size = value;
    }
}

export default StackVolume;