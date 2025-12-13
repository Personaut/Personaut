import * as vscode from 'vscode';
import {
  MCPValidator,
  MCPServerConfig,
  MCPValidationResult,
} from '../../shared/services/MCPValidator';

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
export class MCPManager {
  private clients: any[] = [];
  private validator: MCPValidator;
  private showWarning: (message: string) => void;

  constructor(validator?: MCPValidator, showWarning?: (message: string) => void) {
    this.validator = validator || new MCPValidator();
    this.showWarning = showWarning || ((msg) => vscode.window.showWarningMessage(msg));
  }

  /**
   * Set the MCP validator instance.
   */
  setValidator(validator: MCPValidator): void {
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
  async connectToServer(name: string, command: string, args: string[]): Promise<any> {
    // Validate the server configuration (Property 20, 21, 22)
    const serverConfig: MCPServerConfig = { command, args };
    const validation: MCPValidationResult = this.validator.validateServerConfig(serverConfig);

    // Show warnings if any (Property 22: MCP Invalid Configuration Warning)
    if (validation.warnings.length > 0 || validation.errors.length > 0) {
      const warningMessage = this.validator.generateWarningMessage(name, validation);
      console.warn(warningMessage);

      // Show user-facing warning for significant issues
      if (!validation.valid) {
        this.showWarning(`MCP Server "${name}": ${validation.errors[0]}`);
        throw new Error(`MCP server validation failed: ${validation.errors.join(', ')}`);
      } else if (validation.warnings.length > 0) {
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

      const client = new Client(
        {
          name: 'PersoNaut',
          version: '0.0.1',
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);
      this.clients.push(client);
      console.log(`Connected to MCP server: ${name}`);
      return client;
    } catch (e: any) {
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
  validateConfig(_name: string, config: MCPServerConfig): MCPValidationResult {
    return this.validator.validateServerConfig(config);
  }

  /**
   * Get all tools from connected MCP servers.
   */
  async getAllTools(): Promise<any[]> {
    const allTools = [];
    for (const client of this.clients) {
      try {
        const result = await client.listTools();
        allTools.push(...result.tools.map((t: any) => ({ ...t, client })));
      } catch (e) {
        console.error('Failed to list tools:', e);
      }
    }
    return allTools;
  }

  /**
   * Get the number of connected clients.
   */
  getClientCount(): number {
    return this.clients.length;
  }

  /**
   * Dispose of all MCP server connections.
   */
  async dispose(): Promise<void> {
    for (const client of this.clients) {
      try {
        await client.close();
      } catch (_e) {
        // Ignore close errors
      }
    }
    this.clients = [];
  }
}
