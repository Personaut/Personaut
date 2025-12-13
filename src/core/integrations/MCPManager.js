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
exports.MCPManager = void 0;
const vscode = __importStar(require("vscode"));
const MCPValidator_1 = require("../../shared/services/MCPValidator");
/**
 * MCPManager - Manages MCP server connections with security validation.
 *
 * Implements security controls:
 * - Executable validation before connection
 * - Command path allowlist checking
 * - Security warnings for invalid configurations
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */
class MCPManager {
    constructor(validator, showWarning) {
        this.clients = [];
        this.validator = validator || new MCPValidator_1.MCPValidator();
        this.showWarning = showWarning || ((msg) => vscode.window.showWarningMessage(msg));
    }
    /**
     * Set the MCP validator instance.
     */
    setValidator(validator) {
        this.validator = validator;
    }
    /**
     * Connect to an MCP server with security validation.
     *
     * @param name - Server name
     * @param command - Executable command
     * @param args - Command arguments
     * @returns Connected client or throws error
     */
    async connectToServer(name, command, args) {
        // Validate the server configuration (Property 20, 21, 22)
        const serverConfig = { command, args };
        const validation = this.validator.validateServerConfig(serverConfig);
        // Show warnings if any (Property 22: MCP Invalid Configuration Warning)
        if (validation.warnings.length > 0 || validation.errors.length > 0) {
            const warningMessage = this.validator.generateWarningMessage(name, validation);
            console.warn(warningMessage);
            // Show user-facing warning for significant issues
            if (!validation.valid) {
                this.showWarning(`MCP Server "${name}": ${validation.errors[0]}`);
                throw new Error(`MCP server validation failed: ${validation.errors.join(', ')}`);
            }
            else if (validation.warnings.length > 0) {
                // Log warnings but allow connection
                console.warn(`MCP Server "${name}" warnings:`, validation.warnings);
            }
        }
        try {
            // Dynamic import to handle missing dependencies gracefully in POC
            const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
            const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
            const transport = new StdioClientTransport({
                command,
                args,
            });
            const client = new Client({
                name: 'PersoNaut',
                version: '0.0.1',
            }, {
                capabilities: {},
            });
            await client.connect(transport);
            this.clients.push(client);
            console.log(`Connected to MCP server: ${name}`);
            return client;
        }
        catch (e) {
            console.error(`Failed to connect to MCP server ${name}:`, e);
            throw e;
        }
    }
    /**
     * Validate an MCP server configuration without connecting.
     *
     * @param _name - Server name (unused, kept for API compatibility)
     * @param config - Server configuration
     * @returns Validation result
     */
    validateConfig(_name, config) {
        return this.validator.validateServerConfig(config);
    }
    /**
     * Get all tools from connected MCP servers.
     */
    async getAllTools() {
        const allTools = [];
        for (const client of this.clients) {
            try {
                const result = await client.listTools();
                allTools.push(...result.tools.map((t) => ({ ...t, client })));
            }
            catch (e) {
                console.error('Failed to list tools:', e);
            }
        }
        return allTools;
    }
    /**
     * Get the number of connected clients.
     */
    getClientCount() {
        return this.clients.length;
    }
    /**
     * Dispose of all MCP server connections.
     */
    async dispose() {
        for (const client of this.clients) {
            try {
                await client.close();
            }
            catch (_e) {
                // Ignore close errors
            }
        }
        this.clients = [];
    }
}
exports.MCPManager = MCPManager;
//# sourceMappingURL=MCPManager.js.map