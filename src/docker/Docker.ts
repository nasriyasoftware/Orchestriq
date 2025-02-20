
import { DockerOptions } from "../docs/docs";
import DockerSocket from './socket/DockerSocket';
import ContainersManager from "./containers/ContainersManager";
import NetworksManager from "./networks/NetworksManager";
import VolumesManager from "./volumes/VolumesManager";
import ImagesManager from "./images/ImagesManager";
import DockerfileTemplate from "./containers/templates/assets/builders/Dockerfile/DockerfileTemplate";

class Docker {
    #_socket = new DockerSocket();
    #_containers = new ContainersManager(this.#_socket);
    #_networks = new NetworksManager(this.#_socket);
    #_volumes = new VolumesManager(this.#_socket);
    #_images = new ImagesManager(this.#_socket);

    constructor(configs?: DockerOptions) {
        this.#_socket.update(configs);
    }

    /**
     * Retrieves the containers manager associated with the Docker instance.
     * @returns {ContainersManager} An instance of the ContainersManager class, providing APIs to manage containers within the Docker daemon.
     */
    get containers(): ContainersManager { return this.#_containers }

    /**
     * Retrieves the networks manager associated with the Docker instance.
     * @returns {NetworksManager} An instance of the NetworksManager class, providing APIs to manage networks within the Docker daemon.
     */
    get networks(): NetworksManager { return this.#_networks }

    /**
     * Retrieves the volumes manager associated with the Docker instance.
     * @returns {VolumesManager} An instance of the VolumesManager class, providing APIs to manage volumes within the Docker daemon.
     */
    get volumes(): VolumesManager { return this.#_volumes }

    /**
     * Retrieves the images manager associated with the Docker instance.
     * @returns {ImagesManager} An instance of the ImagesManager class, providing APIs to manage images within the Docker daemon.
     */
    get images(): ImagesManager { return this.#_images }

    /**
     * Retrieves the templates available for generating.
     * @returns {Object} An object containing the available templates.
     */
    readonly templates = Object.freeze({
        /**
         * Retrieves a Dockerfile template builder, allowing you to generate a Dockerfile used to build a Docker image.
         * @returns {DockerfileTemplate} A Dockerfile template builder that can be used to generate a Dockerfile.
         */
        dockerfile: (): DockerfileTemplate => {
            return new DockerfileTemplate()
        }
    })
}

export default Docker;