import { DockerContainerData } from "./docs";

class DockerContainer {
    #_data = Object.seal({
        Id: '',
        Names: [],
        Image: '',
        ImageID: '',
        Command: '',
        Created: 0,
        Ports: [],
        Labels: {},
        State: '',
        Status: '',
        HostConfig: {},
        NetworkSettings: {},
        Mounts: []
    } as DockerContainerData)

    constructor(data: DockerContainerData) {
        this.#_data = data;
    }

    get id() { return this.#_data.Id; }
    get names() { return [...this.#_data.Names]; }
    get image() { return this.#_data.Image; }
    get imageID() { return this.#_data.ImageID; }
    get command() { return this.#_data.Command; }
    get created() { return this.#_data.Created; }
    get ports() { return JSON.parse(JSON.stringify(this.#_data.Ports)) }
    get labels() { return { ...this.#_data.Labels }; }
    get state() { return this.#_data.State; }
    get hostConfig() { return { ...this.#_data.HostConfig }; }
    get networkSettings() { return JSON.parse(JSON.stringify(this.#_data.NetworkSettings)); }
    get mounts() { return [...this.#_data.Mounts]; }

    /**
     * Converts the container data to a JSON string representation.
     *
     * @returns {string} A JSON string representing the container data.
     */
    toString(): string {
        return JSON.stringify(this.#_data)
    }

    /**
     * Returns a JSON representation of the container data.
     * @returns {DockerContainerData} The JSON representation of the container data.
     */
    toJSON(): DockerContainerData {
        return JSON.parse(this.toString());
    }

   
    /**
     * TODO: Implement the following methods on the container.
     * - `start()`
     * - `stop()`
     * - `restart()`
     * - `inspect()`
     * - `logs()`
     * - `stats()`
     * - `top()`
     * - `exec()`
     * - `remove()`
     */
}

export default DockerContainer;