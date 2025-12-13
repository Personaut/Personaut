import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as os from 'os';
import { CommandValidator, CommandValidationResult } from '../../shared/services/CommandValidator';

export class TerminalManager {
  private static instance: TerminalManager;
  private terminal: vscode.Terminal | undefined;
  private commandValidator: CommandValidator;

  private constructor() {
    this.commandValidator = new CommandValidator();
  }

  public static getInstance(): TerminalManager {
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
  public async executeCommand(
    command: string,
    shouldSkipConfirmation: boolean = false
  ): Promise<string> {
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
    this.terminal!.show();
    this.terminal!.sendText(validation.sanitizedCommand || command);

    // Execute in background with sanitized environment
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const shellArgs =
      os.platform() === 'win32'
        ? ['-Command', validation.sanitizedCommand || command]
        : ['-c', validation.sanitizedCommand || command];

    // Filter sensitive environment variables
    const sanitizedEnv = this.commandValidator.sanitizeEnvironment(process.env);

    return new Promise<string>((resolve, reject) => {
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
  private async requestConfirmation(
    command: string,
    validation: CommandValidationResult
  ): Promise<boolean> {
    const riskLabel = validation.riskLevel === 'high' ? '⚠️ HIGH RISK' : '⚡ Potentially Dangerous';

    const result = await vscode.window.showWarningMessage(
      `${riskLabel}: The following command requires confirmation:\n\n${command}`,
      { modal: true },
      'Execute',
      'Cancel'
    );

    return result === 'Execute';
  }

  /**
   * Validate a command without executing it.
   *
   * @param command - The command to validate
   * @returns Validation result
   */
  public validateCommand(command: string): CommandValidationResult {
    return this.commandValidator.validate(command);
  }

  /**
   * Get the current rate limit status.
   */
  public getRateLimitStatus() {
    return this.commandValidator.getRateLimitStatus();
  }

  /**
   * Get the CommandValidator instance for testing.
   */
  public getCommandValidator(): CommandValidator {
    return this.commandValidator;
  }

  private ensureTerminal(): void {
    if (this.terminal) {
      return;
    }

    // Create a real interactive terminal
    this.terminal = vscode.window.createTerminal({
      name: 'Personaut',
      cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    });
  }

  public dispose() {
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = undefined;
    }
  }
}
