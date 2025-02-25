import { RemoteAuth } from "../../docs/docs";

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
     * A path of the dockerfile
     */
    dockerfilePath?: string;

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

export interface ImageRemoveOptions {
    /**The tag of the image to remove. Default: `latest` */
    tag?: string;
    /**A boolean flag to force the removal of the image even if it is in use by stopped containers. Default: `false` */
    force?: boolean;
    /**A boolean flag to prevent the pruning of untagged parent images. Default: `false`. */
    noprune?: boolean;
}

export interface ImageTagOptions {
    /**The repository name to associate with the image. */
    repository: string;
    /**The tag to assign to the image within the specified repository. Default: `latest` */
    tag?: string;
    /**Whether to force creation of the tag, even if it already exists. Default: `false` */
    force?: boolean;
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

