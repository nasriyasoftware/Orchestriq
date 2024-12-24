import { StackVolumOptions } from "../../../../../docs/docs";
import ContainerTemplate from "../../ContainerTemplate";
import StackVolume from "./StackVolume";

class ServicesVolumesManager {
    #_container: ContainerTemplate;
    #_volumes: Record<string, StackVolume> = {};
    
    constructor(container: ContainerTemplate) {
        this.#_container = container;
    }

    /**
     * Returns a record of all volumes in the container.
     * @returns {Record<string, StackVolume>} A record of all volumes in the container.
     */
    get list(): Record<string, StackVolume> {
        return this.#_volumes;
    }

    /**
     * Creates a new volume and adds it to the container.
     * 
     * @param volume The volume to define, which includes properties such as:
     *               - name: The name of the volume.
     *               - driver: The driver to use for the volume.
     *               - driverOpts: Options specific to the driver.
     *               - labels: Labels for the volume.
     *               - mount: The mount path for the volume.
     *               - size: The size of the volume.
     *               - accessMode: The access mode for the volume (e.g., 'read-write').
     * @returns {StackVolume} The created volume.
     */
    create(volume: StackVolumOptions): StackVolume {
        const vol = new StackVolume(volume, this.#_container);
        this.#_volumes[vol.name] = vol;
        return vol;
    }
}

export default ServicesVolumesManager;