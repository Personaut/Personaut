"use strict";
/**
 * CommandValidator - Validates and sanitizes shell commands before execution.
 *
 * Implements security controls for command execution:
 * - Injection pattern detection
 * - Command blacklisting
 * - Environment variable filtering
 * - Rate limiting
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandValidator = void 0;
class CommandValidator {
    constructor(rateLimitConfig) {
        this.commandHistory = [];
        this.rateLimitConfig = rateLimitConfig || {
            maxCommands: 30,
            windowMs: 60000, // 1 minute
        };
    }
    /**
     * Validate a command for security issues.
     *
     * @param command - The command to validate
     * @returns Validation result with allowed status and details
     */
    validate(command) {
        // Check for empty command
        if (!command || command.trim() === '') {
            return {
                allowed: false,
                reason: 'Empty command',
                requiresConfirmation: false,
                riskLevel: 'low',
            };
        }
        // Check for injection patterns BEFORE trimming to catch newline injection
        const injectionResult = this.detectInjection(command);
        if (injectionResult.detected) {
            return {
                allowed: false,
                reason: `Potential command injection detected: ${injectionResult.pattern}`,
                requiresConfirmation: false,
                riskLevel: 'high',
            };
        }
        const trimmedCommand = command.trim();
        // Check blacklist
        if (this.isBlacklisted(trimmedCommand)) {
            return {
                allowed: false,
                reason: 'Command matches blacklist pattern and is blocked for security reasons',
                requiresConfirmation: false,
                riskLevel: 'high',
            };
        }
        // Check rate limiting
        if (!this.checkRateLimit()) {
            return {
                allowed: false,
                reason: `Rate limit exceeded. Maximum ${this.rateLimitConfig.maxCommands} commands per ${this.rateLimitConfig.windowMs / 1000} seconds.`,
                requiresConfirmation: false,
                riskLevel: 'medium',
            };
        }
        // Check if command requires confirmation
        const requiresConfirmation = this.isDangerous(trimmedCommand);
        return {
            allowed: true,
            sanitizedCommand: trimmedCommand,
            requiresConfirmation,
            riskLevel: requiresConfirmation ? 'medium' : 'low',
        };
    }
    /**
     * Check if a command matches any blacklist pattern.
     *
     * @param command - The command to check
     * @returns true if the command is blacklisted
     */
    isBlacklisted(command) {
        const normalizedCommand = command.toLowerCase().trim();
        return CommandValidator.BLACKLISTED_COMMANDS.some((pattern) => {
            // Check if pattern is a regex string
            if (pattern.includes('.*') || pattern.includes('\\')) {
                try {
                    const regex = new RegExp(pattern, 'i');
                    return regex.test(normalizedCommand);
                }
                catch {
                    return normalizedCommand.includes(pattern.toLowerCase());
                }
            }
            return normalizedCommand.includes(pattern.toLowerCase());
        });
    }
    /**
     * Detect command injection patterns.
     *
     * @param command - The command to check
     * @returns Object with detection result and matched pattern
     */
    detectInjection(command) {
        for (const pattern of CommandValidator.INJECTION_PATTERNS) {
            if (pattern.test(command)) {
                return {
                    detected: true,
                    pattern: pattern.toString(),
                };
            }
        }
        return { detected: false };
    }
    /**
     * Check if a command is potentially dangerous and requires confirmation.
     *
     * @param command - The command to check
     * @returns true if the command requires user confirmation
     */
    isDangerous(command) {
        return CommandValidator.DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
    }
    /**
     * Filter environment variables to remove sensitive keys.
     *
     * @param env - The environment variables object
     * @returns Filtered environment variables
     */
    sanitizeEnvironment(env) {
        const filtered = {};
        for (const [key, value] of Object.entries(env)) {
            const isSensitive = CommandValidator.SENSITIVE_ENV_PATTERNS.some((pattern) => pattern.test(key));
            if (!isSensitive) {
                filtered[key] = value;
            }
        }
        return filtered;
    }
    /**
     * Check if we're within rate limits.
     *
     * @returns true if command execution is allowed
     */
    checkRateLimit() {
        const now = Date.now();
        const windowStart = now - this.rateLimitConfig.windowMs;
        // Remove old entries
        this.commandHistory = this.commandHistory.filter((time) => time > windowStart);
        // Check if we're at the limit
        if (this.commandHistory.length >= this.rateLimitConfig.maxCommands) {
            return false;
        }
        // Record this command
        this.commandHistory.push(now);
        return true;
    }
    /**
     * Get the current rate limit status.
     *
     * @returns Object with current usage and limit info
     */
    getRateLimitStatus() {
        const now = Date.now();
        const windowStart = now - this.rateLimitConfig.windowMs;
        // Clean up old entries
        this.commandHistory = this.commandHistory.filter((time) => time > windowStart);
        const oldestCommand = this.commandHistory[0];
        const resetIn = oldestCommand
            ? Math.max(0, oldestCommand + this.rateLimitConfig.windowMs - now)
            : 0;
        return {
            current: this.commandHistory.length,
            max: this.rateLimitConfig.maxCommands,
            windowMs: this.rateLimitConfig.windowMs,
            resetIn,
        };
    }
    /**
     * Reset the rate limit counter (for testing purposes).
     */
    resetRateLimit() {
        this.commandHistory = [];
    }
    /**
     * Update rate limit configuration.
     *
     * @param config - New rate limit configuration
     */
    setRateLimitConfig(config) {
        this.rateLimitConfig = config;
    }
}
exports.CommandValidator = CommandValidator;
// Patterns that indicate command injection attempts
CommandValidator.INJECTION_PATTERNS = [
    /;\s*[a-zA-Z]/, // Semicolon followed by command
    /\|\s*[a-zA-Z]/, // Pipe followed by command
    /`[^`]+`/, // Backtick command substitution
    /\$\([^)]+\)/, // $() command substitution
    /&&\s*[a-zA-Z]/, // && followed by command
    /\|\|\s*[a-zA-Z]/, // || followed by command
    />\s*\/(?:etc|dev)/, // Redirect to system directories
    /[\r\n]/, // Newline or carriage return (command separator)
];
// Commands that are completely blocked
CommandValidator.BLACKLISTED_COMMANDS = [
    'rm -rf /',
    'rm -rf /*',
    'rm -rf ~',
    'rm -rf ~/*',
    'dd if=',
    'mkfs',
    'format c:',
    ':(){:|:&};:', // Fork bomb
    '> /dev/sda',
    'chmod -R 777 /',
    'chown -R',
    'wget.*\\|.*sh', // Download and execute
    'curl.*\\|.*sh', // Download and execute
    'sudo rm -rf',
    'shutdown',
    'reboot',
    'init 0',
    'init 6',
    'halt',
    'poweroff',
];
// Commands that require user confirmation
CommandValidator.DANGEROUS_PATTERNS = [
    /rm\s+(-[rRf]+\s+)*[^\s]+/, // rm with flags
    /sudo\s+/, // Any sudo command
    /chmod\s+/, // Permission changes
    /chown\s+/, // Ownership changes
    /mv\s+.*\//, // Moving files
    />\s*[^\s]+/, // Output redirection
    /kill\s+/, // Kill processes
    /pkill\s+/, // Kill processes by name
    /npm\s+publish/, // Publishing packages
    /git\s+push\s+.*--force/, // Force push
    /git\s+reset\s+--hard/, // Hard reset
    /DROP\s+/i, // SQL DROP
    /DELETE\s+FROM/i, // SQL DELETE
    /TRUNCATE\s+/i, // SQL TRUNCATE
];
// Sensitive environment variable patterns to filter
CommandValidator.SENSITIVE_ENV_PATTERNS = [
    /API[_-]?KEY/i,
    /SECRET/i,
    /TOKEN/i,
    /PASSWORD/i,
    /CREDENTIAL/i,
    /PRIVATE[_-]?KEY/i,
    /AUTH/i,
    /AWS[_-]?ACCESS/i,
    /AWS[_-]?SECRET/i,
    /GEMINI/i,
    /OPENAI/i,
    /ANTHROPIC/i,
];
//# sourceMappingURL=CommandValidator.js.map