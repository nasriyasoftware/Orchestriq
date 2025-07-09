import helpers from "../../../../../utils/helpers";
import ContainerTemplate from "../../ContainerTemplate";
import { FailureRestartOption, ServiceConfigMode } from "../services/assets/docs";

class ComposeBuilder {
    #_container: ContainerTemplate;
    #_configs = Object.seal({ tab: `  `, indent: 0 });
    #_lines: string[] = [];
    #_generating = false;

    constructor(container: ContainerTemplate) {
        this.#_container = container;
    }

    /**Ends the current line and starts a new line with the same indentation level. */
    #_newLine() { return this.#_write('') }

    /**
     * Increments the indentation level by one.
     * Each line started with {@link _startLine} will have an additional tab character.
     * @returns {this} The current instance for chaining.
     */
    #_incIndent(): this {
        this.#_configs.indent++;
        return this;
    }

    /**
     * Decrements the indentation level by one.
     * Each line started with {@link _startLine} will have one less tab character.
     * @returns {this} The current instance for chaining.
     */
    #_decIndent(): this {
        this.#_configs.indent--;
        return this;
    }

    /**
     * Appends a line to the compose file with the given content.
     * The line is indented with the current indentation level.
     * @param content The content to be written to the compose file.
     * @returns {this} The current instance for chaining.
     */
    #_write(content: string): this {
        const indentation = this.#_configs.tab.repeat(this.#_configs.indent);
        this.#_lines.push(`${indentation}${content}\n`);
        return this;
    }

    #_helpers = {
        generate: {
            services: () => {
                const services = Object.values(this.#_container.services.list);
                services.sort((a, b) => {
                    if (a.isMain) { return -1; }
                    if (b.isMain) { return 1; }
                    return 0;
                })

                if (services.length === 0) { throw new Error('Unable to generate compose file. No services found.') }
                this.#_write('services:').#_incIndent();

                for (const service of services) {
                    this.#_write(`${service.name}:`).#_incIndent();

                    if (service.container_name) {
                        this.#_write(`container_name: ${service.container_name}`);
                    }

                    if (service.description) {
                        this.#_write(`# ${service.description}`);
                        this.#_write(`description: ${service.description}`);
                    }

                    if (service.image) {
                        this.#_write(`image: ${service.image}`);
                    }

                    if (service.build.configured) {
                        const build = service.build;
                        this.#_write(`build:`).#_incIndent();

                        // Check properties
                        if (build.context) {
                            this.#_write(`context: ${build.context}`);
                        }

                        if (build.dockerfile) {
                            this.#_write(`dockerfile: "${build.dockerfile}"`);
                        }

                        if (build.target) {
                            this.#_write(`target: ${build.target}`);
                        }

                        if (build.shm_size) {
                            this.#_write(`shm_size: ${build.shm_size}`);
                        }

                        if (build.network) {
                            this.#_write(`network: ${build.network}`);
                        }

                        if (build.args) {
                            if (Object.keys(build.args).length > 0) {
                                this.#_write(`args:`).#_incIndent();

                                for (const [key, value] of Object.entries(build.args)) {
                                    this.#_write(`${key}: "${value}"`);
                                }

                                this.#_decIndent();
                            }
                        }

                        if (build.labels) {
                            if (Object.keys(build.labels).length > 0) {
                                this.#_write(`labels:`).#_incIndent();

                                for (const [key, value] of Object.entries(build.labels)) {
                                    this.#_write(`- ${key}: "${value}"`);
                                }

                                this.#_decIndent();
                            }
                        }

                        if (build.cache_from) {
                            if (build.cache_from.length > 0) {
                                this.#_write(`cache_from:`).#_incIndent();

                                for (const image of build.cache_from) {
                                    this.#_write(`- ${image}`);
                                }

                                this.#_decIndent();
                            }
                        }

                        if (build.extra_hosts) {
                            if (build.extra_hosts.length > 0) {
                                this.#_write(`extra_hosts:`).#_incIndent();

                                for (const [key, value] of Object.entries(build.extra_hosts)) {
                                    this.#_write(`- ${key}: "${value}"`);
                                }

                                this.#_decIndent();
                            }
                        }

                        this.#_decIndent();
                    }

                    if (service.userns_mode && service.userns_mode !== 'default') {
                        this.#_write(`userns_mode: ${service.userns_mode}`);
                    }

                    if (service.ports.length > 0) {
                        const internalPorts = service.ports.filter(port => port.internalOnly === true);
                        const externalPorts = service.ports.filter(port => port.internalOnly !== true);

                        if (internalPorts.length > 0) {
                            this.#_write(`expose:`).#_incIndent();

                            for (const port of internalPorts) {
                                this.#_write(`- ${port.internal}`);
                            }

                            this.#_decIndent();
                        }

                        if (externalPorts.length > 0) {
                            this.#_write('ports:').#_incIndent();

                            for (const port of externalPorts) {
                                if (port.internalOnly || !port.external) {
                                    this.#_write(`- ${port.internal}:${port.internal}`);
                                } else {
                                    this.#_write(`- ${port.external}:${port.internal}`);
                                }
                            }

                            this.#_decIndent();
                        }
                    }

                    if (service.volumes.length > 0) {
                        this.#_write(`volumes:`).#_incIndent();

                        for (const volume of service.volumes) {
                            if ('name' in volume && helpers.hasOwnProperty(volume, 'name')) {
                                this.#_write(`- ${volume.name}:${volume.containerPath}:${volume.read_only === true ? 'ro' : 'rw'}`);
                                continue;
                            }

                            if ('hostPath' in volume && helpers.hasOwnProperty(volume, 'hostPath')) {
                                this.#_write(`- ${volume.hostPath}:${volume.containerPath}:${volume.read_only === true ? 'ro' : 'rw'}`);
                                continue;
                            }

                            this.#_write(`- ${volume.containerPath}:${volume.read_only === true ? 'ro' : 'rw'}`);
                        }

                        this.#_decIndent();
                    }

                    if (service.env_files.length > 0 || this.#_container.env_files.length > 0) {
                        this.#_write(`env_file:`).#_incIndent();
                        for (const env_file of service.env_files) {
                            this.#_write(`- ${env_file}`);
                        }

                        if (this.#_container.env_files.length > 0) {
                            for (const env_file of this.#_container.env_files) {
                                this.#_write(`- ${env_file}`);
                            }
                        }

                        this.#_decIndent();
                    }

                    if (service.environment) {
                        if (Object.keys(service.environment.list).length > 0) {
                            this.#_write(`environment:`).#_incIndent();

                            for (const [key, value] of Object.entries(service.environment.list)) {
                                this.#_write(`${key}: "${value}"`);
                            }

                            this.#_decIndent();
                        }
                    }

                    if (service.entrypoint) {
                        this.#_write(`entrypoint: ${service.entrypoint}`);
                    }

                    if (service.command) {
                        if (service.command.length > 0) {
                            this.#_write(`command:`).#_incIndent();

                            for (const command of service.command) {
                                this.#_write(`- ${command}`);
                            }

                            this.#_decIndent();
                        }
                    }

                    if (service.dependsOn) {
                        if (service.dependsOn.length > 0) {
                            this.#_write(`depends_on:`).#_incIndent();

                            for (const depService of service.dependsOn) {
                                this.#_write(`- ${depService}`);
                            }

                            this.#_decIndent();
                        }
                    }

                    if (service.networks && service.networks.length > 0) {
                        this.#_write(`networks:`).#_incIndent();

                        for (const network of service.networks) {
                            this.#_write(`- ${network}`);
                        }

                        this.#_decIndent();
                    } else {
                        if (service.network_mode) {
                            const mode = (service.network_mode as string).includes(':') ? `"${service.network_mode}"` : service.network_mode;
                            this.#_write(`network_mode: ${mode}`);
                        }
                    }

                    if (service.user) {
                        this.#_write(`user: ${service.user}`);
                    }

                    if (service.restart) {
                        if (typeof service.restart === 'string') {
                            this.#_write(`restart: ${service.restart}`);
                        } else {
                            const restart = service.restart;
                            if (restart.policy === 'on-failure') {
                                this.#_write(`restart:`).#_incIndent();
                                this.#_write(`policy: ${restart.policy}`);
                                if (restart.policy === 'on-failure') {
                                    this.#_write(`times: ${(restart as FailureRestartOption).times}`);
                                }

                                this.#_decIndent();
                            } else {
                                this.#_write(`restart: ${restart.policy}`);
                            }
                        }
                    }

                    if (service.logging) {
                        const logging = service.logging;
                        this.#_write(`logging:`).#_incIndent();

                        this.#_write(`driver: ${logging.driver}`);
                        if ('options' in logging && (typeof logging.options === 'object' && Object.keys(logging.options).length > 0)) {
                            this.#_write(`options:`).#_incIndent();

                            for (const [key, value] of Object.entries(logging.options)) {
                                this.#_write(`${key}: "${value}"`);
                            }

                            this.#_decIndent();
                        }

                        this.#_decIndent();
                    }

                    if (service.healthcheck) {
                        const healthcheck = service.healthcheck;
                        if (healthcheck.test.length > 0) {
                            this.#_write(`healthcheck:`).#_incIndent();

                            this.#_write(`test: [${healthcheck.test.map(c => `"${c}"`).join(', ')}]`);
                            if (healthcheck.interval) { this.#_write(`interval: ${healthcheck.interval}`); }
                            if (healthcheck.retries) { this.#_write(`retries: ${healthcheck.retries}`); }
                            if (healthcheck.timeout) { this.#_write(`timeout: ${healthcheck.timeout}`); }
                            if (healthcheck.start_period) { this.#_write(`start_period: ${healthcheck.start_period}`); }
                            if (healthcheck.disable) { this.#_write(`disable: ${healthcheck.disable}`); }

                            this.#_decIndent();
                        }
                    }

                    if (service.external_links.length > 0) {
                        this.#_write(`external_links:`).#_incIndent();

                        for (const link of service.external_links) {
                            if (helpers.hasOwnProperty(link, 'internalContainerName')) {
                                this.#_write(`- ${link.externalContainerName}:${link.internalContainerName}`);
                            } else {
                                this.#_write(`- ${link.externalContainerName}`);
                            }
                        }

                        this.#_decIndent();
                    }

                    if (service.secrets.length > 0) {
                        this.#_write(`secrets:`).#_incIndent();

                        for (const secret of service.secrets) {
                            this.#_write(`- ${secret}`);
                        }

                        this.#_decIndent();
                    }

                    if (service.deploy) {
                        const deploy = service.deploy;
                        this.#_write(`deploy:`).#_incIndent();

                        if (deploy.mode) { this.#_write(`mode: ${deploy.mode}`); }
                        if (deploy.replicas) { this.#_write(`replicas: ${deploy.replicas}`); }
                        if (deploy.labels && Object.keys(deploy.labels).length > 0) {
                            this.#_write(`labels:`).#_incIndent();

                            for (const [key, value] of Object.entries(deploy.labels)) {
                                this.#_write(`${key}: ${value}`);
                            }

                            this.#_decIndent();
                        }

                        if (deploy.update_config && Object.keys(deploy.update_config).length > 0) {
                            const update_config = deploy.update_config;
                            this.#_write(`update_config:`).#_incIndent();

                            if (update_config.parallelism) { this.#_write(`parallelism: ${update_config.parallelism}`); }
                            if (update_config.delay) { this.#_write(`delay: ${update_config.delay}`); }
                            if (update_config.failure_action) { this.#_write(`failure_action: ${update_config.failure_action}`); }
                            if (update_config.monitor) { this.#_write(`monitor: ${update_config.monitor}`); }
                            if (update_config.max_failure_ratio) { this.#_write(`max_failure_ratio: ${update_config.max_failure_ratio}`); }
                            if (update_config.order) { this.#_write(`order: ${update_config.order}`); }

                            this.#_decIndent();
                        }

                        if (deploy.rollback_config && Object.keys(deploy.rollback_config).length > 0) {
                            const rollback_config = deploy.rollback_config;
                            this.#_write(`rollback_config:`).#_incIndent();

                            if (rollback_config.delay) { this.#_write(`delay: ${rollback_config.delay}`); }
                            if (rollback_config.failure_action) { this.#_write(`failure_action: ${rollback_config.failure_action}`); }
                            if (rollback_config.monitor) { this.#_write(`monitor: ${rollback_config.monitor}`); }
                            if (rollback_config.max_failure_ratio) { this.#_write(`max_failure_ratio: ${rollback_config.max_failure_ratio}`); }
                            if (rollback_config.order) { this.#_write(`order: ${rollback_config.order}`); }

                            this.#_decIndent();
                        }

                        if (deploy.restart_policy && Object.keys(deploy.restart_policy).length > 0) {
                            const restart_policy = deploy.restart_policy;
                            this.#_write(`restart_policy:`).#_incIndent();

                            if (restart_policy.condition) { this.#_write(`condition: ${restart_policy.condition}`); }
                            if (restart_policy.delay) { this.#_write(`delay: ${restart_policy.delay}`); }
                            if (restart_policy.max_attempts) { this.#_write(`max_attempts: ${restart_policy.max_attempts}`); }
                            if (restart_policy.window) { this.#_write(`window: ${restart_policy.window}`); }

                            this.#_decIndent();
                        }

                        if (deploy.placement && Object.keys(deploy.placement).length > 0) {
                            const placement = deploy.placement;
                            this.#_write(`placement:`).#_incIndent();

                            if (Array.isArray(placement.constraints) && placement.constraints.length > 0) {
                                const constraints = placement.constraints;
                                this.#_write(`constraints:`).#_incIndent();

                                for (const constraint of constraints) {
                                    this.#_write(`- ${constraint}`);
                                }

                                this.#_decIndent();
                            }

                            if (Array.isArray(placement.preferences) && placement.preferences.length > 0) {
                                const preferences = placement.preferences.filter(preference => preference.spread);
                                if (preferences.length > 0) {
                                    this.#_write(`preferences:`).#_incIndent();

                                    for (const preference of preferences) {
                                        this.#_write(`- spread: ${preference.spread}`);
                                    }

                                    this.#_decIndent();
                                }
                            }


                            this.#_decIndent();
                        }

                        if (deploy.endpoint_mode) { this.#_write(`endpoint_mode: ${deploy.endpoint_mode}`); }

                        if (deploy.resources && Object.keys(deploy.resources).length > 0) {
                            const resources = deploy.resources;
                            if (resources.limits || resources.reservations) {
                                this.#_write(`resources:`).#_incIndent();

                                if (resources.limits) {
                                    const limits = resources.limits;
                                    if (limits.memory || limits.cpus) {
                                        this.#_write(`limits:`).#_incIndent();

                                        if (limits.memory) { this.#_write(`memory: ${limits.memory}`); }
                                        if (limits.cpus) { this.#_write(`cpus: ${limits.cpus}`); }

                                        this.#_decIndent();
                                    }
                                }

                                if (resources.reservations) {
                                    const reservations = resources.reservations;
                                    if (reservations.memory || reservations.cpus) {
                                        this.#_write(`reservations:`).#_incIndent();

                                        if (reservations.memory) { this.#_write(`memory: ${reservations.memory}`); }
                                        if (reservations.cpus) { this.#_write(`cpus: ${reservations.cpus}`); }

                                        this.#_decIndent();
                                    }
                                }

                                this.#_decIndent();
                            }
                        }
                    }

                    if (service.security_opt && service.security_opt.length > 0) {
                        this.#_write(`security_opt: ${service.security_opt}`);

                        for (const security_opt of service.security_opt) {
                            this.#_write(`- ${security_opt}`);
                        }

                        this.#_decIndent();
                    }

                    if (service.configs && service.configs.length > 0) {
                        const configs = service.configs;
                        this.#_write(`configs:`).#_incIndent();

                        for (const config of configs) {
                            this.#_write(`- ${config.source}`);
                            this.#_write(`  target: ${config.target}`);

                            if (config.mode) {
                                const getModeCode = (value: ServiceConfigMode | ServiceConfigMode[] | undefined): number => {
                                    if (!value) { return 0 }
                                    if (!Array.isArray(value)) { value = [value] }
                                    let mode = 0;

                                    const modes = Array.from(new Set(value));
                                    for (const permission of modes) {
                                        switch (permission) {
                                            case 'read': mode += 4; break;
                                            case 'write': mode += 2; break;
                                            case 'exec': mode += 1; break;
                                        }
                                    }

                                    return mode;
                                }

                                const owner = getModeCode(config.mode.owner);
                                const group = getModeCode(config.mode.group);
                                const others = getModeCode(config.mode.others);
                                this.#_write('  # The numbers below represent the octal value of the permissions');
                                this.#_write('  # To learn more about the octal value of a permission, see https://en.wikipedia.org/wiki/Octal');
                                this.#_write(`  mode: 0${owner}${group}${others}`);
                            }
                        }

                        this.#_decIndent();
                    }

                    this.#_decIndent();
                }

                this.#_decIndent().#_newLine();
                return this;
            },
            volumes: () => {
                const volumes = Object.values(this.#_container.volumes.list);
                if (volumes.length === 0) { return this; }

                this.#_write(`volumes:`).#_incIndent();

                for (const volume of volumes) {
                    this.#_write(`${volume.name}:`).#_incIndent();

                    if (volume.external) {
                        if (typeof volume.external === 'boolean' && volume.external) {
                            this.#_write(`external: ${volume.external}`);
                        } else if (typeof volume.external === 'object' && 'name' in volume.external) {
                            this.#_write(`external:`).#_incIndent();
                            this.#_write(`name: ${volume.external.name}`);
                            this.#_decIndent();
                        }
                    } else {
                        if (volume.driver) { this.#_write(`driver: ${volume.driver}`); }

                        if (volume.driverOpts) {
                            this.#_write(`driver_opts:`).#_incIndent();

                            for (const [key, value] of Object.entries(volume.driverOpts)) {
                                if (typeof value === 'string' || typeof value === 'number') {
                                    this.#_write(`${key}: ${value}`);
                                } else if (Array.isArray(value)) {
                                    this.#_write(`${key}:`).#_incIndent();

                                    for (const item of value) {
                                        this.#_write(`- ${item}`);
                                    }

                                    this.#_decIndent();
                                } else if (typeof value === 'object' && Object.keys(value).length > 0) {
                                    this.#_write(`${key}:`).#_incIndent();

                                    for (const [key2, value2] of Object.entries(value)) {
                                        this.#_write(`${key2}: ${value2}`);
                                    }

                                    this.#_decIndent();
                                }
                            }

                            this.#_decIndent();
                        }

                        if (volume.labels) {
                            this.#_write(`labels:`).#_incIndent();
                            for (const [key, value] of Object.entries(volume.labels)) {
                                this.#_write(`${key}: "${value}"`);
                            }

                            this.#_decIndent();
                        }

                        if (volume.scope) { this.#_write(`scope: ${volume.scope}`); }
                        if (volume.accessMode) { this.#_write(`accessMode: ${volume.accessMode}`); }
                        if (volume.tmpfs) { this.#_write(`tmpfs: ${volume.tmpfs}`); }
                        if (volume.size) { this.#_write(`size: ${volume.size}`); }
                    }

                    this.#_decIndent();
                }

                this.#_decIndent().#_newLine();
                return this;
            },
            networks: () => {
                const networks = Object.values(this.#_container.networks.list);
                if (networks.length === 0) { return this; }

                this.#_write(`networks:`).#_incIndent();
                for (const network of networks) {
                    this.#_write(`${network.name}:`).#_incIndent();
                    this.#_write(`name: ${network.name}`);

                    if (network.external) {
                        this.#_write(`external: ${network.external}`);
                    } else {
                        this.#_write(`driver: ${network.driver}`);

                        if (network.driverOpts && Object.keys(network.driverOpts).length > 0) {
                            this.#_write(`driver_opts:`).#_incIndent();

                            for (const [key, value] of Object.entries(network.driverOpts)) {
                                this.#_write(`${key}: ${value}`);
                            }

                            this.#_decIndent();
                        }

                        if (network.ipam) {
                            if (network.ipam.driver || network.ipam.config) {
                                this.#_write(`ipam:`).#_incIndent();

                                if (network.ipam.driver) { this.#_write(`driver: ${network.ipam.driver}`); }

                                if (network.ipam.config && network.ipam.config.length > 0) {
                                    this.#_write(`config:`).#_incIndent();
                                    if (network.ipam.config.length === 1) {
                                        const config = network.ipam.config[0];
                                        this.#_write(`- subnet: ${config.subnet}`);
                                        if (config.gateway) { this.#_write(`  gateway: ${config.gateway}`); }
                                        if (config.ipRange) { this.#_write(`  ip_range: ${config.ipRange}`); }
                                        if (config.auxAddress && Object.keys(config.auxAddress).length > 0) {
                                            this.#_write(`  aux_address:`).#_incIndent();
                                            for (const [key, value] of Object.entries(config.auxAddress)) {
                                                this.#_write(`${key}: "${value}"`);
                                            }

                                            this.#_decIndent();
                                        }
                                    }

                                    this.#_decIndent();
                                }

                                this.#_decIndent();
                            }
                        }

                        if (network.internal) { this.#_write(`internal: ${network.internal}`); }
                        if (network.enableIpv6) { this.#_write(`enable_ipv6: ${network.enableIpv6}`); }
                        if (network.labels && Object.keys(network.labels).length > 0) {
                            this.#_write(`labels:`).#_incIndent();
                            for (const [key, value] of Object.entries(network.labels)) {
                                this.#_write(`${key}: "${value}"`);
                            }

                            this.#_decIndent();
                        }
                    }

                    this.#_decIndent();
                }

                this.#_decIndent().#_newLine();
                return this;
            },
            secrets: () => {
                const secrets = Object.values(this.#_container.secrets.list);
                if (secrets.length === 0) { return this; }

                this.#_write(`secrets:`).#_incIndent();

                for (const secret of secrets) {
                    this.#_write(`${secret.name}:`).#_incIndent();

                    if (secret.external === true) {
                        this.#_write(`${secret.name}:`).#_incIndent();
                        this.#_write(`external: true`);
                        this.#_decIndent();
                    } else if (secret.file) {
                        this.#_write(`file: ${secret.file}`);
                    } else {
                        throw new Error(`Secret "${secret.name}" must have either "external: true" or a "file" defined.`);
                    }

                    this.#_decIndent();
                }

                this.#_decIndent().#_newLine();
                return this;
            },
            configs: () => {
                const configs = Object.values(this.#_container.configs.list);
                if (configs.length === 0) { return this; }

                this.#_write(`configs:`).#_incIndent();

                for (const config of configs) {
                    this.#_write(`${config.name}:`).#_incIndent();
                    this.#_write(`file: ${config.filePath}`);
                    this.#_decIndent();
                }

                this.#_decIndent().#_newLine();
                return this;
            },
            env_files: () => {
                return this;
                /**
                 * As of Docker Compose v2, specifying `env_files` at the root
                 * level is not supported. Will enable this feature once it is.
                 */
                const env_files = this.#_container.env_files;
                if (env_files.length === 0) { return this; }

                this.#_write(`env_file:`).#_incIndent();
                for (const env_file of env_files) {
                    this.#_write(`- ${env_file}`);
                }

                this.#_decIndent().#_newLine();
                return this;
            }
        }
    }

    /**
     * Generates the compose yaml content
     * @returns {string} The compose yaml content
     */
    generate(): string {
        if (this.#_generating) { throw new Error('Cannot generate Dockerfile while already generating.'); }
        this.#_generating = true;
        this.#_lines = [];

        this.#_helpers.generate.services();
        this.#_helpers.generate.volumes();
        this.#_helpers.generate.networks();
        this.#_helpers.generate.secrets();
        this.#_helpers.generate.configs();
        this.#_helpers.generate.env_files();

        this.#_generating = false;
        return this.#_lines.join('');
    }
}

export default ComposeBuilder;