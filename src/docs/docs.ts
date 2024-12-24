export interface ServiceCreationOptions {
    name: string;
    container_name?: string;
    image?: string;
    context?: string;
    ports?: (number | string | Port | Port)[];
    volumes?: ServiceVolume | ServiceVolume[];
    description?: string;
    build?: ServiceBuildOptions;
    environment?: Record<string, string>;
    entrypoint?: string;
    command?: string[];
    dependsOn?: string[];
    networks?: string[];
    user?: string;
    restart?: FailureRestartOption | RestartOption;
    logging?: DockerLoggingDriver;
    healthcheck?: HealthcheckData;
    external_links?: ExternalLinkRecord[];
    secrets?: string[];
    isMain?: boolean;
    deploy?: ServiceDeploymentData;
    security_opt?: string[];
}

interface ServiceBuildOptions {
    context?: string;
    dockerfile?: string;
    args?: Record<string, string>;
    labels?: Record<string, string>;
    target?: string;
    cache_from?: string[];
    shm_size?: string;
    extra_hosts?: string[];
    squash?: boolean;
    network?: 'host' | 'bridge' | string;
}

export type RestartPolicy = 'on-failure' | 'unless-stopped' | 'always' | 'no';

export interface RestartOption {
    policy: Omit<RestartPolicy, 'on-failure'>;
}

export interface FailureRestartOption extends RestartOption {
    policy: 'on-failure';
    /**Only works with the `on-failure` policy. Default: `5` */
    times: number;
}

export interface Port {
    internal: number | string;
    external?: number | string;
    /**
     * If set to `true`, the container will only be accessible by
     * other containers, but not the host.
     */
    internalOnly?: boolean;
}

interface BaseServiceVolume {
    /**The name of the volume in the container */
    name: string;
    /**The of the volume in the container */
    containerPath: string;
    /**The path on the host where the volume is mounted */
    hostPath?: string;
    read_only?: boolean;
}

type AnonymousVolume = Pick<BaseServiceVolume, 'containerPath' | 'read_only'>;
type NamedVolume = Pick<BaseServiceVolume, 'name' | 'containerPath' | 'read_only'>;
type BindVolume = Pick<BaseServiceVolume, 'hostPath' | 'containerPath' | 'read_only'>;
export type ServiceVolume = AnonymousVolume | NamedVolume | BindVolume;


export type VolumeDriver = 'local' | 'nfs' | 'ceph' | 'efs' | 'azurefile' | 'glusterfs' | 'longhorn' | 'portworx' | 'cifs' | 'vSphere' | 'flocker' | 'local-persist' | 'rexray' | 'scaleio' | 'ztfs' | string;

interface VolumeDriverOptions {
    type?: string; // The type of volume (e.g., local, nfs, tmpfs, etc.)
    device?: string; // The device or path for the volume (e.g., /path/to/data or nfs://server:/path)
    o?: string | string[]; // Mount options for specific drivers (e.g., rw, nolock, etc.)
    mountpoint?: string; // The path on the host where the volume is mounted
}

interface LocalVolumeDriverOptions extends VolumeDriverOptions {
    type?: 'local'; // Default type
    device?: string; // Local path (e.g., /path/to/data)
    o?: string | string[]; // Mount options
    mountpoint?: string; // Host mount point
}

interface NfsVolumeDriverOptions extends VolumeDriverOptions {
    type: 'nfs';
    device: string; // e.g., 192.168.1.100:/nfs/share
    o?: string | string[]; // NFS-specific options (e.g., rw, nolock, etc.)
    mountpoint?: string; // Mount point on the host
}

interface TmpfsVolumeDriverOptions extends VolumeDriverOptions {
    type: 'tmpfs';
    size?: string; // Size of the tmpfs (e.g., 100m for 100 MB)
    mode?: string; // Mode for tmpfs (e.g., 1777 for world-writable)
    mountpoint?: string; // Mount point on the host
}

interface AzureFileVolumeDriverOptions extends VolumeDriverOptions {
    type: 'azurefile';
    shareName: string; // Azure File share name
    storageAccountName: string; // Azure storage account name
    storageAccountKey: string; // Storage account key
    mountpoint?: string; // Mount point on the host
}

interface RexrayVolumeDriverOptions extends VolumeDriverOptions {
    type: 'rexray';
    volumeID: string; // Cloud provider volume ID (e.g., vol-abc123 for AWS EBS)
    fsType?: string; // File system type (e.g., ext4, xfs)
    iops?: number; // IOPS (if applicable)
    mountOptions?: string[]; // Mount options (e.g., nfsvers=4)
    mountpoint?: string; // Mount point on the host
}

interface GlusterfsVolumeDriverOptions extends VolumeDriverOptions {
    type: 'glusterfs';
    device: string; // e.g., glusterfs-server:/vol1
    o?: string | string[]; // Mount options
    mountpoint?: string; // Mount point on the host
}

interface CephVolumeDriverOptions extends VolumeDriverOptions {
    type: 'ceph';
    device: string; // e.g., ceph:/vol1
    secret: string; // Keyring or authentication secret
    fsid: string; // Ceph cluster ID
    mountpoint?: string; // Mount point on the host
}

interface DigitalOceanVolumeDriverOptions extends VolumeDriverOptions {
    type: 'digitalocean';
    access: 'readwrite' | 'readonly'; // Access level
    size: number; // Volume size in GB
    region: string; // Region for the volume (e.g., nyc1)
    mountpoint?: string; // Mount point on the host
}

interface Nfs4VolumeDriverOptions extends VolumeDriverOptions {
    type: 'nfs'; // NFS is the base type
    device: string; // Device, which typically is in the form of `<server>:/<share>`
    o?: string | string[]; // Mount options, such as `rw`, `nolock`, `nfsvers=4`, etc.
    mountpoint?: string; // Mount point on the host
    nfsVersion?: '4'; // Explicitly specify that NFS version 4 is being used
}


export type VolumeDriverOptionsUnion =
    | LocalVolumeDriverOptions
    | NfsVolumeDriverOptions
    | TmpfsVolumeDriverOptions
    | AzureFileVolumeDriverOptions
    | RexrayVolumeDriverOptions
    | GlusterfsVolumeDriverOptions
    | CephVolumeDriverOptions
    | DigitalOceanVolumeDriverOptions
    | Nfs4VolumeDriverOptions;

export interface StackVolumOptions {
    /** The name of the volume */
    name: string;

    /** The driver to use for the volume (e.g., "local", "nfs", etc.) */
    driver?: VolumeDriver;

    /** Options specific to the volume driver */
    driverOpts?: VolumeDriverOptionsUnion;

    /** Indicates if the volume is external to the Compose project. Can be a boolean or an object with a name. */
    external?: boolean | { name: string };

    /** Custom labels for the volume, useful for organization or querying */
    labels?: Record<string, string>;

    /** Scope of the volume, typically 'global' for Swarm or 'local' */
    scope?: 'global' | 'local';

    /** Access mode for volumes in Docker Swarm (typically 'read-write' or 'read-only') */
    accessMode?: 'read-write' | 'read-only';

    /** If true, the volume is mounted as a temporary filesystem (typically for tmpfs) */
    tmpfs?: boolean;

    /** Size of the volume or tmpfs mount (e.g., '100m' for 100MB) */
    size?: string;
}

export type CreateVolumeOptions = Pick<StackVolumOptions, 'name' | 'driver' | 'driverOpts' | 'labels'>;

export type DockerLoggingDriver = {
    driver: 'json-file';
    options?: {
        'max-size'?: string; // Maximum size of each log file before rotation
        'max-file'?: number | string; // Maximum number of log files to keep
        'labels'?: string[]; // Comma-separated list of labels to filter logs
        'env'?: Record<string, any>; // An object of environment variables to filter logs
    }
} | {
    driver: 'syslog';
    options?: {
        'syslog-address'?: string; // Syslog server address (e.g., tcp://localhost:514)
        'syslog-facility'?: string; // Syslog facility to use (e.g., user)
        'syslog-level'?: string; // Syslog level (e.g., info, warning)
        'tag'?: string; // Tag to prepend to log messages
        'rfc5424'?: boolean; // Whether to follow RFC5424 format
        'syslog-tls'?: boolean; // Use TLS for syslog
    }
} | {
    driver: 'journald';
    options?: {
        'max-buffer-size'?: string; // Maximum size of the buffer for logs
        'max-buffer-age'?: string; // Maximum age for logs in the buffer
    }
} | {
    driver: 'gelf';
    options?: {
        'gelf-address'?: string; // GELF server address (e.g., udp://localhost:12201)
        'compression-type'?: string; // Compression type (e.g., gzip, zlib)
        'labels'?: string; // Labels to include in GELF logs
        'tags'?: string; // Tags to include in GELF logs
    }
} | {
    driver: 'fluentd';
    options?: {
        'fluentd-address'?: string; // Fluentd server address (e.g., localhost:24224)
        'fluentd-async'?: boolean; // Whether to send logs asynchronously
        'fluentd-buffer-limit'?: number; // Buffer limit for Fluentd logs
        'fluentd-keep-alive'?: boolean; // Whether to use keep-alive for Fluentd connections
    }
} | {
    driver: 'awslogs';
    options?: {
        'awslogs-group'?: string; // CloudWatch Logs group
        'awslogs-stream'?: string; // CloudWatch Logs stream
        'awslogs-region'?: string; // AWS region for CloudWatch Logs
        'awslogs-create-group'?: boolean; // Whether to create the log group if it doesn't exist
        'awslogs-datetime-format'?: string; // Format for datetime in logs
        'awslogs-multiline-pattern'?: string; // Multiline log pattern to combine log lines
    }
} | {
    driver: 'splunk';
    options?: {
        'splunk-url'?: string; // URL for the Splunk HTTP Event Collector (HEC)
        'splunk-token'?: string; // Splunk HEC token
        'splunk-index'?: string; // Splunk index for logs
        'splunk-source'?: string; // Source for Splunk logs
        'splunk-sourcetype'?: string; // Sourcetype for Splunk logs
        'splunk-index-timeout'?: string; // Timeout for Splunk index
    }
} | {
    driver: 'none';
    // No options for 'none' driver
} | {
    driver: 'logentries';
    options?: {
        'logentries-token'?: string; // Logentries token for log access
        'logentries-url'?: string; // URL for the Logentries service
    }
} | {
    driver: 'local';
    options?: {
        'local-log-dir'?: string; // Local directory to store logs
        'local-max-size'?: string; // Maximum size for local logs
    }
} | {
    driver: 'etwlogs';
    options?: {
        'etw-logs-source'?: string; // Source for Event Tracing for Windows logs
    }
} | {
    driver: 'gcplogs';
    options?: {
        'gcp-project-id'?: string; // GCP project ID
        'gcp-log-name'?: string; // GCP log name
        'gcp-datetime-format'?: string; // Date-time format for GCP logs
    }
} | {
    driver: 'papertrail';
    options?: {
        'papertrail-host'?: string; // Papertrail host (e.g., logs.papertrailapp.com)
        'papertrail-port'?: number; // Papertrail port (e.g., 12345)
        'papertrail-ssl'?: boolean; // Whether to use SSL for Papertrail
    }
} | {
    driver: 'logstash';
    options?: {
        'logstash-addr'?: string; // Logstash server address (e.g., localhost:5044)
        'logstash-format'?: string; // Format for Logstash logs (e.g., json)
        'logstash-socket'?: string; // Socket for sending logs to Logstash
    }
} | {
    driver: 'datadog';
    options?: {
        'datadog-api-key'?: string; // Datadog API key for logging
        'datadog-site'?: string; // Datadog site (e.g., datadoghq.com)
        'datadog-service'?: string; // Datadog service name
    }
} | {
    driver: 'stackdriver';
    options?: {
        'stackdriver-project-id'?: string; // GCP Project ID for Stackdriver
        'stackdriver-log-name'?: string; // Log name for Stackdriver
    }
} | {
    driver: 'azurelog';
    options?: {
        'azurelog-workspace-id'?: string; // Azure Log Analytics workspace ID
        'azurelog-shared-key'?: string; // Azure Log Analytics shared key
    }
} | {
    driver: 'kafka';
    options?: {
        'kafka-broker'?: string; // Kafka broker address (e.g., localhost:9092)
        'kafka-topic'?: string; // Kafka topic for logs
        'kafka-partition'?: number; // Kafka partition for logs
        'kafka-sasl-username'?: string; // SASL username for Kafka
        'kafka-sasl-password'?: string; // SASL password for Kafka
    }
};

//
export type DockerDriverType = DockerLoggingDriver['driver'];

export interface ExternalLinkRecord {
    externalContainerName: string;
    /**If not defined, the internal container name will be the same as the external container name */
    internalContainerName?: string;
}

export interface HealthcheckData {
    /** Command to run to check health (required) */
    test: string[]; // The health check command, e.g., ["CMD", "curl", "-f", "http://localhost/"]

    /** Time between checks (default: 30s) */
    interval?: string; // Optional, default: '30s'

    /** Number of retries before marking as unhealthy (default: 3) */
    retries?: number; // Optional, default: 3

    /** Initial grace period before starting checks (default: 0s) */
    start_period?: string; // Optional, default: '0s'

    /** Maximum time for the health check to run (default: 30s) */
    timeout?: string; // Optional, default: '30s'

    /** Whether to disable the health check (default: false) */
    disable?: boolean; // Optional, default: false
}

export type NetworkDriver = 'bridge' | 'overlay' | 'macvlan' | 'host' | 'none';

export interface IPAMOptions {
    /** The driver to use for IP address management. */
    driver?: string;

    /** The IPAM configuration settings. */
    config?: IPAMConfig[];
}

export interface IPAMConfig {
    /** The subnet for the network in CIDR format (e.g., '172.18.0.0/16') */
    subnet: string;

    /** The gateway IP for the network. */
    gateway?: string;

    /** The IP range for the network. */
    ipRange?: string;

    /** The aux address for the network (optional additional address range). */
    auxAddress?: Record<string, string>;
}

export interface StackNetworkData {
    /** The name of the network. */
    name?: string;

    /** The driver to use for the network (e.g., 'bridge', 'overlay', 'host'). */
    driver?: NetworkDriver | string;

    /** Options specific to the selected network driver. */
    driverOpts?: Record<string, string>;

    /** IP Address Management (IPAM) configuration for the network. */
    ipam?: IPAMOptions

    /** If true, the network is isolated from external access. */
    internal?: boolean;

    /** Whether to enable IPv6 on the network. */
    enableIpv6?: boolean;

    /** Labels for organizing and categorizing networks. */
    labels?: Record<string, string>;

    /** If true, use an existing external network. */
    external?: boolean | { name: string };

    /**If true, the network can be attached to containers. */
    attachable?: boolean;

    /**
     * The scope of the network, either 'global' or 'local'.
     * 
     * - 'global': The network is visible to all containers on the host.
     * - 'local': The network is only visible to containers on the same host.
     */
    scope?: 'global' | 'local';

    /**Additional options specific to the network configuration. */
    options?: Record<string, string>;
}

export interface ServiceNetwork {
    /** The name of the network to attach the service to. Must match a globally defined network. */
    name: string;

    /** Custom aliases for the service in this network. */
    aliases?: string[];

    /** A specific IPv4 address for the service in this network. */
    ipv4Address?: string;

    /** A specific IPv6 address for the service in this network. */
    ipv6Address?: string;

    /** Additional options specific to the service's network configuration. */
    driverOpts?: Record<string, string>;
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

export interface ServiceDeploymentData {
    /**Service deployment mode */
    mode?: "global" | "replicated";
    /**Number of service replicas (only applicable to "replicated" mode) */
    replicas?: number;
    /**Metadata labels for the service */
    labels?: Record<string, string>;
    /**Configuration for updating services */
    update_config?: UpdateConfig;
    /**Configuration for rollback scenarios */
    rollback_config?: UpdateConfig;
    /**Restart policy for the service */
    restart_policy?: RestartPolicyConfig;
    /**Constraints and preferences for service placement */
    placement?: Placement;
    /**Endpoint mode for load balancing */
    endpoint_mode?: "vip" | "dnsrr";
    /**Resource limits and reservations */
    resources?: ResourceConfig;
}

export interface UpdateConfig {
    /**Maximum number of tasks updated in parallel */
    parallelism?: number;
    /**Delay between updates (e.g., "10s") */
    delay?: string;
    /**Action on update failure */
    failure_action?: "continue" | "pause" | "rollback";
    /**Duration to monitor for update failures */
    monitor?: string;
    /**Failure ratio to tolerate before marking the update as failed */
    max_failure_ratio?: number;
    /**Order of task updates */
    order?: "start-first" | "stop-first";
}

export interface RestartPolicyConfig {
    /**Restart condition */
    condition?: "none" | "on-failure" | "any";
    /**Delay before restarting a failed task */
    delay?: string;
    /**Maximum restart attempts for a task */
    max_attempts?: number;
    /**Window of time during which the restart policy applies */
    window?: string;
}

export interface Placement {
    /**List of placement constraints (e.g., "node.role == manager") */
    constraints?: string[];
    /**Preferences for spreading tasks across nodes */
    preferences?: Array<{ spread?: string }>;
    /**Maximum replicas per node */
    max_replicas_per_node?: number;
}

export interface ResourceConfig {
    /**Maximum resource usage allowed for the service */
    limits?: ResourceLimits;
    /**Minimum resources reserved for the service */
    reservations?: ResourceReservations;
}

export interface ResourceLimits {
    /**Maximum CPU limit, e.g., "0.5" */
    cpus?: string;
    /**Maximum memory limit, e.g., "512M" */
    memory?: string;
}

export interface ResourceReservations {
    /**Reserved CPU, e.g., "0.25" */
    cpus?: string;
    /**Reserved memory, e.g., "256M" */
    memory?: string;
}

export interface StackConfigsData {
    /**The name of the config file to be used in services */
    name: string;
    /**The path of the config file to be used in services */
    filePath: string;
}

export interface ServiceConfigsData {
    /**The name of the config defined in the container */
    source: string;
    /**The config file path inside the container */
    target: string;
    mode?: {
        owner?: ServiceConfigMode | ServiceConfigMode[];
        group?: ServiceConfigMode | ServiceConfigMode[];
        others?: ServiceConfigMode | ServiceConfigMode[];
    }
}

export type ServiceConfigMode = 'read' | 'write' | 'exec';

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
    labels?: Record<string, any>;
}

export type DockerOptions = LocalDockerOptions | NetworkDockerOptions | RemoteDockerOptions;
export type SocketConfig = Required<LocalDockerOptions> & { url: URL } | Omit<ExternalDockerConfig, 'authorization'> & { authorization?: RemoteAuth };

export interface ExternalDockerConfig extends Omit<ExternalDockerOptions, 'host' | 'protocol'> {
    hostType: 'remote' | 'network';
    url: URL;
}

export interface BaseDockerOptions {
    hostType: 'local' | 'remote' | 'network';
    /**Define the port to connect to. Defaults to `2375` for `local` daemons and nothing for remote daemons. */
    port?: number;
}

export interface LocalDockerOptions extends Omit<BaseDockerOptions, 'port'> {
    hostType: 'local';
    /**Specify the socket path. Defaults to `/var/run/docker.sock` for Linux and `//./pipe/docker_engine` for Windows */
    socketPath?: string;
}

export interface ExternalDockerOptions extends BaseDockerOptions {
    /**Define the host to connect to. */
    host: string;
    /**
     * Define the authorization to use when connecting to the Docker daemon.
     * If not provided, no authorization will be used.
     * @default 'none'
     */
    authorization?: RemoteAuth | 'none';
    /**
     * The credentials to use when connecting to the Docker daemon.
     * They're used to create `Basic` authorization. The value is ignored
     * if `authorization` is defined, even if it's set to `none`.
     */
    credentials?: Omit<BasicAuthorization, 'type'>;
}

export interface NetworkDockerOptions extends ExternalDockerOptions {
    hostType: 'network';
    /**Enforce a protocol. Defaults to `tcp`. */
    protocol?: 'http' | 'https' | 'tcp';
}

export interface RemoteDockerOptions extends ExternalDockerOptions {
    hostType: 'remote';
    /**The protocol to use. Defaults to `https`. */
    protocol?: 'https';
}

export interface BasicAuthorization extends SocketAuth {
    type: 'Basic';
    username: string;
    password: string;
}

export interface BearerAuthorization extends SocketAuth {
    type: 'Bearer';
    token: string;
}

export interface SocketAuth {
    /**The socket authorization type */
    type: 'Basic' | 'Bearer' | 'none';
}

export type RemoteAuth = BasicAuthorization | BearerAuthorization;

export interface RegisteryOptions {
    /**An image tag */
    tag?: string;
    /**The authorization to use when accessing the registery. */
    authorization?: RemoteAuth;
    /**
     * The registery URL to perform actions on.
     * Do not set this if you want to use the default registry.
     * 
     * **Note:**
     * If the URL includes the value from the `fromImage` and/or
     * the `tag` properties, they'll be ignored.
     */
    registeryURL?: string;
    verbose?: boolean;
}

export interface ImageHistoryEntry {
    /** The ID of the layer or image. */
    Id: string;
    /** The timestamp (in seconds) when the layer was created. */
    Created: number;
    /** Command used to create this layer. */
    CreatedBy: string;
    /** Tags associated with this layer (if any). */
    Tags: string[] | null;
    /** Size of the layer in bytes. */
    Size: number;
    /** Any comments for this layer (if provided). */
    Comment: string;
}

export interface ImageTagOptions {
    /**The repository name to associate with the image. */
    repository: string;
    /**The tag to assign to the image within the specified repository. Default: `latest` */
    tag?: string;
    /**Whether to force creation of the tag, even if it already exists. Default: `false` */
    force?: boolean;
}

export interface ImageRemoveOptions {
    /**The tag of the image to remove. Default: `latest` */
    tag?: string;
    /**A boolean flag to force the removal of the image even if it is in use by stopped containers. Default: `false` */
    force?: boolean;
    /**A boolean flag to prevent the pruning of untagged parent images. Default: `false`. */
    noprune?: boolean;
}

export interface BuildImageOptions {
    /**The name of the image to build. */
    name: string;
    /** The tag for the built image (e.g., `name:tag`). Default: `latest`. */
    tag?: string;

    /**
     * Path to the build context, pre-existing tarball, or URL.
     * - **Directory**: Provide a local directory path to build from.
     * - **Tarball**: Provide the path to a `.tar` file.
     * - **URL**: Specify a remote tarball or Dockerfile URL (e.g., `https://example.com/context.tar`).
     * 
     * Defaults to the current working directory (`process.cwd()`).
     * 
     * **Note:** If the context is a directory, the Dockerfile must be named `'Dockerfile'` or a custom name can
     * be provided using the `dockerfileName` option.
     */
    context?: string;

    /**
     * Custom Dockerfile name (defaults to "Dockerfile").
     * Useful if a non-standard Dockerfile name is used in the context.
     */
    dockerfileName?: string;

    /**
     * Authorization information for remote contexts, if required.
     * Used to authenticate requests to private URLs or secured endpoints.
     */
    authorization?: RemoteAuth;

    /**
     * Whether to disable Docker's build cache (default is false).
     * When set to true, Docker will rebuild all layers without caching.
     */
    noCache?: boolean;

    /** Remove intermediate containers after successful build. Default: true. */
    removeIntermediate?: boolean;
    /** Always remove intermediate containers, even on failure. Default: false. */
    forceRemoveIntermediate?: boolean;
    /** Always attempt to pull the latest base image. Default: false. */
    pullBaseImage?: boolean;

    /** 
     * Networking mode for `RUN` instructions during the build. 
     * For example: `bridge`, `host`, or custom network names.
     */
    networkMode?: string;

    /** Specify the target platform for building (e.g., `linux/amd64`, `linux/arm64`).  */
    platform?: string;

    /** Metadata labels for the image. */
    labels?: Record<string, string>;

    /**
     * Build-time arguments passed to the Dockerfile (e.g., `ARG my_var=value`).
     * 
     * Key-value pairs correspond to build arguments and their values.
     */
    buildArgs?: Record<string, string>;

    /**
     * Configures the output type and location.
     * For example: `type=local,dest=/path/to/output`.
     */
    outputs?: { key: string, value: string }[];

    /** Enable verbose output from the build process. Default: `false`. */
    verbose?: boolean;
}

export interface BuildImageEndpointParams {
    /**
     * Name and optional tag for the resulting image.
     * Format: `repository:tag` (e.g., `my-image:latest`).
     */
    t?: string;

    /**
     * Whether to disable caching for the build.
     * When `true`, all layers will be rebuilt without using the cache.
     */
    nocache?: boolean;

    /**
     * Remove intermediate containers after a successful build.
     * Default: `true`.
     */
    rm?: boolean;

    /**
     * Always remove intermediate containers, even if the build fails.
     * Default: `false`.
     */
    forcerm?: boolean;

    /**
     * Always pull the latest version of the base image before building.
     * Default: `false`.
     */
    pull?: boolean;

    /**
     * Networking mode for `RUN` instructions during the build.
     * Examples: `bridge`, `host`, or custom network names.
     */
    networkmode?: string;

    /**
     * Specify the target platform for the build.
     * Example: `linux/amd64`.
     */
    platform?: string;

    /**
     * Metadata labels for the image.
     * These are passed as key-value pairs.
     */
    labels?: Record<string, string>;

    /**
     * Build-time arguments passed to the Dockerfile.
     * Example: `{ "MY_VAR": "value" }` corresponds to `ARG MY_VAR=value`.
     */
    buildargs?: Record<string, string>;

    /**
     * Output configuration for the build.
     * Example: `type=local,dest=/path/to/output`.
     */
    outputs?: string;

    /**
     * The name of the Dockerfile within the build context.
     * Default: `Dockerfile`.
     */
    dockerfile?: string;

    /**
     * Controls whether verbose build output is enabled.
     */
    q?: boolean;   

    /**
     * The remote URL for the context tarball or Dockerfile.
     * If provided, Docker will fetch the context from this location.
     */
    remote?: string;    
}


// ##########################################################
// ##########################################################
// #################### Docker Interfaces ###################
// ##########################################################
// ##########################################################
export interface Network {
    Id: string;                    // Unique identifier for the network
    Name: string;                  // The name of the network
    Created: string;               // Creation time of the network (ISO 8601 format)
    Scope: 'local' | 'global';     // Scope of the network (either 'local' or 'global')
    Driver: Omit<NetworkDriver, 'none'>;                // Driver used by the network (e.g., 'bridge', 'overlay', etc.)
    EnableIPv6: boolean;           // Whether IPv6 is enabled on the network
    IPAM: Required<IPAMOptions>;
    Internal: boolean;             // Whether the network is internal (i.e., cannot access external networks)
    Attachable: boolean;           // Whether containers can be attached to the network
    Containers: Record<string, {
        Name: string;              // Name of the container
        EndpointID: string;        // Unique ID for the container's endpoint on the network
        MacAddress: string;        // MAC address of the container's network interface
        IPv4Address: string;       // IPv4 address of the container on the network
        IPv6Address: string;       // IPv6 address of the container on the network (if enabled)
    }>;
    Options: Record<string, string>; // Any options set for the network (key-value pairs)
    Labels: Record<string, string>;  // Any labels associated with the network (key-value pairs)
}

export interface Volume {
    Name: string; // The name of the volume
    Driver: string; // The driver used to manage the volume
    Mountpoint: string; // The path on the host where the volume is mounted
    CreatedAt: string; // The timestamp when the volume was created
    Status?: Record<string, any>; // The low-level status information about the volume (optional)
    Labels?: Record<string, string>; // User-defined metadata associated with the volume (optional)
    Scope: 'local' | 'global'; // The scope of the volume, either `local` or `global`
    Options?: Record<string, string>; // Driver-specific options used when creating the volume (optional)
    UsageData?: {
        Size: number; // The size of the volume in bytes
        RefCount: number; // The number of containers referencing this volume
    }; // Information about the volume's usage (optional)
}

export interface DockerImage {
    /** Number of containers running this image (-1 if none or not applicable) */
    Containers: number;

    /** Timestamp (in seconds since the epoch) when the image was created */
    Created: number;

    /** The unique identifier for the image */
    Id: string;

    /** Key-value pairs of labels associated with the image, or null if no labels */
    Labels: Record<string, string> | null;

    /** The ID of the parent image, empty if there is no parent */
    ParentId: string;

    /** Array of digests associated with the image */
    RepoDigests: string[];

    /** Array of tags associated with the image */
    RepoTags: string[];

    /** Shared size of the image (-1 if not applicable) */
    SharedSize: number;

    /** The total size of the image in bytes */
    Size: number;
}

// ##########################################################
// ##########################################################
// #################### Docker Interfaces ###################
// ##########################################################
// ##########################################################