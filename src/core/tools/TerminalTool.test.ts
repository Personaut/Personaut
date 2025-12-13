import { ExecuteCommandTool } from './TerminalTool';
import { TerminalManager } from '../integrations/TerminalManager';

// Mock TerminalManager
jest.mock('../integrations/TerminalManager');

describe('ExecuteCommandTool', () => {
  let executeCommandTool: ExecuteCommandTool;
  let mockTerminalManager: jest.Mocked<TerminalManager>;

  beforeEach(() => {
    mockTerminalManager = {
      executeCommand: jest.fn(),
    } as any;

    (TerminalManager.getInstance as jest.Mock).mockReturnValue(mockTerminalManager);

    executeCommandTool = new ExecuteCommandTool(() => null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should execute command successfully', async () => {
    const mockOutput = 'command output';
    mockTerminalManager.executeCommand.mockResolvedValue(mockOutput);

    const result = await executeCommandTool.execute({}, 'ls -la');

    expect(result).toBe(mockOutput);
    expect(mockTerminalManager.executeCommand).toHaveBeenCalledWith('ls -la');
  });

  it('should handle command execution errors', async () => {
    mockTerminalManager.executeCommand.mockRejectedValue(new Error('Command failed'));

    const result = await executeCommandTool.execute({}, 'invalid-command');

    expect(result).toContain('Error: Command failed');
  });

  it('should handle empty command', async () => {
    mockTerminalManager.executeCommand.mockResolvedValue('');

    await executeCommandTool.execute({}, '');

    expect(mockTerminalManager.executeCommand).toHaveBeenCalledWith('');
  });
});
