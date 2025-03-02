import { StackSecretOptions } from "../../docs";
import helpers from "../../../../../utils/helpers";
import ContainerTemplate from "../../ContainerTemplate";

class StackSecret {
    #_container: ContainerTemplate;
    #_data: StackSecretOptions = { name: '', file: '' };

    constructor(options: StackSecretOptions, container: ContainerTemplate) {
        this.#_container = container;

        if (!(typeof options === 'object' && Object.keys(options).length > 0)) {
            throw new TypeError('options must be an object.');
        }

        if (helpers.hasOwnProperty(options, 'name')) { this.#_data.name = options.name; } else { throw new Error('A secret name must be provided.'); }
        if ('external' in options && options.external === true) {
            this.external = options.external;
        } else {
            if (helpers.hasOwnProperty(options, 'file')) { this.#_data.file = options.file; } else { throw new Error('A file must be provided.'); }
        }
    }

    /**
     * Gets the name of the secret.
     * The name is a string and is unique among all secrets in the container.
     * @returns {string} The name of the secret.
     */
    get name(): string { return this.#_data.name; }
    /**
     * Sets the name of the secret.
     * The name must be a string and unique among all secrets in the container.
     * If the name is already set, this method will throw an error.
     * @param value A string representing the name of the secret.
     * @throws {TypeError} If the provided value is not a string.
     * @throws {Error} If the name is already set or if a secret with the same name already exists.
     */
    set name(value: string) {
        if (typeof value !== 'string') { throw new TypeError("The 'name' property must be a string."); }
        if (value.length === 0) { throw new Error("The 'name' property cannot be empty."); }
        if (value in this.#_container.secrets.list) { throw new Error(`A secret with the name '${value}' already exists in the container.`); }

        this.#_data.name = value;
    }

    /**
     * Returns whether the secret is external or not.
     * If the secret is external, it is not created by the container and must already exist.
     * If not set, the default value is false.
     * @returns {boolean} A boolean indicating whether the secret is external.
     */
    get external(): boolean { return this.#_data.external || false }

    /**
     * Sets whether the secret is external or not.
     * If the secret is external, it is not created by the container and must already exist.
     * If not set, the default value is false.
     * @param value A boolean indicating whether the secret is external.
     * @throws {TypeError} If the provided value is not a boolean.
     */
    set external(value: boolean) {
        if (typeof value !== 'boolean') { throw new TypeError("The 'external' property must be a boolean."); }
        if (value === true) { this.#_data.file = '' }
        this.#_data.external = value;
    }

    /**
     * Returns the file associated with the secret.
     * The file is a string representing the path to the secret file.
     * If the file is set, the secret is not external and the value property is ignored.
     * If the file is not set, the secret is external and the value property is used.
     * @returns {string | undefined} A string representing the path to the secret file, or undefined if not set.
     */
    get file(): string | undefined { return this.#_data.file || undefined; }

    /**
     * Sets the file associated with the secret.
     * The file is a string representing the path to the secret file.
     * If the file is set, the secret is not external and the value property is ignored.
     * If the file is not set, the secret is external and the value property is used.
     * @param value A string representing the path to the secret file.
     * @throws {TypeError} If the provided value is not a string.
     * @throws {Error} If the file path is empty.
     */
    set file(value: string) {
        if (typeof value !== 'string') { throw new TypeError("The 'file' property must be a string."); }
        if (value.length === 0) { throw new Error("The 'file' property cannot be empty."); }
        this.#_data.file = value;
        this.#_data.external = false;
    }
}

export default StackSecret;