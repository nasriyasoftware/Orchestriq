import ContainerTemplate from "../../ContainerTemplate";
import { ServiceCreationOptions } from "./assets/docs";
import Service from "./assets/Service";

class ServicesManager {
    #_container: ContainerTemplate;
    #_services: Record<string, Service> = {};

    constructor(container: ContainerTemplate) {
        this.#_container = container;
    }

    /**
     * Retrieves a record of all services managed by the ServicesManager.
     * @returns {Record<string, Service>} A record containing all the services.
     */
    get list(): Record<string, Service> { return this.#_services; }

    /**
     * Creates a new service and adds it to the container.
     * @param options The options for creating the service.
     * @returns The created service.
     * @throws {Error} If a service with the same name already exists.
     * @throws {Error} If the service is marked as the main service and another main service already exists.
     */
    create(options: ServiceCreationOptions): Service {
        if (options?.name in this.#_services) { throw new Error(`Service with name ${options?.name} already exists.`) }
        if (options?.isMain && Object.values(this.#_services).some(service => service.isMain)) { throw new Error('There can only be one main service.'); }

        const service = new Service(options, this.#_container);
        this.#_services[service.name] = service;
        return service;
    }
}

export default ServicesManager;