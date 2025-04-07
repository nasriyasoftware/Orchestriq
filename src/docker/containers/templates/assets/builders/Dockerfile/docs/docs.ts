export interface SSHKeyCopyConfigs {
    /**
     * The path of the project that needs to be built.
     * This is used to copy the SSH key in the project directory.
     */
    context: string;
    /**
     * The name of the SSH key or the path to the SSH key.
     * If the value is not a path, the SSH key is expected to be in
     * the default `.ssh` folder of the user.
     */
    from: string;
    /**
     * Whether to install the SSH client on the image.
     * Default: `false`
     */
    installClient?: boolean;
}

export interface DockerfileUserOptions {
    /**Specify a group for the user. Default: `service_containers` */
    group?: string;
    /**Specify what the user is for. Default: `service`  */
    for?: 'service' | 'build';
    /**
     * Whether to check if the user exists and create it if it doesn't.
     * Default: `false`
     */
    checkUser?: boolean;
    /**
     * Whether to check if the group exists and create it if it doesn't.
     * Default: `false`
     */
    checkGroup?: boolean;    
}

export interface DockerfileOutput {
    /**The path to the generated Dockerfile */
    path: string;
    /**The name of the generated Dockerfile. Default: `Dockerfile` */
    name?: string;
}

export interface DockerfileArgItem {
    /**The name of the argument */
    name: string;
    /**The value of the argument */
    value?: string | number | boolean;
    /**Whether the argument is global (pre-`FROM`)
     * or application-specific (post-`FROM`). Default: `false`,
     * which means the argument is application-specific
     */
    global?: boolean;
}

export interface DockerfileCopyItem {
    /**The source of the file to copy */
    src: string;
    /**The destination of the file to copy */
    dest: string;
    /**
     * Specify the stage to copy the file from.
     * @example
     * const item = {
     *     src: '/path/to/file',
     *     dest: '/path/to/file',
     *     from: 'stage1'
     * }
     */
    from?: string;
    /**
     * Specify the owner of the files being copied. in the
     * format `<user>:<group>` or just `<user>`.
     * @example 
     * const options = {
     *     owner: 'user:group' // user:group is the owner
     * }
     * @example
     * // Setting the owner without a group.
     * const options = {
     *     owner: 'user' // user is the owner
     }
     */
    owner?: string;
}

export interface DockerfileStageConfig {
    /**The base image to use for the Dockerfile. Default: `node:latest` */
    from: string;
    /**Specify a different name for the base image to be used in later stages. */
    as?: string;
    /**The working directory for the Dockerfile */
    workdir?: string;
    /**The ports to expose in the Dockerfile. */
    ports: string[];
    /**The volumes to mount in the Dockerfile */
    volumes: string[];
    /**The environment variables to set in the Dockerfile */
    env: Map<string, any>;
    /**The arguments to set in the Dockerfile */
    args: DockerfileArgItem[];
    /**The user that will be used when building the Dockerfile */
    buildUser?: string;
    /**The user that will be used to run the service */
    serviceUser?: string;
    /**The group to set in the Dockerfile */
    group?: string;
    /**
     * The entrypoint to set in the Dockerfile.
     * 
     * **Note**: When using `entrypoint` and `cmd` together, the `entrypoint` takes
     * precedency and runs first, and the `cmd` will act as arguments that will be
     * passed to the executable of the entrypoint.
     */
    entrypoint?: string;
    /**
     * The command to run in the Dockerfile.
     * 
     * **Notes**:
     * - When using `entrypoint` and `cmd` together, the `entrypoint` takes
     * precedency and runs first, and the `cmd` will act as arguments that will be
     * passed to the executable of the entrypoint.
     * - When used without `entrypoint`, the `cmd` will be the command to run in the container.
     */
    cmd: (string | number | boolean)[];
    /**The commands to run in the Dockerfile */
    run: string[];
    /**The files to copy in the Dockerfile */
    copy: DockerfileCopyItem[];
    /**The predefined commands to run in the Dockerfile */
    predefinedCommands: DockerPredefinedRunCommand[];
}

export interface DockerfileStageOptions {
    /**The base image to use for the Dockerfile. Default: `node:latest` */
    from: string;
    /**Specify a different name for the base image to be used in later stages. */
    as?: string;
    /**The working directory for the Dockerfile */
    workdir?: string;
    /**The ports to expose in the Dockerfile. */
    ports?: (string | number)[];
    /**The volumes to mount in the Dockerfile */
    volumes?: string | string[];
    /**The environment variables to set in the Dockerfile */
    env?: Record<string, any>;
    /**The arguments to set in the Dockerfile */
    args?: DockerfileArgItem | DockerfileArgItem[];
    /**The user that will be used when building the Dockerfile */
    buildUser?: string;
    /**The user that will be used to run the service */
    serviceUser?: string;
    /**The group to set in the Dockerfile */
    group?: string;
    /**
     * The entrypoint to set in the Dockerfile.
     * 
     * **Note**: When using `entrypoint` and `cmd` together, the `entrypoint` takes
     * precedency and runs first, and the `cmd` will act as arguments that will be
     * passed to the executable of the entrypoint.
     */
    entrypoint?: string;
    /**
     * The command to run in the Dockerfile.
     * 
     * **Notes**:
     * - When using `entrypoint` and `cmd` together, the `entrypoint` takes
     * precedency and runs first, and the `cmd` will act as arguments that will be
     * passed to the executable of the entrypoint.
     * - When used without `entrypoint`, the `cmd` will be the command to run in the container.
     */
    cmd?: (string | number | boolean)[];
    /**The commands to run in the Dockerfile */
    run?: string | string[];
    /**The files to copy in the Dockerfile */
    copy?: DockerfileCopyItem[];
    /**The predefined commands to run in the Dockerfile */
    predefinedCommands?: DockerPredefinedRunCommand | DockerPredefinedRunCommand[];
}

interface DockerRunUpdateNPM {
    name: 'update_npm';
    /**The version of NPM to use. Default: `latest` */
    value?: string
}

interface DockerRunInstallNPMDependencies {
    name: 'install_dependencies_npm';
    value?: NPMInstallOptions
}

export type DockerPredefinedRunCommand = DockerRunUpdateNPM | DockerRunInstallNPMDependencies;

export interface NPMInstallOptions {
    flags?: {
        /** Omit optional dependencies */
        omitOptional?: boolean;
        /** Omit dev dependencies. Defaults: `true` */
        omitDev?: boolean;
        /** Don't run security audits. Defaults: `true` */
        noAudit?: boolean;
        /** Don't display funding messages. Defaults: `true` */
        noFund?: boolean;
        /** Don't show update notifications. Defaults: `true` */
        noUpdateNotifier?: boolean;
        /** Allow scripts to run as root inside Docker */
        unsafePerm?: boolean;
        /** Don't show progress bar */
        noProgress?: boolean;
        /** Force reinstall of already installed packages */
        force?: boolean;
        /** Use legacy peer dependency resolution */
        legacyPeerDeps?: boolean;
        /** Prefer offline installation */
        preferOffline?: boolean;
        /** Don't modify package.json or lock files */
        noSave?: boolean;
        /** Don't execute package lifecycle scripts */
        ignoreScripts?: boolean;
    };
    /** When `true`, installs packages globally */
    global?: boolean;
    /** Run custom command(s) after NPM install */
    postInstallRun?: string | string[];
}

interface NPMInstallConfigItem {
    /**The flag used in the command */
    flag: string;
    /**A boolean value to determine if the flag should be used. Default: `false` */
    value: boolean
}

export interface NPMInstallConfigs {
    flags: {
        /** Omit optional dependencies */
        omitOptional: NPMInstallConfigItem;
        /** Omit dev dependencies */
        omitDev: NPMInstallConfigItem;
        /** Don't run security audits */
        noAudit: NPMInstallConfigItem;
        /** Don't display funding messages */
        noFund: NPMInstallConfigItem;
        /** Don't show update notifications */
        noUpdateNotifier: NPMInstallConfigItem;
        /** Allow scripts to run as root inside Docker */
        unsafePerm: NPMInstallConfigItem;
        /** Don't show progress bar */
        noProgress: NPMInstallConfigItem;
        /** Force reinstall of already installed packages */
        force: NPMInstallConfigItem;
        /** Use legacy peer dependency resolution */
        legacyPeerDeps: NPMInstallConfigItem;
        /** Prefer offline installation */
        preferOffline: NPMInstallConfigItem;
        /** Don't modify package.json or lock files */
        noSave: NPMInstallConfigItem;
        /** Don't execute package lifecycle scripts */
        ignoreScripts: NPMInstallConfigItem;
    },
    /** Run custom command(s) after NPM install */
    postInstallRun: string[]
}