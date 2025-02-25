import { Readable } from "stream";
import { RegistryAuth } from "../registries/docs";
import ProgressLogger from "./cli_logger";

class Helpers {
    deepClone(value: any): any {
        // Check if value is a non-null object (arrays are also objects in JS)
        if (value && typeof value === 'object') {
            if (Array.isArray(value)) {
                // If it's an array, recursively clone each item
                return value.map(this.deepClone);
            } else {
                // If it's an object, create a new object and recursively clone its properties
                const clonedObject: Record<string, any> = {};
                for (const key in value) {
                    if (value.hasOwnProperty(key)) {
                        clonedObject[key] = this.deepClone(value[key]);
                    }
                }
                return clonedObject;
            }
        }
        // If it's a primitive value, just return it as is
        return value;
    }

    isURL(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Reads a response stream and logs its content in a human-readable format.
     * It expects the response to be a JSON stream where each line is a JSON object.
     * It parses each line and extracts the status, progress and error if present.
     * If the verbose flag is set to true, it logs each line with status and progress.
     * If the verbose flag is set to false, it logs only the final result.
     *
     * @param response - The response stream to read.
     * @param verbose - Whether to log each line or just the final result.
     */
    async processStream(response: Response, verbose: boolean = false) {
        const reader = (response as Response).body?.getReader();
        if (!reader) { throw new Error('Failed to get response stream.'); }

        const decoder = new TextDecoder('utf-8');
        const progress = new ProgressLogger();
        let done = false;

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;

            if (value) {
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(Boolean);

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (verbose === true) {
                            const msgs = [];
                            if (data.status) {
                                const status = (() => {
                                    if (data.status.toLowerCase().includes('pulling from') && data.id) {
                                        return `${data.status}:${data.id}`;
                                    } else {
                                        return data.status;
                                    }
                                })();

                                msgs.push(status);
                            }

                            if (data.progress) { msgs.push(`${' '.repeat(20 - data.status.length)}${data.progress}`); }
                            if (data.errorDetail) { msgs.push(data.errorDetail.message); }
                            if (data.stream) {
                                progress.log(data.stream, data.id);
                                continue;
                            }

                            const message = msgs.filter(Boolean).join(' ');
                            progress.log(message, data.id);
                        }

                    } catch (err) {
                        console.error('Failed to parse JSON:', err);
                    }
                }
            }
        }
    }


    /**
     * Converts a readable stream into a single buffer.
     * 
     * @param stream - A readable stream, which can be either a Node.js Readable stream or a web ReadableStream.
     * @returns A promise that resolves with a buffer containing all the data from the stream.
     * @throws Will throw an error if the stream encounters an error during reading.
     * 
     * This function listens for data, end, and error events on Node.js streams. For web streams, it uses an async iterator
     * to read the stream. The resulting data chunks are collected into a buffer.
     */
    async streamToBuffer(stream: ReadableStream<any> | Readable): Promise<Buffer> {
        const chunks: Buffer[] = [];

        if (stream instanceof Readable) {
            return new Promise((resolve, reject) => {
                stream.on('data', (chunk) => {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                });

                stream.on('end', () => {
                    resolve(Buffer.concat(chunks)); // Combine chunks into a single buffer
                });

                stream.on('error', (err) => {
                    reject(err); // Reject the promise if there's an error
                });
            });
        } else {
            for await (const chunk of stream) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            return Buffer.concat(chunks);
        }
    }

    addRegistryAuthHeader(reqOptions: Record<string, any>, auth: RegistryAuth, serveraddress: string = 'https://index.docker.io/v1') {
        const authConfig: RegistryAuth = { username: auth.username, password: auth.password };

        if ('username' in auth) {
            if (typeof auth.username !== 'string' || auth.username.length === 0) { throw new TypeError(`The "username" option (when provided) must be a non-empty string.`); }
        } else {
            throw new TypeError(`The registry "authorization" option (when provided) must contain a "username" property.`);
        }

        if ('password' in auth) {
            if (typeof auth.password !== 'string' || auth.password.length === 0) { throw new TypeError(`The "password" option (when provided) must be a non-empty string.`); }
        } else {
            throw new TypeError(`The registry "authorization" option (when provided) must contain a "password" property.`);
        }

        if ('email' in auth) {
            if (typeof auth.email !== 'string' || auth.email.length === 0) { throw new TypeError(`The registry "email" option (when provided) must be a non-empty string.`); }
            if (!this.isValidEmail(auth.email)) { throw new TypeError(`The registry "email" you provided (${auth.email}) must be a valid email address.`); }
            authConfig.email = auth.email;
        }

        if (!reqOptions.headers) { reqOptions.headers = {}; }
        reqOptions.headers['X-Registry-Auth'] = Buffer.from(JSON.stringify({ ...authConfig, serveraddress })).toString('base64');
    }

    isValidObject(obj: any): boolean { return this.isObject(obj) && this.notEmptyObject(obj); }
    isObject(obj: any): boolean { return typeof obj === 'object' && obj !== null; }
    notEmptyObject(obj: any): boolean { return this.isObject(obj) && Object.keys(obj).length > 0; }
    isValidEmail(email: string): boolean { return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email); }
}

const helpers = new Helpers();
export default helpers;