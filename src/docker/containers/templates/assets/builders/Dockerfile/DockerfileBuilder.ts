import helpers from "../../../../../../utils/helpers";
import { DockerfileArgItem, DockerfileCopyItem, DockerfileUserOptions, NPMInstallConfigs, NPMInstallOptions, SSHKeyCopyConfigs } from "./docs/docs";
import fs from 'fs';
import path, { relative } from 'path';
import os from 'os';
import { exec } from 'child_process';

class DockerfileBuilder {
    #_lines: string[] = [];
    #_cache = {
        cmd: { used: false },
        entrypoint: { used: false },
        openssh: { installed: false },
        git: { installed: false }
    }

    constructor() {
        this.multiLineComment([
            'Comments are provided throughout this file to help you get started.',
            'Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7'
        ])
    }

    #_helpers = {
        /**
         * Checks if the given value is a valid path for the current platform.
         * @example
         * const builder = new DockerfileBuilder();
         * builder._helpers.isPath('/usr/bin'); // true
         * builder._helpers.isPath('C:\\Windows'); // true
         * builder._helpers.isPath('foo/bar'); // false
         * @param {string} value - The value to check.
         * @returns {boolean} Whether the value is a valid path.
         */
        isPath: (value: string): boolean => {
            const tests = { win32: /^[a-zA-Z]:\\(?:[^\0\/\\:*?"<>|\r\n]+\\)*$/, unix: /^(\/[^<>:"\/\\|?*]*)+$/ };
            const platform = os.platform() === 'win32' ? 'win32' : 'unix';
            return tests[platform].test(value);
        },
        /**
         * Converts a Windows path to a Docker-compatible path if on Windows.
         * Otherwise, returns the path unchanged.
         * @param {string} value - The path to convert.
         * @returns {string} The converted path.
         */
        toUnixPath: (value: string): string => {
            // Convert backslashes to forward slashes
            value = value.replace(/\\/g, '/');

            // If it's already a Unix-style path or relative path, leave it unchanged
            if (value.startsWith('/') || value.startsWith('./') || value.startsWith('../') || value.startsWith('~')) {
                return value;
            } else {
                value = `./${value}`;
            }

            // Convert Windows path to Docker-compatible path if on Windows
            if (os.platform() === 'win32') {
                // If it's a Windows-style absolute path (e.g., C:\)
                if (value[1] === ':') {
                    value = '/' + value[0].toLowerCase() + value.slice(2); // Convert C:\ to /c/
                }
            }

            return value;
        }
    }

    #_commands = Object.freeze({
        update: {
            /**
             * Updates the version of NPM in the Dockerfile stage.
             * Accepts either a string or a number as the version. The version can starts with `v`.
             * If no version is specified, defaults to 'latest'.
             *
             * @param version - A string or number representing the NPM version to update to, defaults to 'latest'.
             * @throws {Error} If the provided version is neither a string nor a number.
             */
            npm: (version: string = 'latest'): DockerfileBuilder => {
                if (typeof version === 'string') {
                    if (version.startsWith('v')) { version = version.slice(1); }
                } else if (typeof version === 'number') { version = String(version) } else {
                    throw new Error('NPM version must be a string or a number.');
                }

                this.comment(`Updating NPM version to ${version === 'latest' ? 'latest version' : version}`);
                return this.run([
                    `npm install npm@${version} --unsafe-perm --no-progress`,
                    'rm -rf /usr/local/lib/node_modules/npm',
                    'mv node_modules/npm /usr/local/lib/node_modules/npm',
                    'rm -rf node_modules'
                ], { batch: true })
            },
        },
        install: {
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
             * @since v1.0.5
             */
            dependencies: (options?: NPMInstallOptions): DockerfileBuilder => {
                const flags = {
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
                }

                const cache = Object.seal({ cmd: '', runs: [] as string[] });

                if (options && helpers.isValidObject(options)) {
                    if (options.flags && helpers.hasOwnProperty(options, 'flags')) {
                        const flagOptions = options.flags;
                        for (const key in flags) {
                            if (key in flagOptions && helpers.hasOwnProperty(flagOptions, key)) {
                                const value = flagOptions[key as keyof NPMInstallOptions['flags']];
                                if (typeof value !== 'boolean') { throw new TypeError(`A NPM command was configured with a flag (${key}) with an incorrect value. Expected a boolean value but instead got ${typeof value}`) }
                                flags[key as keyof NPMInstallConfigs['flags']].value = value;
                            }
                        }
                    }

                    if (options.postInstallRun && helpers.hasOwnProperty(options, 'postInstallRun')) {
                        if (!Array.isArray(options.postInstallRun)) { options.postInstallRun = [options.postInstallRun]; }
                        for (const cmd of options.postInstallRun) {
                            if (typeof cmd !== 'string') { throw new TypeError('The post-install npm commands must be strings.'); }
                            if (cmd.trim().length === 0) { throw new Error('The post-install npm commands must not be empty.'); }
                            cache.runs.push(cmd);
                        }
                    }
                }

                this.comment('Installing dependencies using NPM...');
                const entries = Object.entries(flags).filter(flag => flag[1].value === true).map(flag => flag[1].flag).join(' ').trim();
                cache.cmd = `npm install${entries.length > 0 ? ` ${entries}` : ''}`;

                return this.run([cache.cmd, ...cache.runs], { batch: true });
            },
            /**
             * Installs the specified Linux apps using the package manager of the Linux distribution.
             * 
             * @param names - The names of the Linux apps to install. If an array is provided, the names will be joined with a space.
             * @param options - An object containing options to configure the installation. The object should contain the following properties:
             *                  - noCache (boolean): If true, the package manager will not cache the installed apps. Defaults to false.
             *                  - withComment (boolean): If true, a comment will be added above the installation command. Defaults to true.
             * @throws {TypeError} If any of the provided app names are not strings.
             * @throws {TypeError} If any of the options have invalid types.
             * @throws {Error} If the OS is not supported.
             * @returns {DockerfileBuilder}
             * @since v1.0.5
             */
            apps: (names: string | string[], options?: { noCache?: boolean, withComment?: boolean }): DockerfileBuilder => {
                const data = { names: '', noCache: false, withComment: true };
                if (!Array.isArray(names)) { names = [names]; }
                for (const name of names) {
                    if (typeof name !== 'string') { throw new TypeError(`Unable to install linux app ${name}. Expected a string but instead got ${typeof name}.`) }
                }

                if (options && helpers.isObject(options)) {
                    if (helpers.hasOwnProperty(options, 'noCache')) {
                        if (typeof options.noCache !== 'boolean') { throw new TypeError(`Unable to install linux app ${name}. Expected a boolean value but instead got ${typeof options.noCache}.`) }
                        data.noCache = options.noCache;
                    }

                    if (helpers.hasOwnProperty(options, 'withComment')) {
                        if (typeof options.withComment !== 'boolean') { throw new TypeError(`Unable to install linux app ${name}. Expected a boolean value but instead got ${typeof options.withComment}.`) }
                        data.withComment = options.withComment;
                    }
                }

                const _names = names.map(name => name.trim()).filter(Boolean);
                if (_names.length > 0) {
                    if (data.withComment) { this.comment(`Installing linux apps: ${_names.join(', ')}`) }
                    const content = `${_names.join(' ')}`
                    const tab = ' '.repeat(4);
                    const lines = [
                        `${tab}if [ -f /etc/alpine-release ]; then \\`,
                        `${tab.repeat(2)}apk add ${data.noCache ? `--no-cache ` : ''}${content}; \\`,
                        `${tab}elif [ -f /etc/debian_version ]; then \\`,
                        `${tab.repeat(2)}apt update && apt install -y ${content}; \\`,
                        `${tab}else \\`,
                        `${tab.repeat(2)}echo "Unsupported OS"; exit 1; \\`,
                        `${tab}fi`
                    ]
                    this.run(lines.join('\n').trim());
                }

                return this;
            },
            /**
             * Installs Git into the Docker image. This is useful for scenarios
             * where you need to clone a repository from a Git server and build
             * the code.
             *
             * @returns The Dockerfile builder instance.
             * @since v1.0.5
             */
            git: (): DockerfileBuilder => {
                if (!this.#_cache.git.installed) {
                    this.#_cache.git.installed = true;
                    this.commands.install.apps('git', { withComment: false });
                }

                return this;
            },
            /**
             * Installs OpenSSH into the Docker image. This is useful for scenarios
             * where you need to SSH into the Docker container.
             *
             * @returns The Dockerfile builder instance.
             * @since v1.0.5
             */
            openSSH: (): DockerfileBuilder => {
                if (!this.#_cache.openssh.installed) {
                    this.#_cache.openssh.installed = true;
                    this.commands.install.apps('openssh', { withComment: false });
                }

                return this;
            }
        },
        remove: {
            /**
             * Removes an SSH key from the Docker image. This is useful for scenarios
             * where you have previously copied an SSH key using the `copySSHKey` method
             * and no longer need it.
             *
             * @param {string} name - The name of the SSH key to remove.
             * @returns The Dockerfile builder instance.
             * @throws {TypeError} If the `name` parameter is not a string.
             * @since v1.0.5
             */
            sshKey: (name: string): DockerfileBuilder => {
                if (typeof name !== 'string') { throw new TypeError(`Unable to remove SSH key ${name}. Expected a string but instead got ${typeof name}.`) }

                return this.comment(`Removing SSH key ${name}...`).run(`rm -rf /root/.ssh/${name}`);
            }
        },
        /**
         * Asynchronously copies an SSH key to a specified location in the Docker build context.
         *
         * @param {SSHKeyCopyConfigs} configs - Configuration object for copying the SSH key.
         *   @param {string} configs.context - Directory path within the build context.
         *   @param {string} configs.from - Source path or SSH key name within the user's home directory.
         *   @param {string} configs.to - Destination path within the Docker image.
         * @returns {Promise<DockerfileBuilder>} A promise that resolves to the DockerfileBuilder instance
         *   after adding the SSH key copy instructions to the Dockerfile.
         * @throws {SyntaxError} If the `configs`, `context`, or `from` properties are missing.
         * @throws {TypeError} If the `context`, `from`, or `to` properties are not strings.
         * @throws {Error} If the specified files or directories do not exist.
         * @since v1.0.5
         */
        copySSHKey: async (configs: SSHKeyCopyConfigs): Promise<DockerfileBuilder> => {
            try {
                if (!(configs && helpers.isObject(configs))) {
                    throw new SyntaxError('The `configs` parameter must be an object.');
                }

                const _configs: SSHKeyCopyConfigs = {
                    context: '',
                    from: '',
                    installClient: false
                }

                if (configs.context && helpers.hasOwnProperty(configs, 'context')) {
                    if (typeof configs.context !== 'string') { throw new TypeError(`The "context property must be a string, instead got ${typeof configs.context}.`); }
                    if (!fs.existsSync(configs.context)) { throw new Error(`The file ${configs.context} does not exist`); }
                    const stats = fs.statSync(configs.context);
                    if (stats.isFile()) { throw new Error(`The file ${configs.context} is not a directory.`); }
                    _configs.context = configs.context;
                } else {
                    throw new SyntaxError('The `context` property is required.');
                }

                if (configs.from && helpers.hasOwnProperty(configs, 'from')) {
                    if (typeof configs.from !== 'string') { throw new TypeError(`The "from" property must be a string, instead got ${typeof configs.from}.`); }

                    // Convert the SSH key name into a path if it isn't already
                    if (!this.#_helpers.isPath(configs.from)) { configs.from = path.join(os.homedir(), '.ssh', configs.from) }
                    if (!fs.existsSync(configs.from)) { throw new Error(`The file ${configs.from} does not exist`); }

                    try {
                        await fs.promises.access(configs.from, fs.constants.R_OK);
                    } catch (err) {
                        // @ts-ignore
                        throw new Error(`The file ${configs.from} is not readable: ${err.message}`);
                    }

                    _configs.from = configs.from;
                } else {
                    throw new SyntaxError('The `from` property is required.');
                }

                if (configs.installClient && helpers.hasOwnProperty(configs, 'installClient')) {
                    if (typeof configs.installClient !== 'boolean') { throw new TypeError(`The "installClient" property must be a boolean, instead got ${typeof configs.installClient}.`); }
                    _configs.installClient = configs.installClient;
                }

                // Copying the SSH key
                const ssh = {
                    file: { name: path.basename(_configs.from), path: { relative: '', absolute: '', relativeUnix: '' }, containerPath: '' },
                    storePath: path.join('temp', 'orchestriq', '.ssh'),
                    parent: { relative: '', absolute: '' }
                };

                ssh.parent.relative = path.join('.', ssh.storePath);
                ssh.parent.absolute = path.join(_configs.context, ssh.storePath);
                ssh.file.path.relative = path.join(ssh.parent.relative, ssh.file.name);
                ssh.file.path.relativeUnix = this.#_helpers.toUnixPath(ssh.file.path.relative);
                ssh.file.path.absolute = path.join(ssh.parent.absolute, ssh.file.name);
                ssh.file.containerPath = this.#_helpers.toUnixPath(path.join(path.join('/root', '.ssh', ssh.file.name)));
                // =======================
                if (!fs.existsSync(ssh.parent.absolute)) { await fs.promises.mkdir(ssh.parent.absolute, { recursive: true }); }
                await fs.promises.copyFile(_configs.from, ssh.file.path.absolute);

                // Adding SSH key copy instructions to Dockerfile
                this.comment(`Set up SSH directory & copy the private key`).copy({ src: ssh.file.path.relativeUnix, dest: ssh.file.containerPath });

                this.comment(`Set up SSH configurations`).run([
                    'mkdir -p /root/.ssh',
                    `chmod 600 ${ssh.file.containerPath}`,
                    `echo "Host github.com\\n  IdentityFile ${ssh.file.containerPath}\\n  StrictHostKeyChecking no" > /root/.ssh/config`
                ])

                this.env({ GIT_SSH_COMMAND: `"ssh -i ${ssh.file.containerPath}"` });

                if (_configs.installClient) { this.commands.install.openSSH(); }
                return this;
            } catch (error) {
                if (error instanceof Error) { error.message = `Error copying SSH key: ${error.message}`; }
                throw error;
            }
        }
    })

    /**Predefined commands that you can add to the Dockerfile. */
    get commands() { return this.#_commands }

    /**
     * Copies files from the host to the image.
     * @param copy - The files to copy. Each item in the array must contain the following properties:
     *   - `src`: The path to the file on the host.
     *   - `dest`: The path to the file in the image.
     *   - `from`: The stage to copy from. If not set, the file is copied from the host.
     * @returns The builder.
     * @throws {Error} If a file is invalid. Expected src and dest to be strings.
     * @throws {TypeError} If the "from" stage is invalid. Expected the "from" stage to be a string.
     * @throws {Error} If the "from" stage does not exist.
     */
    copy(copy: DockerfileCopyItem | DockerfileCopyItem[]): this {
        if (!Array.isArray(copy)) { copy = [copy]; }

        for (const item of copy) {
            if (typeof item.src !== 'string' || typeof item.dest !== 'string') {
                throw new Error('Invalid file. Expected src and dest to be strings.');
            }

            if (helpers.hasOwnProperty(item, 'from')) {
                if (typeof item.from !== 'string') { throw new TypeError('Invalid file. Expected the "from" stage to be a string.'); }
                if (!this.#_lines.find(line => line.endsWith(item.from as string))) { throw new Error(`The "from" stage "${item.from}" does not exist.`); }
            }
        }

        this.comment('Copy files');
        const content = copy.map(item => `COPY ${item.from ? `--from=${item.from} ` : ''}${item.src} ${item.dest}`).join('\n');
        return this.content(content).newLine();
    }

    /**
     * Configures the user and group for the Dockerfile.
     *
     * This method sets the user and group for the Docker container. It validates
     * the input parameters and updates the internal cache with user and group
     * information. Based on the options provided, it may also check for
     * the existence of the user and group, create them if necessary, and
     * assign the user to the group.
     *
     * @param user - The username to set for the Docker container. Must be a non-empty string.
     * @param options - Optional configuration to specify additional user and group settings.
     *   - for: Specifies whether the user is for 'service' or 'build'. Defaults to 'service'.
     *   - group: The group name to set. Must be a non-empty string.
     *   - checkUser: If true, checks if the user exists and creates it if not.
     *   - checkGroup: If true, checks if the group exists and creates it if not.
     *   - checkUserGroup: If true, adds the user to the group.
     * @returns The current instance of DockerfileBuilder to allow method chaining.
     * @throws {TypeError} If the user is not a string.
     * @throws {Error} If the user is an empty string.
     * @throws {TypeError} If any options provided are of incorrect type.
     * @throws {Error} If invalid values are provided for options.
     */
    user(user: string, options?: DockerfileUserOptions): this {
        if (typeof user !== 'string') { throw new TypeError('user must be a string.'); }
        if (user.trim().length === 0) { throw new Error('user cannot be empty.'); }

        const cache = {
            group: { value: 'service_containers', check: false, placeholder: '', refPlaceholder: '' },
            user: { value: user, check: false, placeholder: '', refPlaceholder: '' },
            for: 'service' as 'service' | 'build',
            args: [] as string[],
        }


        if (options && helpers.isObject(options)) {
            if (helpers.hasOwnProperty(options, 'for') && options.for) {
                if (typeof options.for !== 'string') { throw new TypeError('The "user"\'s "for" option (when provided) must be a string.'); }
                if (!['service', 'build'].includes(options.for)) { throw new Error('The "user"\'s "for" option (when provided) must be "service" or "build".'); }
                cache.for = options.for;
            }

            if (helpers.hasOwnProperty(options, 'group') && options.group) {
                if (typeof options.group !== 'string') { throw new TypeError('The "user"\'s "group" option (when provided) must be a string.'); }
                if (options.group.trim().length === 0) { throw new Error('The "user"\'s "group" option (when provided) cannot be empty.'); }
                cache.group.value = options.group;
            }

            if (helpers.hasOwnProperty(options, 'checkUser') && options.checkUser) {
                if (typeof options.checkUser !== 'boolean') { throw new TypeError('The "user"\'s "checkUser" option (when provided) must be a boolean.'); }
                cache.user.check = options.checkUser;
            }

            if (helpers.hasOwnProperty(options, 'checkGroup') && options.checkGroup) {
                if (typeof options.checkGroup !== 'boolean') { throw new TypeError('The "user"\'s "checkGroup" option (when provided) must be a boolean.'); }
                cache.group.check = options.checkGroup;
            }
        }


        cache.user.placeholder = `${cache.for.toUpperCase()}_USER`;
        cache.user.refPlaceholder = "${" + cache.user.placeholder + "}";

        cache.group.placeholder = `${cache.for.toUpperCase()}_GROUP`;
        cache.group.refPlaceholder = "${" + cache.group.placeholder + "}";

        this.comment('Set the user and group for the container').args([
            { name: cache.user.placeholder, value: cache.user.value },
            { name: cache.group.placeholder, value: cache.group.value }
        ]);

        if (cache.group.check || cache.user.check) {
            const tab = ' '.repeat(4);
            const cmd: string[] = [
                'DISTRO=$(cat /etc/os-release | grep ^ID= | cut -d= -f2) && \\',
                `${tab}if [ "$DISTRO" = "alpine" ]; then \\`,
                `${tab.repeat(2)}# Alpine-specific: Use addgroup and adduser for user/group management`
            ];

            if (cache.group.check) {
                cmd.push(
                    `${tab.repeat(2)}# Alpine-specific: Use addgroup and adduser for user/group management`,
                    `${tab.repeat(2)}if ! getent group ${'${SERVICE_GROUP}'} > /dev/null; then \\`,
                    `${tab.repeat(3)}addgroup -S ${'${SERVICE_GROUP}'}; \\`,
                    `${tab.repeat(2)}fi${cache.user.check ? ' &&' : ''} \\`
                )
            }

            if (cache.user.check) {
                cmd.push(
                    `${tab.repeat(2)}if ! id -u ${'${SERVICE_USER}'} > /dev/null 2>&1; then \\`,
                    `${tab.repeat(3)}adduser -S ${'${SERVICE_USER}'} -G ${'${SERVICE_GROUP}'}; \\`,
                    `${tab.repeat(2)}fi; \\`
                )
            }

            cmd.push(
                `${tab}elif [ "$DISTRO" = "debian" ] || [ "$DISTRO" = "ubuntu" ]; then \\`,
                `${tab.repeat(2)}groupadd --system ${'${SERVICE_GROUP}'} && \\`,
            );

            if (cache.group.check) {
                cmd.push(
                    `${tab.repeat(2)}# Debian-based: Use groupadd and useradd for user/group management`,
                    `${tab.repeat(2)}if ! getent group ${'${SERVICE_GROUP}'} > /dev/null; then \\`,
                    `${tab.repeat(3)}groupadd --system ${'${SERVICE_GROUP}'}; \\`,
                    `${tab.repeat(2)}fi${cache.user.check ? ' &&' : ''} \\`
                )
            }

            if (cache.user.check) {
                cmd.push(
                    `${tab.repeat(2)}if ! id -u ${'${SERVICE_USER}'} > /dev/null 2>&1; then \\`,
                    `${tab.repeat(3)}useradd --system --ingroup ${'${SERVICE_GROUP}'} ${'${SERVICE_USER}'}; \\`,
                    `${tab.repeat(2)}fi; \\`
                )
            }

            cmd.push(
                `${tab}else \\`,
                `${tab.repeat(2)}echo "Unsupported OS"; exit 1; \\`,
                `${tab}fi`
            )

            this.comment('Detect distribution and create the user and group accordingly').run(cmd.join('\n').trim());
        }

        return this.comment('Set the user and group for the container').content(`USER ${cache.user.refPlaceholder}:${cache.group.refPlaceholder}`).newLine();
    }

    /**
     * Sets the entrypoint command for the Dockerfile.
     *
     * The entrypoint is the command that is run when the Docker container is started.
     *
     * Throws an error if the provided value is not a string, or if the string is empty.
     *
     * Throws a SyntaxError if the ENTRYPOINT instruction is used more than once.
     *
     * @param entrypoint A string representing the entrypoint command.
     * @returns The current instance of DockerfileBuilder.
     */
    entrypoint(entrypoint: string): this {
        if (typeof entrypoint !== 'string') { throw new TypeError('entrypoint must be a string.'); }
        if (entrypoint.trim().length === 0) { throw new Error('entrypoint cannot be empty.'); }
        if (this.#_cache.entrypoint.used) { throw new SyntaxError(`ENTRYPOINT can only be used once.`); }

        this.#_cache.entrypoint.used = true;
        return this.content(`ENTRYPOINT [${entrypoint.split('').map(c => `"${c}"`).join(', ')}]`).newLine();
    }

    /**
     * Sets the default command to execute when the container starts.
     *
     * The specified command will be executed when the container starts.
     * If the command is not provided, the ENTRYPOINT instruction will be
     * executed instead.
     *
     * @param cmd A string representing the command to execute.
     * @returns The current instance of the Dockerfile builder for chaining.
     * @throws {TypeError} If the provided cmd is not a string.
     * @throws {Error} If the provided cmd is empty.
     * @throws {SyntaxError} If the CMD instruction has already been used.
     */
    cmd(cmd: string): this {
        if (typeof cmd !== 'string') { throw new TypeError('cmd must be a string.'); }
        if (cmd.trim().length === 0) { throw new Error('cmd cannot be empty.'); }
        if (this.#_cache.cmd.used) { throw new SyntaxError(`CMD can only be used once.`); }

        this.#_cache.cmd.used = true;
        this.comment('Set the default command to execute when the container starts');
        return this.content(`CMD [${cmd.split(' ').map(c => `"${c}"`).join(', ')}]`).newLine();
    }

    /**
     * Adds RUN commands to the Dockerfile.
     *
     * This method allows you to specify one or more shell commands to be executed
     * when building the Docker image. The commands can be provided as a single
     * string or an array of strings. If the `batch` option is set to `true`, the
     * commands will be combined into a single RUN instruction using '&&'.
     *
     * @param commands - A string or an array of strings representing the shell commands.
     * @param options - Options for executing the commands.
     * @param options.batch - If true, combines the commands into a single RUN
     * instruction. Defaults to false.
     * @returns This Dockerfile builder.
     * @throws {TypeError} If any element in the provided value is not a string.
     * @throws {Error} If any command is empty.
     */
    run(commands: string | string[], options: { batch?: boolean } = { batch: false }): this {
        if (!Array.isArray(commands)) { commands = [commands] }
        const batch = options.batch === true;

        for (const command of commands) {
            if (typeof command !== 'string') { throw new TypeError('Commands must be strings.'); }
            if (command.trim().length === 0) { throw new Error('Commands must not be empty.'); }

            if (!batch) { this.content(`RUN ${command.trim()}`); }
        }

        return batch ? this.content(`RUN ${commands.filter(cmd => cmd.length > 0).map(cmd => cmd.trim()).join(' && ')}`).newLine() : this.newLine();
    }

    /**
     * Adds environment variables to the Dockerfile.
     * @param env - Environment variables that must be an object or a map.
     * @param options - Options for formatting the environment variables.
     * @param options.entriesPerLine - The number of entries per line. Defaults to 5.
     * @returns This Dockerfile builder.
     */
    env(env: Record<string, any> | Map<string, any>, options: { entriesPerLine: number } = { entriesPerLine: 5 }): this {
        if (!helpers.isObject(env) && !(env instanceof Map)) { throw new TypeError('Environment variables must be an object or a map.'); }
        if (env instanceof Map) { env = Object.fromEntries(env); }

        const entries = Object.entries(env);
        const chunkSize = options?.entriesPerLine ?? 5;
        const space = ' '.repeat('env'.length + 1);

        const formattedEnv = entries.map((env, idx) => {
            idx++;
            const [key, value] = env;
            if (idx === 1) { return `ENV ${key}=${value}`; }
            const entry = `${idx === 1 ? 'ENV ' : ''}${key}=${value}`;

            const breakPoint = idx % chunkSize === 0;
            const newLinePoint = (idx - 1) % chunkSize === 0;

            if (breakPoint) {
                return ` ${entry} \/\n`;
            } else {
                return newLinePoint ? `${space}${entry}` : ` ${entry}`
            }
        }).join('');

        return this.comment('Environment Variables').content(formattedEnv).newLine();
    }

    /**
     * Mounts the specified volumes in the Dockerfile.
     * 
     * This method accepts a single volume or an array of volumes, which must be strings.
     * It validates that each volume is of the correct type and adds the `VOLUME` instruction
     * to the Dockerfile lines.
     * 
     * @param {string | string[]} volumes - The volume(s) to mount.
     * @returns {this} The current instance of DockerfileBuilder.
     * @throws {TypeError} If any of the provided volumes are not strings.
     */
    volumes(volumes: string | string[]): this {
        if (!Array.isArray(volumes)) { volumes = [volumes] }

        for (const volume of volumes) {
            if (typeof volume !== 'string') { throw new TypeError(`The volume you provided (${volume}) must be a string, but a type of ${typeof volume} was received.`) }
        }

        return this.comment('Volumes').content(`VOLUME [${volumes.map(i => `"${i}"`).join(', ')}]`).newLine();
    }

    /**
     * Exposes the specified ports in the Dockerfile.
     * 
     * This method accepts a single port or an array of ports, which can be either
     * strings or numbers. It validates that each port is of the correct type and
     * adds the `EXPOSE` instruction to the Dockerfile lines.
     * 
     * @param {string | number | (string | number)[]} ports - The port(s) to expose.
     * @returns {this} The current instance of DockerfileBuilder.
     * @throws {TypeError} If any of the provided ports are not strings or numbers.
     */
    expose(ports: string | number | (string | number)[]): this {
        if (!Array.isArray(ports)) { ports = [ports] }
        if (ports.length === 0) { return this }

        for (const port of ports) {
            if (typeof port !== 'string' && typeof port !== 'number') { throw new TypeError(`The port you provided (${port}) can either be a number or a stringified number, but a type of ${typeof port} was received.`) }
        }

        return this.comment('Exposed Ports').content(`EXPOSE ${ports.join(' ')}`).newLine();
    }

    /**
     * Sets the working directory for the Dockerfile.
     * 
     * @param {string} workDir - The path to set as the working directory.
     * @throws {TypeError} If `workDir` is not a string.
     * @throws {RangeError} If `workDir` is an empty string.
     * @returns {this} The current instance of DockerfileBuilder.
     */
    workDir(workDir: string): this {
        if (typeof workDir !== 'string') { throw new TypeError(`The "workDir" property is expected to be a string, yet it received ${typeof workDir}`) }
        if (workDir.length === 0) { throw new RangeError(`The "workDir" value cannot be an empty string`) }
        return this.comment('Working Directory').content(`WORKDIR ${workDir}`).newLine();
    }

    /**
     * Sets the base image for the Dockerfile with an optional stage name.
     * 
     * @param {string} fromImage - The name of the base image to use.
     * @param {string} [as] - An optional parameter to specify the stage name.
     * @returns {this} The current instance of DockerfileBuilder.
     * @throws {Error} If `fromImage` is not a string or is an empty string.
     * @throws {Error} If `as` is provided but is not a string or is an empty string.
     */
    from(fromImage: string, as?: string): this {
        if (typeof fromImage !== 'string') { throw new Error('Base image must be a string.'); }
        if (fromImage.length === 0) { throw new Error('Base image name cannot be empty.'); }
        this.comment('Base Image');

        if (as !== undefined) {
            if (typeof as !== 'string') { throw new Error('Stage name must be a string.'); }
            if (as.length === 0) { throw new Error('Stage name cannot be empty.'); }
            this.content(`FROM ${fromImage} AS ${as}`);
        } else {
            this.content(`FROM ${fromImage}`);
        }

        return this.newLine();
    }

    /**
     * Sets the list of build arguments for the Dockerfile stage.
     * 
     * The arguments can be provided as a single `DockerfileArgItem` or an array of them.
     * Each argument must be an object with the following properties:
     * - `name`: A non-empty string representing the argument name.
     * - `value` (optional): A value of type string, number, or boolean representing the argument value.
     * - `global` (optional): A boolean indicating if the argument is global. Defaults to false.
     * 
     * @param args - A DockerfileArgItem or an array of DockerfileArgItems.
     * @throws {Error} If the arguments are not objects, or if they lack required properties.
     */
    args(args: DockerfileArgItem | DockerfileArgItem[]): this {
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
        }

        if (args.length > 0) {
            args.sort((a, b) => {
                const isADefined = helpers.hasOwnProperty(a, 'value') && a.value !== undefined;
                const isBDefined = helpers.hasOwnProperty(b, 'value') && b.value !== undefined;

                if (isADefined && !isBDefined) { return 1; }
                if (!isADefined && isBDefined) { return -1; }

                return 0;
            })

            this.comment('Arguments').content(`ARG ${args.map(arg => arg.value ? `${arg.name}=${arg.value}` : arg.name).join(' ').trim()}`);
        }

        return this.newLine();
    }

    /**
     * Adds one or more lines of comments to the Dockerfile.
     * 
     * If a single string is provided, it will be split into multiple lines
     * if necessary. Each line is added as a separate comment.
     * 
     * @param {string | string[]} comment - The comment or array of comments to add.
     * @returns {this} The current instance of DockerfileBuilder.
     */
    multiLineComment(comment: string | string[]): this {
        if (typeof comment === 'string') { comment = [comment] }
        for (const _comment of comment) {
            const parts = _comment.trim().split('\n');
            for (const part of parts) {
                this.comment(part);
            }
        }

        return this.newLine();
    }

    /**
     * Adds a comment to the Dockerfile.
     * 
     * @param {string} comment - The comment to add.
     * @returns {this} The current instance of DockerfileBuilder.
     */
    comment(comment: string, options = { newLine: false }): this {
        this.#_lines.push(`# ${comment}`);
        if (options?.newLine === true) { this.newLine(); }
        return this;
    }

    /**
     * Adds one or more empty lines to the Dockerfile.
     * 
     * @param {number} [num=1] - The number of empty lines to add.
     * @returns {this} The current instance of DockerfileBuilder.
     */
    newLine(num: number = 1): this {
        this.#_lines.push(...' '.repeat(num || 1).split('').map(i => i.trim()));
        return this;
    }

    /**
     * Adds a line of content to the Dockerfile.
     * 
     * @param {string} content - The content of the line to add.
     * 
     * @throws {Error} If the content is not a non-empty string.
     * 
     * @returns {this} The current instance of DockerfileBuilder.
     */
    content(content: string): this {
        if (typeof content !== 'string' || content.length === 0) { throw new Error(`The line content should be a non-empty string`) }
        this.#_lines.push(content);
        return this;
    }

    /**
     * Returns the generated Dockerfile content as a string.
     * @returns {string} The generated Dockerfile content as a string.
     */
    toString(): string {
        return this.#_lines.join('\n').trim();
    }

    /**
     * Asynchronously generates and writes the Dockerfile content to the specified output path.
     *
     * Ensures that the parent directories for the output path exist before writing the content.
     *
     * @param {string} outputPath - The path where the Dockerfile content should be written.
     *
     * @throws {Error} If there is an issue creating directories or writing the file.
     */
    async generate(outputPath: string) {
        try {
            const content = this.toString();
            await fs.promises.mkdir(path.dirname(outputPath), { recursive: true }); // Ensure parent directories exist
            await fs.promises.writeFile(path.resolve(outputPath), content, { encoding: 'utf-8' });
        } catch (error) {
            if (error instanceof Error) { error.message = `Error generating Dockerfile: ${error.message}`; }
            throw error;
        }
    }
}

export default DockerfileBuilder