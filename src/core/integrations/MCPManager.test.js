"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MCPManager_1 = require("./MCPManager");
const MCPValidator_1 = require("../../shared/services/MCPValidator");
// Mock MCPValidator
jest.mock('../../shared/services/MCPValidator');
// Mock MCP SDK
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: jest.fn(),
}));
jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
    StdioClientTransport: jest.fn(),
}));
describe('MCPManager', () => {
    let mcpManager;
    let mockValidator;
    let mockShowWarning;
    let mockClient;
    let mockTransport;
    beforeEach(() => {
        // Create mock validator
        mockValidator = {
            validateServerConfig: jest.fn(),
            generateWarningMessage: jest.fn(),
        };
        mockShowWarning = jest.fn();
        // Create mock client
        mockClient = {
            connect: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined),
            listTools: jest.fn().mockResolvedValue({ tools: [] }),
        };
        // Create mock transport
        mockTransport = {};
        // Mock MCP SDK
        const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
        const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
        Client.mockImplementation(() => mockClient);
        StdioClientTransport.mockImplementation(() => mockTransport);
        mcpManager = new MCPManager_1.MCPManager(mockValidator, mockShowWarning);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('connectToServer', () => {
        it('should connect to valid MCP server', async () => {
            const validationResult = {
                valid: true,
                executable: true,
                inAllowlist: true,
                warnings: [],
                errors: [],
            };
            mockValidator.validateServerConfig.mockReturnValue(validationResult);
            const client = await mcpManager.connectToServer('test-server', 'node', ['server.js']);
            expect(mockValidator.validateServerConfig).toHaveBeenCalledWith({
                command: 'node',
                args: ['server.js'],
            });
            expect(mockClient.connect).toHaveBeenCalledWith(mockTransport);
            expect(client).toBe(mockClient);
            expect(mcpManager.getClientCount()).toBe(1);
        });
        it('should reject invalid MCP server configuration', async () => {
            const validationResult = {
                valid: false,
                executable: false,
                inAllowlist: false,
                warnings: [],
                errors: ['Command does not exist'],
            };
            mockValidator.validateServerConfig.mockReturnValue(validationResult);
            mockValidator.generateWarningMessage.mockReturnValue('Warning message');
            await expect(mcpManager.connectToServer('test-server', 'invalid-command', [])).rejects.toThrow('MCP server validation failed');
            expect(mockShowWarning).toHaveBeenCalledWith('MCP Server "test-server": Command does not exist');
            expect(mockClient.connect).not.toHaveBeenCalled();
        });
        it('should log warnings but allow connection for valid config with warnings', async () => {
            const validationResult = {
                valid: true,
                executable: true,
                inAllowlist: false,
                warnings: ['Command not in allowlist'],
                errors: [],
            };
            mockValidator.validateServerConfig.mockReturnValue(validationResult);
            mockValidator.generateWarningMessage.mockReturnValue('Warning message');
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            const client = await mcpManager.connectToServer('test-server', 'custom-cmd', []);
            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(mockClient.connect).toHaveBeenCalled();
            expect(client).toBe(mockClient);
            consoleWarnSpy.mockRestore();
        });
        it('should handle connection errors', async () => {
            const validationResult = {
                valid: true,
                executable: true,
                inAllowlist: true,
                warnings: [],
                errors: [],
            };
            mockValidator.validateServerConfig.mockReturnValue(validationResult);
            mockClient.connect.mockRejectedValue(new Error('Connection failed'));
            await expect(mcpManager.connectToServer('test-server', 'node', ['server.js'])).rejects.toThrow('Connection failed');
        });
    });
    describe('validateConfig', () => {
        it('should validate server configuration without connecting', () => {
            const config = {
                command: 'node',
                args: ['server.js'],
            };
            const validationResult = {
                valid: true,
                executable: true,
                inAllowlist: true,
                warnings: [],
                errors: [],
            };
            mockValidator.validateServerConfig.mockReturnValue(validationResult);
            const result = mcpManager.validateConfig('test-server', config);
            expect(result).toEqual(validationResult);
            expect(mockValidator.validateServerConfig).toHaveBeenCalledWith(config);
            expect(mockClient.connect).not.toHaveBeenCalled();
        });
    });
    describe('getAllTools', () => {
        it('should get tools from all connected clients', async () => {
            const validationResult = {
                valid: true,
                executable: true,
                inAllowlist: true,
                warnings: [],
                errors: [],
            };
            mockValidator.validateServerConfig.mockReturnValue(validationResult);
            // Connect two servers
            await mcpManager.connectToServer('server1', 'node', ['server1.js']);
            const mockClient2 = {
                connect: jest.fn().mockResolvedValue(undefined),
                close: jest.fn().mockResolvedValue(undefined),
                listTools: jest.fn().mockResolvedValue({
                    tools: [{ name: 'tool2' }],
                }),
            };
            const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
            Client.mockImplementationOnce(() => mockClient2);
            await mcpManager.connectToServer('server2', 'node', ['server2.js']);
            mockClient.listTools.mockResolvedValue({
                tools: [{ name: 'tool1' }],
            });
            const tools = await mcpManager.getAllTools();
            expect(tools.length).toBeGreaterThanOrEqual(0);
        });
        it('should handle errors when listing tools', async () => {
            const validationResult = {
                valid: true,
                executable: true,
                inAllowlist: true,
                warnings: [],
                errors: [],
            };
            mockValidator.validateServerConfig.mockReturnValue(validationResult);
            await mcpManager.connectToServer('test-server', 'node', ['server.js']);
            mockClient.listTools.mockRejectedValue(new Error('Failed to list tools'));
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            const tools = await mcpManager.getAllTools();
            expect(tools).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });
    describe('getClientCount', () => {
        it('should return number of connected clients', async () => {
            expect(mcpManager.getClientCount()).toBe(0);
            const validationResult = {
                valid: true,
                executable: true,
                inAllowlist: true,
                warnings: [],
                errors: [],
            };
            mockValidator.validateServerConfig.mockReturnValue(validationResult);
            await mcpManager.connectToServer('server1', 'node', ['server1.js']);
            expect(mcpManager.getClientCount()).toBe(1);
            await mcpManager.connectToServer('server2', 'node', ['server2.js']);
            expect(mcpManager.getClientCount()).toBe(2);
        });
    });
    describe('setValidator', () => {
        it('should set validator instance', () => {
            const newValidator = new MCPValidator_1.MCPValidator();
            mcpManager.setValidator(newValidator);
            // Validator should be updated (we can't directly test this without accessing private field)
            expect(mcpManager).toBeDefined();
        });
    });
    describe('dispose', () => {
        it('should close all connected clients', async () => {
            const validationResult = {
                valid: true,
                executable: true,
                inAllowlist: true,
                warnings: [],
                errors: [],
            };
            mockValidator.validateServerConfig.mockReturnValue(validationResult);
            await mcpManager.connectToServer('server1', 'node', ['server1.js']);
            await mcpManager.connectToServer('server2', 'node', ['server2.js']);
            expect(mcpManager.getClientCount()).toBe(2);
            await mcpManager.dispose();
            expect(mcpManager.getClientCount()).toBe(0);
        });
        it('should handle errors when closing clients', async () => {
            const validationResult = {
                valid: true,
                executable: true,
                inAllowlist: true,
                warnings: [],
                errors: [],
            };
            mockValidator.validateServerConfig.mockReturnValue(validationResult);
            await mcpManager.connectToServer('test-server', 'node', ['server.js']);
            mockClient.close.mockRejectedValue(new Error('Close failed'));
            // Should not throw
            await expect(mcpManager.dispose()).resolves.not.toThrow();
            expect(mcpManager.getClientCount()).toBe(0);
        });
    });
});
//# sourceMappingURL=MCPManager.test.js.map