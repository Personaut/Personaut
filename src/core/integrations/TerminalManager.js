"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalManager = void 0;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
const os = __importStar(require("os"));
const CommandValidator_1 = require("../../shared/services/CommandValidator");
class TerminalManager {
    constructor() {
        this.commandValidator = new CommandValidator_1.CommandValidator();
    }
    static getInstance() {
        if (!TerminalManager.instance) {
            TerminalManager.instance = new TerminalManager();
        }
        return TerminalManager.instance;
    }
    /**
     * Execute a command with security validation.
     *
     * @param command - The command to execute
     * @param shouldSkipConfirmation - If true, skip user confirmation for dangerous commands
     * @returns Command output or error message
     */
    async executeCommand(command, shouldSkipConfirmation = false) {
        // Validate the command
        const validation = this.commandValidator.validate(command);
        if (!validation.allowed) {
            // Log blocked command attempt
            console.warn(`[TerminalManager] Blocked command: ${command}. Reason: ${validation.reason}`);
            return `Command blocked: ${validation.reason}`;
        }
        // Check if confirmation is required
        if (validation.requiresConfirmation && !shouldSkipConfirmation) {
            const confirmed = await this.requestConfirmation(command, validation);
            if (!confirmed) {
                return 'Command cancelled by user.';
            }
        }
        this.ensureTerminal();
        // Send command to the interactive terminal for user visibility
        this.terminal.show();
        this.terminal.sendText(validation.sanitizedCommand || command);
        // Execute in background with sanitized environment
        const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        const shellArgs = os.platform() === 'win32'
            ? ['-Command', validation.sanitizedCommand || command]
            : ['-c', validation.sanitizedCommand || command];
        // Filter sensitive environment variables
        const sanitizedEnv = this.commandValidator.sanitizeEnvironment(process.env);
        return new Promise((resolve, reject) => {
            const proc = cp.spawn(shell, shellArgs, {
                cwd,
                env: sanitizedEnv,
            });
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            proc.on('close', (_code) => {
                // Return output just like a normal terminal - stdout and stderr combined
                const result = stdout + stderr;
                resolve(result);
            });
            proc.on('error', (err) => {
                reject(err);
            });
        });
    }
    /**
     * Request user confirmation for dangerous commands.
     *
     * @param command - The command requiring confirmation
     * @param validation - The validation result
     * @returns true if user confirms, false otherwise
     */
    async requestConfirmation(command, validation) {
        const riskLabel = validation.riskLevel === 'high' ? '⚠️ HIGH RISK' : '⚡ Potentially Dangerous';
        const result = await vscode.window.showWarningMessage(`${riskLabel}: The following command requires confirmation:\n\n${command}`, { modal: true }, 'Execute', 'Cancel');
        return result === 'Execute';
    }
    /**
     * Validate a command without executing it.
     *
     * @param command - The command to validate
     * @returns Validation result
     */
    validateCommand(command) {
        return this.commandValidator.validate(command);
    }
    /**
     * Get the current rate limit status.
     */
    getRateLimitStatus() {
        return this.commandValidator.getRateLimitStatus();
    }
    /**
     * Get the CommandValidator instance for testing.
     */
    getCommandValidator() {
        return this.commandValidator;
    }
    ensureTerminal() {
        if (this.terminal) {
            return;
        }
        // Create a real interactive terminal
        this.terminal = vscode.window.createTerminal({
            name: 'Personaut',
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        });
    }
    dispose() {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = undefined;
        }
    }
}
exports.TerminalManager = TerminalManager;
//# sourceMappingURL=TerminalManager.js.map