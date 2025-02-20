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

export type NetworkDriver = 'bridge' | 'overlay' | 'macvlan' | 'host' | 'none';

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