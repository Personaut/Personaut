"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MCPToolAdapter_1 = require("./MCPToolAdapter");
describe('MCPToolAdapter', () => {
    let mcpToolAdapter;
    let mockMcpTool;
    let mockClient;
    beforeEach(() => {
        mockMcpTool = {
            name: 'test-tool',
            description: 'A test tool',
            inputSchema: {
                properties: {
                    arg1: { type: 'string' },
                },
            },
        };
        mockClient = {
            callTool: jest.fn(),
        };
        mcpToolAdapter = new MCPToolAdapter_1.MCPToolAdapter(mockMcpTool, mockClient);
    });
    it('should return tool name', () => {
        expect(mcpToolAdapter.name).toBe('test-tool');
    });
    it('should return tool description', () => {
        expect(mcpToolAdapter.description).toBe('A test tool');
    });
    it('should generate usage example', () => {
        const example = mcpToolAdapter.getUsageExample();
        expect(example).toContain('test-tool');
        expect(example).toContain('arg1');
    });
    it('should execute tool successfully', async () => {
        const mockResult = {
            content: [{ text: 'result text' }],
        };
        mockClient.callTool.mockResolvedValue(mockResult);
        const result = await mcpToolAdapter.execute({ arg1: 'value1' });
        expect(result).toBe('result text');
        expect(mockClient.callTool).toHaveBeenCalledWith({
            name: 'test-tool',
            arguments: { arg1: 'value1' },
        });
    });
    it('should handle JSON content in execute', async () => {
        const mockResult = {
            content: [{ text: 'result' }],
        };
        mockClient.callTool.mockResolvedValue(mockResult);
        const jsonContent = '{"arg2": "value2"}';
        await mcpToolAdapter.execute({ arg1: 'value1' }, jsonContent);
        expect(mockClient.callTool).toHaveBeenCalledWith({
            name: 'test-tool',
            arguments: { arg1: 'value1', arg2: 'value2' },
        });
    });
    it('should handle tool execution errors', async () => {
        mockClient.callTool.mockRejectedValue(new Error('Tool failed'));
        const result = await mcpToolAdapter.execute({ arg1: 'value1' });
        expect(result).toContain('MCP Tool Error: Tool failed');
    });
    it('should handle non-array content results', async () => {
        const mockResult = {
            someField: 'value',
        };
        mockClient.callTool.mockResolvedValue(mockResult);
        const result = await mcpToolAdapter.execute({ arg1: 'value1' });
        expect(result).toContain('someField');
    });
});
//# sourceMappingURL=MCPToolAdapter.test.js.map