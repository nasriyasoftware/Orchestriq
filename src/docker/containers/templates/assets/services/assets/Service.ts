import { Port, ServiceVolume, FailureRestartOption, RestartOption, DockerLoggingDriver, ExternalLinkRecord, ServiceConfigsData, ServiceCreationOptions, RestartPolicy, DockerDriverType, NetworkMode } from './docs';
import ContainerTemplate from '../../../ContainerTemplate';
import ServiceBuild from './ServiceBuild';
import Environment from '../../Environment';
import Healthcheck from './Healthcheck';
import ServiceDeployment from './ServiceDeployment';
import fs from 'fs';
import path from 'path';
import helpers from '../../../../../../utils/helpers';

class Service {
    #_container: ContainerTemplate;
    #_main: boolean = false;
    #_name: string = undefined as unknown as string;
    #_container_name: string | undefined = undefined;
    #_description: string | undefined = undefined;
    #_image: string | undefined = undefined;

    #_build: ServiceBuild;

    #_ports: Port[] = [];
    #_volumes: ServiceVolume[] = [];

    #_environment = new Environment();
    #_env_files: string[] = [];

    #_entrypoint: string | undefined = undefined;
    #_command: string[] = [];
    #_dependsOn: string[] = [];

    #_networks: string[] = [];
    #_network_mode: NetworkMode = 'bridge';
    #_user = 'node';
    #_restart: FailureRestartOption | RestartOption | RestartPolicy = 'unless-stopped';

    #_logging: DockerLoggingDriver = {
        driver: 'json-file',
        options: {
            'max-size': '10m',
            'max-file': 5
        }
    }

    #_healthcheck = new Healthcheck();
    #_external_links: ExternalLinkRecord[] = [];
    #_secrets: string[] = [];
    #_deploy: ServiceDeployment | undefined;
    #_security_opt: string[] = [];
    #_configs: ServiceConfigsData[] = [];
    // #########################################################################
    // #########################################################################
    // #########################################################################

    /**
     * Constructs a new instance of the Service class using the provided options.
     * 
     * @param options - The options for creating the service, including fields such as:
     * - name: The name of the service.
     * - image: The Docker image to use for the service.
     * - context: The build context directory.
     * - ports: An array of ports to expose.
     * - volumes: An array of volume mappings.
     * - description: A description of the service.
     * - build: Build options for the service.
     * - environment: Environment variables for the service.
     * - entrypoint: The entrypoint for the service.
     * - command: Commands to be executed in the service.
     * - dependsOn: Services that the current service depends on.
     * - networks: Networks to which the service should be connected.
     * - user: The user to run the service as.
     * - restart: Restart policy for the service.
     * - logging: Logging configuration for the service.
     * - healthcheck: Healthcheck configuration for the service.
     * - external_links: External links to other containers.
     * - secrets: List of secrets associated with the service.
     */
    constructor(options: ServiceCreationOptions, container: ContainerTemplate) {
        this.#_container = container;
        this.#_build = new ServiceBuild(container);
        this.#_environment.add({ 'NODE_ENV': 'production' });

        if (!options || typeof options !== 'object') { throw new TypeError('options must be an object.'); }

        if (options.name) {
            this.#_name = options.name;
        } else {
            throw new TypeError('Service name is required.');
        }

        this.#_image = options.image;
        if (options.container_name) { this.container_name = options.container_name; }
        if (options.ports) { this.add.ports(options.ports); }
        if (options.volumes) { this.add.volumes(options.volumes); }
        if (options.description) { this.description = options.description; }
        if (options.context) { this.build.context = options.context; }
        if (options.build) {
            if (options.build.context) { this.build.context = options.build.context; }
            if (options.build.dockerfile) { this.build.dockerfile = options.build.dockerfile; }
            if (options.build.args) { this.build.add.args(options.build.args); }
            if (options.build.labels) { this.build.add.labels(options.build.labels); }
            if (options.build.target) { this.build.target = options.build.target; }
            if (options.build.cache_from) { this.build.cache_from = options.build.cache_from; }
            if (options.build.shm_size) { this.build.shm_size = options.build.shm_size; }
            if (options.build.extra_hosts) { this.build.extra_hosts = options.build.extra_hosts; }
            if (options.build.squash) { this.build.squash = options.build.squash; }
            if (options.build.network) { this.build.network = options.build.network; }
        }

        if (options.environment) { this.environment.add(options.environment); }
        if (options.env_files) { this.env_files = options.env_files; }
        if (options.entrypoint) { this.entrypoint = options.entrypoint; }
        if (options.command) { this.command = options.command; }
        if (options.dependsOn) { this.add.dependsOn(options.dependsOn); }
        if (options.networks) { this.add.networks(options.networks); }
        if (options.network_mode) { this.network_mode = options.network_mode; }
        if (options.user) { this.user = options.user; }
        if (options.restart) { this.restart = options.restart; }
        if (options.logging) { this.logging = options.logging; }
        if (options.healthcheck) { this.healthcheck.set(options.healthcheck) }
        if (options.external_links) { this.add.external_links(options.external_links); }
        if (options.secrets) { this.add.secrets(options.secrets); }
        if (options.security_opt) { this.security_opt = options.security_opt; }
        if (options.deploy) {
            const deploy = new ServiceDeployment(options.deploy);
            this.#_deploy = deploy;
        }
    }
    // #########################################################################
    // #########################################################################
    // #########################################################################

    /**
     * Sets the network mode for the service.
     * If the mode is an object with `type` and `value` properties, the value of `type` must be either 'container' or 'service',
     * and the value of `value` must be a non-empty string.
     * If the mode is a string, it must be one of 'bridge', 'host', or 'none'.
     * @param mode The network mode for the service.
     * @throws {TypeError} If the network mode is invalid.
     */
    set network_mode(mode: NetworkMode) {
        if (typeof mode === 'object' && (mode.type === 'container' || mode.type === 'service')) {
            if (typeof mode.value !== 'string' || mode.value.length === 0) {
                throw new TypeError('Network mode value must be a non-empty string.');
            }

            this.#_network_mode = `${mode.type}:${mode.value}`;
            return;
        }

        if (typeof mode !== 'string') { throw new TypeError('Network mode must be a string.'); }
        if (!['bridge', 'host', 'none'].includes(mode)) { throw new TypeError('Invalid network mode.'); }

        this.#_network_mode = mode;
    }


    /**
     * Retrieves the network mode for the service.
     * The network mode determines whether the service uses a bridge, host, or none network.
     * If the mode is an object with `type` and `value` properties, the value of `type` must be either 'container' or 'service',
     * and the value of `value` must be a non-empty string.
     * If the mode is a string, it must be one of 'bridge', 'host', or 'none'.
     * @returns {NetworkMode} The network mode for the service.
     */
    get network_mode(): NetworkMode { return this.#_network_mode }

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

        const finalFiles: string[] = [];
        for (let file of value) {
            if (typeof file !== 'string') { throw new TypeError('env_file must be a string.'); }
            if (fs.existsSync(file)) {
                const stat = fs.statSync(file);

                if (stat.isFile()) {
                    finalFiles.push(file);
                    continue;
                }

                if (stat.isDirectory()) {
                    const files = fs.readdirSync(file, { withFileTypes: true }).filter(f => f.isFile());
                    const envFiles = files.filter(f => f.name.endsWith('.env'));
                    finalFiles.push(...envFiles.map(f => path.join(file, f.name)));
                    continue;
                }
            } else {
                const context = this.#_build.context;
                if (context) {
                    const filePath = path.join(context, file);
                    if (!fs.existsSync(filePath)) { throw new Error(`env_file '${filePath}' does not exist in the build context.`); }
                    finalFiles.push(filePath);
                    continue;
                } else {
                    throw new Error(`env_file '${file}' does not exist.`);
                }
            }
        }

        this.#_env_files = finalFiles;
    }

    /**
     * Gets the path to a file containing environment variables in the format
     * KEY=VALUE, one per line.
     * @returns {string | undefined} The path to the env file, or undefined if not set.
     */
    get env_files(): string[] { return this.#_env_files; }

    /**
     * Sets the container name for the service.
     * This is an optional property that can be used to set the container name
     * for the service. If not set, the name of the service will be used as the
     * container name instead.
     * @param value A string representing the container name.
     * @throws {TypeError} If the provided value is not a string.
     * @throws {TypeError} If the provided value is empty.
     */
    set container_name(value: string) {
        if (typeof value !== 'string') { throw new TypeError('container_name must be a string.'); }
        if (value.length === 0) { throw new TypeError('container_name must not be empty.'); }
        this.#_container_name = value;
    }

    /**
     * Set the security options for the service.
     * This is an optional string array that can be used to set the security options
     * for the service. For example, it can be used to set the AppArmor profile or
     * the SELinux context. The format of the string array is:
     *
     * ['label:user:User', 'label:role:Role', ...]
     *
     * @throws {TypeError} If the provided value is not an array of strings.
     */
    set security_opt(value: string[]) {
        if (!Array.isArray(value)) { throw new TypeError('security_opt must be an array.'); }
        if (!value.every(item => typeof item === 'string')) { throw new TypeError('security_opt must be an array of strings.'); }
        this.#_security_opt = value;
    }

    /**
     * Set whether this service is the main service of the application.
     * This is used to determine which service to create first and to
     * automatically set the port mappings.
     * @param value Whether this service is the main service of the application.
     */
    set isMain(value: boolean) {
        if (typeof value !== 'boolean') { throw new TypeError('isMain must be a boolean.'); }
        this.#_main = value;
    }

    /**
     * A human-readable description of the service.
     * @param value A string description of the service.
     */
    set description(value: string) {
        if (typeof value !== 'string') { throw new TypeError('description must be a string.'); }
        this.#_description = value;
    }

    /**
     * Sets the name of the service.
     * @param value A string representing the name of the service.
     * @throws {TypeError} If the provided value is not a string.
     */
    set name(value: string) {
        if (typeof value !== 'string') { throw new TypeError('name must be a string.'); }
        if (typeof this.#_name === 'string') { throw new TypeError('Service name cannot be changed.'); }
        this.#_name = value;
    }

    /**
     * The Docker image to use for the service.
     * This is used to set the 'image' key in the 'docker-compose.yml' file.
     * @param value A string representing the name of the Docker image.
     * @throws {TypeError} If the provided value is not a string.
     */
    set image(value: string) {
        if (typeof value !== 'string') { throw new TypeError('image must be a string.'); }
        this.#_image = value;
    }

    /**
     * Overrides the default entrypoint for the image.
     * This is used to set the 'entrypoint' key in the 'docker-compose.yml' file.
     * @param value A string representing the entrypoint command.
     * @throws {TypeError} If the provided value is not a string.
     */
    set entrypoint(value: string) {
        if (typeof value !== 'string') { throw new TypeError('entrypoint must be a string.'); }
        this.#_entrypoint = value;
    }

    /**
     * Overrides the default command for the image.
     * This is used to set the 'command' key in the 'docker-compose.yml' file.
     * @param value A string or array of strings representing the command to use.
     * @throws {TypeError} If the provided value is neither a string nor an array of strings.
     * @throws {Error} If the provided value is an empty array.
     */
    set command(value: string | string[]) {
        if (typeof value === 'string') { value = value.split(' ').filter(v => v.length > 0); }
        if (!Array.isArray(value)) { throw new TypeError('command must be a string or an array of strings.'); }

        // Convert all items to strings
        const command = value.map(i => String(i)).filter(v => v.length > 0);
        if (command.length === 0) { throw new Error('No valid command provided. The command cannot be empty.'); }

        this.#_command = command;
    }

    /**
     * Sets the user under which the service runs.
     * @param value A string representing the user name.
     * @throws {TypeError} If the provided value is not a string.
     */
    set user(value: string) {
        if (typeof value !== 'string') { throw new TypeError('user must be a string.'); }
        this.#_user = value;
    }

    /**
     * Sets the restart policy for the service.
     * The restart policy determines how the service should be restarted in case of failures.
     * 
     * @param value The restart policy, which can be a string representing the policy name 
     *              ('on-failure', 'always', 'unless-stopped', 'no', or 'none'), or an object 
     *              containing the policy and optional configuration.
     * 
     * @throws {TypeError} If the provided policy is not valid or well-structured.
     *                     - If given as a string, it must be one of the valid policy names.
     *                     - If given as an object, it must contain a valid 'policy' field and 
     *                       optionally a 'times' field if the policy is 'on-failure'.
     *                     - The 'times' field, if present, must be a number between 1 and 10.
     */
    set restart(value: RestartPolicy | Omit<FailureRestartOption, 'times' & { times?: number }> | RestartOption) {
        const policies = ['on-failure', 'always', 'unless-stopped', 'no', 'none'];

        let policy: FailureRestartOption | RestartOption;
        if (typeof value === 'string') {
            if (!policies.includes(value)) { throw new TypeError(`${value} is not a valid restart policy. Valid policies are: ${policies.join(', ')}`); }

            if (value === 'on-failure') {
                policy = { policy: 'on-failure', times: 5 };
            } else {
                policy = { policy: value };
            }
        } else if (typeof value === 'object' && Object.keys(value).length > 1) {
            if (!('policy' in value)) { throw new TypeError('Restart policy is missing.'); }
            if (typeof value.policy !== 'string') { throw new TypeError('Restart policy must be a string.'); }
            if (!policies.includes(value.policy)) { throw new TypeError(`${value.policy} is not a valid restart policy. Valid policies are: ${policies.join(', ')}`); }

            if (value.policy === 'on-failure') {
                const fPolicy: FailureRestartOption = { policy: 'on-failure', times: 5 };

                if ('times' in value) {
                    if (typeof value.times !== 'number') { throw new TypeError('Restart times must be a number.'); }
                    if (value.times < 1 || value.times > 10) { throw new TypeError('Restart times must be between 1 and 10.'); }
                    fPolicy.times = value.times;
                }

                policy = fPolicy;
            } else {
                policy = value;
            }
        } else {
            throw new TypeError('Restart policy must be a string or an object.');
        }

        this.#_restart = policy;
    }

    /**
     * Sets the logging driver.
     * The logging driver determines how the service's logs are handled.
     * 
     * @param value The logging driver, which can be a string representing the driver name
     *              ('json-file', 'syslog', 'journald', 'gelf', 'fluentd', 'awslogs', 'splunk', 'none', 'logentries', 'local', 'etwlogs', 'gcplogs', 'papertrail', 'logstash', 'datadog', 'stackdriver', 'azurelog', 'kafka'),
     *              or an object containing the driver and optional configuration.
     * 
     * @throws {TypeError} If the provided driver is not valid or well-structured.
     *                     - If given as a string, it must be one of the valid driver names.
     *                     - If given as an object, it must contain a valid 'driver' field and
     *                       optionally other fields depending on the driver, as specified in the
     *                       following sections.
     */
    set logging(value: DockerLoggingDriver) {
        if (!(typeof value === 'object' && Object.keys(value).length > 1)) { throw new TypeError('logging must be a driver object.'); }
        if (!('driver' in value)) { throw new TypeError('Logging driver type is missing.'); }

        const loggingDrivers: DockerDriverType[] = ['json-file', 'syslog', 'journald', 'gelf', 'fluentd', 'awslogs', 'splunk', 'none', 'logentries', 'local', 'etwlogs', 'gcplogs', 'papertrail', 'logstash', 'datadog', 'stackdriver', 'azurelog', 'kafka'];
        if (!loggingDrivers.includes(value.driver)) { throw new TypeError(`${value.driver} is not a valid logging driver. Valid drivers are: ${loggingDrivers.join(', ')}`); }

        switch (value.driver) {
            case 'json-file': {
                // Handle 'json-file' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'max-size' if provided
                    if (options['max-size'] && typeof options['max-size'] !== 'string') {
                        throw new Error("Invalid 'max-size'. It should be a string.");
                    }

                    // Validate 'max-file' if provided
                    if (options['max-file']) {
                        if (typeof options['max-file'] !== 'number' && typeof options['max-file'] !== 'string') {
                            throw new Error("Invalid 'max-file'. It should be a number or a string.");
                        }
                    }

                    // Validate 'labels' if provided
                    if (options['labels']) {
                        if (!Array.isArray(options['labels'])) {
                            throw new Error("Invalid 'labels'. It should be an array of strings.");
                        }
                        options['labels'].forEach(label => {
                            if (typeof label !== 'string') {
                                throw new Error("Each label in 'labels' should be a string.");
                            }
                        });
                    }

                    // Validate 'env' if provided
                    if (options['env']) {
                        if (typeof options['env'] !== 'object' || Array.isArray(options['env'])) {
                            throw new Error("Invalid 'env'. It should be an object.");
                        }
                        for (const key in options['env']) {
                            if (typeof key !== 'string') {
                                throw new Error("Each key in 'env' should be a string.");
                            }
                            // Optionally: Validate value type of environment variables if needed
                        }
                    }
                }

                break;
            }
            case 'syslog': {
                // Handle 'syslog' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'syslog-address' if provided
                    if (options['syslog-address'] && typeof options['syslog-address'] !== 'string') {
                        throw new Error("Invalid 'syslog-address'. It should be a string.");
                    }

                    // Validate 'syslog-facility' if provided
                    if (options['syslog-facility'] && typeof options['syslog-facility'] !== 'string') {
                        throw new Error("Invalid 'syslog-facility'. It should be a string.");
                    }

                    // Validate 'syslog-level' if provided
                    if (options['syslog-level'] && typeof options['syslog-level'] !== 'string') {
                        throw new Error("Invalid 'syslog-level'. It should be a string.");
                    }

                    // Validate 'tag' if provided
                    if (options['tag'] && typeof options['tag'] !== 'string') {
                        throw new Error("Invalid 'tag'. It should be a string.");
                    }

                    // Validate 'rfc5424' if provided
                    if (options['rfc5424'] && typeof options['rfc5424'] !== 'boolean') {
                        throw new Error("Invalid 'rfc5424'. It should be a boolean.");
                    }

                    // Validate 'syslog-tls' if provided
                    if (options['syslog-tls'] && typeof options['syslog-tls'] !== 'boolean') {
                        throw new Error("Invalid 'syslog-tls'. It should be a boolean.");
                    }
                }

                break;
            }
            case 'journald': {
                // Handle 'journald' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'max-buffer-size' if provided
                    if (options['max-buffer-size'] && typeof options['max-buffer-size'] !== 'string') {
                        throw new Error("Invalid 'max-buffer-size'. It should be a string.");
                    }

                    // Validate 'max-buffer-age' if provided
                    if (options['max-buffer-age'] && typeof options['max-buffer-age'] !== 'string') {
                        throw new Error("Invalid 'max-buffer-age'. It should be a string.");
                    }
                }
                break;
            }
            case 'gelf': {
                // Handle 'gelf' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Check if the 'gelf-address' is a valid URL
                    if (options['gelf-address'] && !/^([a-zA-Z][a-zA-Z\d+\-.]*):\/\/\S+$/.test(options['gelf-address'])) {
                        throw new Error("Invalid 'gelf-address'. It should be a valid URL.");
                    }

                    // Validate 'compression-type' if it's provided
                    if (options['compression-type'] && !['gzip', 'zlib'].includes(options['compression-type'])) {
                        throw new Error("Invalid 'compression-type'. Valid options are: gzip, zlib.");
                    }

                    // Optionally validate 'labels' and 'tags', for example, check that they are strings or a comma-separated list
                    if (options['labels'] && typeof options['labels'] !== 'string') {
                        throw new Error("Invalid 'labels'. It should be a string.");
                    }

                    if (options['tags'] && typeof options['tags'] !== 'string') {
                        throw new Error("Invalid 'tags'. It should be a string.");
                    }
                }
                break;
            }
            case 'fluentd': {
                // Handle 'fluentd' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'fluentd-address' if it's provided
                    if (options['fluentd-address'] && !/^([a-zA-Z][a-zA-Z\d+\-.]*):\/\/\S+$/.test(options['fluentd-address'])) {
                        throw new Error("Invalid 'fluentd-address'. It should be a valid URL (e.g., tcp://localhost:24224).");
                    }

                    // Validate 'fluentd-async' if it's provided
                    if (options['fluentd-async'] && typeof options['fluentd-async'] !== 'boolean') {
                        throw new Error("Invalid 'fluentd-async'. It should be a boolean.");
                    }

                    // Validate 'fluentd-buffer-limit' if it's provided
                    if (options['fluentd-buffer-limit'] && typeof options['fluentd-buffer-limit'] !== 'number') {
                        throw new Error("Invalid 'fluentd-buffer-limit'. It should be a number.");
                    }

                    // Validate 'fluentd-keep-alive' if it's provided
                    if (options['fluentd-keep-alive'] && typeof options['fluentd-keep-alive'] !== 'boolean') {
                        throw new Error("Invalid 'fluentd-keep-alive'. It should be a boolean.");
                    }
                }
                break;
            }
            case 'awslogs': {
                // Handle 'awslogs' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'awslogs-group' if it's provided
                    if (options['awslogs-group'] && typeof options['awslogs-group'] !== 'string') {
                        throw new Error("Invalid 'awslogs-group'. It should be a string.");
                    }

                    // Validate 'awslogs-stream' if it's provided
                    if (options['awslogs-stream'] && typeof options['awslogs-stream'] !== 'string') {
                        throw new Error("Invalid 'awslogs-stream'. It should be a string.");
                    }

                    // Validate 'awslogs-region' if it's provided
                    if (options['awslogs-region'] && typeof options['awslogs-region'] !== 'string') {
                        throw new Error("Invalid 'awslogs-region'. It should be a string.");
                    }

                    // Validate 'awslogs-create-group' if it's provided
                    if (options['awslogs-create-group'] && typeof options['awslogs-create-group'] !== 'boolean') {
                        throw new Error("Invalid 'awslogs-create-group'. It should be a boolean.");
                    }

                    // Validate 'awslogs-datetime-format' if it's provided
                    if (options['awslogs-datetime-format'] && typeof options['awslogs-datetime-format'] !== 'string') {
                        throw new Error("Invalid 'awslogs-datetime-format'. It should be a string.");
                    }

                    // Validate 'awslogs-multiline-pattern' if it's provided
                    if (options['awslogs-multiline-pattern'] && typeof options['awslogs-multiline-pattern'] !== 'string') {
                        throw new Error("Invalid 'awslogs-multiline-pattern'. It should be a string.");
                    }
                }
                break;
            }
            case 'splunk': {
                // Handle 'splunk' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'splunk-url' if it's provided
                    if (options['splunk-url'] && typeof options['splunk-url'] !== 'string') {
                        throw new Error("Invalid 'splunk-url'. It should be a string.");
                    }

                    // Validate 'splunk-token' if it's provided
                    if (options['splunk-token'] && typeof options['splunk-token'] !== 'string') {
                        throw new Error("Invalid 'splunk-token'. It should be a string.");
                    }

                    // Validate 'splunk-index' if it's provided
                    if (options['splunk-index'] && typeof options['splunk-index'] !== 'string') {
                        throw new Error("Invalid 'splunk-index'. It should be a string.");
                    }

                    // Validate 'splunk-source' if it's provided
                    if (options['splunk-source'] && typeof options['splunk-source'] !== 'string') {
                        throw new Error("Invalid 'splunk-source'. It should be a string.");
                    }

                    // Validate 'splunk-sourcetype' if it's provided
                    if (options['splunk-sourcetype'] && typeof options['splunk-sourcetype'] !== 'string') {
                        throw new Error("Invalid 'splunk-sourcetype'. It should be a string.");
                    }

                    // Validate 'splunk-index-timeout' if it's provided
                    if (options['splunk-index-timeout'] && typeof options['splunk-index-timeout'] !== 'string') {
                        throw new Error("Invalid 'splunk-index-timeout'. It should be a string.");
                    }
                }
                break;
            }
            case 'none': {
                // Handle 'none' driver
                break;
            }
            case 'logentries': {
                // Handle 'logentries' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'logentries-token' if it's provided
                    if (options['logentries-token'] && typeof options['logentries-token'] !== 'string') {
                        throw new Error("Invalid 'logentries-token'. It should be a string.");
                    }

                    // Validate 'logentries-url' if it's provided
                    if (options['logentries-url'] && typeof options['logentries-url'] !== 'string') {
                        throw new Error("Invalid 'logentries-url'. It should be a string.");
                    }
                }
                break;
            }
            case 'local': {
                // Handle 'local' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'local-log-dir' if it's provided
                    if (options['local-log-dir'] && typeof options['local-log-dir'] !== 'string') {
                        throw new Error("Invalid 'local-log-dir'. It should be a string.");
                    }

                    // Validate 'local-max-size' if it's provided
                    if (options['local-max-size'] && typeof options['local-max-size'] !== 'string') {
                        throw new Error("Invalid 'local-max-size'. It should be a string.");
                    }
                }
                break;
            }
            case 'etwlogs': {
                // Handle 'etwlogs' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    if (options['etw-logs-source'] && typeof options['etw-logs-source'] !== 'string') {
                        throw new Error("Invalid 'etw-logs-source'. It should be a string.");
                    }
                }
                break;
            }
            case 'gcplogs': {
                // Handle 'gcplogs' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'gcp-project-id' if it's provided
                    if (options['gcp-project-id'] && typeof options['gcp-project-id'] !== 'string') {
                        throw new Error("Invalid 'gcp-project-id'. It should be a string.");
                    }

                    // Validate 'gcp-log-name' if it's provided
                    if (options['gcp-log-name'] && typeof options['gcp-log-name'] !== 'string') {
                        throw new Error("Invalid 'gcp-log-name'. It should be a string.");
                    }

                    // Validate 'gcp-datetime-format' if it's provided
                    if (options['gcp-datetime-format'] && typeof options['gcp-datetime-format'] !== 'string') {
                        throw new Error("Invalid 'gcp-datetime-format'. It should be a string.");
                    }
                }
                break;
            }
            case 'papertrail': {
                // Handle 'papertrail' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'papertrail-host' if it's provided
                    if (options['papertrail-host'] && typeof options['papertrail-host'] !== 'string') {
                        throw new Error("Invalid 'papertrail-host'. It should be a string.");
                    }

                    // Validate 'papertrail-port' if it's provided
                    if (options['papertrail-port'] && typeof options['papertrail-port'] !== 'number') {
                        throw new Error("Invalid 'papertrail-port'. It should be a number.");
                    }

                    // Validate 'papertrail-ssl' if it's provided
                    if (options['papertrail-ssl'] && typeof options['papertrail-ssl'] !== 'boolean') {
                        throw new Error("Invalid 'papertrail-ssl'. It should be a boolean.");
                    }
                }
                break;
            }
            case 'logstash': {
                // Handle 'logstash' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'logstash-addr' if it's provided
                    if (options['logstash-addr'] && typeof options['logstash-addr'] !== 'string') {
                        throw new Error("Invalid 'logstash-addr'. It should be a string.");
                    }

                    // Validate 'logstash-format' if it's provided
                    if (options['logstash-format'] && typeof options['logstash-format'] !== 'string') {
                        throw new Error("Invalid 'logstash-format'. It should be a string.");
                    }

                    // Validate 'logstash-socket' if it's provided
                    if (options['logstash-socket'] && typeof options['logstash-socket'] !== 'string') {
                        throw new Error("Invalid 'logstash-socket'. It should be a string.");
                    }
                }
                break;
            }
            case 'datadog': {
                // Handle 'datadog' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'datadog-api-key' if it's provided
                    if (options['datadog-api-key'] && typeof options['datadog-api-key'] !== 'string') {
                        throw new Error("Invalid 'datadog-api-key'. It should be a string.");
                    }

                    // Validate 'datadog-site' if it's provided
                    if (options['datadog-site'] && typeof options['datadog-site'] !== 'string') {
                        throw new Error("Invalid 'datadog-site'. It should be a string.");
                    }

                    // Validate 'datadog-service' if it's provided
                    if (options['datadog-service'] && typeof options['datadog-service'] !== 'string') {
                        throw new Error("Invalid 'datadog-service'. It should be a string.");
                    }
                }
                break;
            }
            case 'stackdriver': {
                // Handle 'stackdriver' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'stackdriver-project-id' if it's provided
                    if (options['stackdriver-project-id'] && typeof options['stackdriver-project-id'] !== 'string') {
                        throw new Error("Invalid 'stackdriver-project-id'. It should be a string.");
                    }

                    // Validate 'stackdriver-log-name' if it's provided
                    if (options['stackdriver-log-name'] && typeof options['stackdriver-log-name'] !== 'string') {
                        throw new Error("Invalid 'stackdriver-log-name'. It should be a string.");
                    }
                }
                break;
            }
            case 'azurelog': {
                // Handle 'azurelog' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'azurelog-workspace-id' if it's provided
                    if (options['azurelog-workspace-id'] && typeof options['azurelog-workspace-id'] !== 'string') {
                        throw new Error("Invalid 'azurelog-workspace-id'. It should be a string.");
                    }

                    // Validate 'azurelog-shared-key' if it's provided
                    if (options['azurelog-shared-key'] && typeof options['azurelog-shared-key'] !== 'string') {
                        throw new Error("Invalid 'azurelog-shared-key'. It should be a string.");
                    }
                }
                break;
            }
            case 'kafka': {
                // Handle 'kafka' driver
                if ('options' in value) {
                    const options = value.options;
                    if (!(options && typeof options === 'object')) { throw new TypeError('Logging options must be an object when defined.'); }

                    // Validate 'kafka-broker' if provided
                    if (options['kafka-broker'] && typeof options['kafka-broker'] !== 'string') {
                        throw new Error("Invalid 'kafka-broker'. It should be a string.");
                    }

                    // Validate 'kafka-topic' if provided
                    if (options['kafka-topic'] && typeof options['kafka-topic'] !== 'string') {
                        throw new Error("Invalid 'kafka-topic'. It should be a string.");
                    }

                    // Validate 'kafka-partition' if provided
                    if (options['kafka-partition'] && typeof options['kafka-partition'] !== 'number') {
                        throw new Error("Invalid 'kafka-partition'. It should be a number.");
                    }

                    // Validate 'kafka-sasl-username' if provided
                    if (options['kafka-sasl-username'] && typeof options['kafka-sasl-username'] !== 'string') {
                        throw new Error("Invalid 'kafka-sasl-username'. It should be a string.");
                    }

                    // Validate 'kafka-sasl-password' if provided
                    if (options['kafka-sasl-password'] && typeof options['kafka-sasl-password'] !== 'string') {
                        throw new Error("Invalid 'kafka-sasl-password'. It should be a string.");
                    }
                }
                break;
            }
        }

        this.#_logging = value;
    }

    // #########################################################################
    // #########################################################################
    // #########################################################################

    /**
     * A collection of methods for adding various configurations to a service.
     * This object provides methods to add ports, volumes, environment variables,
     * dependencies, networks, external links, and secrets to the service.
     * 
     * Each method validates the input data and throws errors if the data is invalid.
     * 
     * @namespace add
     */
    readonly add = Object.freeze({
        /**
         * Adds configuration data to the service.
         * Validates and processes each configuration object or array of objects,
         * ensuring that each config has a valid 'source' and 'target' property.
         * The 'source' must correspond to an existing config in the container,
         * and both 'source' and 'target' must be non-empty strings.
         * 
         * @param value A single configuration object or an array of configurations.
         * Each configuration must have 'source' and 'target' properties.
         * 
         * @throws {TypeError} If a config is not a non-empty object or if 'source' or 'target' are not strings.
         * @throws {SyntaxError} If 'source' or 'target' are not defined or are empty strings.
         * @throws {Error} If the 'source' does not exist in the container's configuration list.
         */
        configs: (value: ServiceConfigsData | ServiceConfigsData[]) => {
            if (!Array.isArray(value)) { value = [value] }

            for (const config of value) {
                if (!(typeof config === 'object' && Object.keys(config).length > 0)) { throw new TypeError('Configs must be a non-empty object.'); }

                if ('source' in config) {
                    if (typeof config.source !== 'string') { throw new TypeError('Config source must be a string.'); }
                    if (config.source.length === 0) { throw new SyntaxError('Config source must be defined.'); }
                    if (!(config.source in this.#_container.configs.list)) { throw new Error(`Config source '${config.source}' is not defined in the container's configs.`); }
                } else {
                    throw new SyntaxError('Config source must be defined.');
                }

                if ('target' in config) {
                    if (typeof config.target !== 'string') { throw new TypeError('Config target must be a string.'); }
                    if (config.target.length === 0) { throw new SyntaxError('Config target must be defined.'); }
                } else {
                    throw new SyntaxError('Config target must be defined.');
                }

                if ('mode' in config) {
                    if (!(typeof config.mode === 'object' && Object.keys(config.mode).length > 0)) { throw new TypeError('Config mode must be a non-empty object.'); }


                    if ('owner' in config.mode) {
                        if (!config.mode.owner) { config.mode.owner = [] }
                        if (!Array.isArray(config.mode.owner)) { config.mode.owner = [config.mode.owner] }

                        for (const permission of config.mode.owner) {
                            if (typeof permission !== 'string') { throw new TypeError('Config owner permissions must be a string.'); }
                            if (!(permission === 'read' || permission === 'write' || permission === 'exec')) { throw new SyntaxError('Config owner permissions must be "read", "write", or "exec".'); }
                        }
                    }

                    if ('group' in config.mode) {
                        if (!config.mode.group) { config.mode.group = [] }
                        if (!Array.isArray(config.mode.group)) { config.mode.group = [config.mode.group] }

                        for (const permission of config.mode.group) {
                            if (typeof permission !== 'string') { throw new TypeError('Config group permissions must be a string.'); }
                            if (!(permission === 'read' || permission === 'write' || permission === 'exec')) { throw new SyntaxError('Config group permissions must be "read", "write", or "exec".'); }
                        }
                    }

                    if ('others' in config.mode) {
                        if (!config.mode.others) { config.mode.others = [] }
                        if (!Array.isArray(config.mode.others)) { config.mode.others = [config.mode.others] }

                        for (const permission of config.mode.others) {
                            if (typeof permission !== 'string') { throw new TypeError('Config others permissions must be a string.'); }
                            if (!(permission === 'read' || permission === 'write' || permission === 'exec')) { throw new SyntaxError('Config others permissions must be "read", "write", or "exec".'); }
                        }
                    }
                }

                this.#_configs.push(config);
            }
        },
        /**
         * Adds a list of ports to the service.
         * The ports can be specified as numbers, strings, or objects.
         * 
         * @param value An array of ports, where each port can be:
         *              - A number or string representing the internal port.
         *              - An object of type Port with internal and external properties.
         * 
         * @throws {TypeError} If a port object is not valid, i.e., the internal
         *                     or external properties are not strings.
         * @throws {Error} If no valid ports are provided.
         */
        ports: (value: (number | string | Port)[]) => {
            if (!Array.isArray(value)) { value = [value] }
            const ports: Port[] = [];

            for (const port of value) {
                if (typeof port === 'number' || typeof port === 'string') {
                    ports.push({ internal: port });
                } else if (typeof port === 'object' && Object.keys(port).length > 1) {
                    if ('internal' in port && 'external' in port) {
                        if (!(typeof port.internal === 'string' || typeof port.internal === 'number')) { throw new TypeError(`A port object has been provided, but the internal property is not a string or number.`) }
                        if (!(typeof port.external === 'string' || typeof port.external === 'number')) { throw new TypeError(`A port object has been provided, but the external property is not a string or number.`) }

                        ports.push(port);
                    } else {
                        throw new TypeError(`One of the ports is not valid, it must have an internal and external property.`);
                    }
                } else {
                    throw new TypeError(`Ports must be a list of individual ports (string/number) or 'Port' objects, instead got ${typeof port}.`);
                }
            }

            if (ports.length > 0) {
                this.#_ports.push(...ports);
            } else {
                throw new Error('No valid ports provided.');
            }
        },

        /**
         * Adds a list of volumes to the service.
         * The volumes can be specified as a ServiceVolume or a list of ServiceVolume.
         * Each volume must have a containerPath defined, and can have a name, hostPath, or read_only defined.
         * If name is defined, it must reference a volume defined in the container.
         * If hostPath is defined, it must be a valid path and must exist.
         * If read_only is defined, it must be a boolean.
         * 
         * @param value A ServiceVolume or a list of ServiceVolume.
         * @throws {TypeError} If a volume object is not valid, i.e., the containerPath, name, hostPath, or read_only properties are not strings, booleans, or defined.
         * @throws {Error} If no valid volumes are provided.
         */
        volumes: (value: ServiceVolume | ServiceVolume[]) => {
            if (!Array.isArray(value)) { value = [value] }
            const volumes: ServiceVolume[] = [];
            const PATH_REGEX = /^([a-zA-Z]:\\|\\\\|\/|\.?\/|\.{2}\/).*$/;

            for (const volume of value) {
                if (!(typeof volume === 'object' && Object.keys(volume).length > 0)) { throw new TypeError('Volumes must be a "ServiceVolume" or a list of "ServiceVolume".'); }

                if ('containerPath' in volume) {
                    if (typeof volume.containerPath !== 'string') { throw new TypeError('Volume containerPath must be a string.'); }
                    if (volume.containerPath.length === 0) { throw new SyntaxError('Volume containerPath must be defined.'); }
                    if (!PATH_REGEX.test(volume.containerPath)) { throw new SyntaxError('Volume containerPath must be a valid path.'); }
                } else {
                    throw new SyntaxError('Volume containerPath must be defined.');
                }

                if ('read_only' in volume) {
                    if (typeof volume.read_only !== 'boolean') { throw new TypeError('Volume read_only (when provided) must be a boolean.'); }
                }

                if ('name' in volume) {
                    if (typeof volume.name !== 'string') { throw new TypeError('Volume name (when provided) must be a string.'); }
                    if (volume.name.length === 0) { throw new SyntaxError('Volume name cannot be empty.'); }
                    if (!(volume.name in this.#_container.volumes.list)) { throw new Error(`Volume name '${volume.name}' is not defined in the container's volumes.`); }
                    volumes.push({ containerPath: volume.containerPath, name: volume.name, read_only: volume.read_only });
                    continue;
                }

                if ('hostPath' in volume) {
                    if (typeof volume.hostPath !== 'string') { throw new TypeError('Volume hostPath (when defined) must be a string.'); }
                    if (volume.hostPath.length === 0) { throw new SyntaxError('Volume hostPath cannot be empty.'); }
                    if (!PATH_REGEX.test(volume.hostPath)) { throw new SyntaxError('Volume hostPath must be a valid path.'); }
                    if (!fs.existsSync(volume.hostPath)) { throw new Error(`Volume hostPath '${volume.hostPath}' does not exist.`); }
                    volumes.push({ containerPath: volume.containerPath, hostPath: volume.hostPath, read_only: volume.read_only });
                    continue;
                }

                volumes.push({ containerPath: volume.containerPath, read_only: volume.read_only });
            }

            if (volumes.length > 0) {
                this.#_volumes.push(...volumes);
            } else {
                throw new Error('No valid volumes provided.');
            }
        },
        /**
         * Adds services that this service depends on.
         * The services can be specified as a string or an array of strings.
         * 
         * @param value An array of strings of service names that this service depends on.
         * 
         * @throws {TypeError} If the dependsOn is not provided as a string or an array of strings.
         * @throws {Error} If no valid dependsOn are provided. The dependsOn cannot be empty.
         */
        dependsOn: (value: string | string[]) => {
            if (typeof value === 'string') { value = [value] }
            if (!Array.isArray(value)) { throw new TypeError('dependsOn must be a string or an array of strings.'); }

            const dependsOn = value.map(i => String(i)).filter(v => v.length > 0);
            if (dependsOn.length === 0) { throw new Error('No valid dependsOn provided. The dependsOn cannot be empty.'); }

            const services = this.#_container.services.list;
            for (const depService in dependsOn) {
                if (!(depService in services)) { throw new Error(`Cannot find service "${depService}" to depend on. Please create the service first.`) }
            }

            this.#_dependsOn.push(...dependsOn);
        },
        /**
         * Adds networks to the service.
         * The networks can be specified as a string or an array of strings.
         * 
         * @param value An array of strings of network names that this service will connect to.
         * 
         * @throws {TypeError} If the networks is not provided as a string or an array of strings.
         * @throws {Error} If no valid networks are provided. The networks cannot be empty.
         */
        networks: (value: string | string[]) => {
            if (typeof value === 'string') { value = [value] }
            if (!Array.isArray(value)) { throw new TypeError('networks must be a string or an array of strings.'); }

            const networks = value.map(i => String(i)).filter(v => v.length > 0);
            if (networks.length === 0) { throw new Error('No valid networks provided. The networks cannot be empty.'); }

            const containerNetworks = this.#_container.networks.list;
            for (const network of networks) {
                if (!(network in containerNetworks)) {
                    throw new Error(`Network ${network} does not exist in the container. Please create the network before adding it to the service.`);
                }
            }

            this.#_networks.push(...networks);
        },
        /**
         * Adds external links to the service.
         * Each external link must be an object with at least an 'externalContainerName' property,
         * and optionally an 'internalContainerName' property. If 'internalContainerName' is not
         * provided, it defaults to the value of 'externalContainerName'.
         * 
         * @param value An ExternalLinkRecord or an array of ExternalLinkRecord objects.
         *              Each record should contain:
         *              - externalContainerName: A string representing the name of the external container.
         *              - internalContainerName (optional): A string representing the name of the internal container.
         * 
         * @throws {TypeError} If any of the records do not have the required properties or if they are not of the correct type.
         * @throws {Error} If an 'externalContainerName' property is missing.
         */
        external_links: (value: ExternalLinkRecord | ExternalLinkRecord[]) => {
            if (!Array.isArray(value)) { value = [value] }

            for (const link of value) {
                if (!(typeof link === 'object' && Object.keys(link).length > 1)) { throw new TypeError('External links must be an object of key-value pairs.') }

                if ('externalContainerName' in link) {
                    if (typeof link.externalContainerName !== 'string') { throw new TypeError(`External links must have an "externalContainerName" property that is a string, instead got ${typeof link.externalContainerName}.`) }
                } else {
                    throw new Error('External links must have an "externalContainerName" property.');
                }

                if ('internalContainerName' in link) {
                    if (typeof link.internalContainerName !== 'string') { throw new TypeError(`External links must have an "internalContainerName" property as a string, instead got ${typeof link.internalContainerName}.`) }
                } else {
                    link.internalContainerName = link.externalContainerName;
                }

                this.#_external_links.push(link);
            }
        },
        /**
         * Adds secrets to the service.
         * The secrets can be specified as a string or an array of strings.
         * 
         * @param value An array of strings of secret names that this service will use.
         * 
         * @throws {TypeError} If the secrets is not provided as a string or an array of strings.
         * @throws {Error} If no valid secrets are provided. The secrets cannot be empty.
         */
        secrets: (value: string | string[]) => {
            if (typeof value === 'string') { value = [value] }
            if (!Array.isArray(value)) { throw new TypeError('secrets must be a string or an array of strings.'); }

            const secrets = value.map(i => String(i)).filter(v => v.length > 0);
            if (secrets.length === 0) { throw new Error('No valid secrets provided. The secrets cannot be empty.'); }

            this.#_secrets.push(...secrets);
        }
    })

    // #########################################################################
    // #########################################################################
    // #########################################################################

    /**
     * Retrieves the container name for the service.
     * If the container name has not been explicitly set, the property will be undefined.
     * The container name is used to identify the service's container within the Docker environment.
     * 
     * @returns {string | undefined} The name of the container as a string, or undefined if not set.
     */
    get container_name(): string | undefined { return this.#_container_name }

    /**
     * Gets the config files for the service.
     * If no config files have been set, the property will be undefined.
     * The config files are specified as an array of objects, where each object must have a `source` property and a `target` property.
     * The 'source' property is the name of the config file and must be a string and defined on the stack level.
     * The 'target' property is the path to the config file in the container and must be a string.
     * @returns {Record<string, ServiceConfigsData> | undefined} An object containing the config files, where each key is the name of the config file and each value is an object containing the config file's properties.
     *           If no config files have been set, the property will be undefined.
     */
    get configs(): ServiceConfigsData[] | undefined { return Object.keys(this.#_configs).length > 0 ? this.#_configs : undefined; }

    /**
     * Gets the security options for the service.
     * The security options are strings that can be used to customize the security configuration of the service.
     * For example, SELinux labels can be specified with the "label" option.
     * @returns {string[] | undefined} An array of strings representing the security options, or undefined if no security options are defined.
     */
    get security_opt(): string[] | undefined { return this.#_security_opt.length > 0 ? this.#_security_opt : undefined; }

    /**
     * Retrieves the deployment configuration associated with the service.
     * 
     * @returns {ServiceDeployment | undefined} An instance of the ServiceDeployment class, providing APIs to manage deployment options such as replicas, mode, and update/rollback policies if defined, or undefined if no deployment configuration is defined.
     */
    get deploy(): ServiceDeployment | undefined { return this.#_deploy; }

    /**
    * Returns an instance of the Environment, providing APIs to manage environment variables.
    * 
    * @returns {Environment} An object with methods to add and list environment variables as key-value pairs.
    */
    get environment(): Environment { return this.#_environment; }

    /**
     * Gets whether the service is marked as the main service.
     * @returns {boolean} True if the service is the main service.
     */
    get isMain(): boolean { return this.#_main; }

    /**
     * Gets the description of the service.
     * @returns {string | undefined} The service description, or undefined if not set.
     */
    get description(): string | undefined { return this.#_description; }

    /**
     * Gets the name of the service.
     * @returns {string} The name of the service.
     */
    get name(): string { return this.#_name; }

    /**
     * Gets the image of the service.
     * @returns {string | undefined} The Docker image name, or undefined if not set.
     */
    get image(): string | undefined { return this.#_image; }

    /**
     * Gets the build configuration for the service.
     * @returns {ServiceBuild} The build configuration for the service.
     */
    get build(): ServiceBuild { return this.#_build; }

    /**
     * Gets the list of exposed ports for the service.
     * @returns {Port[]} An array of Port objects representing the exposed ports.
     */
    get ports(): Port[] { return this.#_ports; }

    /**
     * Gets the list of volumes for the service.
     * @returns {ServiceVolume[]} An array of ServiceVolume objects representing the volumes.
     */
    get volumes(): ServiceVolume[] { return this.#_volumes; }


    /**
     * Gets the entrypoint for the service.
     * @returns {string | undefined} The entrypoint command, or undefined if not set.
     */
    get entrypoint(): string | undefined { return this.#_entrypoint; }

    /**
     * Gets the list of commands to be run inside the container for the service.
     * @returns {string[]} An array of strings representing the commands.
     */
    get command(): string[] { return this.#_command; }

    /**
     * Gets the list of services that this service depends on.
     * @returns {string[]} An array of service names that this service depends on.
     */
    get dependsOn(): string[] { return this.#_dependsOn; }

    /**
     * Gets the list of networks to which the service is connected.
     * @returns {string[]} An array of network names.
     */
    get networks(): string[] { return this.#_networks; }

    /**
     * Gets the user under which the service runs.
     * @returns {string} The user name for the service.
     */
    get user(): string { return this.#_user; }

    /**
     * Gets the restart policy for the service.
     * @returns {FailureRestartOption | RestartOption | RestartPolicy} An object with the restart policy and times.
     */
    get restart(): FailureRestartOption | RestartOption | RestartPolicy { return this.#_restart; }

    /**
     * Gets the logging configuration for the service.
     * @returns {DockerLoggingDriver} The logging driver configuration.
     */
    get logging(): DockerLoggingDriver { return this.#_logging; }

    /**
     * Returns the health check configuration for the service.
     * 
     * @returns {Healthcheck} An instance of the Healthcheck class, providing APIs to set and get various health check properties.
     */
    get healthcheck(): Healthcheck { return this.#_healthcheck }

    /**
     * Gets the list of external links associated with the service.
     * @returns {ExternalLinkRecord[]} An array of ExternalLinkRecord objects.
     */
    get external_links(): ExternalLinkRecord[] { return this.#_external_links; }

    /**
     * Gets the list of secrets associated with the service.
     * @returns {string[]} An array of secret names.
     */
    get secrets(): string[] { return this.#_secrets; }
}

export default Service;