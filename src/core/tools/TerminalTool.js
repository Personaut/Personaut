"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecuteCommandTool = void 0;
const TerminalManager_1 = require("../integrations/TerminalManager");
class ExecuteCommandTool {
    constructor(_abortControllerProvider) {
        this.name = 'execute_command';
        this.description = 'Execute a shell command in the workspace root. The command is executed in a visible terminal.';
    }
    getUsageExample() {
        return `<execute_command>\n    command here\n</execute_command>`;
    }
    async execute(_args, content) {
        const command = content || '';
        try {
            const terminalManager = TerminalManager_1.TerminalManager.getInstance();
            const output = await terminalManager.executeCommand(command);
            // Return the output directly - it already includes exit code info
            return output;
        }
        catch (e) {
            return `Error: ${e.message}`;
        }
    }
}
exports.ExecuteCommandTool = ExecuteCommandTool;
//# sourceMappingURL=TerminalTool.js.map