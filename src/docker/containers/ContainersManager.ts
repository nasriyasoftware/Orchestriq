import DockerSocket from "../socket/DockerSocket";
import ContainerTemplate from "./templates/ContainerTemplate";
import DockerContainer from "./DockerContainer";

class ContainersManager {
    #_containers: ContainerTemplate[] = [];
    #_socket: DockerSocket;

    constructor(socket: DockerSocket) {
        this.#_socket = socket;
    }

    /**
     * Creates a new container template and adds it to the list of containers.
     * @returns {ContainerTemplate} The newly created container template.
     */
    newTemplate(): ContainerTemplate {
        const container = new ContainerTemplate(this.#_socket);
        this.#_containers.push(container);
        return container;
    }

    /**
     * Lists all containers managed by this instance.
     * 
     * @returns {Promise<DockerContainer[]>} A promise that resolves to an array of DockerContainer objects, representing all containers managed by this instance.
     * @throws {Error} If the request fails to list containers.
     */
    async list(): Promise<DockerContainer[]> {
        try {
            const containers: DockerContainer[] = await this.#_socket.fetch('containers/json?all=true');
            return containers;
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to list containers: ${error.message}`; }
            throw error;
        }
    }
    

    /**
     * Create a container from a template to the Docker host.
     * 
     * @param {ContainerTemplate} container The container template to deploy.
     * @returns {Promise<string>} A promise that resolves to the ID of the created container.
     * @throws {Error} If the request fails to create the container.
     */
    async create(container: ContainerTemplate): Promise<string> {
        try {
            if (!(container instanceof ContainerTemplate)) { throw new Error('Container must be an instance of ContainerTemplate.'); }

            /**
             * TODO: Convert the data from the `ContainerTemplate` to a compatible format
             * for the `docker create` command.
             */

            const container_id = await this.#_socket.fetch('containers/create', { method: 'POST', body: JSON.stringify(container) });

            return container_id;
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to deploy container: ${error.message}`; }
            throw error;
        }
    }

    async remove(container: string | DockerContainer) {

    }
}

export default ContainersManager;