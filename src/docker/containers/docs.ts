export interface DockerContainerData {
    Id: string;
    Names: string[];
    Image: string;
    ImageID: string;
    Command: string;
    Created: number;
    Ports: { IP?: string, PrivatePort: number, PublicPort?: number, Type: string }[];
    Labels: Record<string, string>;
    State: string;
    Status: string;
    HostConfig: Record<string, string>;
    NetworkSettings: any;
    Mounts: any[];
}

export interface CreateContainerRequest {
    /** Name of the image to use for the container (e.g., 'nginx:latest') */
    Image: string;
    /** Command to run inside the container */
    Cmd?: string[];
    /** Allocate a pseudo-TTY */
    Tty?: boolean;
    /** Keep stdin open */
    OpenStdin?: boolean;
    /** Attach standard input */
    AttachStdin?: boolean;
    /** Attach standard output */
    AttachStdout?: boolean;
    /** Attach standard error */
    AttachStderr?: boolean;
    /** Set environment variables (e.g., ['VAR=value']) */
    Env?: string[];
    /** Set the working directory inside the container */
    WorkingDir?: string;
    /** Container volumes (e.g., {'/data': {}}) */
    Volumes?: Record<string, object>;
    /** Entry point for the container */
    Entrypoint?: string[];
    /** Labels for the container */
    Labels?: Record<string, string>;
    /** Network settings */
    NetworkingConfig?: {
        /** Custom aliases for the container in user-defined networks */
        EndpointsConfig?: Record<string, {
            /** List of network aliases */
            Aliases?: string[];
        }>;
    };
    /** Host configuration (mounts, networking, resource limits) */
    HostConfig?: {
        /** Bind mounts (e.g., ['/host/path:/container/path']) */
        Binds?: string[];
        /** Port bindings (e.g., {'80/tcp': [{'HostPort': '8080'}]}) */
        PortBindings?: Record<string, { HostPort: string }[]>;
        /** Run the container in privileged mode */
        Privileged?: boolean;
        /** Auto-remove container when it stops */
        AutoRemove?: boolean;
        /** Restart policy (e.g., {Name: 'always'}) */
        RestartPolicy?: { Name: string };
        /** Memory limit in bytes */
        Memory?: number;
        /** CPU share weighting */
        CpuShares?: number;
        /** Additional Linux capabilities */
        CapAdd?: string[];
    };
    /** Exposed container ports (e.g., {'80/tcp': {}}) */
    ExposedPorts?: Record<string, object>;
    /** Disable networking */
    NetworkDisabled?: boolean;
    /** Custom hostname inside the container */
    Hostname?: string;
    /** MAC address */
    MacAddress?: string;
}

export type CreateContainerOptions = CreateContainerRequest & {
    /** Name of the container */
    name?: string;
}

export interface ContainerTopResponse {
    /** List of column titles (e.g., ["UID", "PID", "PPID", "CMD"]) */
    Titles: string[];
    /** List of process information, where each inner array corresponds to the columns in `Titles` */
    Processes: string[][];
}

export interface ContainerLogsOptions {
    /** Return logs from stdout */
    stdout?: boolean;
    /** Return logs from stderr */
    stderr?: boolean;
    /** Return logs starting from a specific UNIX timestamp or duration (e.g., "10m" for last 10 minutes) */
    since?: Date;
    /** Return logs before a specific UNIX timestamp or duration (e.g., "10m" for last 10 minutes) */
    until?: Date;
    /** Show logs as a stream (default: false) */
    follow?: boolean;
    /** Show logs in a raw format without timestamps */
    timestamps?: boolean;
    /** Number of lines from the end of the logs (e.g., "100" for last 100 lines) or `all`. Default: `all` */
    tail?: number | string;
}

interface ContainerChange {
    /** Path to the file or directory inside the container */
    Path: string;
    /** Change type: 0 = Modified, 1 = Added, 2 = Deleted */
    Kind: 0 | 1 | 2;
}

export type ContainerChangesResponse = ContainerChange[];

export interface ContainerStatsOptions {
    /** If true, returns a stream of stats */
    stream?: boolean;
    /** If true, returns a single chunk of stats and then closes the stream */
    oneShot?: boolean;
}

/**Options for updating a running container's resource limits. */
export interface ContainerUpdateOptions {
    /** CPU shares (relative weight) */
    CpuShares?: number;
    /** CPU period to configure CFS scheduler (in microseconds) */
    CpuPeriod?: number;
    /** CPU quota to configure CFS scheduler (in microseconds) */
    CpuQuota?: number;
    /** CPU real-time period in microseconds */
    CpuRealtimePeriod?: number;
    /** CPU real-time runtime in microseconds */
    CpuRealtimeRuntime?: number;
    /** Number of CPUs to use (e.g., "1.5" for 1.5 CPUs) */
    NanoCpus?: number;
    /** Memory limit in bytes */
    Memory?: number;
    /** Memory soft limit in bytes */
    MemoryReservation?: number;
    /** Total memory limit (memory + swap) in bytes; set to -1 for unlimited swap */
    MemorySwap?: number;
    /** Kernel memory limit in bytes (deprecated in newer versions) */
    KernelMemory?: number;
    /** Number of processes allowed inside the container */
    PidsLimit?: number;
    /** Block IO weight (relative weight, value between 10 and 1000) */
    BlkioWeight?: number;
    /** List of block IO weight per device */
    BlkioWeightDevice?: Array<{ Path: string; Weight: number }>;
    /** Throttle read rate (bytes per second) per device */
    BlkioDeviceReadBps?: Array<{ Path: string; Rate: number }>;
    /** Throttle write rate (bytes per second) per device */
    BlkioDeviceWriteBps?: Array<{ Path: string; Rate: number }>;
    /** Throttle read IO operations per second per device */
    BlkioDeviceReadIOps?: Array<{ Path: string; Rate: number }>;
    /** Throttle write IO operations per second per device */
    BlkioDeviceWriteIOps?: Array<{ Path: string; Rate: number }>;
    /** List of allowed CPUs (e.g., "0,1" or "0-2") */
    CpusetCpus?: string;
    /** List of allowed memory nodes (NUMA) */
    CpusetMems?: string;
    /** Whether to disable OOM Killer for the container */
    OomKillDisable?: boolean;
    /** Tune host kernel’s Out Of Memory killer for this container (lower is more likely to be killed) */
    OomScoreAdj?: number;
    /** Adjusts the container's scheduling priority (-20 to 19, lower is higher priority) */
    CpuRtPeriod?: number;
    /** Adjusts the container's CPU scheduling runtime */
    CpuRtRuntime?: number;
    /** Whether to allow container to use swap memory */
    Swappiness?: number;
    /** If true, allows container to access OOM-killed process logs */
    AllowOomMemoryDump?: boolean;
    /** Whether the container should restart automatically on failure */
    RestartPolicy?: {
        Name: "no" | "always" | "unless-stopped" | "on-failure";
        MaximumRetryCount?: number;
    };
    /** Memory usage for HugePages (e.g., "2MB:512MB") */
    HugePagesLimits?: Array<{ PageSize: string; Limit: number }>;
    /** Custom SELinux label for the container */
    SecurityOpt?: string[];
    /** List of additional kernel capabilities */
    CapAdd?: string[];
    /** List of kernel capabilities to drop */
    CapDrop?: string[];
    /** Additional devices to add to the container */
    Devices?: Array<{ PathOnHost: string; PathInContainer: string; CgroupPermissions: string }>;
    /** Whether to enable CPU CFS (Completely Fair Scheduler) */
    CpuCfsQuota?: boolean;
    /** Additional sysctls (kernel parameters) */
    Sysctls?: Record<string, string>;
}

export interface ContainerRemoveOptions {
    /** Whether to force the removal of a running container (uses SIGKILL) */
    force?: boolean;
    /** Whether to remove the volumes associated with the container */
    removeVolumes?: boolean;
    /** Whether to remove the specified link and not the underlying data */
    link?: boolean;
}

export interface ContainerArchiveTarOutputOptions {
    /**The type of output */
    type: 'file' | 'stream';
    /**The path to the file to write the output to */
    path?: string;
}

export interface ContainerArchiveAddFilesOptions {
    /**Path to a directory in the container to extract the archive’s contents into. */
    path: string;
    /**A path to a tarball or a directory to be added to the container */
    context: string;
    /**If true, do not overwrite an existing directory of the same name */
    noOverwrite?: boolean;
    /**If true, copy the UID and GID from the archive */
    copyUIDGID?: boolean;
}

/** Filters to process on the prune list, encoded as JSON (a map of maps). */
export interface ContainersPruneFilters {
    /**
     * Prune containers created before this timestamp.
     * The timestamp can be Unix timestamps, date formatted timestamps, or Go duration strings (e.g. 2m, 1h30m)
     * computed relative to the daemon machine’s time.
     */
    until?: Date | number | string;

    /**
     * Prune containers with or without the specified labels
     * in case `label!=...` or `{ equal: false }` is specified as a label filter.
     * @example
     * // Defining labels with strings
     * labels: ['label1=value1', 'label3!=value3', ]
     * @example
     * // Defining labels with objects
     * labels: [{ key: 'label1', value: 'value1' }, { key: 'label3', value: 'value3', equal: false }]
     * @example
     * // Defining mixed labels
     * labels: ['label1=value1', { key: 'label3', value: 'value3', equal: false }]
     */
    labels?: (string | ContainersPruneLabelFilter)[];
}

interface ContainersPruneLabelFilter {
    /** The key of the label */
    key: string;
    /** The value of the label */
    value: string;
    /**
     * If `true`, the label `value` must be equal to the specified value,
     * if `false`, the label `value` must not be equal to the specified value.
     * Defaults to `true`.
     * @default true
     */
    equal?: boolean;
}

/**
 * Represents the response from the Docker daemon after pruning containers.
 */
export interface ContainersPruneResponse {
    /** The amount of disk space reclaimed in bytes. */
    SpaceReclaimed: number;

    /** An array of container IDs that were deleted. */
    ContainersDeleted?: string[];
}
