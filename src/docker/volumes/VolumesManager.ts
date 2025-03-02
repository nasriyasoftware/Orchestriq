import { Volume } from "../../docs/docs";
import { CreateVolumeOptions } from "../containers/templates/assets/volumes/docs";
import DockerSocket from "./../socket/DockerSocket";
import StackVolume from "../containers/templates/assets/volumes/StackVolume";

class VolumesManager {
    #_socket: DockerSocket;

    constructor(socket: DockerSocket) {
        this.#_socket = socket;
    }

    /**
     * Retrieves a list of volumes from the Docker daemon.
     * 
     * @returns A promise that resolves to an array of Volume objects.
     * @throws {Error} If unable to fetch the list of volumes.
     */
    async list(): Promise<Volume[]> {
        try {
            const res = await this.#_socket.fetch('/volumes');
            const volumes: Volume[] = res.Volumes;
            return volumes;
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to list volumes: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Creates a new volume and returns its name.
     * @param data The volume to create, which can be either a {@link CreateVolumeOptions} object or a {@link StackVolume} instance.
     * @returns A promise that resolves to the name of the created volume.
     * @throws {Error} If the volume could not be created.
     */
    async create(data: CreateVolumeOptions | StackVolume): Promise<string> {
        try {
            const stackVolume = data instanceof StackVolume ? data : new StackVolume(data);
            const json = stackVolume.toJSON('api');

            const volume: Volume = await this.#_socket.fetch('/volumes/create', { method: 'POST', body: JSON.stringify(json) });
            return volume.Name;
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to create volume: ${error.message}`; }
            throw error;
        }
    }
}

export default VolumesManager;