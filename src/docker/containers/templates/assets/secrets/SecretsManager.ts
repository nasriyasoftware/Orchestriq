import { StackSecretOptions } from "../../../../../docs/docs";
import ContainerTemplate from "../../ContainerTemplate";
import StackSecret from "../../assets/secrets/StackSecret";

class SecretsManager {
    #_container: ContainerTemplate;
    #_secrets: Record<string, StackSecret> = {};

    constructor(container: ContainerTemplate) {
        this.#_container = container;
    }

    /**
     * Returns a record of all secrets in the container.
     * @returns {Record<string, StackSecret>} A record of all secrets in the container.
     */
    get list(): Record<string, StackSecret> { return this.#_secrets }

    /**
     * Creates a new secret object and adds it to the container's secrets.
     * @param secret The secret options to create a new secret with.
     * @returns The created secret.
     */
    create(secret: StackSecretOptions): StackSecret {
        const sec = new StackSecret(secret, this.#_container);
        this.#_secrets[sec.name] = sec;
        return sec;
    }
}

export default SecretsManager;