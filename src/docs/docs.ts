








interface ServiceNetwork {
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







export type DockerOptions = LocalDockerOptions | NetworkDockerOptions | RemoteDockerOptions;
export type SocketConfig = Required<LocalDockerOptions> & { url: URL } | ExternalDockerConfig & { headers: Record<string, string> };

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
     * Define the authentication to use when connecting to the Docker daemon.
     * If not provided, no authentication will be used.
     * @default 'none'
     */
    authentication?: RemoteAuth | 'none';
    /**
     * The credentials to use when connecting to the Docker daemon.
     * They're used in the request URL.
     */
    credentials?: Omit<BasicAuth, 'type'>;
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
    /**Specify the authentication to use when connecting to the Docker daemon. */
    authentication?: RemoteAuth;
}

export interface BasicAuth extends SocketAuth {
    type: 'Basic';
    username: string;
    password: string;
}

export interface BearerAuth extends SocketAuth {
    type: 'Bearer';
    token: string;
}

export interface SocketAuth {
    /**The socket authorization type */
    type: 'Basic' | 'Bearer' | 'none';
}

export type RemoteAuth = BasicAuth | BearerAuth;

// ##########################################################
// ##########################################################
// #################### Docker Interfaces ###################
// ##########################################################
// ##########################################################


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



// ##########################################################
// ##########################################################
// #################### Docker Interfaces ###################
// ##########################################################
// ##########################################################