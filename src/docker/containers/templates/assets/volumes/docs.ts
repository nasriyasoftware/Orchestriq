export type VolumeDriver = 'local' | 'nfs' | 'ceph' | 'efs' | 'azurefile' | 'glusterfs' | 'longhorn' | 'portworx' | 'cifs' | 'vSphere' | 'flocker' | 'local-persist' | 'rexray' | 'scaleio' | 'ztfs' | string;

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

export type CreateVolumeOptions = Pick<StackVolumOptions, 'name' | 'driver' | 'driverOpts' | 'labels'>;