import Environment from "./assets/Environment";
import StackConfigs from "./assets/configs/StackConfigs";
import ServicesNetworksManager from "./assets/networks/ServicesNetworksManager";
import SecretsManager from "./assets/secrets/SecretsManager";
import ServicesManager from "./assets/services/ServicesManager";
import ServicesVolumesManager from "./assets/volumes/ServicesVolumesManager";
import ComposeBuilder from "./assets/compose/ComposeBuilder";

import fs from "fs";
import path from "path";
import { spawn } from 'child_process';
import { DockerComposeUpOptions } from "../../../docs/docs";

class ContainerTemplate {
    #_name = '';
    #_volumes: ServicesVolumesManager;
    #_networks: ServicesNetworksManager;
    #_services: ServicesManager;
    #_secrets: SecretsManager;
    #_env = new Environment();
    #_env_files: string[] = [];
    #_configs = new StackConfigs();

    #_compose = {
        generated: false, path: '',
        up: async (options: DockerComposeUpOptions) => {
            // Used to label the container to get its ID later
            const invocationId = Date.now();

            // Build the docker-compose command arguments
            const args: string[] = ['up'];

            if (!options.labels) { options.labels = {} }
            options.labels.invocationId = String(invocationId);

            for (const [key, value] of Object.entries(options.labels)) {
                args.push(`--label`, `${key}=${value}`);
            }

            if (options.detach) { args.push('-d') }
            if (options.build) { args.push('--build') }
            if (options.forceRecreate) { args.push('--force-recreate') }
            if (options.noRecreate) { args.push('--no-recreate') }
            if (options.noBuild) { args.push('--no-build') }
            if (options.removeOrphans) { args.push('--remove-orphans') }
            if (options.abortOnContainerExit) { args.push('--abort-on-container-exit') }
            if (options.compatibility) { args.push('--compatibility') }
            if (options.renewAnonVolumes) { args.push('--renew-anon-volumes') }
            if (options.verbose) { args.push('--verbose') }
            if (options.wait) { args.push('--wait') }

            // Handle the scale option
            if (options.scale) {
                for (const [serviceName, value] of Object.entries(options.scale)) {
                    args.push('--scale', `${serviceName}=${value}`);
                }
            }

            // Handle environment variables
            if (options.env) {
                for (const [envKey, envValue] of Object.entries(options.env)) {
                    args.push('--env', `${envKey}=${envValue}`);
                }
            }

            // Handle the files option (compose files)
            if (options.files) {
                for (const file of options.files) {
                    args.push('-f', file);
                }
            }

            // Handle the services option
            if (options.services) {
                for (const service of options.services) {
                    args.push(service);
                }
            }

            // Optionally, you can return a promise to wait for the process to finish:
            return new Promise<string>((resolve, reject) => {
                // Run the command using `spawn`
                const dockerComposeProcess = spawn('docker-compose', args, {
                    stdio: 'inherit',  // This allows the output to go directly to the terminal
                    env: options.env,  // Ensure the environment variables are set properly
                });

                // Handle errors or exit codes
                dockerComposeProcess.on('error', (err) => {
                    reject(new Error(`Error executing docker-compose: ${err.message}`));
                });

                dockerComposeProcess.on('exit', (code) => {
                    if (code !== 0) {
                        reject(new Error(`docker-compose process exited with code ${code}`));
                    } else {
                        // Once the docker-compose up is successful, get the container ID(s)
                        const psArgs = ['ps', '-q', '--filter', `label=invocationId=${invocationId}`];
                        const dockerPsProcess = spawn('docker-compose', psArgs, {
                            stdio: 'pipe',  // Capture the output to get the container ID(s)
                            env: options.env,  // Ensure the environment variables are set properly
                        });

                        let containerId = '';
                        dockerPsProcess.stdout.on('data', (data) => {
                            containerId += data.toString().trim();  // Collect container IDs
                        });

                        dockerPsProcess.on('close', (code) => {
                            if (code === 0) {
                                resolve(containerId);  // Return the container ID(s)
                            } else {
                                reject(new Error('Failed to fetch container ID(s)'));
                            }
                        });

                        dockerPsProcess.on('error', (err) => {
                            reject(new Error(`Error fetching container ID: ${err.message}`));
                        });
                    }
                });

                dockerComposeProcess.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Docker Compose process exited with code ${code}`));
                    }
                });
            });
        },
    };

    constructor() {
        this.#_networks = new ServicesNetworksManager(this);
        this.#_services = new ServicesManager(this);
        this.#_volumes = new ServicesVolumesManager(this);
        this.#_secrets = new SecretsManager(this);
    }

    /**
     * Generates a docker-compose YAML content for the container.
     * @returns {string} The generated docker-compose YAML content.
     */
    generateComposeContent(): string {
        return new ComposeBuilder(this).generate().trim();
    }

    /**
     * Generates a docker-compose YAML file for the container.
     * @param {string} [outputPath] The path to write the YAML file to. If not specified, the file will be written to a directory with the same name as the container and a timestamp, within the current working directory.
     * @returns {Promise<string>} A promise that resolves to the path of the generated file.
     * @throws {TypeError} If the provided output path is not a string.
     * @throws {Error} If the provided output path is not a YAML file.
     * @throws {Error} If the provided output path does not have a name of 'docker-compose'.
     */
    async generateComposeYaml(outputPath?: string): Promise<string> {
        if (outputPath !== undefined) {
            if (typeof outputPath !== 'string') { throw new TypeError(`The ${this.#_name ? `'${this.#_name}' ` : ''}container's output path (when defined) must be a string.`) }
        }

        const filePath = outputPath || path.join(process.cwd(), this.#_name ? this.#_name : String(Date.now()), 'docker', 'docker-compose.yml');
        const extname = path.extname(filePath).toLowerCase();
        if (!(extname === '.yml' || extname === '.yaml')) { throw new Error(`The ${this.#_name ? `'${this.#_name}' ` : ''}container's output path (when defined) must be a YAML file.`) }

        const basename = path.basename(filePath).toLowerCase();
        if (!basename.startsWith('docker-compose')) { throw new Error(`The ${this.#_name ? `'${this.#_name}' ` : ''}container's output path (when defined) must be named 'docker-compose'.`) }

        const content = this.generateComposeContent();

        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, content, 'utf8');
        return filePath;
    }

    /**
     * Starts the container.
     * 
     * **Note:**
     * This method only works on local containers, to deploy to remote containers, use the `deploy` method
     * on from the package's `containers` module.
     * @param options An object containing the options for the "docker-compose up" command.
     * @returns A promise that resolves with the container ID(s) when the container is started successfully.
     * @throws {Error} If the container is already running.
     * @throws {TypeError} If the options (when provided) are invalid.
     * @throws {Error} If the command fails to execute.
     */
    async up(options?: DockerComposeUpOptions): Promise<string> {
        // Default options can be merged with user-provided ones if needed
        const flags: DockerComposeUpOptions = {
            detach: false,
            build: false,
            forceRecreate: false,
            noRecreate: false,
            noBuild: false,
            removeOrphans: false,
            abortOnContainerExit: false,
            wait: false,
            compatibility: false,
            renewAnonVolumes: false,
            verbose: false,
        };

        const finalOptions: DockerComposeUpOptions = {
            ...flags,
            files: [this.#_compose.generated ? this.#_compose.path : await this.generateComposeYaml()],
            env: {}
        };

        if (options !== undefined) {
            // Validate that the options are a plain object
            if (typeof options !== 'object' || options === null || Array.isArray(options)) {
                throw new TypeError("The 'options' parameter (when provided) must be a plain object.");
            }

            // Validate the flags from the options
            const flags = Object.keys(options);
            for (const _flag of flags) {
                if (_flag in options) {
                    const flag = _flag as keyof DockerComposeUpOptions;
                    if (typeof options[flag] !== 'boolean') { throw new TypeError(`The '${flag}' option must be a boolean.`); }
                    // @ts-ignore
                    finalOptions[flag] = options[flag] === true ? true : undefined;
                }
            }

            if ('scale' in options) {
                if (typeof options.scale !== 'object' || options.scale === null || Array.isArray(options.scale)) {
                    throw new TypeError("The 'scale' option (when provided) must be an object.");
                }

                for (const [serviceName, value] of Object.entries(options.scale)) {
                    if (!(serviceName in this.#_services.list)) { throw new Error(`Cannot setup the scale for the '${serviceName}' service. The '${serviceName}' service is not defined.`); }
                    if (typeof value !== 'number') { throw new TypeError(`The '${serviceName}' service scale must be a number.`); }
                    if (value <= 0) { throw new Error(`The '${serviceName}' service scale must be greater than 0.`); }
                }

                finalOptions.scale = options.scale;
            }

            if ('env' in options) {
                if (typeof options.env !== 'object' || options.env === null || Array.isArray(options.env)) {
                    throw new TypeError("The 'env' option (when provided) must be an object.");
                }

                for (const [envKey, envValue] of Object.entries(options.env)) {
                    if (typeof envValue !== 'string') { throw new TypeError(`The '${envKey}' environment variable value must be a string.`); }
                    if (envValue.length === 0) { throw new Error(`The '${envKey}' environment variable value must not be empty.`); }
                }

                finalOptions.env = options.env;
            }

            if ('timeout' in options) {
                if (typeof options.timeout !== 'number') { throw new TypeError("The 'timeout' option (when provided) must be a number."); }
                if (options.timeout <= 0) { throw new Error("The 'timeout' option (when provided) must be greater than 0."); }
                finalOptions.timeout = options.timeout;
            }

            if ('services' in options) {
                if (!Array.isArray(options.services)) { throw new TypeError("The 'services' option (when provided) must be an array."); }
                for (const serviceName of options.services) {
                    if (typeof serviceName !== 'string') { throw new TypeError("The 'services' option (when provided) must be an array of strings."); }
                    if (!(serviceName in this.#_services.list)) { throw new Error(`Cannot start the '${serviceName}' service. The '${serviceName}' service is not defined.`); }
                }

                finalOptions.services = options.services;
            }

            if ('files' in options) {
                if (!Array.isArray(options.files)) { throw new TypeError("The 'files' option (when provided) must be an array."); }
                for (const filePath of Array.from(new Set(options.files))) {
                    if (typeof filePath !== 'string') { throw new TypeError("The 'files' option (when provided) must be an array of strings."); }
                    if (!fs.existsSync(filePath)) { throw new Error(`The '${filePath}' file does not exist.`); }
                }

                finalOptions.files?.push(...options.files);
            }

            if ('labels' in options) {
                if (typeof options.labels !== 'object' || options.labels === null || Array.isArray(options.labels)) {
                    throw new TypeError("The 'labels' option (when provided) must be an object.");
                }

                for (const [labelKey, labelValue] of Object.entries(options.labels)) {
                    if (labelKey === 'invocationId') { throw new Error(`The label "invocationId" is reserved and cannot be used. You attempted to use it with value: ${labelValue}`) }
                    options.labels[labelKey] = String(labelValue);
                }

                finalOptions.labels = options.labels;
            }
        }

        // Assign the container name (if specified)
        if (this.name && finalOptions.env) { finalOptions.env['COMPOSE_PROJECT_NAME'] = this.name; }

        // Run the command
        return this.#_compose.up(finalOptions);
    }

    /**
     * Sets the path to a file containing environment variables in the format
     * KEY=VALUE, one per line.
     * The file is read and the environment variables are added to the service.
     * If the file does not exist, an error is thrown.
     * @param value A string representing the path to the env file.
     * @throws {TypeError} If the provided value is not a string.
     * @throws {Error} If the file does not exist.
     */
    set env_files(value: string | string[]) {
        if (!Array.isArray(value)) { value = [value] }

        for (const file of value) {
            if (typeof file !== 'string') { throw new TypeError('env_file must be a string.'); }
            if (!fs.existsSync(file)) { throw new Error(`env_file '${file}' does not exist.`); }
        }

        this.#_env_files = value;
    }

    /**
     * Gets the path to a file containing environment variables in the format
     * KEY=VALUE, one per line.
     * @returns {string | undefined} The path to the env file, or undefined if not set.
     */
    get env_files(): string[] { return this.#_env_files; }

    /**
     * Gets the name of the container.
     * @returns {string} The name of the container.
     */
    get name(): string {
        return this.#_name;
    }

    /**
     * Sets the name of the container.
     * The name is a string and must be unique among all containers.
     * If the name is already set, this method will throw an error.
     * @param value A string representing the name of the container.
     * @throws {TypeError} If the provided value is not a string.
     */
    set name(value: string) {
        if (typeof value !== 'string') { throw new TypeError("The 'name' property must be a string."); }
        this.#_name = value.replace(/\s+/g, '_').toLowerCase();
    }

    /**
     * Retrieves the config manager associated with the container.
     * @returns {StackConfigs} An instance of the StackConfigs class, providing APIs to manage configuration within the container.
     */
    get configs(): StackConfigs { return this.#_configs }

    /**
     * Retrieves the services manager associated with the container.
     * @returns {ServicesManager} An instance of the ServicesManager class, providing APIs to manage services within the container.
     */
    get services(): ServicesManager { return this.#_services }

    /**
     * Retrieves the volumes manager associated with the container.
     * @returns {VolumesManager} An instance of the VolumesManager class, providing APIs to manage volumes within the container.
     */
    get volumes(): ServicesVolumesManager { return this.#_volumes }

    /**
     * Retrieves the networks manager associated with the container.
     * @returns {NetworksManager} An instance of the NetworksManager class, providing APIs to manage networks within the container.
     */
    get networks(): ServicesNetworksManager { return this.#_networks }

    /**
     * Retrieves the environment variables associated with the container.
     * @returns {Environment} An instance of the Environment class, providing APIs to manage environment variables within the container.
     */
    get environment(): Environment { return this.#_env }

    /**
     * Retrieves the secrets manager associated with the container.
     * @returns {SecretsManager} An instance of the SecretsManager class, providing APIs to manage secrets within the container.
     */
    get secrets(): SecretsManager { return this.#_secrets }
}

export default ContainerTemplate;