import Docker from "./docker/Docker";
export { default as Docker } from "./docker/Docker";

class Orchestriq {
    /**
     * The Docker class provides an interface for interacting with a Docker daemon.
     * It allows you to create containers, networks, volumes, and secrets, as well as
     * manage existing ones.
     */   
    get Docker() { return Docker }
}

const orchestriq = new Orchestriq();
export default orchestriq