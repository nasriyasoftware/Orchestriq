import { ResourceLimits, ServiceDeploymentData, ResourceConfig, ResourceReservations, RestartPolicyConfig, Placement, ServiceUpdateConfig } from "./docs";

class ServiceDeployment {
    #_data: ServiceDeploymentData = {}

    #_helpers = {
        validateUpdateConfig: (value: ServiceUpdateConfig, type: 'update_config' | 'rollback_config') => {
            const cofigs: ServiceUpdateConfig = {};
            if ('parallelism' in value) {
                if (typeof value.parallelism !== 'number') { throw new TypeError(`The deployment's '${type}.parallelism' property (when defined) must be a number.`); }
                if (value.parallelism < 1) { throw new SyntaxError(`The deployment's '${type}.parallelism' property must be greater than 0.`); }
                cofigs.parallelism = value.parallelism;
            }

            if ('delay' in value) {
                if (typeof value.delay !== 'string') { throw new TypeError(`The deployment's '${type}.delay' property (when defined) must be a string (e.g., '30s').`); }
                cofigs.delay = value.delay;
            }

            if ('failure_action' in value) {
                if (value.failure_action !== 'continue' && value.failure_action !== 'pause' && value.failure_action !== 'rollback') {
                    throw new SyntaxError(`The deployment's '${type}.failure_action' property must be one of 'continue', 'pause' or 'rollback'.`)
                }
                cofigs.failure_action = value.failure_action;
            }

            if ('monitor' in value) {
                if (typeof value.monitor !== 'string') { throw new TypeError(`The deployment's '${type}.monitor' property (when defined) must be a string.`); }
                cofigs.monitor = value.monitor;
            }

            if ('max_failure_ratio' in value) {
                if (typeof value.max_failure_ratio !== 'number') { throw new TypeError(`The deployment's '${type}.max_failure_ratio' property (when defined) must be a number.`); }
                if (value.max_failure_ratio < 0) { throw new SyntaxError(`The deployment's '${type}.max_failure_ratio' property must be greater than or equal to 0.`); }
                cofigs.max_failure_ratio = value.max_failure_ratio;
            }

            if ('order' in value) {
                if (value.order !== 'start-first' && value.order !== 'stop-first') { throw new SyntaxError(`The deployment's '${type}.order' property must be 'start-first' or 'stop-first'.`); }
                cofigs.order = value.order;
            }

            return cofigs;
        }
    }

    constructor(data?: ServiceDeploymentData) {
        if (typeof data === 'object' && Object.keys(data).length > 0) {
            if ('mode' in data && data.mode) { this.mode = data.mode; }
            if ('replicas' in data && data.replicas) { this.replicas = data.replicas; }
            if ('labels' in data && data.labels) { this.labels = data.labels; }
            if ('update_config' in data && data.update_config) { this.update_config = data.update_config; }
            if ('rollback_config' in data && data.rollback_config) { this.rollback_config = data.rollback_config; }
            if ('restart_policy' in data && data.restart_policy) { this.restart_policy = data.restart_policy; }
            if ('placement' in data && data.placement) { this.placement = data.placement; }
            if ('endpoint_mode' in data && data.endpoint_mode) { this.endpoint_mode = data.endpoint_mode; }
            if ('resources' in data && data.resources) { this.resources = data.resources; }
        }
    }

    /**
     * Retrieves the endpoint mode for the service deployment.
     * 
     * @returns {string|undefined} A string indicating the endpoint mode, either 'vip' or 'dnsrr', or undefined if not set.
     */
    get endpoint_mode(): string | undefined { return this.#_data.endpoint_mode }

    /**
     * Sets the endpoint mode for the service deployment.
     * The endpoint mode determines how the service is accessed.
     * 
     * @param value A string indicating the endpoint mode, either 'vip' or 'dnsrr'.
     * @throws {SyntaxError} If the provided value is not 'vip' or 'dnsrr'.
     */
    set endpoint_mode(value: "vip" | "dnsrr") {
        if (value !== 'vip' && value !== 'dnsrr') { throw new SyntaxError(`The deployment's 'endpoint_mode' property must be 'vip' or 'dnsrr'.`); }
        this.#_data.endpoint_mode = value;
    }

    /**
     * Retrieves the resource configuration for the service deployment.
     * 
     * @returns {ResourceConfig | undefined} An object containing the resource limits and reservations, or undefined if not set.
     */
    get resources(): ResourceConfig | undefined { return this.#_data.resources }

    /**
     * Sets the resources for the service deployment.
     * The resources determine how many resources (e.g., memory, CPU) should be allocated to the service.
     * If the resources are not set, the service will use the default resources.
     * @param value An object containing the resource configuration.
     *              - The 'limits' property must be an object with 'cpu' and/or 'memory' properties, each of which must be a string.
     *              - The 'reservations' property must be an object with 'cpus' and/or 'memory' properties, each of which must be a string.
     * @throws {SyntaxError} If the provided value does not meet the required structure.
     * @throws {TypeError} If the provided value is not a non-empty object.
     */
    set resources(value: ResourceConfig) {
        if (!(typeof value === 'object' && Object.keys(value).length > 0)) { throw new SyntaxError(`The deployment's 'resources' property (when defined) must be an object with at least one property.`); }

        const configs: ResourceConfig = {}
        if ('limits' in value) {
            if (!(typeof value.limits === 'object' && Object.keys(value.limits).length > 0)) { throw new SyntaxError(`The deployment's 'resources.limits' property (when defined) must be an object with at least one property.`); }

            const limits: ResourceLimits = {};
            if ('cpu' in value.limits) {
                if (typeof value.limits.cpu !== 'string') { throw new TypeError(`The deployment's 'resources.limits.cpu' property (when defined) must be a string.`); }
                limits.cpus = value.limits.cpu;
            }

            if ('memory' in value.limits) {
                if (typeof value.limits.memory !== 'string') { throw new TypeError(`The deployment's 'resources.limits.memory' property (when defined) must be a string.`); }
                limits.memory = value.limits.memory;
            }

            if (Object.keys(limits).length > 0) { configs.limits = limits; }
        }

        if ('reservations' in value) {
            if (!(typeof value.reservations === 'object' && Object.keys(value.reservations).length > 0)) { throw new SyntaxError(`The deployment's 'resources.reservations' property (when defined) must be an object with at least one property.`); }

            const reservations: ResourceReservations = {};
            if ('cpus' in value.reservations) {
                if (typeof value.reservations.cpus !== 'string') { throw new TypeError(`The deployment's 'resources.reservations.cpus' property (when defined) must be a string.`); }
                reservations.cpus = value.reservations.cpus;
            }

            if ('memory' in value.reservations) {
                if (typeof value.reservations.memory !== 'string') { throw new TypeError(`The deployment's 'resources.reservations.memory' property (when defined) must be a string.`); }
                reservations.memory = value.reservations.memory;
            }

            if (Object.keys(reservations).length > 0) { configs.reservations = reservations; }
        }

        this.#_data.resources = Object.keys(configs).length > 0 ? configs : undefined;
    }

    /**
     * Retrieves the deployment mode for the service.
     * The mode determines how the service will be deployed.
     * If the mode is 'global', the service is deployed to all nodes.
     * If the mode is 'replicated', the service is deployed with a specified number of replicas.
     * Defaults to 'global' if not explicitly set.
     * 
     * @returns {("global" | "replicated")} The deployment mode of the service.
     */
    get mode(): "global" | "replicated" { return this.#_data.mode || 'global' }

    /**
     * Sets the deployment mode for the service.
     * The mode determines how the service will be deployed.
     * If the mode is 'global', the service is deployed to all nodes.
     * If the mode is 'replicated', the service is deployed with a specified number of replicas.
     * When set to 'global', the replicas property is undefined.
     * 
     * @param value A string indicating the deployment mode, either 'global' or 'replicated'.
     * @throws {SyntaxError} If the provided value is not 'global' or 'replicated'.
     */
    set mode(value: "global" | "replicated") {
        if (value !== 'global' && value !== 'replicated') { throw new SyntaxError("The deployment's 'mode' property must be either 'global' or 'replicated'.") }
        if (value === 'global') { this.#_data.replicas = undefined }
        this.#_data.mode = value;
    }

    /**
     * Retrieves the number of replicas for the service.
     * If the mode is 'replicated', this property is set.
     * If the mode is 'global', this property is undefined.
     * @returns {number | undefined} The number of replicas for the service, or undefined if the mode is 'global'.
     */
    get replicas(): number | undefined { return this.mode === 'replicated' ? this.#_data.replicas : undefined }

    /**
     * Sets the number of replicas for the service.
     * The number of replicas determines how many service tasks to run.
     * If the mode is 'replicated', the replicas property must be set.
     * When set to 'global', the replicas property is undefined.
     * 
     * @param value A number indicating the number of replicas, which must be greater than 0.
     * @throws {TypeError} If the provided value is not a number.
     * @throws {SyntaxError} If the provided value is not greater than 0 or if the mode is not 'replicated'.
     */
    set replicas(value: number) {
        if (this.mode === 'replicated') {
            if (typeof value !== 'number') { throw new TypeError("The deployment's 'replicas' property must be a number."); }
            if (value < 1) { throw new SyntaxError("The deployment's 'replicas' property must be greater than 0."); }
            this.#_data.replicas = value;
        } else {
            throw new SyntaxError("The deployment's 'replicas' property can only be set when the 'mode' property is set to 'replicated'.");
        }
    }

    /**
     * Retrieves the labels for the service deployment.
     * The labels are a set of key-value pairs that can be used to identify or categorize the deployment.
     * If not set, undefined is returned.
     * 
     * @returns {Record<string, string> | undefined} An object containing key-value pairs of labels, or undefined if not set.
     */
    get labels(): Record<string, string> | undefined { return this.#_data.labels }

    /**
     * Sets the labels for the service deployment.
     * The labels are a set of key-value pairs that can be used to identify or categorize the deployment.
     * The keys must be strings and the values must be strings.
     * The labels must be non-empty.
     * @param value A non-empty object containing key-value pairs of labels.
     * @throws {TypeError} If the labels are not a non-empty object or if the values are not strings.
     * @throws {RangeError} If any of the values are empty.
     */
    set labels(value: Record<string, string>) {
        if (!(typeof value === 'object' && Object.keys(value).length > 0)) { throw new TypeError("The deployment's 'labels' property must be a non-empty object."); }
        for (const [key, val] of Object.entries(value)) {
            if (typeof val !== 'string') { throw new TypeError(`The deployment's label '${key}' must be a string, instead of ${typeof val}.`); }
            if (val.length === 0) { throw new RangeError(`The deployment's label '${key}' must not be empty.`); }
        }
        this.#_data.labels = value;
    }

    /**
     * Retrieves the update configuration for the service deployment.
     * The update configuration defines how the service should be updated.
     * If not set, undefined is returned.
     * 
     * @returns {UpdateConfig | undefined} An object containing the update configuration, or undefined if not set.
     */
    get update_config(): ServiceUpdateConfig | undefined { return this.#_data.update_config }

    /**
     * Sets the update configuration for the service deployment.
     * Validates and assigns the provided update configuration data to the internal configuration.
     *
     * @param value An object containing the update configuration. It must be a non-empty object.
     * 
     * @throws {TypeError} If the provided value is not a non-empty object.
     */
    set update_config(value: ServiceUpdateConfig) {
        if (!(typeof value === 'object' && Object.keys(value).length > 0)) { throw new TypeError("The deployment's 'update_config' property must be a non-empty object."); }

        const configs = this.#_helpers.validateUpdateConfig(value, 'update_config');
        this.#_data.update_config = Object.keys(configs).length > 0 ? configs : undefined;
    }

    /**
     * Retrieves the rollback configuration for the service deployment.
     * The rollback configuration defines how the service should revert
     * to a previous version in case of an update failure.
     * If not set, undefined is returned.
     * 
     * @returns {UpdateConfig | undefined} An object containing the rollback configuration, or undefined if not set.
     */
    get rollback_config(): ServiceUpdateConfig | undefined { return this.#_data.rollback_config }

    /**
     * Sets the rollback configuration for the service deployment.
     * Validates and assigns the provided rollback configuration data to the internal configuration.
     *
     * @param value An object containing the rollback configuration. It must be a non-empty object.
     * 
     * @throws {TypeError} If the provided value is not a non-empty object.
     */
    set rollback_config(value: ServiceUpdateConfig) {
        if (!(typeof value === 'object' && Object.keys(value).length > 0)) { throw new TypeError("The deployment's 'rollback_config' property must be a non-empty object."); }

        const configs = this.#_helpers.validateUpdateConfig(value, 'rollback_config');
        this.#_data.rollback_config = Object.keys(configs).length > 0 ? configs : undefined;
    }

    /**
     * Retrieves the restart policy configuration for the service deployment.
     * The restart policy defines the conditions under which a service should be restarted, any delays
     * between restarts, the maximum number of restart attempts, and the time window for 
     * determining whether a service is failing.
     * If not set, undefined is returned.
     * 
     * @returns {RestartPolicyConfig | undefined} An object containing the restart policy configuration, or undefined if not set.
     */
    get restart_policy(): RestartPolicyConfig | undefined { return this.#_data.restart_policy }

    /**
     * Sets the restart policy configuration for the service deployment.
     * This method validates and assigns the provided restart policy data to the internal configuration.
     * The restart policy defines the conditions under which a service should be restarted, any delays
     * between restarts, the maximum number of restart attempts, and the time window for restart attempts.
     *
     * @param value An object containing the restart policy configuration. It must include:
     *              - `condition` (optional): A string representing the restart condition. Valid values
     *                are 'none', 'on-failure', or 'any'.
     *              - `delay` (optional): A string indicating the delay between restart attempts (e.g., '30s').
     *              - `max_attempts` (optional): A number specifying the maximum number of restart attempts.
     *                Must be greater than 0 if provided.
     *              - `window` (optional): A string defining the time window for restart attempts (e.g., '5m').
     * 
     * @throws {TypeError} If the provided value is not a non-empty object or if any property has an incorrect type.
     * @throws {SyntaxError} If any property has an invalid value.
     */
    set restart_policy(value: RestartPolicyConfig) {
        if (!(typeof value === 'object' && Object.keys(value).length > 0)) { throw new TypeError("The deployment's 'restart_policy' property must be a non-empty object."); }

        const configs: RestartPolicyConfig = {};
        if ('condition' in value) {
            if (typeof value.condition !== 'string') { throw new TypeError(`The deployment's 'restart_policy.condition' property must be a string, instead of ${typeof value.condition}.`); }
            if (value.condition !== 'none' && value.condition !== 'on-failure' && value.condition !== 'any') {
                throw new SyntaxError(`The deployment's 'restart_policy.condition' property must be one of 'none', 'on-failure' or 'any'.`)
            }

            configs.condition = value.condition;
        }

        if ('delay' in value) {
            if (typeof value.delay !== 'string') { throw new TypeError(`The deployment's 'restart_policy.delay' property must be a string (e.g., '30s'), instead of ${typeof value.delay}.`); }
            configs.delay = value.delay;
        }

        if ('max_attempts' in value) {
            if (typeof value.max_attempts !== 'number') { throw new TypeError(`The deployment's 'restart_policy.max_attempts' property must be a number, instead of ${typeof value.max_attempts}.`); }
            if (value.max_attempts < 1) { throw new SyntaxError("The deployment's 'restart_policy.max_attempts' property must be greater than 0."); }
            configs.max_attempts = value.max_attempts;
        }

        if ('window' in value) {
            if (typeof value.window !== 'string') { throw new TypeError(`The deployment's 'restart_policy.window' property must be a string (e.g., '5m'), instead of ${typeof value.window}.`); }
            configs.window = value.window;
        }

        this.#_data.restart_policy = Object.keys(configs).length > 0 ? configs : undefined;
    }

    /**
     * The placement of the service deployment.
     * This property is optional. If it is not set, the service will be distributed randomly across the available nodes.
     * @returns The placement of the service deployment, or undefined if it is not set.
     */
    get placement(): Placement | undefined { return this.#_data.placement }

    /**
     * Sets the placement of the service deployment.
     * The placement determines how the service should be distributed across the available nodes.
     * If the placement is not set, the service will be distributed randomly across the available nodes.
     * @param value An object containing the placement configuration.
     *              - The 'constraints' property must be an array of strings.
     *              - The 'preferences' property must be an array of objects, where each object has a 'spread' property that must be a string.
     *              - The 'max_replicas_per_node' property must be a number greater than 0.
     * @throws {TypeError} If the provided value is not a non-empty object.
     * @throws {SyntaxError} If the provided value does not meet the required structure.
     */
    set placement(value: Placement) {
        if (!(typeof value === 'object' && Object.keys(value).length > 0)) { throw new TypeError("The deployment's 'placement' property must be a non-empty object."); }

        const placement: Placement = {};
        if ('constraints' in value) {
            if (!Array.isArray(value.constraints)) { throw new TypeError(`The deployment's 'placement.constraints' property (when defined) must be an array, instead of ${typeof value.constraints}.`); }
            if (!value.constraints.every((constraint) => typeof constraint === 'string')) { throw new TypeError(`The deployment's 'placement.constraints' property (when defined) must be an array of strings.`); }
            placement.constraints = value.constraints;
        }

        if ('preferences' in value) {
            if (!Array.isArray(value.preferences)) { throw new TypeError(`The deployment's 'placement.preferences' property (when defined) must be an array, instead of ${typeof value.preferences}.`); }

            const preferences: Placement['preferences'] = [];
            for (const preference of value.preferences) {
                if (!(typeof preference === 'object' && Object.keys(preference).length > 0)) { throw new TypeError(`The deployment's 'placement.preferences' property (when defined) must be an array of objects.`); }
                if ('spread' in preference) {
                    if (typeof preference.spread !== 'string') { throw new TypeError(`The deployment's 'placement.preferences.spread' property (when defined) must be a string, instead of ${typeof preference.spread}.`); }
                    preferences.push({ spread: preference.spread });
                }
            }

            placement.preferences = preferences;
        }

        if ('max_replicas_per_node' in value) {
            if (typeof value.max_replicas_per_node !== 'number') { throw new TypeError(`The deployment's 'placement.max_replicas_per_node' property must be a number, instead of ${typeof value.max_replicas_per_node}.`); }
            if (value.max_replicas_per_node < 1) { throw new SyntaxError("The deployment's 'placement.max_replicas_per_node' property must be greater than 0."); }
            placement.max_replicas_per_node = value.max_replicas_per_node;
        }

        this.#_data.placement = Object.keys(placement).length > 0 ? placement : undefined;
    }
}

export default ServiceDeployment;