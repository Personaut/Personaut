"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TerminalTool_1 = require("./TerminalTool");
const TerminalManager_1 = require("../integrations/TerminalManager");
// Mock TerminalManager
jest.mock('../integrations/TerminalManager');
describe('ExecuteCommandTool', () => {
    let executeCommandTool;
    let mockTerminalManager;
    beforeEach(() => {
        mockTerminalManager = {
            executeCommand: jest.fn(),
        };
        TerminalManager_1.TerminalManager.getInstance.mockReturnValue(mockTerminalManager);
        executeCommandTool = new TerminalTool_1.ExecuteCommandTool(() => null);
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
//# sourceMappingURL=TerminalTool.test.js.map