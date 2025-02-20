export interface DockerComposeUpOptions {
    /** Run containers in detached mode (in the background). */
    detach?: boolean;

    /** Build images before starting containers, even if they already exist. */
    build?: boolean;

    /** Recreate containers even if their configuration and images haven’t changed. */
    forceRecreate?: boolean;

    /** Do not recreate containers if they already exist. */
    noRecreate?: boolean;

    /** Do not build an image, even if it’s missing. */
    noBuild?: boolean;

    /** Remove containers for services not defined in the `docker-compose.yml` file. */
    removeOrphans?: boolean;

    /** Stop all containers if any container stops. */
    abortOnContainerExit?: boolean;

    /** Scale a specific service to the specified number of instances. */
    scale?: Record<string, number>;

    /** Wait for services to be healthy before exiting. */
    wait?: boolean;

    /** Enable Docker Swarm compatibility mode for deployment. */
    compatibility?: boolean;

    /** Recreate anonymous volumes to prevent data from persisting between container restarts. */
    renewAnonVolumes?: boolean;

    /** Specify additional environment variables to be passed to the containers. */
    env?: Record<string, string>;

    /** Show detailed output about the execution of the command. */
    verbose?: boolean;

    /** Specify additional files for the `docker-compose` command. */
    files?: string[];

    /** Specify a timeout (in seconds) for container startup. */
    timeout?: number;

    /** Custom service(s) to start instead of starting all defined in the compose file. */
    services?: string[];

    /**Specify additional labels to be passed to the containers. */
    // labels?: Record<string, any>;
}

export interface StackConfigsData {
    /**The name of the config file to be used in services */
    name: string;
    /**The path of the config file to be used in services */
    filePath: string;
}

/**
 * Options for creating a secret
 */
export interface StackSecretOptions {
    /**The name of the secret */
    name: string;
    /**If true, the secret is not created by the container and must already exist */
    external?: boolean;
    /**The file to read the secret from */
    file: string;
}