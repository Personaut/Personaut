/**
 * MCPValidator - Validates MCP server configurations for security.
 *
 * Implements security controls for MCP server management:
 * - Executable validation (exists and is executable)
 * - Command path allowlist checking
 * - Invalid configuration warnings
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPValidationResult {
  valid: boolean;
  executable: boolean;
  inAllowlist: boolean;
  warnings: string[];
  errors: string[];
}

export interface MCPValidatorConfig {
  allowlist?: string[]; // Allowed executable paths/names
  blocklist?: string[]; // Blocked executable paths/names
  requireAllowlist: boolean; // If true, only allowlisted executables are permitted
}

const DEFAULT_CONFIG: MCPValidatorConfig = {
  allowlist: ['node', 'npx', 'npm', 'python', 'python3', 'uvx', 'uv', 'deno', 'bun'],
  blocklist: ['rm', 'dd', 'mkfs', 'format', 'sudo', 'su', 'chmod', 'chown', 'curl', 'wget'],
  requireAllowlist: false,
};

export class MCPValidator {
  private config: MCPValidatorConfig;

  constructor(config?: Partial<MCPValidatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate an MCP server configuration.
   *
   * @param serverConfig - The MCP server configuration to validate
   * @returns Validation result with status and any warnings/errors
   */
  validateServerConfig(serverConfig: MCPServerConfig): MCPValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let executable = false;
    let inAllowlist = false;

    if (!serverConfig.command || serverConfig.command.trim() === '') {
      errors.push('MCP server command is empty or missing');
      return {
        valid: false,
        executable: false,
        inAllowlist: false,
        warnings,
        errors,
      };
    }

    const command = serverConfig.command.trim();

    // Check if command is in blocklist
    if (this.isBlocklisted(command)) {
      errors.push(`Command "${command}" is blocked for security reasons`);
      return {
        valid: false,
        executable: false,
        inAllowlist: false,
        warnings,
        errors,
      };
    }

    // Check allowlist
    inAllowlist = this.isAllowlisted(command);
    if (this.config.requireAllowlist && !inAllowlist) {
      errors.push(
        `Command "${command}" is not in the allowlist. Only allowlisted executables are permitted.`
      );
      return {
        valid: false,
        executable: false,
        inAllowlist: false,
        warnings,
        errors,
      };
    }

    if (!inAllowlist) {
      warnings.push(
        `Command "${command}" is not in the allowlist. Consider adding it if this is a trusted executable.`
      );
    }

    // Check if executable exists
    executable = this.isExecutable(command);
    if (!executable) {
      // For common runtime commands, they might be in PATH
      if (this.isCommonRuntime(command)) {
        warnings.push(`Command "${command}" not found locally but may be available in PATH`);
        executable = true; // Assume it's available
      } else {
        errors.push(`Command "${command}" does not exist or is not executable`);
      }
    }

    // Validate arguments if present
    if (serverConfig.args && serverConfig.args.length > 0) {
      const argWarnings = this.validateArgs(serverConfig.args);
      warnings.push(...argWarnings);
    }

    // Validate environment variables if present
    if (serverConfig.env) {
      const envWarnings = this.validateEnv(serverConfig.env);
      warnings.push(...envWarnings);
    }

    const valid = errors.length === 0;

    return {
      valid,
      executable,
      inAllowlist,
      warnings,
      errors,
    };
  }

  /**
   * Check if a command executable exists and is executable.
   *
   * @param command - The command to check
   * @returns true if the command exists and is executable
   */
  isExecutable(command: string): boolean {
    // If it's an absolute path, check directly
    if (path.isAbsolute(command)) {
      return this.checkFileExecutable(command);
    }

    // Check if it's a relative path
    if (command.includes(path.sep) || command.includes('/')) {
      const resolvedPath = path.resolve(command);
      return this.checkFileExecutable(resolvedPath);
    }

    // For simple command names, check common locations
    const commonPaths = [
      '/usr/bin',
      '/usr/local/bin',
      '/bin',
      '/opt/homebrew/bin',
      process.env.HOME ? path.join(process.env.HOME, '.local/bin') : null,
    ].filter(Boolean) as string[];

    for (const basePath of commonPaths) {
      const fullPath = path.join(basePath, command);
      if (this.checkFileExecutable(fullPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a file exists and is executable.
   *
   * @param filePath - The file path to check
   * @returns true if the file exists and is executable
   */
  private checkFileExecutable(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a command is a common runtime that's typically in PATH.
   *
   * @param command - The command to check
   * @returns true if it's a common runtime
   */
  private isCommonRuntime(command: string): boolean {
    const commonRuntimes = [
      'node',
      'npm',
      'npx',
      'yarn',
      'pnpm',
      'python',
      'python3',
      'pip',
      'pip3',
      'uvx',
      'uv',
      'deno',
      'bun',
      'ruby',
      'gem',
      'go',
    ];

    const baseName = path.basename(command);
    return commonRuntimes.includes(baseName.toLowerCase());
  }

  /**
   * Check if a command is in the allowlist.
   *
   * @param command - The command to check
   * @returns true if the command is allowlisted
   */
  isAllowlisted(command: string): boolean {
    if (!this.config.allowlist || this.config.allowlist.length === 0) {
      return true; // No allowlist means all allowed
    }

    const baseName = path.basename(command).toLowerCase();
    const normalizedCommand = command.toLowerCase();

    return this.config.allowlist.some((allowed) => {
      const normalizedAllowed = allowed.toLowerCase();
      return (
        baseName === normalizedAllowed ||
        normalizedCommand === normalizedAllowed ||
        normalizedCommand.endsWith(path.sep + normalizedAllowed)
      );
    });
  }

  /**
   * Check if a command is in the blocklist.
   *
   * @param command - The command to check
   * @returns true if the command is blocklisted
   */
  isBlocklisted(command: string): boolean {
    if (!this.config.blocklist || this.config.blocklist.length === 0) {
      return false;
    }

    const baseName = path.basename(command).toLowerCase();
    const normalizedCommand = command.toLowerCase();

    return this.config.blocklist.some((blocked) => {
      const normalizedBlocked = blocked.toLowerCase();
      return (
        baseName === normalizedBlocked ||
        normalizedCommand === normalizedBlocked ||
        normalizedCommand.endsWith(path.sep + normalizedBlocked)
      );
    });
  }

  /**
   * Validate command arguments for potential security issues.
   *
   * @param args - The arguments to validate
   * @returns Array of warning messages
   */
  private validateArgs(args: string[]): string[] {
    const warnings: string[] = [];

    const dangerousPatterns = [
      /--no-sandbox/i,
      /--disable-security/i,
      /--allow-root/i,
      /eval\s*\(/i,
      /exec\s*\(/i,
    ];

    for (const arg of args) {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(arg)) {
          warnings.push(`Potentially dangerous argument detected: "${arg}"`);
          break;
        }
      }
    }

    return warnings;
  }

  /**
   * Validate environment variables for potential security issues.
   *
   * @param env - The environment variables to validate
   * @returns Array of warning messages
   */
  private validateEnv(env: Record<string, string>): string[] {
    const warnings: string[] = [];

    const sensitivePatterns = [/password/i, /secret/i, /api[_-]?key/i, /token/i, /credential/i];

    for (const key of Object.keys(env)) {
      for (const pattern of sensitivePatterns) {
        if (pattern.test(key)) {
          warnings.push(
            `Environment variable "${key}" may contain sensitive data - ensure it's not logged`
          );
          break;
        }
      }
    }

    return warnings;
  }

  /**
   * Generate a security warning message for invalid configurations.
   *
   * @param serverName - The name of the MCP server
   * @param result - The validation result
   * @returns Formatted warning message
   */
  generateWarningMessage(serverName: string, result: MCPValidationResult): string {
    const lines: string[] = [];

    lines.push(`⚠️ Security Warning for MCP Server "${serverName}":`);

    if (result.errors.length > 0) {
      lines.push('\nErrors:');
      result.errors.forEach((err) => lines.push(`  ❌ ${err}`));
    }

    if (result.warnings.length > 0) {
      lines.push('\nWarnings:');
      result.warnings.forEach((warn) => lines.push(`  ⚠️ ${warn}`));
    }

    if (!result.inAllowlist) {
      lines.push('\nRecommendation: Add the executable to the allowlist if it is trusted.');
    }

    return lines.join('\n');
  }

  /**
   * Get the current configuration.
   *
   * @returns Current MCPValidator configuration
   */
  getConfig(): MCPValidatorConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration.
   *
   * @param config - Partial configuration to update
   */
  setConfig(config: Partial<MCPValidatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add executables to the allowlist.
   *
   * @param executables - Executables to add
   */
  addToAllowlist(executables: string[]): void {
    this.config.allowlist = [...(this.config.allowlist || []), ...executables];
  }

  /**
   * Add executables to the blocklist.
   *
   * @param executables - Executables to add
   */
  addToBlocklist(executables: string[]): void {
    this.config.blocklist = [...(this.config.blocklist || []), ...executables];
  }
}
