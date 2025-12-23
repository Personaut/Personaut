/**
 * WebpackErrorParser - Parses webpack compilation errors
 */

export interface CompilationError {
    file: string;
    line?: number;
    column?: number;
    message: string;
    type: 'error' | 'warning';
    fullError: string;
}

export class WebpackErrorParser {
    /**
     * Parse webpack output for compilation errors
     */
    static parseErrors(output: string): CompilationError[] {
        const errors: CompilationError[] = [];

        // Match patterns like:
        // ERROR in ./src/App.tsx 6:0-41
        // Module not found: Error: Can't resolve './pages/home-feed'
        const errorPattern = /ERROR in (\.\/[^\s]+)\s+(\d+):(\d+)-(\d+)?\s*\n([^\n]+(?:\n(?!ERROR|WARNING)[^\n]+)*)/g;

        let match;
        while ((match = errorPattern.exec(output)) !== null) {
            const [fullMatch, file, line, column, , message] = match;
            errors.push({
                file: file.replace('./', ''),
                line: parseInt(line, 10),
                column: parseInt(column, 10),
                message: message.trim(),
                type: 'error',
                fullError: fullMatch.trim(),
            });
        }

        // Also match simpler error format:
        // Module not found: Error: Can't resolve './App'
        const simpleErrorPattern = /(Module not found|Syntax error|Type error):\s*([^\n]+)/gi;

        while ((match = simpleErrorPattern.exec(output)) !== null) {
            const [fullMatch, errorType, message] = match;

            // Skip if we already captured this error
            if (errors.some(e => e.fullError.includes(fullMatch))) {
                continue;
            }

            errors.push({
                file: 'unknown',
                message: `${errorType}: ${message}`.trim(),
                type: 'error',
                fullError: fullMatch.trim(),
            });
        }

        return errors;
    }

    /**
     * Format errors for display
     */
    static formatErrors(errors: CompilationError[]): string {
        return errors.map(error => {
            const location = error.line
                ? `${error.file}:${error.line}:${error.column}`
                : error.file;
            return `${location}\n${error.message}`;
        }).join('\n\n');
    }

    /**
     * Check if output contains compilation errors
     */
    static hasErrors(output: string): boolean {
        return /ERROR in|Failed to compile|Syntax error|Module not found/i.test(output);
    }
}
