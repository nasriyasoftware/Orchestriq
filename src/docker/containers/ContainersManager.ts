import DockerSocket from "../socket/DockerSocket";
import ContainerTemplate from "./templates/ContainerTemplate";
import DockerContainer from "./DockerContainer";
import { ContainerArchiveAddFilesOptions, ContainerArchiveTarOutputOptions, ContainerChangesResponse, ContainerLogsOptions, ContainerRemoveOptions, ContainersPruneFilters, ContainersPruneResponse, ContainerStatsOptions, ContainerTopResponse, ContainerUpdateOptions, CreateContainerOptions, DockerContainerData } from "./docs";
import path from "path";
import fs from "fs";
import helpers from "../../utils/helpers";
import { Readable } from "stream";
import tarball from "../../utils/Tarball";
import { BindVolume, NamedVolume } from "./templates/assets/services/assets/docs";

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
            const containers: DockerContainerData[] = await this.#_socket.fetch('containers/json?all=true');
            return containers.map(container => new DockerContainer(container, this));
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to list containers: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Creates a new container and returns its ID.
     * @param container The container to create. This can be either a `ContainerTemplate` instance or a `CreateContainerOptions` object with the following properties:
     * @param verbose Whether to log the creation of the container.
     * @returns A promise that resolves to an object with two properties: id and name. The id is the ID of the created container, and the name is the name of the container.
     * @throws {Error} If the container could not be created.
     */
    async create(container: ContainerTemplate | CreateContainerOptions, verbose: boolean = false): Promise<{ id: string, name: string } | { id: string, name: string }[]> {
        const params = new URLSearchParams();
        const request: Record<string, any> = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            returnJSON: false,
        }

        try {
            if (typeof verbose !== 'boolean') { throw new Error('The "verbose" argument (when provided) must be a boolean.'); }
            if (container instanceof ContainerTemplate) {
                const services = Object.values(container.services.list);
                if (services.length === 0) { throw new Error('The container must have at least one service.'); }
                const createdContainers: { id: string, name: string }[] = [];

                for (const service of services) {
                    if (service.image === undefined) { throw new Error(`The service ${service.name} must have an image.`); }
                    if (verbose) { console.log(`Creating the ${service.name} service${service.container_name ? ` (${service.container_name})` : ''}...`); }

                    const requestBody: Record<string, any> = {
                        Image: service.image,
                    }

                    if (service.user) { requestBody.User = service.user; }
                    if (service.command) { requestBody.Cmd = service.command; }
                    if (service.entrypoint) { requestBody.Entrypoint = service.entrypoint; }

                    // Preparing the environment variables
                    {
                        const env: Map<string, string> = new Map();

                        // #1: Check the container's environment files
                        for (const envFilePath of container.env_files) {
                            if (path.isAbsolute(envFilePath)) {
                                const contentStr = await fs.promises.readFile(envFilePath, 'utf8');
                                const pairs = contentStr.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                                for (const pair of pairs) {
                                    const [key, value] = pair.split('=');
                                    env.set(key, value);
                                }
                            } else {
                                if (verbose) { console.warn(`Skipping the container's environment file path "${envFilePath}" since it is not an absolute path.`); }
                            }
                        }

                        // #2: Check the container's environment variables
                        for (const [key, value] of Object.entries(container.environment.list)) {
                            env.set(key, value);
                        }

                        // #3: Check the service's environment files
                        for (const envFilePath of service.env_files) {
                            if (path.isAbsolute(envFilePath)) {
                                const contentStr = await fs.promises.readFile(envFilePath, 'utf8');
                                const pairs = contentStr.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                                for (const pair of pairs) {
                                    const [key, value] = pair.split('=');
                                    env.set(key, value);
                                }
                            } else {
                                if (verbose) { console.warn(`Skipping the service's environment file path "${envFilePath}" since it is not an absolute path.`); }
                            }
                        }

                        // #4: Check the service's environment variables
                        for (const [key, value] of Object.entries(service.environment.list)) {
                            env.set(key, value);
                        }

                        // Add the environment variables to the request body
                        if (env.size > 0) {
                            requestBody.Env = Array.from(env).map(([key, value]) => `${key}=${value}`);
                        }
                    }

                    // Preparing the healthcheck
                    {
                        const healthcheck = service.healthcheck.toJSON();
                        if (healthcheck.test.length > 0) {
                            const obj = {
                                test: healthcheck.test,
                                interval: healthcheck.interval,
                                timeout: healthcheck.timeout,
                                retries: healthcheck.retries,
                                start_period: healthcheck.start_period,
                                disable: healthcheck.disable,
                            }

                            if (Object.values(obj).some(value => value !== undefined)) {
                                requestBody.Healthcheck = obj;
                            }
                        }
                    }

                    // Preparing the volumes
                    {
                        const anonymousVolumes = service.volumes.filter(volume => volume.type === 'anonymous');
                        const namedVolumes = service.volumes.filter(volume => volume.type === 'named');
                        const bindMounts = service.volumes.filter(volume => volume.type === 'bind');

                        if (anonymousVolumes.length > 0) {
                            requestBody.Volumes = {};
                            for (const volume of anonymousVolumes) {
                                requestBody.Volumes[volume.containerPath] = {};
                            }
                        }

                        if (namedVolumes.length > 0 || bindMounts.length > 0) {
                            if (!helpers.hasOwnProperty(requestBody, 'HostConfig')) { requestBody.HostConfig = {}; }
                            if (!helpers.hasOwnProperty(requestBody.HostConfig, 'Binds')) { requestBody.HostConfig.Binds = []; }

                            for (const volume of namedVolumes as NamedVolume[]) {
                                requestBody.HostConfig.Binds.push(`${volume.name}:${volume.containerPath}`);
                            }

                            for (const volume of bindMounts as BindVolume[]) {
                                requestBody.HostConfig.Binds.push(`${volume.hostPath}:${volume.containerPath}`);
                            }
                        }
                    }

                    // Prepare the service ports
                    {
                        if (service.ports.length > 0) {
                            requestBody.ExposedPorts = {};
                            for (const port of service.ports) {
                                requestBody.ExposedPorts[`${port}/tcp`] = {};
                            }
                        }
                    }

                    // Preparing the request
                    const containerName = service.container_name || service.name;
                    params.set('name', containerName);
                    request.body = JSON.stringify(requestBody);

                    // The request to create the container
                    const response = await this.#_socket.fetch(`containers/create${params.size > 0 ? `?${params.toString()}` : ''}`, request);
                    const data = await response.json();

                    if (response.ok) {
                        createdContainers.push({ id: data.Id, name: containerName });
                    } else {
                        throw new Error(data.message);
                    }
                }

                if (createdContainers.length === 0) { throw new Error('No containers were created.'); }
                if (createdContainers.length === 1) { return createdContainers[0] } else { return createdContainers }
            } else {
                // Check if the container is a an object and validate it
                if (!helpers.isObject(container)) { throw new Error('The container must be an object.'); }

                if (helpers.hasOwnProperty(container, 'name')) {
                    if (typeof container.name !== 'string') { throw new Error('The container name must be a string.'); }
                    if (container.name.length === 0) { throw new Error('The container name must be defined.'); }
                    params.set('name', container.name);
                }

                const requestBody = { ...container };
                delete requestBody.name;

                request.body = JSON.stringify(requestBody);
                const response = await this.#_socket.fetch(`containers/create${params.size > 0 ? `?${params.toString()}` : ''}`, request);
                const data = await response.json();

                if (response.ok) {
                    return { id: data.Id, name: container.name || '' };
                } else {
                    throw new Error(data.message);
                }
            }
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to create the ${container.name ? `(${container.name})` : ''} container: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Retrieves the details of a Docker container from the Docker daemon.
     * 
     * @param {string} id - The ID of the container to inspect.
     * @returns {Promise<DockerContainer | undefined>} A promise that resolves to a DockerContainer object containing the details of the container, or undefined if the container does not exist.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async get(id: string): Promise<DockerContainer | undefined> {
        try {
            if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
            if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

            const response = await this.#_socket.fetch(`containers/${id}/json`, { method: 'GET', returnJSON: false });
            const data = await response.json();

            if (response.ok) { return new DockerContainer(data, this); }
            if (response.status === 404) { return; }
            if (response.status === 500) { throw new Error(data.message) }
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to get the details of the container${typeof id === 'string' && id.length < 0 ? ` with ID "${id}"` : ''}: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Retrieves the top processes running in a Docker container from the Docker daemon.
     * 
     * @param {string} id - The ID of the container to inspect.
     * @returns {Promise<ContainerTopResponse | undefined>} A promise that resolves to a ContainerTopResponse object containing the top processes of the container, or undefined if the container does not exist.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async top(id: string): Promise<ContainerTopResponse | undefined> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            const response = await this.#_socket.fetch(`containers/${id}/top`, { method: 'GET', returnJSON: false });
            const data = await response.json();

            if (response.ok) { return data }
            if (response.status === 404) { return; }
            if (response.status === 500) { throw new Error(data.message) }
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to get the top processes of the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Retrieves the logs of a Docker container.
     *
     * @param {string} id - The ID of the container whose logs are to be retrieved.
     * @param {ContainerLogsOptions} options - The options for retrieving the logs.
     *   @param {boolean} [options.stdout] - If true, includes standard output logs.
     *   @param {boolean} [options.stderr] - If true, includes standard error logs.
     *   @param {Date} [options.since] - Filters logs to entries since this date.
     *   @param {Date} [options.until] - Filters logs to entries until this date.
     *   @param {boolean} [options.follow] - If true, continuously streams new logs.
     *   @param {boolean} [options.timestamps] - If true, includes timestamps in logs.
     *   @param {number | string} [options.tail] - Limits the number of log entries returned.
     * @returns {Promise<string | undefined>} A promise that resolves to the container logs as a string, or undefined if the container does not exist.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async logs(id: string, options: ContainerLogsOptions): Promise<string | undefined> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            if (!helpers.isObject(options)) { throw new Error('The options argument must be an object.'); }
            if (!('stdout' in options || 'stderr' in options)) { throw new Error('At least one of the "stdout" or "stderr" options must be provided.'); }

            const params = new URLSearchParams();
            if (helpers.hasOwnProperty(options, 'stdout')) {
                if (typeof options.stdout !== 'boolean') { throw new Error('The "stdout" option must be a boolean.'); }
                if (options.stdout) { params.set('stdout', 'true'); }
            }

            if (helpers.hasOwnProperty(options, 'stderr')) {
                if (typeof options.stderr !== 'boolean') { throw new Error('The "stderr" option must be a boolean.'); }
                if (options.stderr) { params.set('stderr', 'true'); }
            }

            if (helpers.hasOwnProperty(options, 'since')) {
                if (!(options.since instanceof Date)) { throw new Error('The "since" option must be a Date object.'); }
                params.set('since', (Math.floor(options.since.getTime() / 1000)).toString());
            }

            if (helpers.hasOwnProperty(options, 'until')) {
                if (!(options.until instanceof Date)) { throw new Error('The "until" option must be a Date object.'); }
                params.set('until', (Math.floor(options.until.getTime() / 1000)).toString());
            }

            if (helpers.hasOwnProperty(options, 'follow')) {
                if (typeof options.follow !== 'boolean') { throw new Error('The "follow" option must be a boolean.'); }
                if (options.follow) { params.set('follow', 'true'); }
            }

            if (helpers.hasOwnProperty(options, 'timestamps')) {
                if (typeof options.timestamps !== 'boolean') { throw new Error('The "timestamps" option must be a boolean.'); }
                if (options.timestamps) { params.set('timestamps', 'true'); }
            }

            if (helpers.hasOwnProperty(options, 'tail')) {
                if (!['number', 'string'].includes(typeof options.tail)) { throw new Error('The "tail" option must be a number or a string.'); }
                if (typeof options.tail === 'number') { options.tail = String(options.tail) }
                params.set('tail', options.tail as string);
            }

            const response = await this.#_socket.fetch(`/containers/${id}/logs${params.size > 0 ? `?${params.toString()}` : ''}`, { method: 'GET', returnJSON: false });
            // console.log(response)
            const data = await response.text();
            if (response.ok) {
                return data || '';
            }

            if (response.status === 404) { return undefined; }
            throw new Error(`${data.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to get the logs of the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Retrieves the changes of a Docker container from the Docker daemon.
     * 
     * @param {string} id - The ID of the container whose changes are to be retrieved.
     * @returns {Promise<ContainerChangesResponse[] | undefined>} A promise that resolves to an array of ContainerChangesResponse objects containing the changes of the container, or undefined if the container does not exist.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async changes(id: string): Promise<ContainerChangesResponse[] | undefined> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            const response = await this.#_socket.fetch(`containers/${id}/changes`, { method: 'GET', returnJSON: false });
            const data = await response.json();

            if (response.ok) { return data }
            if (response.status === 404) { return undefined; }
            throw new Error(`${data.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to get the changes of the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Exports the filesystem of a Docker container as a tar archive.
     * 
     * @param {string} id - The ID of the container to export.
     * @param {string} dest - The destination path where the tar archive will be saved. Must be an absolute path ending with a `.tar` extension.
     * @returns {Promise<string | undefined>} A promise that resolves to the path where the tar archive is saved, or undefined if the container does not exist.
     * @throws {Error} Throws an error if the container ID or destination path is invalid, or if the request fails.
     */
    async export(id: string, dest: string): Promise<string | undefined> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            if (typeof dest !== 'string') { throw new Error('The destination path must be a string.'); }
            if (dest.length === 0) { throw new Error('The destination path cannot be empty.'); }
            if (!path.isAbsolute(dest)) { dest = path.resolve(dest); }

            const folder = path.dirname(dest);
            const basename = path.basename(dest);

            if (!basename.toLowerCase().endsWith('.tar')) { throw new Error('The destination file must have a `.tar` extension.'); }
            if (!fs.existsSync(folder)) { await fs.promises.mkdir(folder, { recursive: true }); }

            const outputPath = basename ? dest : path.join(dest, `${id}.tar`);

            const response = await this.#_socket.fetch(`containers/${id}/export`, { method: 'GET', returnJSON: false });
            if (response.ok) {
                const stream = fs.createWriteStream(outputPath);
                for await (const chunk of response.body) {
                    stream.write(chunk);
                }

                stream.end();
                return outputPath;
            }

            const data = await response.json();
            if (response.status === 404) { return undefined; }
            throw new Error(`${data.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to export the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Retrieves the stats of a Docker container from the Docker daemon.
     *
     * @param {string} id - The ID of the container whose stats are to be retrieved.
     * @param {ContainerStatsOptions} [options] - The options for retrieving the stats.
     *   @param {boolean} [options.stream] - If true, returns a ReadableStream. If false, returns the latest stats snapshot as an object.
     *   @param {boolean} [options.oneShot] - If true, retrieves only one stats entry (no continuous streaming).
     * @returns {Promise<ReadableStream | object | undefined>} A promise resolving to a ReadableStream (if streaming) or an object (if not).
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async stats(id: string, options: ContainerStatsOptions = { stream: true, oneShot: false }): Promise<ReadableStream | object | undefined> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            const params = new URLSearchParams();
            if (helpers.hasOwnProperty(options, 'stream')) {
                if (typeof options.stream !== 'boolean') { throw new Error('The "stream" option must be a boolean.'); }
                params.set('stream', options.stream.toString());
            }

            if (helpers.hasOwnProperty(options, 'oneShot')) {
                if (typeof options.oneShot !== 'boolean') { throw new Error('The "oneShot" option must be a boolean.'); }
                params.set('one-shot', options.oneShot.toString());
            }

            const response = await this.#_socket.fetch(`containers/${id}/stats${params.size > 0 ? `?${params.toString()}` : ''}`, { method: 'GET', returnJSON: false });
            if (response.ok) {
                return options.stream ? response.body : await response.json();
            }

            const error = await response.json();
            if (response.status === 404) { return undefined; }
            throw new Error(`${error.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to get the stats of the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Starts a stopped or paused container.
     *
     * @param {string} id - The ID of the container to start.
     * @param {number} [timeout] - The time to wait for the container to start before returning an error. Defaults to no timeout.
     * @returns {Promise<void>} A promise that resolves when the container is started successfully.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async start(id: string, timeout?: number): Promise<void> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            if (timeout !== undefined && typeof timeout !== 'number') { throw new Error('The timeout must be a number.'); }

            const params = new URLSearchParams();
            if (typeof timeout === 'number') { params.set('timeout', timeout.toString()); }

            const response = await this.#_socket.fetch(`containers/${id}/start${params.size > 0 ? `?${params.toString()}` : ''}`, { method: 'POST', returnJSON: false });
            if (response.status === 204 || response.status === 304) { return; }

            const error = await response.json();
            throw new Error(`${error.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to start the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Stops a running container.
     *
     * @param {string} id - The ID of the container to stop.
     * @param {number} [timeout] - The time to wait for the container to stop before returning an error. Defaults to no timeout.
     * @returns {Promise<void>} A promise that resolves when the container is stopped successfully.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async stop(id: string, timeout?: number): Promise<void> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            if (timeout !== undefined && typeof timeout !== 'number') { throw new Error('The timeout must be a number.'); }

            const params = new URLSearchParams();
            if (typeof timeout === 'number') { params.set('timeout', timeout.toString()); }

            const response = await this.#_socket.fetch(`containers/${id}/stop${params.size > 0 ? `?${params.toString()}` : ''}`, { method: 'POST', returnJSON: false });
            if (response.status === 204 || response.status === 304) { return; }

            const error = await response.json();
            throw new Error(`${error.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to stop the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Restarts a running container.
     *
     * @param {string} id - The ID of the container to restart.
     * @param {string} [signal] - The signal to send to the container to restart it. Defaults to SIGTERM.
     * @returns {Promise<void>} A promise that resolves when the container is restarted successfully.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async restart(id: string, signal?: string): Promise<void> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            if (signal !== undefined && typeof signal !== 'string') { throw new Error('The signal must be a string.'); }
            const params = new URLSearchParams();
            if (typeof signal === 'string') { params.set('signal', signal); }

            const response = await this.#_socket.fetch(`containers/${id}/restart${params.size > 0 ? `?${params.toString()}` : ''}`, { method: 'POST', returnJSON: false });
            if (response.ok) { return; }

            const error = await response.json();
            throw new Error(`${error.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to restart the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Sends a signal to a container, killing it. Note that when using a signal other than the default (SIGKILL), the container is not removed from the list of running containers until it exits. This is a limitation of the Docker API.
     *
     * @param {string} id - The ID of the container to kill.
     * @param {string} [signal] - The signal to send to the container. Defaults to SIGKILL.
     * @returns {Promise<void>} A promise that resolves when the container is killed successfully.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async kill(id: string, signal?: string): Promise<void> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            if (signal !== undefined && typeof signal !== 'string') { throw new Error('The signal must be a string.'); }
            const params = new URLSearchParams();
            if (typeof signal === 'string') { params.set('signal', signal); }

            const response = await this.#_socket.fetch(`containers/${id}/kill${params.size > 0 ? `?${params.toString()}` : ''}`, { method: 'POST', returnJSON: false });
            if (response.ok) { return; }

            const error = await response.json();
            throw new Error(`${error.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to kill the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Updates a container with the given options. Note that the container must be stopped (not paused) for this function to work.
     *
     * @param {string} id - The ID of the container to update.
     * @param {ContainerUpdateOptions} options - The options to update the container with.
     * @returns {Promise<void>} A promise that resolves when the container is updated successfully.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     * @see https://docs.docker.com/engine/api/v1.41/#operation/ContainerUpdate
     */
    async update(id: string, options: ContainerUpdateOptions): Promise<void> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            if (!helpers.isObject(options)) { throw new TypeError('The options argument must be an object.'); }
            if (!helpers.isNotEmptyObject(options)) { throw new SyntaxError('The options object cannot be empty.'); }

            const requestBody: ContainerUpdateOptions = {};
            // validate the request options
            {
                if (helpers.hasOwnProperty(options, 'CpuShares')) {
                    if (typeof options.CpuShares !== 'number') { throw new TypeError(`The "CpuShares" (when provided) option must be a number, instead got ${typeof options.CpuShares}`); }
                    requestBody.CpuShares = options.CpuShares;
                }

                if (helpers.hasOwnProperty(options, 'CpuPeriod')) {
                    if (typeof options.CpuPeriod !== 'number') { throw new TypeError(`The "CpuPeriod" (when provided) option must be a number, instead got ${typeof options.CpuPeriod}`); }
                    requestBody.CpuPeriod = options.CpuPeriod;
                }

                if (helpers.hasOwnProperty(options, 'CpuQuota')) {
                    if (typeof options.CpuQuota !== 'number') { throw new TypeError(`The "CpuQuota" (when provided) option must be a number, instead got ${typeof options.CpuQuota}`); }
                    requestBody.CpuQuota = options.CpuQuota;
                }

                if (helpers.hasOwnProperty(options, 'CpuRealtimePeriod')) {
                    if (typeof options.CpuRealtimePeriod !== 'number') { throw new TypeError(`The "CpuRealtimePeriod" (when provided) option must be a number, instead got ${typeof options.CpuRealtimePeriod}`); }
                    requestBody.CpuRealtimePeriod = options.CpuRealtimePeriod;
                }

                if (helpers.hasOwnProperty(options, 'CpuRealtimeRuntime')) {
                    if (typeof options.CpuRealtimeRuntime !== 'number') { throw new TypeError(`The "CpuRealtimeRuntime" (when provided) option must be a number, instead got ${typeof options.CpuRealtimeRuntime}`); }
                    requestBody.CpuRealtimeRuntime = options.CpuRealtimeRuntime;
                }

                if (helpers.hasOwnProperty(options, 'NanoCpus')) {
                    if (typeof options.NanoCpus !== 'number') { throw new TypeError(`The "NanoCpus" (when provided) option must be a number, instead got ${typeof options.NanoCpus}`); }
                    requestBody.NanoCpus = options.NanoCpus;
                }

                if (helpers.hasOwnProperty(options, 'Memory')) {
                    if (typeof options.Memory !== 'number') { throw new TypeError(`The "Memory" (when provided) option must be a number, instead got ${typeof options.Memory}`); }
                    requestBody.Memory = options.Memory;
                }

                if (helpers.hasOwnProperty(options, 'MemoryReservation')) {
                    if (typeof options.MemoryReservation !== 'number') { throw new TypeError(`The "MemoryReservation" (when provided) option must be a number, instead got ${typeof options.MemoryReservation}`); }
                    requestBody.MemoryReservation = options.MemoryReservation;
                }

                if (helpers.hasOwnProperty(options, 'MemorySwap')) {
                    if (typeof options.MemorySwap !== 'number') { throw new TypeError(`The "MemorySwap" (when provided) option must be a number, instead got ${typeof options.MemorySwap}`); }
                    requestBody.MemorySwap = options.MemorySwap;
                }

                if (helpers.hasOwnProperty(options, 'KernelMemory')) {
                    if (typeof options.KernelMemory !== 'number') { throw new TypeError(`The "KernelMemory" (when provided) option must be a number, instead got ${typeof options.KernelMemory}`); }
                    requestBody.KernelMemory = options.KernelMemory;
                }

                if (helpers.hasOwnProperty(options, 'PidsLimit')) {
                    if (typeof options.PidsLimit !== 'number') { throw new TypeError(`The "PidsLimit" (when provided) option must be a number, instead got ${typeof options.PidsLimit}`); }
                    requestBody.PidsLimit = options.PidsLimit;
                }

                if (helpers.hasOwnProperty(options, 'BlkioWeight')) {
                    if (typeof options.BlkioWeight !== 'number') { throw new TypeError(`The "BlkioWeight" (when provided) option must be a number, instead got ${typeof options.BlkioWeight}`); }
                    requestBody.BlkioWeight = options.BlkioWeight;
                }

                if (helpers.hasOwnProperty(options, 'BlkioWeightDevice')) {
                    if (!Array.isArray(options.BlkioWeightDevice)) { throw new TypeError(`The "BlkioWeightDevice" (when provided) option must be an array, instead got ${typeof options.BlkioWeightDevice}`); }
                    for (const item of options.BlkioWeightDevice) {
                        if (!helpers.isObject(item)) { throw new TypeError(`The "BlkioWeightDevice" array must contain objects, instead one of them was ${typeof item}`); }

                        if (!('Path' in item)) { throw new SyntaxError(`The "BlkioWeightDevice" object must have a "Path" property.`); }
                        if (!('Weight' in item)) { throw new SyntaxError(`The "BlkioWeightDevice" object must have a "Weight" property.`); }

                        if (typeof item.Path !== 'string') { throw new TypeError(`The "Path" property of the "BlkioWeightDevice" object must be a string, instead got ${typeof item.Path}`); }
                        if (typeof item.Weight !== 'number') { throw new TypeError(`The "Weight" property of the "BlkioWeightDevice" object must be a number, instead got ${typeof item.Weight}`); }
                    }

                    requestBody.BlkioWeightDevice = options.BlkioWeightDevice;
                }

                if (helpers.hasOwnProperty(options, 'BlkioDeviceReadBps')) {
                    if (!Array.isArray(options.BlkioDeviceReadBps)) { throw new TypeError(`The "BlkioDeviceReadBps" (when provided) option must be an array, instead got ${typeof options.BlkioDeviceReadBps}`); }
                    for (const item of options.BlkioDeviceReadBps) {
                        if (!helpers.isObject(item)) { throw new TypeError(`The "BlkioDeviceReadBps" array must contain objects, instead one of them was ${typeof item}`); }

                        if (!('Path' in item)) { throw new SyntaxError(`The "BlkioDeviceReadBps" object must have a "Path" property.`); }
                        if (!('Rate' in item)) { throw new SyntaxError(`The "BlkioDeviceReadBps" object must have a "Rate" property.`); }

                        if (typeof item.Path !== 'string') { throw new TypeError(`The "Path" property of the "BlkioDeviceReadBps" object must be a string, instead got ${typeof item.Path}`); }
                        if (typeof item.Rate !== 'number') { throw new TypeError(`The "Rate" property of the "BlkioDeviceReadBps" object must be a number, instead got ${typeof item.Rate}`); }
                    }

                    requestBody.BlkioDeviceReadBps = options.BlkioDeviceReadBps;
                }

                if (helpers.hasOwnProperty(options, 'BlkioDeviceWriteBps')) {
                    if (!Array.isArray(options.BlkioDeviceWriteBps)) { throw new TypeError(`The "BlkioDeviceWriteBps" (when provided) option must be an array, instead got ${typeof options.BlkioDeviceWriteBps}`); }
                    for (const item of options.BlkioDeviceWriteBps) {
                        if (!helpers.isObject(item)) { throw new TypeError(`The "BlkioDeviceWriteBps" array must contain objects, instead one of them was ${typeof item}`); }

                        if (!('Path' in item)) { throw new SyntaxError(`The "BlkioDeviceWriteBps" object must have a "Path" property.`); }
                        if (!('Rate' in item)) { throw new SyntaxError(`The "BlkioDeviceWriteBps" object must have a "Rate" property.`); }

                        if (typeof item.Path !== 'string') { throw new TypeError(`The "Path" property of the "BlkioDeviceWriteBps" object must be a string, instead got ${typeof item.Path}`); }
                        if (typeof item.Rate !== 'number') { throw new TypeError(`The "Rate" property of the "BlkioDeviceWriteBps" object must be a number, instead got ${typeof item.Rate}`); }
                    }

                    requestBody.BlkioDeviceWriteBps = options.BlkioDeviceWriteBps;
                }

                if (helpers.hasOwnProperty(options, 'BlkioDeviceReadIOps')) {
                    if (!Array.isArray(options.BlkioDeviceReadIOps)) { throw new TypeError(`The "BlkioDeviceReadIOps" (when provided) option must be an array, instead got ${typeof options.BlkioDeviceReadIOps}`); }
                    for (const item of options.BlkioDeviceReadIOps) {
                        if (!helpers.isObject(item)) { throw new TypeError(`The "BlkioDeviceReadIOps" array must contain objects, instead one of them was ${typeof item}`); }

                        if (!('Path' in item)) { throw new SyntaxError(`The "BlkioDeviceReadIOps" object must have a "Path" property.`); }
                        if (!('Rate' in item)) { throw new SyntaxError(`The "BlkioDeviceReadIOps" object must have a "Rate" property.`); }

                        if (typeof item.Path !== 'string') { throw new TypeError(`The "Path" property of the "BlkioDeviceReadIOps" object must be a string, instead got ${typeof item.Path}`); }
                        if (typeof item.Rate !== 'number') { throw new TypeError(`The "Rate" property of the "BlkioDeviceReadIOps" object must be a number, instead got ${typeof item.Rate}`); }
                    }

                    requestBody.BlkioDeviceReadIOps = options.BlkioDeviceReadIOps;
                }

                if (helpers.hasOwnProperty(options, 'BlkioDeviceWriteIOps')) {
                    if (!Array.isArray(options.BlkioDeviceWriteIOps)) { throw new TypeError(`The "BlkioDeviceWriteIOps" (when provided) option must be an array, instead got ${typeof options.BlkioDeviceWriteIOps}`); }
                    for (const item of options.BlkioDeviceWriteIOps) {
                        if (!helpers.isObject(item)) { throw new TypeError(`The "BlkioDeviceWriteIOps" array must contain objects, instead one of them was ${typeof item}`); }

                        if (!('Path' in item)) { throw new SyntaxError(`The "BlkioDeviceWriteIOps" object must have a "Path" property.`); }
                        if (!('Rate' in item)) { throw new SyntaxError(`The "BlkioDeviceWriteIOps" object must have a "Rate" property.`); }

                        if (typeof item.Path !== 'string') { throw new TypeError(`The "Path" property of the "BlkioDeviceWriteIOps" object must be a string, instead got ${typeof item.Path}`); }
                        if (typeof item.Rate !== 'number') { throw new TypeError(`The "Rate" property of the "BlkioDeviceWriteIOps" object must be a number, instead got ${typeof item.Rate}`); }
                    }

                    requestBody.BlkioDeviceWriteIOps = options.BlkioDeviceWriteIOps;
                }

                if (helpers.hasOwnProperty(options, 'CpusetCpus')) {
                    if (typeof options.CpusetCpus !== 'string') { throw new TypeError(`The "CpusetCpus" (when provided) option must be a string, instead got ${typeof options.CpusetCpus}`); }
                    requestBody.CpusetCpus = options.CpusetCpus;
                }

                if (helpers.hasOwnProperty(options, 'CpusetMems')) {
                    if (typeof options.CpusetMems !== 'string') { throw new TypeError(`The "CpusetMems" (when provided) option must be a string, instead got ${typeof options.CpusetMems}`); }
                    requestBody.CpusetMems = options.CpusetMems;
                }

                if (helpers.hasOwnProperty(options, 'OomKillDisable')) {
                    if (typeof options.OomKillDisable !== 'boolean') { throw new TypeError(`The "OomKillDisable" (when provided) option must be a boolean, instead got ${typeof options.OomKillDisable}`); }
                    requestBody.OomKillDisable = options.OomKillDisable;
                }

                if (helpers.hasOwnProperty(options, 'OomScoreAdj')) {
                    if (typeof options.OomScoreAdj !== 'number') { throw new TypeError(`The "OomScoreAdj" (when provided) option must be a number, instead got ${typeof options.OomScoreAdj}`); }
                    requestBody.OomScoreAdj = options.OomScoreAdj;
                }

                if (helpers.hasOwnProperty(options, 'CpuRtPeriod')) {
                    if (typeof options.CpuRtPeriod !== 'number') { throw new TypeError(`The "CpuRtPeriod" (when provided) option must be a number, instead got ${typeof options.CpuRtPeriod}`); }
                    requestBody.CpuRtPeriod = options.CpuRtPeriod;
                }

                if (helpers.hasOwnProperty(options, 'CpuRtRuntime')) {
                    if (typeof options.CpuRtRuntime !== 'number') { throw new TypeError(`The "CpuRtRuntime" (when provided) option must be a number, instead got ${typeof options.CpuRtRuntime}`); }
                    requestBody.CpuRtRuntime = options.CpuRtRuntime;
                }

                if (helpers.hasOwnProperty(options, 'Swappiness')) {
                    if (typeof options.Swappiness !== 'number') { throw new TypeError(`The "Swappiness" (when provided) option must be a number, instead got ${typeof options.Swappiness}`); }
                    requestBody.Swappiness = options.Swappiness;
                }

                if (helpers.hasOwnProperty(options, 'AllowOomMemoryDump')) {
                    if (typeof options.AllowOomMemoryDump !== 'boolean') { throw new TypeError(`The "AllowOomMemoryDump" (when provided) option must be a boolean, instead got ${typeof options.AllowOomMemoryDump}`); }
                    requestBody.AllowOomMemoryDump = options.AllowOomMemoryDump;
                }

                if (helpers.hasOwnProperty(options, 'RestartPolicy')) {
                    const policy = options.RestartPolicy;
                    if (!policy || !helpers.isObject(policy)) { throw new TypeError(`The "RestartPolicy" (when provided) option must be an object, instead got ${typeof policy}`); }

                    if (helpers.hasOwnProperty(policy, 'Name')) {
                        if (typeof policy.Name !== 'string') { throw new TypeError(`The "Name" property of the "RestartPolicy" object must be a string, instead got ${typeof policy.Name}`); }
                        if (!['no', 'always', 'unless-stopped', 'on-failure'].includes(policy.Name)) { throw new Error(`The "Name" property of the "RestartPolicy" object must be one of "no", "always", "unless-stopped", or "on-failure".`); }
                    } else {
                        throw new SyntaxError(`The "RestartPolicy" object must have a "Name" property.`);
                    }

                    if (helpers.hasOwnProperty(policy, 'MaximumRetryCount')) {
                        if (typeof policy.MaximumRetryCount !== 'number') { throw new TypeError(`The "MaximumRetryCount" property of the "RestartPolicy" object must be a number, instead got ${typeof policy.MaximumRetryCount}`); }
                        if (policy.MaximumRetryCount < 0) { throw new RangeError(`The "MaximumRetryCount" property of the "RestartPolicy" object must be a positive number.`); }
                    }

                    requestBody.RestartPolicy = policy;
                }

                if (helpers.hasOwnProperty(options, 'HugePagesLimits')) {
                    if (!Array.isArray(options.HugePagesLimits)) { throw new TypeError(`The "HugePagesLimits" (when provided) option must be an array, instead got ${typeof options.HugePagesLimits}`); }
                    for (const limit of options.HugePagesLimits) {
                        if (!helpers.isObject(limit)) { throw new TypeError(`The "HugePagesLimits" option must be an array of objects but one of the objects is not an object, instead got ${typeof limit}`); }

                        if (helpers.hasOwnProperty(limit, 'PageSize')) {
                            if (typeof limit.PageSize !== 'string') { throw new TypeError(`The "PageSize" property of the "HugePagesLimits" object must be a string, instead got ${typeof limit.PageSize}`); }
                        } else {
                            throw new SyntaxError(`The "HugePagesLimits" object must have a "PageSize" property.`);
                        }

                        if (helpers.hasOwnProperty(limit, 'Limit')) {
                            if (typeof limit.Limit !== 'number') { throw new TypeError(`The "Limit" property of the "HugePagesLimits" object must be a number, instead got ${typeof limit.Limit}`); }
                        } else {
                            throw new SyntaxError(`The "HugePagesLimits" object must have a "Limit" property.`);
                        }
                    }

                    requestBody.HugePagesLimits = options.HugePagesLimits;
                }

                if (helpers.hasOwnProperty(options, 'SecurityOpt')) {
                    if (!Array.isArray(options.SecurityOpt)) { throw new TypeError(`The "SecurityOpt" (when provided) option must be an array, instead got ${typeof options.SecurityOpt}`); }
                    if (options.SecurityOpt.some(item => typeof item !== 'string' || item.length === 0)) { throw new TypeError(`The "SecurityOpt" array must contain strings only.`); }
                    requestBody.SecurityOpt = options.SecurityOpt;
                }

                if (helpers.hasOwnProperty(options, 'CapAdd')) {
                    if (!Array.isArray(options.CapAdd)) { throw new TypeError(`The "CapAdd" (when provided) option must be an array, instead got ${typeof options.CapAdd}`); }
                    if (options.CapAdd.some(item => typeof item !== 'string' || item.length === 0)) { throw new TypeError(`The "CapAdd" array must contain strings only.`); }
                    requestBody.CapAdd = options.CapAdd;
                }

                if (helpers.hasOwnProperty(options, 'CapDrop')) {
                    if (!Array.isArray(options.CapDrop)) { throw new TypeError(`The "CapDrop" (when provided) option must be an array, instead got ${typeof options.CapDrop}`); }
                    if (options.CapDrop.some(item => typeof item !== 'string' || item.length === 0)) { throw new TypeError(`The "CapDrop" array must contain strings only.`); }
                    requestBody.CapDrop = options.CapDrop;
                }

                if (helpers.hasOwnProperty(options, 'Devices')) {
                    if (!Array.isArray(options.Devices)) { throw new TypeError(`The "Devices" (when provided) option must be an array, instead got ${typeof options.Devices}`); }
                    for (const device of options.Devices) {
                        if (!helpers.isObject(device)) { throw new TypeError(`The "Devices" option must be an array of objects but one of the objects is not an object, instead got ${typeof device}`); }

                        if (helpers.hasOwnProperty(device, 'PathOnHost')) {
                            if (typeof device.PathOnHost !== 'string') { throw new TypeError(`The "PathOnHost" property of the "Devices" object must be a string, instead got ${typeof device.PathOnHost}`); }
                        } else {
                            throw new SyntaxError(`The "Devices" object must have a "PathOnHost" property.`);
                        }

                        if (helpers.hasOwnProperty(device, 'PathInContainer')) {
                            if (typeof device.PathInContainer !== 'string') { throw new TypeError(`The "PathInContainer" property of the "Devices" object must be a string, instead got ${typeof device.PathInContainer}`); }
                        } else {
                            throw new SyntaxError(`The "Devices" object must have a "PathInContainer" property.`);
                        }

                        if (helpers.hasOwnProperty(device, 'CgroupPermissions')) {
                            if (typeof device.CgroupPermissions !== 'string') { throw new TypeError(`The "CgroupPermissions" property of the "Devices" object must be a string, instead got ${typeof device.CgroupPermissions}`); }
                        } else {
                            throw new SyntaxError(`The "Devices" object must have a "CgroupPermissions" property.`);
                        }
                    }

                    requestBody.Devices = options.Devices;
                }

                if (helpers.hasOwnProperty(options, 'CpuCfsQuota')) {
                    if (typeof options.CpuCfsQuota !== 'number') { throw new TypeError(`The "CpuCfsQuota" (when provided) option must be a number, instead got ${typeof options.CpuCfsQuota}`); }
                    requestBody.CpuCfsQuota = options.CpuCfsQuota;
                }

                if (helpers.hasOwnProperty(options, 'Sysctls')) {
                    if (!options.Sysctls || !helpers.isObject(options.Sysctls)) { throw new TypeError(`The "Sysctls" (when provided) option must be an object, instead got ${typeof options.Sysctls}`); }
                    for (const [key, value] of Object.entries(options.Sysctls)) {
                        if (typeof key !== 'string') { throw new TypeError(`The "Sysctls" object must have string keys, instead got ${typeof key}`); }
                        if (typeof value !== 'string') { throw new TypeError(`The "Sysctls" object must have string values, instead got ${typeof value}`); }
                    }

                    requestBody.Sysctls = options.Sysctls;
                }
            }

            const request = {
                method: 'POST',
                body: JSON.stringify(requestBody),
                headers: { 'Content-Type': 'application/json' },
                returnJSON: false
            }

            const response = await this.#_socket.fetch(`containers/${id}/update`, request);
            const data = await response.json();

            if (response.ok) { return; }
            throw new Error(`${data.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to update the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Renames a container with the given ID to the given name.
     * 
     * @param {string} id - The ID of the container to rename.
     * @param {string} name - The new name of the container.
     * @returns {Promise<void>} A promise that resolves when the container is renamed successfully.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async rename(id: string, name: string): Promise<void> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            if (typeof name !== 'string') { throw new Error('The new name must be a string.'); }
            if (name.length === 0) { throw new Error('The new name cannot be empty.'); }

            const response = await this.#_socket.fetch(`containers/${id}/rename?${new URLSearchParams({ name }).toString()}`, { method: 'POST', returnJSON: false });
            if (response.ok && response.status === 204) { return; }
            const data = await response.json();
            throw new Error(`${data.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to rename the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Pauses a running container.
     * 
     * @param {string} id - The ID of the container to pause.
     * @returns {Promise<void>} A promise that resolves when the container is paused successfully.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async pause(id: string): Promise<void> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            const response = await this.#_socket.fetch(`containers/${id}/pause`, { method: 'POST', returnJSON: false });
            if (response.ok && response.status === 204) { return; }
            const data = await response.json();
            throw new Error(`${data.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to pause the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Unpauses a paused container.
     * 
     * @param {string} id - The ID of the container to unpause.
     * @returns {Promise<void>} A promise that resolves when the container is unpaused successfully.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async unpause(id: string): Promise<void> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            const response = await this.#_socket.fetch(`containers/${id}/unpause`, { method: 'POST', returnJSON: false });
            if (response.ok && response.status === 204) { return; }
            const data = await response.json();
            throw new Error(`${data.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to unpause the container with ID "${id}": ${error.message}`; }
            throw error;
        }
    }

    /**
     * Removes a container.
     * 
     * @param {string} id - The ID of the container to remove.
     * @param {ContainerRemoveOptions} [options] - Optional parameters for removing the container.
     *   @param {boolean} [options.force] - If true, forces removal of the container even if it is running.
     *   @param {boolean} [options.removeVolumes] - If true, removes associated volumes.
     *   @param {boolean} [options.link] - If true, removes the container for the given link.
     * @returns {Promise<void>} A promise that resolves when the container is removed successfully.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async remove(id: string, options: ContainerRemoveOptions = { force: false, removeVolumes: false, link: false }): Promise<void> {
        if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
        if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

        try {
            if (!helpers.isObject(options)) { throw new TypeError('The options argument (when provided) must be an object.'); }

            const params = new URLSearchParams();
            if (helpers.hasOwnProperty(options, 'force')) {
                if (typeof options.force !== 'boolean') { throw new TypeError('The "force" option must be a boolean.'); }
                params.set('force', options.force.toString());
            }

            if (helpers.hasOwnProperty(options, 'removeVolumes')) {
                if (typeof options.removeVolumes !== 'boolean') { throw new TypeError('The "removeVolumes" option must be a boolean.'); }
                params.set('v', options.removeVolumes.toString());
            }

            if (helpers.hasOwnProperty(options, 'link')) {
                if (typeof options.link !== 'boolean') { throw new TypeError('The "link" option must be a boolean.'); }
                params.set('link', options.link.toString());
            }

            const response = await this.#_socket.fetch(`containers/${id}${params.size > 0 ? `?${params.toString()}` : ''}`, { method: 'DELETE', returnJSON: false });
            if (response.ok && response.status === 204) { return; }
            const data = await response.json();
            throw new Error(`${data.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to remove the container: ${error.message}`; }
        }
    }

    /**
     * Removes unused Docker containers based on specified filters.
     *
     * @param {ContainersPruneFilters} [filters] - Filters to determine which containers are to be pruned.
     *   @param {Date | number | string} [filters.until] - Removes containers created before this date, timestamp, or string.
     *   @param {(string | ContainersPruneLabelFilter)[]} [filters.labels] - Removes containers with matching labels.
     * @returns {Promise<ContainersPruneResponse>} A promise resolving to details of the pruned containers.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async prune(filters?: ContainersPruneFilters): Promise<ContainersPruneResponse> {
        const _filters = {
            until: [] as string[], // Unix timestamp (seconds since epoch)
            label: [] as string[]
        };

        try {
            if (filters && helpers.isObject(filters)) {
                if (helpers.hasOwnProperty(filters, 'until')) {
                    if (['number', 'string'].includes(typeof filters.until) || filters.until instanceof Date) {
                        if (typeof filters.until === 'string') {
                            if (filters.until.length === 0) { throw new RangeError('The "until" filter cannot be an empty string.'); }
                            _filters.until.push(filters.until);
                        }

                        if (typeof filters.until === 'number') {
                            _filters.until.push(filters.until.toString());
                        }

                        if (filters.until instanceof Date) {
                            _filters.until.push((Math.floor(filters.until.getTime() / 1000)).toString());
                        }
                    } else {
                        throw new TypeError('The "until" filter must be a number, string, or Date.');
                    }
                }

                if (helpers.hasOwnProperty(filters, 'labels')) {
                    if (!Array.isArray(filters.labels)) { throw new TypeError('The "labels" filter must be an array.'); }
                    for (const label of filters.labels) {
                        if (typeof label === 'string') {
                            if (label.length === 0) { throw new RangeError('The "labels" filter cannot contain an empty string.'); }
                            _filters.label.push(label);
                            continue;
                        }

                        if (helpers.isObject(label)) {
                            if (!('key' in label)) { throw new SyntaxError('The "labels" filter must contain an object with a "key" property.'); }
                            if (typeof label.key !== 'string') { throw new TypeError('The "key" property of the "labels" filter must be a string.'); }
                            if (label.key.length === 0) { throw new RangeError('The "key" property of the "labels" filter cannot be an empty string.'); }

                            if (!('value' in label)) { throw new SyntaxError('The "labels" filter must contain an object with a "value" property.'); }
                            if (typeof label.value !== 'string') { throw new TypeError('The "value" property of the "labels" filter must be a string.'); }
                            if (label.value.length === 0) { throw new RangeError('The "value" property of the "labels" filter cannot be an empty string.'); }

                            let equal = true;
                            if (helpers.hasOwnProperty(label, 'equal')) {
                                if (typeof label.equal !== 'boolean') { throw new TypeError('The "equal" property of the "labels" filter (when provided) must be a boolean.'); }
                                equal = label.equal;
                            }

                            _filters.label.push(`${label.key}${equal ? '=' : '!='}${label.value}`);
                            continue;
                        }

                        throw new TypeError('The "labels" filter must be an array of strings or objects.');
                    }
                }
            }

            const finalFilters: Record<string, string[]> = {};
            if (_filters.until.length > 0) { finalFilters.until = _filters.until; }
            if (_filters.label.length > 0) { finalFilters.label = _filters.label; }
            if (_filters.label.length > 0) { finalFilters.label = _filters.label; }

            const request = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                returnJSON: false,
                body: JSON.stringify({
                    filters: JSON.stringify(finalFilters)
                })
            }

            const response = await this.#_socket.fetch('containers/prune', request);
            const data = await response.json();

            if (response.ok && response.status === 200) { return data; }
            throw new Error(`${data.message || 'Empty response'} - Status: ${response.status}`);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to prune containers: ${error.message}`; }
            throw error;
        }
    }

    /**Contains methods related to the container's archive. */
    readonly archive = {
        /**
         * Retrieves the properties of a file or directory from a Docker container.
         *
         * @param {string} id - The ID of the container from which to retrieve the file or directory properties.
         * @param {string} path - The path to the file or directory inside the container.
         * @returns {Promise<Record<string, any>>} A promise that resolves to an object containing the properties of the file or directory.
         * @throws {Error} Throws an error if the container ID or path is invalid, or if the request fails.
         */
        getStats: async (id: string, path: string): Promise<Record<string, any>> => {
            if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
            if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

            try {
                if (typeof path !== 'string') { throw new Error('The path must be a string.'); }
                if (path.length === 0) { throw new Error('The path cannot be empty.'); }

                const response = await this.#_socket.fetch(`containers/${id}/archive${path ? `?${new URLSearchParams({ path }).toString()}` : ''}`, { method: 'HEAD', returnJSON: false });
                if (response.ok && response.status === 200) {
                    const base64 = response.headers.get('X-Docker-Container-Path-Stat');
                    if (!base64) { throw new Error('The response did not contain the required header "X-Docker-Container-Path-Stat".'); }

                    const buffer = Buffer.from(base64, 'base64');
                    const stat = JSON.parse(buffer.toString('utf-8'));
                    return stat;
                }

                const error = await response.json();
                throw new Error(`${error.message || 'Empty response'} - Status: ${response.status}`);
            } catch (error) {
                if (error instanceof Error) { error.message = `Unable to archive the container with ID "${id}": ${error.message}`; }
                throw error;
            }
        },

        /**
         * Retrieves a tarball of a file or directory from a Docker container.
         *
         * @param {string} id - The ID of the container from which to retrieve the tarball.
         * @param {string} containerPath - The path inside the container to the file or directory to be tarred.
         * @param {ContainerArchiveTarOutputOptions} [output] - Options for the tarball output.
         *   @param {string} [output.type='stream'] - The type of output, either 'stream' or 'file'.
         *   @param {string} [output.path] - The path where the tarball will be saved if the type is 'file'.
         * @returns {Promise<Readable | string>} A promise that resolves to a Readable stream if the output type is 'stream', or the file path if the output type is 'file'.
         * @throws {Error} Throws an error if the container ID, path, or output options are invalid, or if the request fails.
         */
        getTarball: async (id: string, containerPath: string, output?: ContainerArchiveTarOutputOptions): Promise<Readable | string> => {
            if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
            if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

            try {
                if (typeof containerPath !== 'string') { throw new Error('The path must be a string.'); }
                if (containerPath.length === 0) { throw new Error('The path cannot be empty.'); }

                const configs = {
                    output: { type: 'stream' } as ContainerArchiveTarOutputOptions,
                }

                if (output && helpers.isObject(output)) {
                    if (helpers.hasOwnProperty(output, 'type')) {
                        if (typeof output.type !== 'string') { throw new Error('The output type must be a string.'); }
                        if (!['stream', 'file'].includes(output.type)) { throw new Error('The output type must be either "stream" or "file".'); }
                        configs.output.type = output.type;
                    } else {
                        throw new Error('The output object must have a "type" property.');
                    }

                    if (configs.output.type === 'file') {
                        if (helpers.hasOwnProperty(output, 'path')) {
                            if (typeof output.path !== 'string') { throw new Error('The output path must be a string.'); }
                            if (output.path.length === 0) { throw new Error('The output path cannot be empty.'); }
                            configs.output.path = output.path;
                        } else {
                            throw new Error('The output object must have a "path" property when the output type is "file".');
                        }
                    }
                }

                const response = await this.#_socket.fetch(`containers/${id}/archive${path ? `?${new URLSearchParams({ path: containerPath }).toString()}` : ''}`, { method: 'GET', returnJSON: false });
                if (response.ok) {
                    if (response.headers.get('Content-Type') !== 'application/x-tar') { throw new Error('The response did not contain the required header "Content-Type: application/x-tar".'); }
                    if (configs.output.type === 'stream') { return Readable.fromWeb(response.body); }

                    if (configs.output.type === 'file') {
                        const writeStream = fs.createWriteStream(configs.output.path as string);
                        for await (const chunk of response.body) {
                            writeStream.write(chunk);
                        }

                        writeStream.end();
                        return configs.output.path as string;
                    }
                }

                const error = await response.json();
                throw new Error(`${error.message || 'Empty response'} - Status: ${response.status}`);
            } catch (error) {
                if (error instanceof Error) { error.message = `Unable to archive the container with ID "${id}": ${error.message}`; }
                throw error;
            }
        },

        /**
         * Adds files to a Docker container from a tarball or directory.
         *
         * @param {string} id - The ID of the container to which to add the files.
         * @param {ContainerArchiveAddFilesOptions} configs - The options for adding the files.
         *   @param {string} configs.path - The path inside the container to which to add the files.
         *   @param {string} configs.context - The path to the tarball or directory containing the files to add.
         *   @param {boolean} [configs.noOverwrite=false] - Whether to overwrite existing files if the source and destination have the same name.
         *   @param {boolean} [configs.copyUIDGID=false] - Whether to copy the UID/GID of the source file to the destination file.
         * @returns {Promise<void>} A promise that resolves when the files have been added.
         * @throws {Error} Throws an error if the container ID, path, or context are invalid, or if the request fails.
         */
        addFiles: async (id: string, configs: ContainerArchiveAddFilesOptions): Promise<void> => {
            if (typeof id !== 'string') { throw new Error('The container ID must be a string.'); }
            if (id.length === 0) { throw new Error('The container ID cannot be empty.'); }

            const params = new URLSearchParams();
            const cache = {
                tar: { path: '', isTemp: false }
            }

            try {
                if (!configs || !helpers.isObject(configs)) { throw new TypeError('The options argument must be an object.'); }

                if (helpers.hasOwnProperty(configs, 'path')) {
                    if (typeof configs.path !== 'string') { throw new TypeError('The options path must be a string.'); }
                    if (configs.path.length === 0) { throw new TypeError('The options path cannot be empty.'); }
                    params.set('path', configs.path);
                } else {
                    throw new SyntaxError('The options object must have a "path" property to where the tarball will be extracted to.');
                }

                if (helpers.hasOwnProperty(configs, 'context')) {
                    const context = configs.context;
                    if (path.extname(context)) {
                        if (!fs.existsSync(context)) { throw new Error(`The provided tar file "${context}" does not exist.`); }
                        cache.tar.path = context;
                    } else {
                        if (!fs.existsSync(context)) { throw new Error(`The provided directory "${context}" does not exist.`); }
                        cache.tar.path = await tarball.build(context);
                        cache.tar.isTemp = true;
                    }
                } else {
                    throw new SyntaxError('The options object must have a "context" property of the directory or the tarball to send.');
                }

                if (helpers.hasOwnProperty(configs, 'noOverwrite')) {
                    if (typeof configs.noOverwrite !== 'boolean') { throw new TypeError('The options noOverwrite must be a boolean.'); }
                    params.set('noOverwriteDirNonDir', String(configs.noOverwrite));
                }

                if (helpers.hasOwnProperty(configs, 'copyUIDGID')) {
                    if (typeof configs.copyUIDGID !== 'boolean') { throw new TypeError('The options copyUIDGID must be a boolean.'); }
                    params.set('copyUIDGID', String(configs.copyUIDGID));
                }

                const request: Record<string, any> = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-tar' },
                    returnJSON: false,
                    body: await helpers.streamToBuffer(fs.createReadStream(cache.tar.path)),
                };

                const response = await this.#_socket.fetch(`containers/${id}/archive?${params.toString()}`, request);
                if (response.ok) { return; }

                const error = await response.json();
                throw new Error(`${error.message || 'Empty response'} - Status: ${response.status}`);
            } catch (error) {
                if (error instanceof Error) { error.message = `Unable to archive the container with ID "${id}": ${error.message}`; }
                throw error;
            } finally {
                if (cache.tar.isTemp) { fs.unlinkSync(cache.tar.path); }
            }
        }
    }
}

export default ContainersManager;