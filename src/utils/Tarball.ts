import * as tar from 'tar';
import path from 'path';
import fs from 'fs';
import os from 'os';

class Tarball {
    
    /**
     * Builds a tarball of the given directory path. If a Dockerfile name is provided, it will be renamed within the tarball.
     * @param directoryPath The path to the directory that should be built into a tarball.
     * @param dockerfileName Optional name to rename the Dockerfile within the tarball to.
     * @returns A promise that resolves to the path of the created tarball.
     */
    async build(directoryPath: string, dockerfileName?: string): Promise<string> {       
        const contextPath = path.join(os.tmpdir(), 'NasriyaSoftware', 'DockerNode', 'context');
        if (!fs.existsSync(contextPath)) { await fs.promises.mkdir(contextPath, { recursive: true }); }

        const tarPath = path.join(contextPath, `context-${Date.now()}.tar`);

        // Optional Dockerfile renaming transformation
        const transforms = dockerfileName ? [`--transform=flags=r;s|${dockerfileName}|Dockerfile|`] : [];

        const entries = await fs.promises.readdir(directoryPath);
        const files = entries.concat(transforms);

        await tar.create({ file: tarPath, gzip: false, cwd: path.resolve(directoryPath) }, files);
        return tarPath;
    }
}

const tarball = new Tarball();
export default tarball;