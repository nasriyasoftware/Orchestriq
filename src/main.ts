import Docker from "./docker/Docker";
import registries from "./registries/Registries";
export { default as Docker } from "./docker/Docker";

class Orchestriq {
    /**
     * The Docker class provides an interface for interacting with a Docker daemon.
     * It allows you to create containers, networks, volumes, and secrets, as well as
     * manage existing ones.
     */   
    get Docker() { return Docker }

    /**
     * The Registries class provides an interface for managing Docker registries.
     * It allows you to define, list, and remove registries.
     */
    get registries() { return registries }
}

const orchestriq = new Orchestriq();
export default orchestriq