import { RemoteAuth } from "../docs/docs";
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

                            const message = msgs.filter(Boolean).join(' ');
                            progress.log(data.id, message);
                        }

                    } catch (err) {
                        console.error('Failed to parse JSON:', err);
                    }
                }
            }
        }
    }

    isValidObject(obj: any): boolean { return this.isObject(obj) && this.notEmptyObject(obj); }
    isObject(obj: any): boolean { return typeof obj === 'object' && obj !== null; }
    notEmptyObject(obj: any): boolean { return this.isObject(obj) && Object.keys(obj).length > 0; }

    /**
     * Builds the authorization header for a request based on the given options.
     * @param reqOptions - The request options object to modify.
     * @param auth - The authorization options. If undefined, the header is not set.
     * The authorization options must contain a type property which must be one of:
     * - Basic
     * - Bearer
     * If the type is Basic, the options must contain username and password properties.
     * If the type is Bearer, the options must contain a token property.
     * The authorization options are validated and an error is thrown if they are invalid.
     * @throws TypeError - If the authorization options are invalid.
     * @throws Error - If the authorization type is unknown.
     */
    buildAuthHeader(reqOptions: Record<string, any>, auth: RemoteAuth | undefined) {
        const authTypes = ['Basic', 'Bearer'];
        if (!auth || !this.notEmptyObject(auth)) { throw new Error('The authorization (when provided) must be an object.'); }
        if (!('type' in auth)) { throw new Error('The authorization (when provided) must have a type.'); }
        if (!authTypes.includes(auth.type)) { throw new Error(`The authorization (when provided) must have one of the following types: ${authTypes.join(', ')}.`); }

        if (auth.type === 'Basic') {
            if ('username' in auth) {
                if (typeof auth.username !== 'string' || auth.username.length === 0) { throw new TypeError(`The "username" option (when provided) must be a non-empty string.`); }
            } else {
                throw new TypeError(`The "authorization" option (when provided) must contain a "username" property.`);
            }

            if ('password' in auth) {
                if (typeof auth.password !== 'string' || auth.password.length === 0) { throw new TypeError(`The "password" option (when provided) must be a non-empty string.`); }
            } else {
                throw new TypeError(`The Basic "authorization" option (when provided) must contain a "password" property.`);
            }

            reqOptions.headers['Authorization'] = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
        }

        if (auth.type === 'Bearer') {
            if ('token' in auth) {
                if (typeof auth.token !== 'string' || auth.token.length === 0) { throw new TypeError(`The "token" option (when provided) must be a non-empty string.`); }
                reqOptions.headers['Authorization'] = `Bearer ${auth.token}`;
            } else {
                throw new TypeError(`The Bearer "authorization" option (when provided) must contain a "token" property.`);
            }
        }
    }
}

const helpers = new Helpers();
export default helpers;