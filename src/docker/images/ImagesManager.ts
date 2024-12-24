import path from "path";
import { DockerImage, BuildImageOptions, ImageHistoryEntry, ImageRemoveOptions, ImageTagOptions, RegisteryOptions, BuildImageEndpointParams } from "../../docs/docs";
import helpers from "../../utils/helpers";
import tarball from "../../utils/Tarball";
import DockerSocket from "../socket/DockerSocket";
import fs, { read } from 'fs';

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
     * @param {BasicAuthorization | BearerAuthorization} [options.authorization] - Optional authorization credentials for accessing private images.
     * @param {string} [options.registeryURL] - Optional custom registry URL to pull the image from.
     * @param {boolean} [options.verbose] - If true, logs detailed progress of the image pull process.
     * @returns {Promise<void>} A promise that resolves when the image is successfully pulled.
     * @throws {TypeError} Throws an error if the `fromImage` is not a non-empty string, or if any option is invalid.
     * @throws {Error} Throws an error if unable to pull the image, or if required authorization is missing for private images.
     */
    async pull(fromImage: string, options?: RegisteryOptions): Promise<void> {
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
                if ('tag' in options) {
                    if (typeof options.tag !== 'string' || options.tag.length === 0) { throw new TypeError('Image tag (when provided) must be a non-empty string.'); }
                    queryParams.set('tag', options.tag);
                }

                if ('registeryURL' in options) {
                    if (isURL) { throw new Error('Image URL cannot be provided when using the "registeryURL" option.'); }
                    if (typeof options.registeryURL !== 'string' || options.registeryURL.length === 0) { throw new TypeError('Image registery URL (when provided) must be a non-empty string.'); }
                    if (!helpers.isURL(options.registeryURL)) { throw new TypeError('Image registery URL (when provided) must be a valid URL.'); }
                    queryParams.set('fromImage', `${options.registeryURL}/${image}`);
                }

                if ('authorization' in options) {
                    const auth = options.authorization;
                    helpers.buildAuthHeader(reqOptions, auth);
                } else {
                    if (isPrivate) { throw new Error(`A private image has been used, but no authorization options have been provided. Use the "authorization" option to provide the credentials for the image.`); }
                }
            } else {
                if (isPrivate) { throw new Error(`A private image has been used, but no authorization options have been provided. Use the "authorization" option to provide the credentials for the image.`); }
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
     * Pushes a Docker image to a repository.
     * 
     * @param {string} imageName - The name of the Docker image to push, in the format 'name[:tag]'.
     * @param {RegisteryOptions} [options] - Optional parameters for pushing the image.
     * @param {string} [options.tag] - The tag of the image to push.
     * @param {BasicAuthorization | BearerAuthorization} [options.authorization] - Optional authorization credentials for accessing private images.
     * @param {string} [options.registeryURL] - Optional custom registry URL to push the image to.
     * @param {boolean} [options.verbose] - If true, logs detailed progress of the image push process.
     * @returns {Promise<void>} A promise that resolves when the image is successfully pushed.
     * @throws {TypeError} Throws an error if the `imageName` is not a non-empty string, or if any option is invalid.
     * @throws {Error} Throws an error if unable to push the image, or if required authorization is missing for private images.
     */
    async push(imageName: string, options?: RegisteryOptions): Promise<void> {
        try {
            if (typeof imageName !== 'string' || imageName.length === 0) { throw new TypeError('Image name must be a non-empty string.'); }
            let [image, tag] = imageName.split(':');
            const isURL = helpers.isURL(image);
            const isPrivate = image.split('').filter(i => i === '/').length === 1;

            if (image.length === 0) { throw new Error('Image name is required.'); }
            if (tag && tag.length === 0) { throw new Error('Image tag was denoted with a colon, but no tag was provided.'); }

            const queryParams = new URLSearchParams();
            const reqOptions: Record<string, any> = {
                method: 'POST',
                headers: {},
                returnJSON: false
            };

            if (options) {
                if ('tag' in options) {
                    if (typeof options.tag !== 'string' || options.tag.length === 0) { throw new TypeError('Image tag (when provided) must be a non-empty string.'); }
                    queryParams.set('tag', options.tag);
                }

                if ('registeryURL' in options) {
                    if (isURL) { throw new Error('Image URL cannot be provided when using the "registeryURL" option.'); }
                    if (typeof options.registeryURL !== 'string' || options.registeryURL.length === 0) { throw new TypeError('Image registery URL (when provided) must be a non-empty string.'); }
                    if (!helpers.isURL(options.registeryURL)) { throw new TypeError('Image registery URL (when provided) must be a valid URL.'); }
                    image = `${new URL(options.registeryURL).origin}/${image}`.split('://')[1];
                }

                if ('authorization' in options) {
                    const auth = options.authorization;
                    helpers.buildAuthHeader(reqOptions, auth);
                } else {
                    if (isPrivate) { throw new Error(`A private image has been used, but no authorization options have been provided. Use the "authorization" option to provide the credentials for the image.`); }
                }
            } else {
                if (isPrivate) { throw new Error(`A private image has been used, but no authorization options have been provided. Use the "authorization" option to provide the credentials for the image.`); }
            }

            const endpoint = `/images/${image}/push${queryParams.has('tag') ? '?' : ''}${queryParams.toString()}`.replace(/\/+$/, '');
            const response = await this.#_socket.fetch(endpoint, reqOptions);
            if (!response.ok) { throw new Error(`Unable to push image: ${response.statusText}`); }

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

            if ('repository' in options) {
                if (typeof options.repository !== 'string' || options.repository.length === 0) { throw new TypeError('The "repository" option must be a non-empty string.'); }
                queryParams.set('repo', options.repository);
            } else {
                throw new Error('The "repository" option is required when using the "tag" option.');
            }

            if ('tag' in options) {
                if (typeof options.tag !== 'string' || options.tag.length === 0) { throw new TypeError('The "tag" option (when provided) must be a non-empty string.'); }
                queryParams.set('tag', options.tag);
            }

            if ('force' in options) {
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
                if ('force' in options) {
                    if (typeof options.force !== 'boolean') { throw new TypeError(`The "force" option (when provided) must be a boolean.`) }
                    if (options.force) { queryParams.push('force=true'); }
                }

                if ('noprune' in options) {
                    if (typeof options.noprune !== 'boolean') { throw new TypeError(`The "noprune" option (when provided) must be a boolean.`) }
                    if (options.noprune) { queryParams.push('noprune=true'); }
                }

                if ('tag' in options) {
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
     * Builds a Docker image from a Dockerfile and a build context.
     * @param options - Options for building the Docker image.
     * @param options.name - The name of the image to build.
     * @param options.tag - The tag of the image to build. If not provided, the image will be built with the "latest" tag.
     * @param options.context - The build context to use. Can be a directory path, a .tar file path, or a URL.
     * @param options.dockerfileName - The name of the Dockerfile to use. Default is "Dockerfile".
     * @param options.noCache - If true, the build process will not use the cache. Default is false.
     * @param options.removeIntermediate - If true, the build process will remove intermediate containers. Default is false.
     * @param options.forceRemoveIntermediate - If true, the build process will force remove intermediate containers. Default is false.
     * @param options.pullBaseImages - If true, the build process will pull the base images. Default is false.
     * @param options.networkMode - The network mode to use for the build process. Default is "default".
     * @param options.platform - The platform to use for the build process. Default is the platform of the host.
     * @param options.labels - Labels to apply to the built image.
     * @param options.buildArgs - Build-time variables to pass to the build process.
     * @param options.outputs - Outputs to capture from the build process.
     * @param options.verbose - If true, the build process will log detailed progress. Default is false.
     * @returns {Promise<void>} A promise that resolves when the image is successfully built.
     * @throws {TypeError} Throws an error if any of the options are invalid.
     * @throws {Error} Throws an error if unable to build the image.
     */
    async build(options: BuildImageOptions): Promise<void> {
        const data: BuildImageEndpointParams = {};
        const configs = {
            verbose: false,
            dockerfile: 'Dockerfile',
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
            if ('name' in options) {
                if (typeof options.name !== 'string' || options.name.length === 0) { throw new TypeError('The image name must be a non-empty string.'); }
                if (options.name.includes(':')) { throw new SyntaxError(`The image name cannot include the ':' character. You can specify the tag using the "tag" option.`); }
            } else {
                throw new SyntaxError(`The image 'name' option is required and is missing.`);
            }

            if ('tag' in options) {
                if (typeof options.tag !== 'string' || options.tag.length === 0) { throw new TypeError('The image tag must be a non-empty string.'); }
            } else {
                options.tag = 'latest';
            }

            data.t = `${options.name}:${options.tag}`;

            if ('context' in options) {
                if (typeof options.context !== 'string' || options.context.length === 0) { throw new TypeError('The build context must be a non-empty string.'); }

                if (helpers.isURL(options.context)) {
                    data.remote = options.context;

                    if ('authorization' in options) {
                        const auth = options.authorization;
                        helpers.buildAuthHeader(reqOptions, auth);
                    }
                } else {
                    if (!fs.existsSync(options.context)) { throw new Error(`The build context (${options.context}) must exist.`); }
                    const stats = fs.statSync(options.context);
                    const isDirectory = stats.isDirectory();

                    if (isDirectory) {
                        configs.context.path = options.context;
                    } else {
                        if (path.extname(options.context) !== '.tar') { throw new Error(`The build context path (${options.context}) must be a directory or a .tar file.`); }
                        configs.context.tar.path = options.context;
                    }
                }
            } else {
                configs.context.path = process.cwd();
            }

            if ('dockerfileName' in options) {
                if (typeof options.dockerfileName !== 'string' || options.dockerfileName.length === 0) { throw new TypeError('The Dockerfile name must be a non-empty string.'); }
                configs.dockerfile = data.dockerfile = options.dockerfileName;
            }

            // Validate and build the context path.
            if (configs.context.path) {
                const content = fs.readdirSync(configs.context.path, { withFileTypes: true });
                if (content.length === 0) { throw new Error(`The build context (${configs.context.path}) must not be empty.`); }

                const Dockerfile = content.filter(f => f.isFile()).find(f => f.name === configs.dockerfile)
                if (!Dockerfile) { throw new Error(`The build context (${configs.context.path}) must contain a Dockerfile named "${configs.dockerfile}" as per the "dockerfileName" option.`); }

                configs.context.tar.path = await tarball.build(path.resolve(configs.context.path));
                configs.context.tar.isTemp = true;
            }

            if ('noCache' in options) {
                if (typeof options.noCache !== 'boolean') { throw new TypeError('The "noCache" option (when provided) must be a boolean.'); }
                if (options.noCache) { data.nocache = true; }
            }

            if ('removeIntermediate' in options) {
                if (typeof options.removeIntermediate !== 'boolean') { throw new TypeError('The "removeIntermediate" option (when provided) must be a boolean.'); }
                data.rm = options.removeIntermediate;
            }

            if ('forceRemoveIntermediate' in options) {
                if (typeof options.forceRemoveIntermediate !== 'boolean') { throw new TypeError('The "forceRemoveIntermediate" option (when provided) must be a boolean.'); }
                data.forcerm = options.forceRemoveIntermediate;
            }

            if ('pullBaseImages' in options) {
                if (typeof options.pullBaseImages !== 'boolean') { throw new TypeError('The "pullBaseImages" option (when provided) must be a boolean.'); }
                data.pull = options.pullBaseImages;
            }

            if ('networkMode' in options) {
                if (typeof options.networkMode !== 'string' || options.networkMode.length === 0) { throw new TypeError('The "networkMode" option (when provided) must be a non-empty string.'); }
                data.networkmode = options.networkMode;
            }

            if ('platform' in options) {
                if (typeof options.platform !== 'string' || options.platform.length === 0) { throw new TypeError('The "platform" option (when provided) must be a non-empty string.'); }
                data.platform = options.platform;
            }

            if ('labels' in options) {
                if (!helpers.isValidObject(options.labels)) { throw new TypeError('The "labels" option (when provided) must be an object.'); }
                data.labels = options.labels;
            }

            if ('buildArgs' in options) {
                if (!helpers.isValidObject(options.buildArgs)) { throw new TypeError('The "buildArgs" option (when provided) must be an object.'); }
                data.buildargs = options.buildArgs;
            }

            if ('outputs' in options) {
                if (!Array.isArray(options.outputs)) { throw new TypeError('The "outputs" option (when provided) must be an array.'); }
                for (const output of options.outputs) {
                    if (!helpers.isValidObject(output)) { throw new TypeError('The "outputs" option (when provided) must be an array of objects.'); }
                    if (!('key' in output && 'value' in output)) { throw new TypeError('The "outputs" option (when provided) must be an array of objects with "key" and "value" properties.'); }

                    if (typeof output.key !== 'string' || output.key.length === 0) { throw new TypeError('The "key" property of the "outputs" option (when provided) must be a non-empty string.'); }
                }

                data.outputs = options.outputs.map(i => `${i.key}=${i.value}`).join(',');
            }

            if ('verbose' in options) {
                if (typeof options.verbose !== 'boolean') { throw new TypeError('The "verbose" option (when provided) must be a boolean.'); }
                data.q = !options.verbose;
                configs.verbose = options.verbose;
            }

            // Preparing request
            const queryParams = new URLSearchParams(data as Record<string, string>);
            const endpoint = `/build?${queryParams.toString()}`;
            if (configs.context.tar.path) { reqOptions.body = fs.createReadStream(configs.context.tar.path) }

            const response = await this.#_socket.fetch(endpoint, reqOptions);
            console.log(response.headers)
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
            if (configs.context.tar.isTemp) { await fs.promises.unlink(configs.context.tar.path); }
        }
    }
}

export default ImagesManager;