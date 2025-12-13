/**
 * PathValidator - Validates file system paths for security.
 *
 * Implements security controls for file operations:
 * - Workspace boundary checking
 * - Sensitive directory blocking
 * - File size limit enforcement
 * - Out-of-workspace confirmation requirements
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import * as path from 'path';
import * as os from 'os';

export interface PathValidationResult {
  allowed: boolean;
  normalizedPath?: string;
  reason?: string;
  requiresConfirmation: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FileSizeValidationResult {
  allowed: boolean;
  reason?: string;
  fileSize?: number;
  maxSize?: number;
}

export interface PathValidatorConfig {
  maxFileSize: number; // in bytes
  allowOutOfWorkspace: boolean;
  customBlocklist?: string[];
}

const DEFAULT_CONFIG: PathValidatorConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB default
  allowOutOfWorkspace: false,
};

export class PathValidator {
  // Sensitive directories that should be blocked (using inclusive term "blocklist")
  private static readonly SENSITIVE_DIRECTORY_BLOCKLIST: string[] = [
    '.ssh',
    '.aws',
    '.gnupg',
    '.config',
    '.kube',
    '.docker',
    '/etc',
    '/var',
    '/usr',
    '/bin',
    '/sbin',
    '/root',
    '/private/etc', // macOS
    '/System', // macOS
    'C:\\Windows', // Windows
    'C:\\Program Files', // Windows
    'C:\\ProgramData', // Windows
  ];

  private config: PathValidatorConfig;
  private customBlocklist: string[];

  constructor(config?: Partial<PathValidatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.customBlocklist = config?.customBlocklist || [];
  }

  /**
   * Validate a path for read operations.
   *
   * @param targetPath - The path to validate
   * @param workspaceRoot - The workspace root directory
   * @returns Validation result with allowed status and details
   */
  validateForRead(targetPath: string, workspaceRoot: string): PathValidationResult {
    return this.validatePath(targetPath, workspaceRoot, 'read');
  }

  /**
   * Validate a path for write operations.
   *
   * @param targetPath - The path to validate
   * @param workspaceRoot - The workspace root directory
   * @returns Validation result with allowed status and details
   */
  validateForWrite(targetPath: string, workspaceRoot: string): PathValidationResult {
    return this.validatePath(targetPath, workspaceRoot, 'write');
  }

  /**
   * Validate a path for any file operation.
   *
   * @param targetPath - The path to validate
   * @param workspaceRoot - The workspace root directory
   * @param operation - The type of operation ('read' | 'write' | 'list')
   * @returns Validation result with allowed status and details
   */
  validatePath(
    targetPath: string,
    workspaceRoot: string,
    operation: 'read' | 'write' | 'list' = 'read'
  ): PathValidationResult {
    if (!targetPath || targetPath.trim() === '') {
      return {
        allowed: false,
        reason: 'Empty path provided',
        requiresConfirmation: false,
        riskLevel: 'low',
      };
    }

    if (!workspaceRoot || workspaceRoot.trim() === '') {
      return {
        allowed: false,
        reason: 'No workspace root provided',
        requiresConfirmation: false,
        riskLevel: 'low',
      };
    }

    // Normalize paths for comparison
    const normalizedTarget = this.normalizePath(targetPath);
    const normalizedWorkspace = this.normalizePath(workspaceRoot);

    // Check for sensitive directories first (highest priority block)
    if (this.isSensitiveDirectory(normalizedTarget)) {
      return {
        allowed: false,
        normalizedPath: normalizedTarget,
        reason: `Access to sensitive directory is blocked for security reasons`,
        requiresConfirmation: false,
        riskLevel: 'high',
      };
    }

    // Check if path is within workspace
    const isWithinWorkspace = this.isWithinWorkspace(normalizedTarget, normalizedWorkspace);

    if (!isWithinWorkspace) {
      // Out of workspace - requires confirmation or rejection
      if (this.config.allowOutOfWorkspace) {
        return {
          allowed: true,
          normalizedPath: normalizedTarget,
          requiresConfirmation: true,
          riskLevel: 'medium',
          reason: `Path is outside workspace. User confirmation required for ${operation} operation.`,
        };
      } else {
        return {
          allowed: false,
          normalizedPath: normalizedTarget,
          reason: `Path is outside the workspace directory. ${operation.charAt(0).toUpperCase() + operation.slice(1)} operations are restricted to workspace.`,
          requiresConfirmation: false,
          riskLevel: 'medium',
        };
      }
    }

    // Path is within workspace and not sensitive
    return {
      allowed: true,
      normalizedPath: normalizedTarget,
      requiresConfirmation: false,
      riskLevel: 'low',
    };
  }

  /**
   * Check if a path is within the workspace directory.
   *
   * @param targetPath - The path to check (should be normalized)
   * @param workspaceRoot - The workspace root (should be normalized)
   * @returns true if the path is within the workspace
   */
  isWithinWorkspace(targetPath: string, workspaceRoot: string): boolean {
    const normalizedTarget = this.normalizePath(targetPath);
    const normalizedWorkspace = this.normalizePath(workspaceRoot);

    // Ensure workspace root ends with separator for accurate prefix matching
    const workspacePrefix = normalizedWorkspace.endsWith(path.sep)
      ? normalizedWorkspace
      : normalizedWorkspace + path.sep;

    // Check if target is exactly the workspace or starts with workspace prefix
    return normalizedTarget === normalizedWorkspace || normalizedTarget.startsWith(workspacePrefix);
  }

  /**
   * Check if a path is in a sensitive directory.
   *
   * @param targetPath - The path to check
   * @returns true if the path is in a sensitive directory
   */
  isSensitiveDirectory(targetPath: string): boolean {
    const normalizedPath = this.normalizePath(targetPath);
    const homeDir = os.homedir();

    // Combine default blocklist with custom blocklist
    const fullBlocklist = [...PathValidator.SENSITIVE_DIRECTORY_BLOCKLIST, ...this.customBlocklist];

    for (const sensitiveDir of fullBlocklist) {
      // Handle home directory relative paths
      let resolvedSensitiveDir = sensitiveDir;
      if (sensitiveDir.startsWith('.')) {
        resolvedSensitiveDir = path.join(homeDir, sensitiveDir);
      }

      const normalizedSensitive = this.normalizePath(resolvedSensitiveDir);

      // Check if path is the sensitive directory or inside it
      if (
        normalizedPath === normalizedSensitive ||
        normalizedPath.startsWith(normalizedSensitive + path.sep)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate file size against the configured limit.
   *
   * @param fileSize - The size of the file in bytes
   * @returns Validation result
   */
  validateFileSize(fileSize: number): FileSizeValidationResult {
    if (fileSize < 0) {
      return {
        allowed: false,
        reason: 'Invalid file size',
        fileSize,
        maxSize: this.config.maxFileSize,
      };
    }

    if (fileSize > this.config.maxFileSize) {
      return {
        allowed: false,
        reason: `File size (${this.formatBytes(fileSize)}) exceeds maximum allowed size (${this.formatBytes(this.config.maxFileSize)})`,
        fileSize,
        maxSize: this.config.maxFileSize,
      };
    }

    return {
      allowed: true,
      fileSize,
      maxSize: this.config.maxFileSize,
    };
  }

  /**
   * Normalize a path for consistent comparison.
   * Resolves relative paths, removes trailing slashes, and handles platform differences.
   *
   * @param inputPath - The path to normalize
   * @returns Normalized absolute path
   */
  normalizePath(inputPath: string): string {
    // Expand home directory
    let expandedPath = inputPath;
    if (inputPath.startsWith('~')) {
      expandedPath = path.join(os.homedir(), inputPath.slice(1));
    }

    // Resolve to absolute path and normalize
    const absolutePath = path.resolve(expandedPath);
    const normalized = path.normalize(absolutePath);

    // Remove trailing separator (except for root)
    if (normalized.length > 1 && normalized.endsWith(path.sep)) {
      return normalized.slice(0, -1);
    }

    return normalized;
  }

  /**
   * Get the current configuration.
   *
   * @returns Current PathValidator configuration
   */
  getConfig(): PathValidatorConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration.
   *
   * @param config - Partial configuration to update
   */
  setConfig(config: Partial<PathValidatorConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.customBlocklist) {
      this.customBlocklist = config.customBlocklist;
    }
  }

  /**
   * Get the list of sensitive directories being blocked.
   *
   * @returns Array of blocked directory patterns
   */
  getBlocklist(): string[] {
    return [...PathValidator.SENSITIVE_DIRECTORY_BLOCKLIST, ...this.customBlocklist];
  }

  /**
   * Format bytes to human-readable string.
   *
   * @param bytes - Number of bytes
   * @returns Formatted string (e.g., "10 MB")
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
