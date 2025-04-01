import fs from 'fs';
import DockerfileTemplate from './DockerfileTemplate';
import { DockerfileArgItem, DockerfileCopyItem, DockerfileStageConfig, DockerfileStageOptions, NPMInstallConfigs, NPMInstallOptions } from './docs/docs';
import helpers from '../../../../../../utils/helpers';

class DockerfileStage {
    #_template: DockerfileTemplate;
    #_lines: string[] = [];
    #_generating: boolean = false;

    #_config: DockerfileStageConfig = {
        from: 'node:latest',
        as: '',
        workdir: undefined,
        ports: [],
        volumes: [],
        env: new Map(),
        args: [],
        run: [],
        cmd: [],
        entrypoint: undefined,
        buildUser: undefined,
        serviceUser: undefined,
        group: undefined,
        copy: [],
        predefinedCommands: []
    }

    #_predefinedCommands = {
        npm: {
            version: {
                value: undefined as string | undefined,
                addCommand: () => {
                    const version = this.#_predefinedCommands.npm.version.value;
                    const lines = [];
                    lines.push(`npm install npm${version && version !== 'latest' ? `@${version}` : ''} --unsafe-perm --no-progress`);
                    lines.push('rm -rf /usr/local/lib/node_modules/npm');
                    lines.push('mv node_modules/npm /usr/local/lib/node_modules/npm');
                    lines.push('rm -rf node_modules');
                    this.#_lines.push(`\n# Updating NPM version to ${version === 'latest' ? 'latest version' : version}`, ...lines.map(line => `RUN ${line}`));
                },
                check: () => {
                    if (this.#_predefinedCommands.npm.version.value === undefined) { return; }
                    this.#_predefinedCommands.npm.version.addCommand();
                }
            },
            install: {
                used: false,
                flags: {
                    omitOptional: { flag: `--omit=optional`, value: false },
                    omitDev: { flag: `--omit=dev`, value: true },
                    noAudit: { flag: '--no-audit', value: true },
                    noFund: { flag: '--no-fund', value: true },
                    noUpdateNotifier: { flag: '--no-update-notifier', value: true },
                    unsafePerm: { flag: '--unsafe-perm', value: false },
                    noProgress: { flag: '--no-progress', value: false },
                    force: { flag: '--force', value: false },
                    legacyPeerDeps: { flag: '--legacy-peer-deps', value: false },
                    preferOffline: { flag: '--prefer-offline', value: false },
                    noSave: { flag: '--no-save', value: false },
                    ignoreScripts: { flag: '--ignore-scripts', value: false }
                } as NPMInstallConfigs,
                addCommand: () => {
                    this.#_lines.push('\n# Installing dependencies using NPM');
                    const flags = Object.entries(this.#_predefinedCommands.npm.install.flags).filter(flag => flag[1].value === true).map(flag => flag[1].flag).join(' ').trim();
                    this.#_lines.push(`RUN npm install${flags.length > 0 ? ` ${flags}` : ''}`);
                },
                check: () => {
                    if (this.#_predefinedCommands.npm.install.used) { this.#_predefinedCommands.npm.install.addCommand() }
                }
            }
        }
    }

    readonly predefinedCommands = {
        npm: {
            /**
             * Updates the version of NPM to use in the Dockerfile stage.
             * Accepts either a string or a number as the version. If a string starts with 'v',
             * the 'v' is removed. If a number is provided, it is converted to a string.
             * If no version is specified, defaults to 'latest'.
             *
             * @param version - A string or number representing the NPM version to update to, defaults to 'latest'.
             * @throws {Error} If the provided version is neither a string nor a number.
             */
            update: (version: string = 'latest') => {
                if (typeof version === 'string') {
                    if (version.startsWith('v')) { version = version.slice(1); }
                } else if (typeof version === 'number') { version = String(version) } else {
                    throw new Error('NPM version must be a string or a number.');
                }

                this.#_predefinedCommands.npm.version.value = version;
            },
            /**
             * Configures the NPM install command with the given flags.
             * 
             * If no options are provided, the install command will be generated
             * with no flags.
             * 
             * @param options - An object containing keys and values to configure
             *                  the NPM install command. The keys are the flag names
             *                  and the values are boolean values indicating whether
             *                  to use the flag or not.
             * @throws {TypeError} If any of the provided flags have invalid values.
             * @throws {Error} If any of the provided flags are invalid.
             */
            install: (options?: NPMInstallOptions) => {
                if (helpers.isValidObject(options)) {
                    const flagsData = this.#_predefinedCommands.npm.install.flags;

                    for (const key in options) {
                        const value = options[key as keyof NPMInstallOptions];
                        if (typeof value !== 'boolean') { throw new TypeError(`A NPM command was configured with a flag (${key}) with an incorrect value. Expected a boolean value but instead got ${typeof value}`) }
                        if (!(key in flagsData)) { throw new Error(`A NPM command was configured with an invalid flag (${key}).`) }
                        flagsData[key as keyof NPMInstallConfigs].value = value;
                    }
                }

                this.#_predefinedCommands.npm.install.used = true;
            }
        }
    }

    constructor(template: DockerfileTemplate) {
        this.#_template = template;
    }

    /**
     * Retrieves the files to be copied from the build context to the image.
     * 
     * The files are returned as an array of objects, each containing the following properties:
     * 
     *   - `src`: The path to the file in the build context.
     *   - `dest`: The path to the file in the image.
     * 
     * If the files are not set, the method returns an empty array.
     * 
     * @returns {DockerfileCopyItem[]} The files to be copied from the build context to the image.
     */
    get copy(): DockerfileCopyItem[] { return this.#_config.copy; }

    /**
     * Sets the files to be copied from the build context to the image.
     * 
     * The files can be provided as a single object or an array of objects, each
     * containing the following properties:
     * 
     *   - `src`: The path to the file in the build context.
     *   - `dest`: The path to the file in the image.
     * 
     * If any file is invalid, an error is thrown.
     * 
     * @param copy A single object or an array of objects, each containing the src and dest properties.
     */
    set copy(copy: DockerfileCopyItem | DockerfileCopyItem[]) {
        if (!Array.isArray(copy)) { copy = [copy]; }

        for (const file of copy) {
            if (typeof file.src !== 'string' || typeof file.dest !== 'string') {
                throw new Error('Invalid file. Expected src and dest to be strings.');
            }
        }

        this.#_config.copy = copy;
    }

    /**
     * Retrieves the commands to be run in the shell when the container starts.
     * 
     * The commands are returned as an array of strings. If the commands are not set,
     * the method returns an empty array. Non-string elements in the command array are
     * converted to strings.
     * 
     * @returns {string[]} The commands to be run in the shell when the container starts.
     */
    get run(): string[] { return this.#_config.run; }


    /**
     * Sets the shell commands to be executed when the container starts.
     * 
     * The commands can be provided as a single string or an array of strings.
     * Each command in the array must be a non-empty string and will be trimmed
     * of whitespace. If any command is not a string, an error is thrown.
     * 
     * @param run A string or an array of strings representing the shell commands
     * to execute when the container starts.
     * @throws {Error} If any element in the provided value is not a string.
     */
    set run(run: string | string[]) {
        if (!Array.isArray(run)) { run = [run]; }
        if (run.some(cmd => typeof cmd !== 'string')) { throw new Error('Commands must be strings.'); }
        this.#_config.run = run.map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
    }

    /**
     * Retrieves the command to be executed when the container starts.
     *
     * The command is returned as an array of strings. Each element
     * represents a part of the command, and non-string elements are
     * converted to strings.
     *
     * @returns {string[]} An array of strings representing the command.
     */
    get cmd(): string[] {
        return this.#_config.cmd?.map(cmd => typeof cmd === 'string' ? cmd : cmd.toString());
    }

    /**
     * Sets the command to run when the container is started.
     * 
     * The command can be a string or an array of strings. If the command is an
     * array of strings, it will be joined with spaces to form a single string.
     * @param cmd A string or array of strings representing the command to run.
     * @throws {Error} If the provided value is neither a string nor an array of strings.
     */
    set cmd(cmd: string | (string | number | boolean)[]) {
        if (typeof cmd === 'string') { cmd = [cmd]; }
        this.#_config.cmd = cmd;
    }

    /**
     * Gets the entrypoint command for the Dockerfile stage.
     * @returns {string | undefined} The entrypoint command, or undefined if not set.
     */
    get entrypoint(): string | undefined { return this.#_config.entrypoint; }

    /**
     * Sets the entrypoint command for the Dockerfile stage.
     * @param entrypoint A string representing the entrypoint command.
     * @throws {Error} If the provided value is not a string.
     */
    set entrypoint(entrypoint: string) {
        if (typeof entrypoint !== 'string') { throw new Error('Entrypoint must be a string.'); }
        this.#_config.entrypoint = entrypoint;
    }

    /**
     * Gets the group under which the Dockerfile stage will run.
     * @returns {string | undefined} The group name, or undefined if not set.
     */
    get group(): string | undefined { return this.#_config.group; }

    /**
     * Sets the group under which the Dockerfile stage will run.
     * @param value - A string representing the group name. If undefined, the group name is not set.
     * @throws {TypeError} If the provided value is not a string or undefined.
     */
    set group(group: string) {
        if (typeof group !== 'string') { throw new Error('Group must be a string.'); }
        this.#_config.group = group;
    }

    /**
     * Gets the user under which the Dockerfile stage will build.
     * @returns {string | undefined} The user name, or undefined if not set.
     */
    get buildUser(): string | undefined { return this.#_config.buildUser; }

    /**
     * Sets the user under which the Dockerfile stage will build.
     * 
     * If set, the Dockerfile stage will be built with the specified user.
     * Otherwise, the default user is used.
     * @param user - A string representing the user name. If undefined, the user name is not set.
     * @throws {TypeError} If the provided value is not a string or undefined.
     */
    set buildUser(user: string) {
        if (typeof user !== 'string') { throw new Error('Build-User must be a string.'); }
        this.#_config.buildUser = user;
    }

    /**
     * Gets the user under which the Dockerfile stage will run as a service.
     * @returns {string | undefined} The user name, or undefined if not set.
     */
    get serviceUser(): string | undefined { return this.#_config.serviceUser; }

    /**
     * Sets the user under which the Dockerfile stage will run as a service.
     * 
     * If set, the Dockerfile stage will be run as a service with the specified user.
     * Otherwise, the default user is used.
     * @param user - A string representing the user name. If undefined, the user name is not set.
     * @throws {TypeError} If the provided value is not a string or undefined.
     */
    set serviceUser(user: string) {
        if (typeof user !== 'string') { throw new Error('Service-User must be a string.'); }
        this.#_config.serviceUser = user;
    }

    /**
     * Retrieves the list of environment variables for the Dockerfile stage.
     * @returns {DockerfileArgItem[]} An array of {name, value} objects.
     */
    get args(): DockerfileArgItem[] { return this.#_config.args; }

    /**
     * Sets the list of build arguments for the Dockerfile stage.
     * 
     * The arguments can be provided as a single DockerfileArgItem or an array of them.
     * Each argument must be an object with the following properties:
     * - `name`: A non-empty string representing the argument name.
     * - `value`: A value of type string, number, or boolean representing the argument value.
     * - `global` (optional): A boolean indicating if the argument is global. Defaults to false.
     * 
     * @param args - A DockerfileArgItem or an array of DockerfileArgItems.
     * @throws {Error} If the arguments are not objects, or if they lack required properties.
     */
    set args(args: DockerfileArgItem | DockerfileArgItem[]) {
        if (!Array.isArray(args)) { args = [args]; }

        for (const arg of args) {
            if (!helpers.isObject(arg)) { throw new Error('Arguments must be objects.'); }

            if (helpers.hasOwnProperty(arg, 'name')) {
                if (typeof arg.name !== 'string') { throw new Error('Argument name must be a string.'); }
                if (arg.name.length === 0) { throw new Error('Argument name must not be empty.'); }
            } else {
                throw new Error('Arguments must have a name.');
            }

            if (helpers.hasOwnProperty(arg, 'value')) {
                if (typeof arg.value !== 'string') { throw new Error('Argument value must be a string.'); }
                const types = ['string', 'number', 'boolean'];
                if (!types.includes(typeof arg.value)) { throw new Error('Argument value must be a string, number, or boolean.'); }
            }

            if (helpers.hasOwnProperty(arg, 'global')) {
                if (typeof arg.global !== 'boolean') { throw new Error('Argument global must be a boolean.'); }
            } else {
                arg.global = false;
            }
        }


        this.#_config.args = args;
    }

    /**
     * Retrieves the list of environment variables for the Dockerfile stage.
     * @returns {Map<string, any>} A map of environment variables.
     */
    get env(): Map<string, any> { return this.#_config.env as Map<string, any>; }

    /**
     * Sets the environment variables for the Dockerfile stage.
     * @param {Record<string, any>} env - An object containing the environment variables.
     * @throws {Error} If the provided value is not an object.
     */
    set env(env: Record<string, any>) {
        if (!helpers.isObject(env)) { throw new Error('Environment variables must be an object.'); }
        this.#_config.env = new Map(Object.entries(env));
    }

    /**
     * Retrieves the list of volumes for the Dockerfile stage.
     * @returns {string[]} An array of strings representing the volumes.
     */
    get volumes(): string[] { return this.#_config.volumes as string[]; }


    /**
     * Sets the list of volumes for the Dockerfile stage.
     * 
     * The volumes can be specified as a single string or an array of strings.
     * Each volume must be a non-empty string, representing the volume path or name.
     * 
     * @param volumes A string or an array of strings representing the volumes.
     * @throws {Error} If any of the volumes are not strings.
     */
    set volumes(volumes: string | string[]) {
        if (!Array.isArray(volumes)) { volumes = [volumes]; }

        if (volumes.some(volume => typeof volume !== 'string')) {
            throw new Error('Volumes must be strings.');
        }

        this.#_config.volumes = volumes;
    }

    /**
     * Retrieves the list of ports for the Dockerfile stage.
     * @returns {string[]} An array of strings representing the ports.
     */
    get ports(): string[] { return this.#_config.ports; }

    /**
     * Sets the list of ports for the Dockerfile stage.
     * 
     * The ports can be specified as strings or numbers. Each port is converted to a string
     * and stored in the configuration.
     * 
     * @param ports An array of ports, where each port can be a string or number.
     * @throws {Error} If any of the ports are not strings or numbers.
     */
    set ports(ports: (string | number)[]) {
        if (!Array.isArray(ports)) { ports = [ports]; }

        if (ports.some(port => !(typeof port === 'string' || typeof port === 'number'))) {
            throw new Error('Ports must be strings or numbers.');
        }

        this.#_config.ports = ports.map(port => port.toString());
    }

    /**
     * Sets the name to use for the stage.
     * 
     * The stage name is used to identify the stage in the Dockerfile.
     * 
     * @param as The name of the stage.
     * @throws {Error} If the stage name is not a string.
     * @throws {Error} If a stage of the same name already exists.
     */
    set as(as: string) {
        if (typeof as !== 'string') { throw new Error('Stage name must be a string.'); }
        if (this.#_template.stages.size > 0 && this.#_template.stages.has(as)) { throw new Error(`A stage of (${as}) was created twice. Stages must be unique.`); }
        this.#_config.as = as;
    }

    /**
     * Retrieves the name to use for the stage.
     * @returns {string} The name of the stage.
     */
    get as(): string { return this.#_config.as as string; }

    /**
     * Retrieves the working directory for the Dockerfile.
     * @returns {string | undefined} The path of the working directory.
     */
    get workdir(): string | undefined {
        return this.#_config.workdir;
    }

    /**
     * Sets the working directory for the Dockerfile.
     * 
     * @param {string | undefined} path - The path to set as the working directory. 
     * If undefined, the working directory is cleared.
     * @throws {Error} If the provided path is not a string or if the path does not exist.
     */
    set workdir(path: string | undefined) {
        if (path === undefined) {
            this.#_config.workdir = undefined;
            return;
        }

        if (typeof path !== 'string') { throw new Error('Working directory must be a string.'); }
        this.#_config.workdir = path;
    }

    /**
     * Retrieves the base image for the Dockerfile.
     * @returns {string} The name of the base image.
     */
    get from(): string {
        return this.#_config.from;
    }

    /**
     * Sets the base image for the Dockerfile.
     * 
     * @param {string} image - The name of the base image to set.
     * @throws {Error} If the provided image is not a string or is an empty string.
     */
    set from(image: string) {
        if (typeof image !== 'string') { throw new Error('Base image must be a string.'); }
        if (image.length === 0) { throw new Error('Base image name cannot be empty.'); }
        this.#_config.from = image;
    }

    readonly #_generate = {
        user: {
            init: () => {
                if (this.#_config.serviceUser || this.#_config.buildUser) {
                    const argLines: string[] = [];
                    const cmdLines: string[] = [];

                    if (this.#_config.buildUser) {
                        argLines.push(`BUILD_USER=${this.#_config.buildUser}`);
                    }

                    if (this.#_config.serviceUser) {
                        argLines.push(`SERVICE_USER=${this.#_config.serviceUser}`);

                        const group = this.#_config.group || 'service_containers';
                        argLines.push(`SERVICE_GROUP=${group}`);
                        cmdLines.push('# Detect distribution and create the group accordingly');
                        const tab = ' '.repeat(4);
                        const groupCheckCmd = ['RUN DISTRO=$(cat /etc/os-release | grep ^ID= | cut -d= -f2) && \\'];
                        groupCheckCmd.push(`${tab}if [ "$DISTRO" = "alpine" ]; then \\`);
                        groupCheckCmd.push(`${tab.repeat(2)}addgroup -S ${'${SERVICE_GROUP}'}; \\`);
                        groupCheckCmd.push(`${tab}else \\`);
                        groupCheckCmd.push(`${tab.repeat(2)}groupadd --system ${'${SERVICE_GROUP}'}; \\`);
                        groupCheckCmd.push(`${tab}fi`);
                        cmdLines.push(groupCheckCmd.join('\n'), '');

                        cmdLines.push('# Create the user and assign it to the group');
                        cmdLines.push('RUN id -u ${SERVICE_USER} &>/dev/null || adduser --system --ingroup ${SERVICE_GROUP} ${SERVICE_USER}');

                        cmdLines.push('# Add the user to the group');
                        cmdLines.push('RUN usermod -aG ${SERVICE_GROUP} ${SERVICE_USER}');
                    }

                    const buildUserInfo = this.#_generate.user.getBuildUserCommands()
                    const lines = [
                        '# Set the user and group as build arguments',
                        `ARG ${argLines.join(' ').trim()}`,
                        '',
                        buildUserInfo ? `${buildUserInfo}\n` : undefined,
                        cmdLines.join('\n').trim()
                    ].filter(i => typeof i === 'string').join('\n');

                    this.#_lines.push('', lines.trim());
                }
            },
            getBuildUserCommands: () => {
                if (this.#_config.buildUser === undefined) { return undefined; }
                return '# Set the user used in the build process\nUSER ${BUILD_USER}';
            },
            setServiceInfo: () => {
                if (this.#_config.serviceUser === undefined) { return; }
                this.#_lines.push(`\n# Set user and group to be used in the container`);
                this.#_lines.push(`USER ${'${SERVICE_USER}'}:${'${SERVICE_GROUP}'}`);
            }
        },
        args: (global: boolean = false) => {
            const args = this.#_config.args.filter(arg => global === true ? arg.global === true : arg.global !== true);
            if (args.length === 0) { return; }
            this.#_lines.push(`# ${global === true ? 'Pre' : 'Post'}-Arguments`);
            this.#_lines.push(`ARG ${args.map(arg => arg.value ? `${arg.name}=${arg.value}` : arg.name).join(' ').trim()}`)
        },
        from: () => {
            const as = this.#_config.as ? ` AS ${this.#_config.as}` : '';
            this.#_lines.push(`# Base Image`);
            this.#_lines.push(`FROM ${this.#_config.from}${as}`);
        },
        env: () => {
            if (this.#_config.env.size === 0) { return; }
            this.#_lines.push(`\n# Environment Variables`);
            this.#_lines.push(...Array.from(this.#_config.env.entries()).map(([name, value]) => `ENV ${name}=${value}`));
        },
        workdir: () => {
            if (this.#_config.workdir === undefined) { return; }
            this.#_lines.push(`\n# Working Directory`);
            this.#_lines.push(`WORKDIR ${this.#_config.workdir}`);
        },
        ports: () => {
            if (this.#_config.ports.length === 0) { return; }
            this.#_lines.push(`\n# Expose Ports`);
            this.#_lines.push(...this.#_config.ports.map(port => `EXPOSE ${port}`));
        },
        volumes: () => {
            if (this.#_config.volumes.length === 0) { return; }
            this.#_lines.push(`\n# Mount Volumes`);
            this.#_lines.push(...this.#_config.volumes.map(volume => `VOLUME ${volume}`));
        },
        copy: () => {
            if (this.#_config.copy.length === 0) { return; }
            this.#_lines.push(`\n# Copy Files`);
            this.#_lines.push(...this.#_config.copy.map(file => `COPY ${file.src} ${file.dest}`));
        },
        run: () => {
            if (this.#_config.run.length > 0) {
                this.#_lines.push(`\n# Run Commands`);
                this.#_lines.push(...this.#_config.run.map(cmd => `RUN ${cmd}`));
            }

            if (this.#_config.serviceUser) {
                this.#_lines.push(`RUN chown -R --no-preserve-root ${'${SERVICE_USER}'}:${'${SERVICE_GROUP}'} .`);
            }
        },
        entrypoint: () => {
            if (this.#_config.entrypoint === undefined) { return; }
            this.#_lines.push(`\n# Entrypoint`);
            this.#_lines.push(`ENTRYPOINT ${this.#_config.entrypoint.split(' ').filter(cmd => cmd.length > 0).map(cmd => `"${cmd}"`).join(', ')}`);
        },
        cmd: () => {
            if (this.#_config.cmd.length === 0) { return; }
            this.#_lines.push(`\n# Command`);
            this.#_lines.push(`CMD [${this.#_config.cmd.map(cmd => `"${cmd}"`).join(', ')}]`);
        }
    }

    /**
     * Generates the Dockerfile for this stage.
     * 
     * @returns The generated Dockerfile as a string.
     * 
     * @throws {Error} If the Dockerfile is already being generated.
     * @throws {Error} If no command or entrypoint is set.
     */
    generate(): string {
        try {
            if (this.#_generating) { throw new Error('Cannot generate Dockerfile while already generating.'); }

            this.#_generating = true;
            this.#_lines = [];

            this.#_generate.args(true);
            this.#_generate.from();
            this.#_generate.user.init();

            this.#_generate.args();
            this.#_generate.env();
            this.#_generate.ports();
            this.#_generate.volumes();

            this.#_generate.workdir();
            this.#_generate.copy();
            this.#_predefinedCommands.npm.version.check();
            this.#_generate.run();
            this.#_generate.user.setServiceInfo();
            this.#_predefinedCommands.npm.install.check();
            this.#_generate.entrypoint();
            this.#_generate.cmd();

            return this.#_lines.join('\n').trim();
        } catch (error) {
            throw error;
        } finally {
            this.#_generating = false;
        }
    }

    update(config: DockerfileStageOptions) {
        if (config.from) { this.from = config.from; }
        if (config.as) { this.as = config.as; }
        if (config.workdir) { this.workdir = config.workdir; }
        if (config.ports) { this.ports = config.ports; }
        if (config.volumes) { this.volumes = config.volumes; }
        if (config.env) { this.env = config.env; }
        if (config.args) { this.args = config.args; }
        if (config.buildUser) { this.buildUser = config.buildUser; }
        if (config.serviceUser) { this.serviceUser = config.serviceUser; }
        if (config.group) { this.group = config.group; }
        if (config.entrypoint) { this.entrypoint = config.entrypoint; }
        if (config.cmd) { this.cmd = config.cmd; }
        if (config.run) { this.run = config.run; }
        if (config.copy) { this.copy = config.copy; }
        if (config.predefinedCommands) {
            if (!Array.isArray(config.predefinedCommands)) { config.predefinedCommands = [config.predefinedCommands]; }

            for (const cmd of config.predefinedCommands) {
                switch (cmd.name) {
                    case 'update_npm': {
                        this.predefinedCommands.npm.update(cmd.value);
                        break;
                    }

                    case 'install_dependencies_npm': {
                        this.predefinedCommands.npm.install(cmd.value);
                    }
                }
            }
        }
    }
}

export default DockerfileStage;