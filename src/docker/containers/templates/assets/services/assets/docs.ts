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

export interface ExternalLinkRecord {
    externalContainerName: string;
    /**If not defined, the internal container name will be the same as the external container name */
    internalContainerName?: string;
}

export interface RestartOption {
    policy: Omit<RestartPolicy, 'on-failure'>;
}

export interface FailureRestartOption extends RestartOption {
    policy: 'on-failure';
    /**Only works with the `on-failure` policy. Default: `5` */
    times: number;
}

export type RestartPolicy = 'on-failure' | 'unless-stopped' | 'always' | 'no';
export type DockerDriverType = DockerLoggingDriver['driver'];
export type NetworkMode = 'host' | 'bridge' | 'none' | { type: 'container' | 'service', value: string } | string;

export interface ServiceCreationOptions {
    /**The name of the service */
    name: string;
    /**The name of the container */
    container_name?: string;
    /**The image of the service */
    image?: string;
    /**The working directory of the service */
    context?: string;
    /**The ports exposed by the service */
    ports?: (number | string | Port | Port)[];
    /**The volumes mounted by the service */
    volumes?: ServiceVolume | ServiceVolume[];
    /**The environment variables for the service */
    description?: string;
    /**The build options for the service */
    build?: ServiceBuildOptions;
    /**The environment variables for the service */
    environment?: Record<string, string>;
    /**The environment files/directories for the service */
    env_files?: string | string[];
    entrypoint?: string;
    command?: string[];
    dependsOn?: string[];
    networks?: string[];
    network_mode?: NetworkMode;
    user?: string;
    restart?: FailureRestartOption | RestartPolicy;
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

export type ServiceConfigMode = 'read' | 'write' | 'exec';
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

export interface ServiceDeploymentData {
    /**Service deployment mode */
    mode?: "global" | "replicated";
    /**Number of service replicas (only applicable to "replicated" mode) */
    replicas?: number;
    /**Metadata labels for the service */
    labels?: Record<string, string>;
    /**Configuration for updating services */
    update_config?: ServiceUpdateConfig;
    /**Configuration for rollback scenarios */
    rollback_config?: ServiceUpdateConfig;
    /**Restart policy for the service */
    restart_policy?: RestartPolicyConfig;
    /**Constraints and preferences for service placement */
    placement?: Placement;
    /**Endpoint mode for load balancing */
    endpoint_mode?: "vip" | "dnsrr";
    /**Resource limits and reservations */
    resources?: ResourceConfig;
}

export interface ServiceUpdateConfig {
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

