"use strict";
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
exports.PathValidator = void 0;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const DEFAULT_CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10MB default
    allowOutOfWorkspace: false,
};
class PathValidator {
    constructor(config) {
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
    validateForRead(targetPath, workspaceRoot) {
        return this.validatePath(targetPath, workspaceRoot, 'read');
    }
    /**
     * Validate a path for write operations.
     *
     * @param targetPath - The path to validate
     * @param workspaceRoot - The workspace root directory
     * @returns Validation result with allowed status and details
     */
    validateForWrite(targetPath, workspaceRoot) {
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
    validatePath(targetPath, workspaceRoot, operation = 'read') {
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
            }
            else {
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
    isWithinWorkspace(targetPath, workspaceRoot) {
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
    isSensitiveDirectory(targetPath) {
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
            if (normalizedPath === normalizedSensitive ||
                normalizedPath.startsWith(normalizedSensitive + path.sep)) {
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
    validateFileSize(fileSize) {
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
    normalizePath(inputPath) {
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
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update the configuration.
     *
     * @param config - Partial configuration to update
     */
    setConfig(config) {
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
    getBlocklist() {
        return [...PathValidator.SENSITIVE_DIRECTORY_BLOCKLIST, ...this.customBlocklist];
    }
    /**
     * Format bytes to human-readable string.
     *
     * @param bytes - Number of bytes
     * @returns Formatted string (e.g., "10 MB")
     */
    formatBytes(bytes) {
        if (bytes === 0) {
            return '0 Bytes';
        }
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
exports.PathValidator = PathValidator;
// Sensitive directories that should be blocked (using inclusive term "blocklist")
PathValidator.SENSITIVE_DIRECTORY_BLOCKLIST = [
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
//# sourceMappingURL=PathValidator.js.map