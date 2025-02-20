import { StackNetworkData } from "./docs";
import StackNetwork from "./StackNetwork";
import ContainerTemplate from "../../ContainerTemplate";

class ServicesNetworksManager {
    #_container: ContainerTemplate;
    #_networks: Record<string, StackNetwork> = {};

    constructor(container: ContainerTemplate) {
        this.#_container = container;
    }

    /**
     * Creates a new network and adds it to the container.
     * @param network The data for the network to create.
     * @returns The created network.
     * @throws {Error} If a network with the same name already exists.
     */
    create(network: StackNetworkData): StackNetwork {
        const nw = new StackNetwork(network, this.#_container);
        this.#_networks[nw.name] = nw;
        return nw;
    }

    /**
     * Returns a record of all networks in the container.
     * @returns {Record<string, StackNetwork>} A record of all networks in the container.
     */    
    get list(): Record<string, StackNetwork> { return this.#_networks }
}

export default ServicesNetworksManager;