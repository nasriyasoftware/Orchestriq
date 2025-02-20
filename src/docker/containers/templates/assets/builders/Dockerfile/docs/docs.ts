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
    value: string | number | boolean;
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
    /**The user to set in the Dockerfile */
    user?: string;
    /**The group to set in the Dockerfile */
    group?: string;
    /**
     * The entrypoint to set in the Dockerfile.
     * 
     * **Note**: When using `entrypoint` and `cmd` together, the `entrypoint` takes
     * presedency and runs first, and the `cmd` will act as arguments that will be
     * passed to the executable of the entrypoint.
     */
    entrypoint?: string;
    /**
     * The command to run in the Dockerfile.
     * 
     * **Notes**:
     * - When using `entrypoint` and `cmd` together, the `entrypoint` takes
     * presedency and runs first, and the `cmd` will act as arguments that will be
     * passed to the executable of the entrypoint.
     * - When used without `entrypoint`, the `cmd` will be the command to run in the container.
     */
    cmd: (string | number | boolean)[];
    /**The commands to run in the Dockerfile */
    run: string[];
    /**The files to copy in the Dockerfile */
    copy: DockerfileCopyItem[];
}

export interface DockerfileStageOptions {
    /**The base image to use for the Dockerfile. Default: `node:latest` */
    from: string;
    /**Specify a different name for the base image to be used in later stages. */
    as?: string;
    /**The working directory for the Dockerfile */
    workdir?: string;
    /**The ports to expose in the Dockerfile. */
    ports?: string[];
    /**The volumes to mount in the Dockerfile */
    volumes?: string | string[];
    /**The environment variables to set in the Dockerfile */
    env?: Record<string, any>;
    /**The arguments to set in the Dockerfile */
    args?: DockerfileArgItem | DockerfileArgItem[];
    /**The user to set in the Dockerfile */
    user?: string;
    /**The group to set in the Dockerfile */
    group?: string;
    /**
     * The entrypoint to set in the Dockerfile.
     * 
     * **Note**: When using `entrypoint` and `cmd` together, the `entrypoint` takes
     * presedency and runs first, and the `cmd` will act as arguments that will be
     * passed to the executable of the entrypoint.
     */
    entrypoint?: string;
    /**
     * The command to run in the Dockerfile.
     * 
     * **Notes**:
     * - When using `entrypoint` and `cmd` together, the `entrypoint` takes
     * presedency and runs first, and the `cmd` will act as arguments that will be
     * passed to the executable of the entrypoint.
     * - When used without `entrypoint`, the `cmd` will be the command to run in the container.
     */
    cmd?: (string | number | boolean)[];
    /**The commands to run in the Dockerfile */
    run?: string | string[];
    /**The files to copy in the Dockerfile */
    copy?: DockerfileCopyItem[];
}