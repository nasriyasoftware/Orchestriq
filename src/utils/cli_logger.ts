import readline from 'readline';

class ProgressLogger {
    #_lines: Map<string, number>;
    #_currentLine: number;
    #_index = -1;

    constructor() {
        this.#_lines = new Map();
        this.#_currentLine = 0; // Tracks the total #_lines used in the terminal
    }

    /**
     * Logs a new progress line or updates an existing one.
     * @param {string} id - The unique ID for the progress line.
     * @param {string} message - The progress message to display.
     */
    log(message: string, id?: string) {
        if (!id) {
            this.#_index++;
            id = `msg_${this.#_index}`;
        }
        
        if (!this.#_lines.has(id)) {
            // New progress ID: Save the line number
            this.#_lines.set(id, this.#_currentLine);
            this.#_writeNewLine(message);
            this.#_currentLine++;
        } else {
            // Existing progress ID: Update the line
            const lineNumber = this.#_lines.get(id)!;
            this.#_updateLine(lineNumber, message);
        }
    }

    /**
     * Writes a new line to the terminal.
     * @param {string} message - The message to display.
     */
    #_writeNewLine(message: string) {
        process.stdout.write(`${message}\n`);
    }

    /**
     * Updates a specific line in the terminal.
     * @param {number} lineNumber - The line number to update.
     * @param {string} message - The new message to display.
     */
    #_updateLine(lineNumber: number, message: string) {
        readline.cursorTo(process.stdout, 0); // Move cursor to the start of the line
        readline.moveCursor(process.stdout, 0, lineNumber - this.#_currentLine); // Move to the desired line
        process.stdout.write(`\x1B[K${message}`); // Clear the line and write new content
        readline.cursorTo(process.stdout, 0, this.#_currentLine); // Restore cursor to the end
    }
}

export default ProgressLogger;