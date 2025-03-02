import ContainersManager from "./ContainersManager";
import { Readable } from "stream";
import { ContainerArchiveAddFilesOptions, ContainerArchiveTarOutputOptions, ContainerChangesResponse, ContainerLogsOptions, ContainerRemoveOptions, ContainerStatsOptions, ContainerTopResponse, ContainerUpdateOptions, DockerContainerData } from "./docs";

class DockerContainer {
    #_manager: ContainersManager;
    #_flags = Object.seal({ deleted: false, updated: false });
    #_errors: { notFound: Error, updated: Error } = {} as unknown as { notFound: Error, updated: Error };

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

    constructor(data: DockerContainerData, manager: ContainersManager) {
        this.#_manager = manager;
        this.#_data = data;
        this.#_errors.notFound = new Error(`This container (${this.#_data.Id}) no longer exists.`);
        this.#_errors.updated = new Error(`This container (${this.#_data.Id}) has been updated. Please refresh.`);
    }

    /**
     * The ID of the container.
     * @type {string}
     */
    get id() { return this.#_data.Id; }

    /**
     * A list of names for the container.
     * @type {string[]}
     */
    get names() { return [...this.#_data.Names]; }

    /**
     * The name of the Docker image that this container is running.
     * @type {string}
     */
    get image() { return this.#_data.Image; }

    /**
     * The ID of the Docker image that this container is running.
     * @type {string}
     */
    get imageID() { return this.#_data.ImageID; }

    /**
     * The command that the container is running.
     * @type {string[]}
     */
    get command() { return this.#_data.Command; }

    /**
     * The time at which the container was created, in Unix timestamp format (the number of seconds since the Unix Epoch).
     * @type {number}
     */
    get created() { return this.#_data.Created; }

    /**
     * The ports that the container is exposing.
     * 
     * @type {{ IP?: string, PrivatePort: number, PublicPort?: number, Type: string }[]}
     */
    get ports(): { IP?: string, PrivatePort: number, PublicPort?: number, Type: string }[] { return JSON.parse(JSON.stringify(this.#_data.Ports)) }

    /**
     * Retrieves the labels associated with the container.
     * 
     * @returns {Record<string, string>} An object containing key-value pairs of labels.
     */
    get labels(): Record<string, string> { return { ...this.#_data.Labels }; }

    /**
     * Retrieves the state of the container.
     *
     * The state of the container is one of "running", "exited", or "paused".
     *
     * @returns {string} The state of the container.
     */
    get state(): string { return this.#_data.State; }

    /**
     * Retrieves the host configuration of the container.
     * 
     * @returns {Record<string, any>} An object containing the host configuration of the container.
     */
    get hostConfig(): Record<string, any> { return { ...this.#_data.HostConfig }; }

    /**
     * Retrieves the network settings of the container.
     * 
     * The network settings provide details about the container's network configuration,
     * such as IP address, network mode, and other relevant networking information.
     * 
     * @returns {any} An object containing the network settings of the container.
     */
    get networkSettings(): any { return JSON.parse(JSON.stringify(this.#_data.NetworkSettings)); }

    /**
     * Retrieves the mounts associated with the container.
     * 
     * @returns {any[]} An array of mount objects representing the mounted volumes and their configurations.
     */
    get mounts(): any[] { return [...this.#_data.Mounts]; }

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
     * Retrieves the top processes running in this Docker container.
     * 
     * @returns {Promise<ContainerTopResponse>} A promise that resolves to a ContainerTopResponse object containing the top processes of the container.
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue retrieving the information.
     */
    async top(): Promise<ContainerTopResponse> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            const response = await this.#_manager.top(this.id);
            if (response) {
                return response;
            } else {
                this.#_flags.deleted = true;
                throw this.#_errors.notFound;
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Retrieves the logs of the container from the Docker daemon.
     * 
     * @param {ContainerLogsOptions} [options] - Optional parameters for retrieving the logs.
     *   @param {boolean} [options.stdout] - If true, includes standard output logs.
     *   @param {boolean} [options.stderr] - If true, includes standard error logs.
     *   @param {Date} [options.since] - Filters logs to entries since this date.
     *   @param {Date} [options.until] - Filters logs to entries until this date.
     *   @param {boolean} [options.follow] - If true, continuously streams new logs.
     *   @param {boolean} [options.timestamps] - If true, includes timestamps in logs.
     *   @param {number | string} [options.tail] - Limits the number of log entries returned.
     * @returns {Promise<string>} A promise that resolves to the container logs as a string.
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue retrieving the information.
     */
    async logs(options: ContainerLogsOptions): Promise<string> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            const response = await this.#_manager.logs(this.id, options);
            if (response) {
                return response;
            } else {
                this.#_flags.deleted = true;
                throw this.#_errors.notFound;
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Retrieves the changes of the container from the Docker daemon.
     * 
     * @returns {Promise<ContainerChangesResponse[]>} A promise that resolves to an array of ContainerChangesResponse objects containing the changes of the container, or undefined if the container does not exist.
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue retrieving the information.
     */
    async changes(): Promise<ContainerChangesResponse[]> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            const response = await this.#_manager.changes(this.id);
            if (response) {
                return response;
            } else {
                this.#_flags.deleted = true;
                throw this.#_errors.notFound;
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Exports the filesystem of the container as a tar archive.
     * 
     * @param {string} dest - The destination path where the tar archive will be saved. Must be an absolute path ending with a `.tar` extension.
     * @returns {Promise<string>} A promise that resolves to the path where the tar archive is saved.
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue retrieving the information.
     */
    async export(dest: string): Promise<string> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            const response = await this.#_manager.export(this.id, dest);
            if (response) {
                return response;
            } else {
                this.#_flags.deleted = true;
                throw this.#_errors.notFound;
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Retrieves the stats of the container.
     * 
     * @param {ContainerStatsOptions} [options] - The options for retrieving the stats.
     *   @param {boolean} [options.stream] - If true, returns a ReadableStream. If false, returns the latest stats snapshot as an object.
     *   @param {boolean} [options.oneShot] - If true, retrieves only one stats entry (no continuous streaming).
     * @returns {Promise<ReadableStream | object>} A promise resolving to a ReadableStream (if streaming) or an object (if not).
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue retrieving the information.
     */
    async stats(options: ContainerStatsOptions = { stream: true, oneShot: false }): Promise<ReadableStream | object> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            const response = await this.#_manager.stats(this.id, options);
            if (response) {
                return response;
            } else {
                this.#_flags.deleted = true;
                throw this.#_errors.notFound;
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Starts the container if it has been stopped or paused.
     * 
     * @param {number} [timeout] - Optional timeout period to wait for the container to start. Defaults to no timeout.
     * @returns {Promise<void>} A promise that resolves when the container is started successfully.
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue starting the container.
     */
    async start(timeout?: number): Promise<void> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            await this.#_manager.start(this.id, timeout);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Stops the container if it is running.
     * 
     * @param {number} [timeout] - Optional timeout period to wait for the container to stop. Defaults to no timeout.
     * @returns {Promise<void>} A promise that resolves when the container is stopped successfully.
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue stopping the container.
     */
    async stop(timeout?: number): Promise<void> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            await this.#_manager.stop(this.id, timeout);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Restarts the container.
     * 
     * @param {string} [signal] - Optional signal to pass to the restart command. Defaults to SIGTERM.
     * @returns {Promise<void>} A promise that resolves when the container is restarted successfully.
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue restarting the container.
     */
    async restart(signal?: string): Promise<void> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            await this.#_manager.restart(this.id, signal);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Sends a signal to the container, killing it. Note that when using a signal other than the default (SIGKILL), the container is not removed from the list of running containers until it exits. This is a limitation of the Docker API.
     * 
     * @param {string} [signal] - The signal to send to the container. Defaults to SIGKILL.
     * @returns {Promise<void>} A promise that resolves when the container is killed successfully.
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue killing the container.
     */
    async kill(signal?: string): Promise<void> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            await this.#_manager.kill(this.id, signal);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Updates the container with the given options.
     * 
     * **Note:** Note that after updating, you must use `docker.containers.get(id)` ({@link ContainersManager.get}) again to retrieve the updated container.
     * @param {ContainerUpdateOptions} options - Options for updating the container.
     * @returns {Promise<void>} A promise that resolves when the container is updated successfully.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async update(options: ContainerUpdateOptions): Promise<void> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            await this.#_manager.update(this.id, options);
            this.#_flags.updated = true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Renames the container with the given name.
     * 
     * @param {string} name - The new name for the container.
     * @returns {Promise<void>} A promise that resolves when the container is renamed successfully.
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue renaming the container.
     */
    async rename(name: string): Promise<void> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            await this.#_manager.rename(this.id, name);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Pauses the container. Note that this only pauses the container's processes, it does not stop the container from running.
     * @returns {Promise<void>} A promise that resolves when the container is paused successfully.
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue pausing the container.
     */
    async pause(): Promise<void> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            await this.#_manager.pause(this.id);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Unpauses the container. This will resume the container's processes if the container was previously paused.
     * @returns {Promise<void>} A promise that resolves when the container is unpaused successfully.
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue unpausing the container.
     */
    async unpause(): Promise<void> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            await this.#_manager.unpause(this.id);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Removes the container.
     * 
     * @param {ContainerRemoveOptions} [options] - Optional parameters for removing the container.
     *   @param {boolean} [options.force] - If true, forces removal of the container even if it is running.
     *   @param {boolean} [options.removeVolumes] - If true, removes associated volumes.
     *   @param {boolean} [options.link] - If true, removes the container for the given link.
     * @returns {Promise<void>} A promise that resolves when the container is removed successfully.
     * @throws {Error} Throws an error if the container no longer exists or if there is an issue removing the container.
     */
    async remove(options: ContainerRemoveOptions = { force: false, removeVolumes: false, link: false }): Promise<void> {
        try {
            if (this.#_flags.deleted) { throw this.#_errors.notFound; }
            await this.#_manager.remove(this.id, options);
            this.#_flags.deleted = true;
        } catch (error) {
            throw error;
        }
    }

    /**Contains methods related to the container's archive. */
    readonly archive = {
        /**
         * Retrieves the properties of a file or directory from this container.
         * 
         * @param {string} path - The path to the file or directory inside the container.
         * @returns {Promise<Record<string, any>>} A promise that resolves to an object containing the properties of the file or directory.
         * @throws {Error} Throws an error if the path is invalid, if the container no longer exists, or if there is an issue retrieving the information.
         */
        getStats: async (path: string): Promise<Record<string, any>> => {
            try {
                if (this.#_flags.deleted) { throw this.#_errors.notFound; }
                return await this.#_manager.archive.getStats(this.id, path);
            } catch (error) {
                throw error;
            }
        },

        /**
         * Retrieves a tarball of a file or directory from this container.
         *
         * @param {string} id - The ID of the container from which to retrieve the tarball.
         * @param {string} containerPath - The path inside the container to the file or directory to be tarred.
         * @param {ContainerArchiveTarOutputOptions} [output] - Options for the tarball output.
         *   @param {string} [output.type='stream'] - The type of output, either 'stream' or 'file'.
         *   @param {string} [output.path] - The path where the tarball will be saved if the type is 'file'.
         * @returns {Promise<Readable | string>} A promise that resolves to a Readable stream if the output type is 'stream', or the file path if the output type is 'file'.
         * @throws {Error} Throws an error if the container ID or path is invalid, if the container no longer exists, or if there is an issue retrieving the information.
         */
        getTarball: async (id: string, containerPath: string, output?: ContainerArchiveTarOutputOptions): Promise<Readable | string> => {
            try {
                if (this.#_flags.deleted) { throw this.#_errors.notFound; }
                return await this.#_manager.archive.getTarball(id, containerPath, output);
            } catch (error) {
                throw error;
            }
        },

        /**
         * Adds files to this container from a tarball or directory.
         *
         * @param {ContainerArchiveAddFilesOptions} configs - The options for adding the files.
         *   @param {string} configs.path - The path inside the container to which to add the files.
         *   @param {string} configs.context - The path to the tarball or directory containing the files to add.
         *   @param {boolean} [configs.noOverwrite=false] - Whether to overwrite existing files if the source and destination have the same name.
         *   @param {boolean} [configs.copyUIDGID=false] - Whether to copy the UID/GID of the source file to the destination file.
         * @returns {Promise<void>} A promise that resolves when the files have been added.
         * @throws {Error} Throws an error if the container ID, path, or context are invalid, if the container no longer exists, or if there is an issue adding the files.
         */
        addFiles: async (configs: ContainerArchiveAddFilesOptions): Promise<void> => {
            try {
                if (this.#_flags.deleted) { throw this.#_errors.notFound; }
                await this.#_manager.archive.addFiles(this.id, configs);
            } catch (error) {
                throw error;
            }
        }
    }
}

export default DockerContainer;