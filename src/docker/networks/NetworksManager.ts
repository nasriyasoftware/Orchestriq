import DockerSocket from "../socket/DockerSocket";
import StackNetwork from "../containers/templates/assets/networks/StackNetwork";
import { Network, StackNetworkData } from "../containers/templates/assets/networks/docs";

class NetworksManager {
    #_socket: DockerSocket;

    constructor(socket: DockerSocket) {
        this.#_socket = socket;
    }

    /**
     * Retrieves a list of all networks.
     *
     * @returns {Promise<Network[]>} A promise that resolves to an array of Network objects.
     * @throws {Error} If unable to list networks.
     */
    async list(): Promise<Network[]> {
        try {
            const networks: Network[] = await this.#_socket.fetch('/networks');
            return networks;
        } catch (error) {
            if (error instanceof Error) { { error.message = `Unable to list networks: ${error.message}` } }
            throw error;
        }
    }

    /**
     * Creates a new network and returns its ID.
     * @param data The data for the network to create.
     * @param options An object with options for creating the network.
     * The object must have a `checkDuplicates` property that is a boolean.
     * If `checkDuplicates` is true, the method will check if a network with the same name already exists.
     * If `checkDuplicates` is false, the method will create a new network with the same name if it already exists.
     * @returns The ID of the created network.
     * @throws {Error} If the network could not be created.
     */
    async create(data: StackNetworkData | StackNetwork, options: { checkDuplicates?: boolean } = { checkDuplicates: true }): Promise<string> {
        try {
            const stackNetwork = data instanceof StackNetwork ? data : new StackNetwork(data);
            const json = stackNetwork.toJSON('api');
            json.CheckDuplicate = options.checkDuplicates;

            const network: Network = await this.#_socket.fetch('/networks/create', { method: 'POST', body: JSON.stringify(json) });
            return network.Id;
        } catch (error) {
            if (error instanceof Error) { { error.message = `Unable to create network: ${error.message}` } }
            throw error;
        }
    }
}

export default NetworksManager;