
import { DockerOptions } from "../docs/docs";
import DockerSocket from './socket/DockerSocket';
import ContainersManager from "./containers/ContainersManager";
import NetworksManager from "./networks/NetworksManager";
import VolumesManager from "./volumes/VolumesManager";
import ImagesManager from "./images/ImagesManager";
import DockerfileTemplate from "./containers/templates/assets/builders/Dockerfile/DockerfileTemplate";
import DockerfileBuilder from "./containers/templates/assets/builders/Dockerfile/DockerfileBuilder";

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
     * @since v1.0.3
     */
    readonly builders = Object.freeze({
        /**
         * Retrieves a Dockerfile builder, allowing you to generate a Dockerfile used to build a Docker image.
         * @returns {DockerfileBuilder} A Dockerfile builder that can be used to generate a Dockerfile.
         * @since v1.0.3
         */
        dockerfile: (): DockerfileBuilder => {
            return new DockerfileBuilder();
        },
        /**
         * Retrieves a Dockerfile template builder with default settings.
         * 
         * This method provides an easy way to create a Dockerfile template
         * without complex configuration. It is suitable for users who
         * want to quickly generate a Dockerfile using standard settings.
         * 
         * For advanced users, we recommend using the `dockerfile` method
         * to create a custom Dockerfile template.
         * 
         * @returns {DockerfileTemplate} A Dockerfile template builder that can be used to generate a Dockerfile.
         * @since v1.0.3
         */
        easyDockerfileTemplate: (): DockerfileTemplate => {
            return new DockerfileTemplate()
        }
    })

    /**
     * Retrieves the templates available for generating.
     * @returns {Object} An object containing the available templates.
     */
    readonly templates = Object.freeze({
        /**
         * Retrieves a Dockerfile template builder, allowing you to generate a Dockerfile used to build a Docker image.
         * @returns {DockerfileTemplate} A Dockerfile template builder that can be used to generate a Dockerfile.
         * @deprecated
         * Use `builders.easyDockerfileTemplate` instead, or use
         * `builders.dockerfile` for advanced users.
         * 
         * Deprecated since v1.0.3.
         */
        dockerfile: (): DockerfileTemplate => {
            return new DockerfileTemplate()
        }
    })
}

export default Docker;