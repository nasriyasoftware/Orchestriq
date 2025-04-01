import fs from 'fs';
import path from 'path';
import tarball from "../../utils/Tarball";
import helpers from "../../utils/helpers";
import DockerSocket from "../socket/DockerSocket";
import registries from "../../registries/Registries";
import { RegistryOptions } from "../../registries/docs";
import { DockerImage, ImageHistoryEntry, ImageTagOptions, ImageRemoveOptions, BuildImageOptions, BuildImageEndpointParams } from "./docs";

class ImagesManager {
    #_socket: DockerSocket;

    constructor(socket: DockerSocket) {
        this.#_socket = socket;
    }

    /**
     * Retrieves a list of Docker images from the Docker daemon.
     * 
     * @returns A promise that resolves to an array of DockerImage objects.
     * @throws {Error} If unable to fetch the list of images.
     */
    async list(): Promise<DockerImage[]> {
        try {
            const images = await this.#_socket.fetch('images/json');
            return images;
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to list images: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Pulls a Docker image from a repository.
     * 
     * @param {string} fromImage - The name of the image to pull, in the format 'name[:tag]'.
     * @param {PullImageOptions} [options] - Optional parameters for pulling the image.
     * @param {string} [options.tag] - The tag of the image to pull.
     * @param {BasicAuth | BearerAuth} [options.authorization] - Optional authorization credentials for accessing private images.
     * @param {string} [options.registryURL] - Optional custom registry URL to pull the image from.
     * @param {boolean} [options.verbose] - If true, logs detailed progress of the image pull process.
     * @returns {Promise<void>} A promise that resolves when the image is successfully pulled.
     * @throws {TypeError} Throws an error if the `fromImage` is not a non-empty string, or if any option is invalid.
     * @throws {Error} Throws an error if unable to pull the image, or if required authorization is missing for private images.
     */
    async pull(fromImage: string, options?: RegistryOptions): Promise<void> {
        try {
            if (typeof fromImage !== 'string' || fromImage.length === 0) { throw new TypeError('fromImage must be a non-empty string.'); }
            let [image, tag] = fromImage.split(':');
            const isURL = helpers.isURL(image);
            const isPrivate = image.split('').filter(i => i === '/').length === 1;

            if (image.length === 0) { throw new Error('Image name is required.'); }
            if (tag && tag.length === 0) { throw new Error('Image tag was denoted with a colon, but no tag was provided.'); }

            const queryParams = new URLSearchParams();
            const reqOptions: Record<string, any> = {
                method: 'POST',
                headers: {},
                returnJSON: false
            }

            queryParams.set('fromImage', image);

            if (options) {
                if (helpers.hasOwnProperty(options, 'tag')) {
                    if (typeof options.tag !== 'string' || options.tag.length === 0) { throw new TypeError('Image tag (when provided) must be a non-empty string.'); }
                    queryParams.set('tag', options.tag);
                }

                if (helpers.hasOwnProperty(options, 'registry')) {
                    if (typeof options.registry !== 'string' || options.registry.length === 0) { throw new TypeError('Image Registry (when provided) must be a non-empty string.'); }
                    const registry = registries.get(options.registry);
                    if (!registry) { throw new Error(`Registry "${options.registry}" is not defined. Please define the registry before using it.`); }

                    queryParams.set('fromImage', `${registry.serveraddress}/${image}`);
                    if (registry.authentication) { reqOptions.headers['X-Registry-Auth'] = registry.xAuthHeader; }
                } else {
                    if (helpers.hasOwnProperty(options, 'registryURL')) {
                        if (isURL) { throw new Error('Image URL cannot be provided when using the "registryURL" option.'); }
                        if (typeof options.registryURL !== 'string' || options.registryURL.length === 0) { throw new TypeError('Image Registry URL (when provided) must be a non-empty string.'); }
                        if (!helpers.isURL(options.registryURL)) { throw new TypeError('Image Registry URL (when provided) must be a valid URL.'); }
                        queryParams.set('fromImage', `${options.registryURL}/${image}`);
                    }

                    if ('authentication' in options && options.authentication) {
                        const auth = options.authentication;
                        helpers.addRegistryAuthHeader(reqOptions, auth);
                    } else {
                        if (isPrivate) { throw new Error(`A private image has been used, but no authentication options have been provided. Use the "authentication" option to provide the credentials for the image.`); }
                    }
                }
            } else {
                if (isPrivate) { throw new Error(`A private image has been used, but no authentication options have been provided. Use the "authentication" option to provide the credentials for the image.`); }
            }

            const response = await this.#_socket.fetch(`/images/create?${queryParams.toString()}`, reqOptions);
            if (!response.ok) { throw new Error(`Unable to pull image: ${response.statusText}`); }

            // Process the stream
            await helpers.processStream(response, options?.verbose);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to pull image: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Retrieves detailed information about a Docker image from the Docker daemon.
     * 
     * @param {string} image - The name of the Docker image to inspect.
     * @returns {Promise<DockerImage>} A promise that resolves to a DockerImage object
     * containing detailed information about the image.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async inspect(image: string): Promise<DockerImage> {
        try {
            if (typeof image !== 'string' || image.length === 0) { throw new TypeError('Image name must be a non-empty string.'); }
            const imageInfo: DockerImage = await this.#_socket.fetch(`/images/${image}/json`);
            return imageInfo;
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to inspect image: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Retrieves the history of a Docker image from the Docker daemon.
     * 
     * @param {string} image - The name of the Docker image to retrieve the history for.
     * @returns {Promise<ImageHistoryEntry[]>} A promise that resolves to an array of ImageHistoryEntry objects
     * containing the history of the image.
     * @throws {Error} Throws an error if the request fails or the response is not OK.
     */
    async history(image: string): Promise<ImageHistoryEntry[]> {
        try {
            if (typeof image !== 'string' || image.length === 0) { throw new TypeError('Image name must be a non-empty string.'); }
            const history: ImageHistoryEntry[] = await this.#_socket.fetch(`/images/${image}/history`);
            return history;
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to inspect image: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Pushes an image to a repository.
     * 
     * **Notes:**
     * - If the image is private, you must provide the necessary authorization credentials.
     * - The pushed image will be publicly available unless the repository is private. You can make the repository private in the Docker Hub settings.
     * 
     * @param {string} imageName - The name of the Docker image to push, in the format `name[:tag]`.
     * @param {RegistryOptions} [options] - Optional parameters for pushing the image.
     * @param {string} [options.tag] - The tag of the image to push.
     * @param {BasicAuth | BearerAuth} [options.authorization] - Optional authorization credentials for accessing private images.
     * @param {string} [options.registryURL] - Optional custom registry URL to push the image to.
     * @param {boolean} [options.verbose] - If true, logs detailed progress of the image push process.
     * @returns {Promise<void>} A promise that resolves when the image is successfully pushed.
     * @throws {TypeError} Throws an error if the `imageName` is not a non-empty string, or if any option is invalid.
     * @throws {Error} Throws an error if unable to push the image, or if required authorization is missing for private images.
     */
    async push(imageName: string, options: RegistryOptions): Promise<void> {
        const cache = Object.seal({ tag: undefined as unknown as string, serveraddress: undefined as unknown as string });
        const reqOptions: Record<string, any> = {
            method: 'POST',
            headers: {},
            returnJSON: false
        };

        try {
            if (typeof imageName !== 'string' || imageName.length === 0) { throw new TypeError('Image name must be a non-empty string.'); }
            const [image, tag] = imageName.split(':');

            if (image.length === 0) { throw new Error('Image name is required.'); }
            if (tag) {
                if (tag.length === 0) { throw new Error('Image tag was denoted with a colon, but no tag was provided.'); }
                cache.tag = tag;
            }

            if (options) {
                if (helpers.hasOwnProperty(options, 'tag')) {
                    if (typeof options.tag !== 'string' || options.tag.length === 0) { throw new TypeError('Image tag (when provided) must be a non-empty string.'); }
                    if (cache.tag) { throw new SyntaxError('Image tag was already provided in the image name. Use either the image name or the "tag" option, not both.'); }
                    cache.tag = options.tag;
                }

                if (helpers.hasOwnProperty(options, 'registry')) {
                    if (typeof options.registry !== 'string' || options.registry.length === 0) { throw new TypeError('Image Registry (when provided) must be a non-empty string.'); }
                    const registry = registries.get(options.registry);
                    if (!registry) { throw new Error(`Registry "${options.registry}" is not defined. Please define the registry before using it.`); }
                    if (registry.authentication) { reqOptions.headers['X-Registry-Auth'] = registry.xAuthHeader; }
                } else {
                    if (helpers.hasOwnProperty(options, 'registryURL')) {
                        if (typeof options.registryURL !== 'string' || options.registryURL.length === 0) { throw new TypeError('Image Registry URL (when provided) must be a non-empty string.'); }
                        if (!helpers.isURL(options.registryURL)) { throw new TypeError('Image Registry URL (when provided) must be a valid URL.'); }
                        cache.serveraddress = options.registryURL;
                    }

                    if ('authentication' in options && options.authentication) {
                        const auth = options.authentication;
                        helpers.addRegistryAuthHeader(reqOptions, auth, cache.serveraddress);
                    }
                }
            }

            const endpoint = `/images/${encodeURIComponent(image)}/push${cache.tag ? `?tag=${cache.tag}` : ''}`.replace(/\/+$/, '');
            const response = await this.#_socket.fetch(endpoint, reqOptions);

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`Unable to push image: ${err?.message || response.statusText}`);
            }

            // Process the stream            
            await helpers.processStream(response, options?.verbose);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to push image: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Tags a Docker image with a new repository and tag.
     * 
     * @param {string} image - The name of the Docker image to tag.
     * @param {ImageTagOptions} options - Options for tagging the image.
     * @param {string} options.repository - The repository name to tag the image with.
     * @param {string} [options.tag] - The tag to assign to the image.
     * @param {boolean} [options.force] - If true, forces the tagging operation.
     * @throws {TypeError} Throws an error if the image name is not a non-empty string, or if options are invalid.
     * @throws {Error} Throws an error if the repository option is not provided.
     */
    async tag(image: string, options: ImageTagOptions) {
        try {
            if (typeof image !== 'string' || image.length === 0) { throw new TypeError('Image name must be a non-empty string.'); }
            if (!(typeof options === 'object' && Object.keys(options).length > 0)) { throw new TypeError('Tag options must be an object.'); }

            const queryParams = new URLSearchParams();
            const reqOptions: Record<string, any> = {
                method: 'POST',
                headers: {},
                returnJSON: false
            };

            if (helpers.hasOwnProperty(options, 'repository')) {
                if (typeof options.repository !== 'string' || options.repository.length === 0) { throw new TypeError('The "repository" option must be a non-empty string.'); }
                queryParams.set('repo', options.repository);
            } else {
                throw new Error('The "repository" option is required when using the "tag" option.');
            }

            if (helpers.hasOwnProperty(options, 'tag')) {
                if (typeof options.tag !== 'string' || options.tag.length === 0) { throw new TypeError('The "tag" option (when provided) must be a non-empty string.'); }
                queryParams.set('tag', options.tag);
            }

            if (helpers.hasOwnProperty(options, 'force')) {
                if (typeof options.force !== 'boolean') { throw new TypeError('The "force" option (when provided) must be a boolean.'); }
                queryParams.set('force', String(options.force));
            }

            const endpoint = `/images/${image}/tag?${queryParams.toString()}`.replace(/\/+$/, '');
            const response = await this.#_socket.fetch(endpoint, reqOptions);
            if (!response.ok) { throw new Error(`Unable to tag image: ${response.statusText}`); }
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to tag image: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Removes a Docker image from the Docker daemon.
     * 
     * @param {string} image - The name of the Docker image to remove.
     * @param {ImageRemoveOptions} [options] - Optional parameters for removing the image.
     * @param {boolean} [options.force] - If true, forces removal of the image even if it is in use by a container.
     * @param {boolean} [options.noprune] - If true, prevents the deletion of untagged parent images.
     * @returns {Promise<void>} A promise that resolves when the image is successfully removed.
     * @throws {TypeError} Throws an error if the image name is not a non-empty string, or if options are invalid.
     * @throws {Error} Throws an error if the image is in use by a container or if the removal fails.
     */
    async remove(image: string, options?: ImageRemoveOptions): Promise<void> {
        try {
            const queryParams: string[] = [];

            if (typeof image !== 'string' || image.length === 0) { throw new TypeError('Image name must be a non-empty string.'); }
            const [imageName, _imageTag] = image.split(':').filter(i => i.trim().length > 0);
            let imageTag = _imageTag;

            if (typeof options === 'object' && Object.keys(options).length > 0) {
                if (helpers.hasOwnProperty(options, 'force')) {
                    if (typeof options.force !== 'boolean') { throw new TypeError(`The "force" option (when provided) must be a boolean.`) }
                    if (options.force) { queryParams.push('force=true'); }
                }

                if (helpers.hasOwnProperty(options, 'noprune')) {
                    if (typeof options.noprune !== 'boolean') { throw new TypeError(`The "noprune" option (when provided) must be a boolean.`) }
                    if (options.noprune) { queryParams.push('noprune=true'); }
                }

                if (helpers.hasOwnProperty(options, 'tag')) {
                    if (imageTag) { throw new SyntaxError(`The "tag" option cannot be used with an image name that includes a tag.`) }
                    if (typeof options.tag !== 'string' || options.tag.length === 0) { throw new TypeError(`The "tag" option (when provided) must be a non-empty string.`) }
                    imageTag = options.tag;
                }
            }

            const name = `${imageName}${imageTag ? `:${imageTag}` : ''}`.replace(/\/+$/, '');
            const endpoint = `/images/${name}${queryParams.length > 0 ? `?${queryParams.join('&')}` : ''}`.replace(/\/+$/, '');
            const response = await this.#_socket.fetch(endpoint, { method: 'DELETE', returnJSON: false });
            if (!response.ok) {
                if (response.status === 404) { return; }
                if (response.status === 409) { throw new Error(`The ${name} image is in use by a container. Please remove the container before removing the image. or pass the "force" option.`); }
                throw new Error(`Unable to remove image: ${response.statusText}`);
            }
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to remove image: ${error.message}` }
            throw error;
        }
    }


    /**
     * Builds a Docker image using the provided build options.
     * 
     * @param {BuildImageOptions} options - Options for building the image.
     *   @param {string} options.name - The name of the image to build.
     *   @param {string} [options.tag='latest'] - The tag to assign to the built image.
     *   @param {string} [options.context] - The build context, can be a URL or local directory.
     *   @param {string} [options.dockerfileName='Dockerfile'] - The name of the Dockerfile.
     *   @param {string} [options.dockerfilePath] - The path to the Dockerfile if different from context.
     *   @param {boolean} [options.noCache] - If true, does not use cache when building the image.
     *   @param {boolean} [options.removeIntermediate] - If true, removes intermediate containers after a successful build.
     *   @param {boolean} [options.forceRemoveIntermediate] - If true, always removes intermediate containers.
     *   @param {boolean} [options.pullBaseImages] - If true, always attempts to pull a newer version of the base image.
     *   @param {string} [options.networkMode] - Sets the networking mode for the RUN instructions during build.
     *   @param {string} [options.platform] - Sets the platform if the server is multi-platform capable.
     *   @param {Record<string, string>} [options.labels] - Sets metadata for an image.
     *   @param {Record<string, string>} [options.buildArgs] - Sets build-time variables.
     *   @param {Array<{ key: string, value: string }>} [options.outputs] - Configures output locations.
     *   @param {boolean} [options.verbose=false] - If true, logs detailed progress of the build process.
     * 
     * @returns {Promise<void>} A promise that resolves when the image is successfully built.
     * 
     * @throws {TypeError} Throws an error if any required option is invalid or missing.
     * @throws {Error} Throws an error if unable to build the image.
     */
    async build(options: BuildImageOptions): Promise<void> {
        const data: BuildImageEndpointParams = {};
        const configs = {
            verbose: false,
            dockerfile: { name: 'Dockerfile', path: undefined as string | undefined },
            context: {
                tar: { path: null as unknown as string, isTemp: false },
                path: null as unknown as string
            }
        };

        const reqOptions: Record<string, any> = {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-tar' },
            returnJSON: false
        };

        try {
            if (!helpers.isValidObject(options)) { throw new TypeError('Build options must be an object.'); }
            if (helpers.hasOwnProperty(options, 'name')) {
                if (typeof options.name !== 'string' || options.name.length === 0) { throw new TypeError('The image name must be a non-empty string.'); }
                if (options.name.includes(':')) { throw new SyntaxError(`The image name cannot include the ':' character. You can specify the tag using the "tag" option.`); }
            } else {
                throw new SyntaxError(`The image 'name' option is required and is missing.`);
            }

            if (helpers.hasOwnProperty(options, 'tag')) {
                if (typeof options.tag !== 'string' || options.tag.length === 0) { throw new TypeError('The image tag must be a non-empty string.'); }
                if (options.tag.includes(':')) {
                    const [name, tag] = options.tag.split(':');
                    if (!(name && tag)) { throw new SyntaxError(`The image tag "${options.tag}" is invalid.`); }
                    data.t = `${name}:${tag}`;
                } else {
                    data.t = `${options.name}:${options.tag}`;
                }
            } else {
                options.tag = 'latest';
                data.t = `${options.name}:${options.tag}`;
            }

            if (helpers.hasOwnProperty(options, 'context')) {
                if (typeof options.context !== 'string' || options.context.length === 0) { throw new TypeError('The build context must be a non-empty string.'); }
                const isURL = helpers.isURL(options.context);

                if (isURL && (options.context.startsWith('http://') || options.context.startsWith('https://'))) {
                    data.remote = options.context;

                    if ('authorization' in options && options.authorization) {
                        const auth = options.authorization;
                        if (auth.type === 'Basic') {
                            reqOptions.headers['Authorization'] = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                        } else if (auth.type === 'Bearer') {
                            reqOptions.headers['Authorization'] = `Bearer ${auth.token}`;
                        }
                    }
                } else {
                    if (!fs.existsSync(options.context)) { throw new Error(`The build context (${options.context}) must exist.`); }
                    const stats = fs.statSync(options.context);
                    const isDirectory = stats.isDirectory();

                    if (isDirectory) {
                        configs.context.path = options.context;
                        configs.context.tar.isTemp = true;
                    } else {
                        if (path.extname(options.context) !== '.tar') { throw new Error(`The build context path (${options.context}) must be a directory or a .tar file.`); }
                        configs.context.tar.path = options.context;
                    }
                }
            } else {
                configs.context.path = process.cwd();
                configs.context.tar.isTemp = true;
            }

            if (helpers.hasOwnProperty(options, 'dockerfileName')) {
                if (typeof options.dockerfileName !== 'string' || options.dockerfileName.length === 0) { throw new TypeError('The Dockerfile name must be a non-empty string.'); }
                configs.dockerfile.name = data.dockerfile = options.dockerfileName;
            }

            if (helpers.hasOwnProperty(options, 'dockerfilePath')) {
                if (typeof options.dockerfilePath !== 'string') { throw new TypeError(`The "dockerfilePath" (when provided) must be a string but instead got ${typeof options.dockerfilePath}`) }
                configs.dockerfile.path = options.dockerfilePath;
            }

            // Validate and build the context path.
            if (configs.context.path) {
                const cache = {
                    dockerfilePath: configs.dockerfile.path || configs.context.path,
                    contextHasDockerFile: false,
                    backupFilePath: undefined as undefined | string,
                    copiedFilePath: undefined as undefined | string
                }

                if (configs.dockerfile.path && configs.dockerfile.path !== configs.context.path) {
                    if (!path.isAbsolute(configs.dockerfile.path)) {
                        cache.dockerfilePath = path.join(configs.context.path, configs.dockerfile.path);
                    }

                    if (!fs.existsSync(cache.dockerfilePath)) { throw new Error(`The path you provided for the dockerfile (${configs.dockerfile.path}) doesn't exist`) }
                    if (!fs.existsSync(path.join(cache.dockerfilePath, configs.dockerfile.name))) { throw new Error(`The path you provided for the dockerfile (${configs.dockerfile.path}) doesn't have a docker file called ${configs.dockerfile.name}`) }

                    cache.contextHasDockerFile = fs.existsSync(path.join(configs.context.path, configs.dockerfile.name));
                    if (cache.contextHasDockerFile) {
                        // Rename the existent file to prevent overwriting the original one
                        cache.backupFilePath = path.join(configs.context.path, `${configs.dockerfile.name}_${Date.now()}_backup`);
                        await fs.promises.copyFile(path.join(configs.context.path, configs.dockerfile.name), cache.backupFilePath as string);
                    }

                    // Copy the dockerfile to the context folder
                    cache.copiedFilePath = path.join(configs.context.path, configs.dockerfile.name);
                    await fs.promises.copyFile(path.join(cache.dockerfilePath, configs.dockerfile.name), cache.copiedFilePath as string);
                } else {
                    if (!fs.existsSync(path.join(configs.context.path, configs.dockerfile.name))) { throw new Error(`The build context (${configs.context.path}) must contain a Dockerfile named "${configs.dockerfile.name}" as per the "dockerfileName" option.`); }
                }

                configs.context.tar.path = await tarball.build(path.resolve(configs.context.path));
                configs.context.tar.isTemp = true;

                if (cache.copiedFilePath) {
                    // Delete the temp file
                    await fs.promises.unlink(cache.copiedFilePath);
                }

                if (cache.contextHasDockerFile) {
                    // Rename the original file to the original name
                    await fs.promises.copyFile(cache.backupFilePath as string, path.join(configs.context.path, configs.dockerfile.name));
                    // Delete the backup file
                    await fs.promises.unlink(cache.backupFilePath as string);
                }
            }

            if (helpers.hasOwnProperty(options, 'noCache')) {
                if (typeof options.noCache !== 'boolean') { throw new TypeError('The "noCache" option (when provided) must be a boolean.'); }
                if (options.noCache) { data.nocache = true; }
            }

            if (helpers.hasOwnProperty(options, 'removeIntermediate')) {
                if (typeof options.removeIntermediate !== 'boolean') { throw new TypeError('The "removeIntermediate" option (when provided) must be a boolean.'); }
                data.rm = options.removeIntermediate;
            }

            if (helpers.hasOwnProperty(options, 'forceRemoveIntermediate')) {
                if (typeof options.forceRemoveIntermediate !== 'boolean') { throw new TypeError('The "forceRemoveIntermediate" option (when provided) must be a boolean.'); }
                data.forcerm = options.forceRemoveIntermediate;
            }

            if ('pullBaseImages' in options && helpers.hasOwnProperty(options, 'pullBaseImages')) {
                if (typeof options.pullBaseImages !== 'boolean') { throw new TypeError('The "pullBaseImages" option (when provided) must be a boolean.'); }
                data.pull = options.pullBaseImages;
            }

            if (helpers.hasOwnProperty(options, 'networkMode')) {
                if (typeof options.networkMode !== 'string' || options.networkMode.length === 0) { throw new TypeError('The "networkMode" option (when provided) must be a non-empty string.'); }
                data.networkmode = options.networkMode;
            }

            if (helpers.hasOwnProperty(options, 'platform')) {
                if (typeof options.platform !== 'string' || options.platform.length === 0) { throw new TypeError('The "platform" option (when provided) must be a non-empty string.'); }
                data.platform = options.platform;
            }

            if (helpers.hasOwnProperty(options, 'labels')) {
                if (!helpers.isValidObject(options.labels)) { throw new TypeError('The "labels" option (when provided) must be an object.'); }
                data.labels = options.labels;
            }

            if (helpers.hasOwnProperty(options, 'buildArgs')) {
                if (!helpers.isValidObject(options.buildArgs)) { throw new TypeError('The "buildArgs" option (when provided) must be an object.'); }
                data.buildargs = options.buildArgs;
            }

            if (helpers.hasOwnProperty(options, 'outputs')) {
                if (!Array.isArray(options.outputs)) { throw new TypeError('The "outputs" option (when provided) must be an array.'); }
                for (const output of options.outputs) {
                    if (!helpers.isValidObject(output)) { throw new TypeError('The "outputs" option (when provided) must be an array of objects.'); }
                    if (!('key' in output && 'value' in output)) { throw new TypeError('The "outputs" option (when provided) must be an array of objects with "key" and "value" properties.'); }

                    if (typeof output.key !== 'string' || output.key.length === 0) { throw new TypeError('The "key" property of the "outputs" option (when provided) must be a non-empty string.'); }
                }

                data.outputs = options.outputs.map(i => `${i.key}=${i.value}`).join(',');
            }

            if (helpers.hasOwnProperty(options, 'verbose')) {
                if (typeof options.verbose !== 'boolean') { throw new TypeError('The "verbose" option (when provided) must be a boolean.'); }
                data.q = !options.verbose;
                configs.verbose = options.verbose;
            }

            // Preparing request
            const queryParams = new URLSearchParams(data as Record<string, string>);
            const endpoint = `/build?${queryParams.toString()}`;
            if (configs.context.tar.path) {
                const stream = fs.createReadStream(configs.context.tar.path);
                reqOptions.body = await helpers.streamToBuffer(stream);
            }

            const response = await this.#_socket.fetch(endpoint, reqOptions);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err?.message || `${response.statusText}`);
            }

            // Process the stream   
            await helpers.processStream(response, configs.verbose);
        } catch (error) {
            if (error instanceof Error) { error.message = `Unable to build image: ${error.message}`; }
            throw error;
        } finally {
            // Cleanup
            if (configs.context.tar.isTemp && await fs.existsSync(configs.context.tar.path)) {
                await fs.promises.unlink(configs.context.tar.path);
            }
        }
    }
}

export default ImagesManager;