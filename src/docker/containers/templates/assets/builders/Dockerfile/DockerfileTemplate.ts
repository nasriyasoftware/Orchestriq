import DockerfileStage from "./DockerfileStage";
import { DockerfileStageOptions } from "./docs/docs";
import fs from 'fs/promises';
import path from "path";

class DockerfileTemplate {
    #_stages = new Map<string, DockerfileStage>();
    #_lines: string[] = [];
    #_generating = false;

    /**
     * Generates the Dockerfile content based on the specified stages.
     *
     * Throws an error if the Dockerfile is already being generated, or if there are no stages specified.
     *
     * @returns {string} The content of the generated Dockerfile.
     */
    generateContent(): string {
        try {
            if (this.#_generating) { throw new Error('Cannot generate Dockerfile while already generating.'); }
            this.#_generating = true;
            if (this.#_stages.size === 0) { throw new Error('Cannot generate Dockerfile without any stages.'); }

            this.#_lines = [];
            this.#_lines.push(
                '# Comments are provided throughout this file to help you get started.',
                '# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7\n'                
            );

            const stages = Array.from(this.#_stages.values());
            for (let i = 0; i < stages.length; i++) {
                const stage = stages[i];
                const stageNum = i + 1;
                this.#_lines.push(`# Stage: ${stage.as || stageNum}`);
                this.#_lines.push(stage.generate(), '\n');
            }


            return this.#_lines.join('\n').trim();
        } catch (error) {
            if (error instanceof Error) { error.message = `Error generating Dockerfile: ${error.message}`; }
            throw error;
        } finally {
            this.#_generating = false;
        }
    }

    /**
     * Generates the Dockerfile content based on the specified stages and writes it to the provided path.
     *
     * @param {string} outputPath The path to write the Dockerfile content to.
     *
     * @throws {Error} If the Dockerfile is already being generated.
     * @throws {Error} If there are no stages specified.
     * @throws {Error} If there is an error writing the file to the specified path.
     */
    async generate(outputPath: string) {
        try {
            const content = this.generateContent();
            await fs.mkdir(path.dirname(outputPath), { recursive: true }); // Ensure parent directories exist
            await fs.writeFile(path.resolve(outputPath), content, { encoding: 'utf-8' });
        } catch (error) {
            if (error instanceof Error) { error.message = `Error generating Dockerfile: ${error.message}`; }
            throw error;
        }
    }

    /**
     * Retrieves the stages of the Dockerfile template.
     *
     * @returns {Map<string, DockerfileStage>} A map where keys are stage names and values are instances of DockerfileStage.
     */
    get stages(): Map<string, DockerfileStage> { return Object.freeze(this.#_stages); }

    /**
     * Creates a new Dockerfile stage and adds it to the template.
     *
     * @param {DockerfileStageOptions} [options] The options to pass to the new DockerfileStage.
     *
     * @returns {DockerfileStage} The new DockerfileStage instance.
     */
    newStage(options: DockerfileStageOptions): DockerfileStage {
        const stage = new DockerfileStage(this);
        const order = this.#_stages.size + 1;
        stage.update(options || {})

        this.#_stages.set(stage.as || `Stage_${order}`, stage);
        return stage;
    }
}

export default DockerfileTemplate;