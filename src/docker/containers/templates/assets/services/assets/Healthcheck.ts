import helpers from "../../../../../../utils/helpers";
import { HealthcheckData } from "./docs";

/**
 * Represents a health check configuration for a service.
 * Provides methods to set and get various health check properties.
 */
class Healthcheck {
    #_healthcheck: HealthcheckData = {
        /**Command to run to check health */
        test: [] as string[],
        /**Time between checks (default: 30s) */
        interval: '30s',
        /**Number of retries before marking as unhealthy (default: 3) */
        retries: 3,
        /**Initial grace period before starting checks (default: 0s) */
        start_period: '0s',
        /**Maximum time for the health check to run (default: 30s) */
        timeout: '10s',
        /**Whether to disable the health check (default: false) */
        disable: false
    }

    /**
     * Converts the health check configuration to a JSON object.
     * 
     * @returns {HealthcheckData} A JSON object containing the health check configuration.
     * The object contains the following properties:
     * - `test`: An array of strings representing the command to run to check health.
     * - `interval`: A string specifying the time between checks.
     * - `retries`: A number indicating the number of retries before marking as unhealthy.
     * - `start_period`: A string denoting the initial grace period before starting checks.
     * - `timeout`: A string defining the maximum time for the health check to run.
     * - `disable`: A boolean to indicate whether to disable the health check.
     */
    toJSON(): HealthcheckData {
        return {
            test: [...this.test],
            interval: this.interval,
            retries: this.retries,
            start_period: this.start_period,
            timeout: this.timeout,
            disable: this.disable
        };
    }

    /**
     * Sets the health check configuration for the service.
     * Validates and assigns the provided health check data to the internal
     * configuration. The 'test' property is mandatory, while other properties
     * are optional but must be of specific types if provided.
     *
     * @param value An object containing health check configuration. It must include:
     *              - `test`: An array of strings representing the command to run to check health.
     *              - `interval` (optional): A string specifying the time between checks.
     *              - `retries` (optional): A number indicating the number of retries before marking as unhealthy.
     *              - `start_period` (optional): A string denoting the initial grace period before starting checks.
     *              - `timeout` (optional): A string defining the maximum time for the health check to run.
     *              - `disable` (optional): A boolean to indicate whether to disable the health check.
     * 
     * @throws {Error} If the provided value is not an object or if the 'test' property is missing.
     * @throws {TypeError} If any provided property is not of the expected type.
     */
    set(value: HealthcheckData) {
        // First, validate that the value is an object and not null
        if (typeof value !== 'object' || value === null) {
            throw new Error("The 'healthcheck' value must be an object.");
        }

        if (helpers.hasOwnProperty(value, 'test')) { this.test = value.test } else { throw new Error("The 'test' property is required."); }

        if (helpers.hasOwnProperty(value, 'interval')) {
            if (typeof value.interval !== 'string') { throw new TypeError("The 'interval' property must be a string (e.g., '30s')."); }
            this.interval = value.interval;
        }

        if (helpers.hasOwnProperty(value, 'retries')) {
            if (typeof value.retries !== 'number') { throw new TypeError("The 'retries' property must be a number."); }
            this.retries = value.retries;
        }

        if (helpers.hasOwnProperty(value, 'start_period')) {
            if (typeof value.start_period !== 'string') { throw new TypeError("The 'start_period' property must be a string (e.g., '0s')."); }
            this.start_period = value.start_period;
        }

        if (helpers.hasOwnProperty(value, 'timeout')) {
            if (typeof value.timeout !== 'string') { throw new TypeError("The 'timeout' property must be a string (e.g., '10s')."); }
            this.timeout = value.timeout;
        }

        if (helpers.hasOwnProperty(value, 'disable')) {
            if (typeof value.disable !== 'boolean') { throw new TypeError("The 'disable' property must be a boolean."); }
            this.disable = value.disable;
        }

        return this;
    }

    /**
    * Returns the test commands for the health check.
    * 
    * @returns {string[]} An array of strings representing the commands to run for the health check.
    */
    get test(): string[] { return this.#_healthcheck.test }

    /**
     * Returns the interval between health check attempts.
     * 
     * @returns {string|undefined} A string specifying the time between checks, or undefined if not set.
     */
    get interval(): string | undefined { return this.#_healthcheck.interval }

    /**
     * Returns the number of retries before marking as unhealthy.
     * 
     * @returns {number|undefined} A number indicating the number of retries, or undefined if not set.
     */
    get retries(): number | undefined { return this.#_healthcheck.retries }

    /**
     * Returns the initial grace period before starting checks.
     * 
     * @returns {string|undefined} A string denoting the initial grace period, or undefined if not set.
     */
    get start_period(): string | undefined { return this.#_healthcheck.start_period }

    /**
     * Returns the maximum time for the health check to run.
     * 
     * @returns {string|undefined} A string defining the maximum time, or undefined if not set.
     */
    get timeout(): string | undefined { return this.#_healthcheck.timeout }

    /**
     * Returns whether the health check is disabled.
     * 
     * @returns {boolean|undefined} A boolean indicating whether the health check is disabled, or undefined if not set.
     */
    get disable(): boolean | undefined { return this.#_healthcheck.disable }

    /**
     * Sets the health check test commands.
     * The test property is required and must be a non-empty array of strings.
     * 
     * @param value An array of strings representing the commands to run
     *              for the health check.
     * 
     * @throws {Error} If the provided value is not a non-empty array of strings.
     */
    set test(value: string[]) {
        // Validate the 'test' property (must be a non-empty array of strings)
        if (!Array.isArray(value) || value.length === 0) {
            throw new Error("The 'test' property must be a non-empty array.");
        }

        this.#_healthcheck.test = value;
    }


    /**
     * Sets the interval between health check attempts.
     * The interval property is optional and must be a string if provided.
     * If provided, it must be a duration string (e.g., '30s', '1m', etc.).
     * If not provided, the default interval is 30 seconds.
     * 
     * @param value A string representing the interval between health check attempts.
     *              If not provided, the default interval is 30 seconds.
     * 
     * @throws {Error} If the provided value is not a string.
     */
    set interval(value: string) {
        // Validate the 'interval' property (must be a string if provided)
        if (value && typeof value !== 'string') {
            throw new Error("The 'interval' property must be a string (e.g., '30s').");
        }

        this.#_healthcheck.interval = value;
    }


    /**
     * Sets the number of times to retry the health check before marking
     * the service as unhealthy.
     * The retries property is optional and must be a non-negative number
     * if provided. If not provided, the default number of retries is 3.
     * 
     * @param value A non-negative number representing the number of
     *              times to retry the health check before marking the
     *              service as unhealthy.
     *              If not provided, the default number of retries is 3.
     * 
     * @throws {Error} If the provided value is not a non-negative number.
     */
    set retries(value: number) {
        // Validate the 'retries' property (must be a non-negative number if provided)
        if (value !== undefined && (typeof value !== 'number' || value < 0)) {
            throw new Error("The 'retries' property must be a non-negative number.");
        }

        this.#_healthcheck.retries = value
    }

    /**
     * Sets the initial grace period before starting health checks.
     * The start_period property is optional and must be a string if provided.
     * If provided, it should be a duration string (e.g., '0s', '1s', etc.).
     * 
     * @param value A string representing the initial grace period before starting
     *              health checks. If not provided, the default start period is 0 seconds.
     * 
     * @throws {Error} If the provided value is not a string.
     */
    set start_period(value: string) {
        // Validate the 'start_period' property (must be a string if provided)
        if (value && typeof value !== 'string') {
            throw new Error("The 'start_period' property must be a string (e.g., '0s').");
        }

        this.#_healthcheck.start_period = value
    }

    /**
     * Sets the maximum time to wait for a health check to complete before
     * considering it as failed. The timeout property is optional and must
     * be a string if provided. If provided, it should be a duration string
     * (e.g., '10s', '1m', etc.).
     * 
     * @param value A string representing the maximum time to wait for a
     *              health check to complete. If not provided, the default
     *              timeout is 30 seconds.
     * 
     * @throws {Error} If the provided value is not a string.
     */
    set timeout(value: string) {
        // Validate the 'timeout' property (must be a string if provided)
        if (value && typeof value !== 'string') {
            throw new Error("The 'timeout' property must be a string (e.g., '10s').");
        }

        this.#_healthcheck.timeout = value
    }

    /**
     * Disables the health check if set to true.
     * @param value A boolean indicating whether to disable the health check.
     *              If not provided, the default value is false (health check is enabled).
     * @throws {Error} If the provided value is not a boolean.
     */
    set disable(value: boolean) {
        // Validate the 'disable' property (must be a boolean if provided)
        if (value !== undefined && typeof value !== 'boolean') {
            throw new Error("The 'disable' property must be a boolean.");
        }

        this.#_healthcheck.disable = value
    }
}

export default Healthcheck;