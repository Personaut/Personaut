import { ITool } from './ITool';
import { TerminalManager } from '../integrations/TerminalManager';

export class ExecuteCommandTool implements ITool {
  name = 'execute_command';
  description =
    'Execute a shell command in the workspace root. The command is executed in a visible terminal.';

  constructor(_abortControllerProvider: () => AbortController | null) {}

  getUsageExample(): string {
    return `<execute_command>\n    command here\n</execute_command>`;
  }

  async execute(_args: unknown, content?: string): Promise<string> {
    const command = content || '';

    try {
      const terminalManager = TerminalManager.getInstance();
      const output = await terminalManager.executeCommand(command);
      // Return the output directly - it already includes exit code info
      return output;
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  }
}
