/**
 * ErrorSanitizer - Removes sensitive information from error messages.
 *
 * Implements security controls for error handling:
 * - Removes file paths, API keys, and tokens from user-facing messages
 * - Classifies errors into user, system, and security categories
 * - Separates detailed logging from user-facing messages
 * - Hides stack traces from user-facing error messages
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.2, 8.4
 */

/**
 * Error classification types
 */
export type ErrorClassification = 'user' | 'system' | 'security';

/**
 * Result of error sanitization
 */
export interface SanitizedError {
  /** Original error message (for internal use only) */
  originalMessage: string;
  /** Sanitized message safe for user display */
  userMessage: string;
  /** Detailed message for logging (includes sensitive info) */
  logMessage: string;
  /** Error classification */
  classification: ErrorClassification;
  /** Error code if available */
  code?: string;
  /** Whether the error contained sensitive information */
  containedSensitiveInfo: boolean;
}

/**
 * Configuration for ErrorSanitizer
 */
export interface ErrorSanitizerConfig {
  /** Whether to include error codes in user messages */
  includeErrorCodes: boolean;
  /** Custom sensitive patterns to detect */
  customSensitivePatterns?: RegExp[];
  /** Generic messages for each error classification */
  genericMessages: {
    user: string;
    system: string;
    security: string;
  };
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ErrorSanitizerConfig = {
  includeErrorCodes: true,
  genericMessages: {
    user: 'The operation could not be completed. Please check your input and try again.',
    system: 'An unexpected error occurred. Please try again later.',
    security: 'The operation was blocked for security reasons.',
  },
};

/**
 * Patterns that indicate sensitive information in error messages
 */
const SENSITIVE_PATTERNS: RegExp[] = [
  // File paths - Unix style
  /\/(?:home|Users|var|etc|tmp|usr|opt)\/[^\s"'<>|]+/gi,
  // File paths - Windows style
  /[A-Za-z]:\\(?:Users|Windows|Program Files|ProgramData)[^\s"'<>|]*/gi,
  // Generic absolute paths
  /(?:^|[\s"'(])\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+){2,}/g,
  // API keys - generic long alphanumeric strings (20+ chars)
  /\b[A-Za-z0-9_-]{20,}\b/g,
  // AWS access keys
  /\bAKIA[A-Z0-9]{16}\b/g,
  // AWS secret keys
  /\b[A-Za-z0-9/+=]{40}\b/g,
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  // JWT tokens
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  // Generic tokens/secrets in key=value format
  /(?:api[_-]?key|secret|token|password|credential|auth)[_-]?[a-z]*\s*[=:]\s*["']?[^\s"']+["']?/gi,
  // Environment variable references
  /process\.env\.[A-Z_]+/g,
  // Email addresses (can be PII)
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // IP addresses
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  // Connection strings
  /(?:mongodb|mysql|postgres|redis|amqp):\/\/[^\s"']+/gi,
];

/**
 * Patterns that indicate stack traces
 */
const STACK_TRACE_PATTERNS: RegExp[] = [
  // JavaScript/TypeScript stack traces
  /^\s*at\s+.+\(.+:\d+:\d+\)/gm,
  /^\s*at\s+.+\s+\(.+\)/gm,
  /^\s*at\s+[^\s]+\s*$/gm,
  // File:line:column references
  /[^\s]+\.[jt]sx?:\d+:\d+/g,
  // Error stack property
  /Error:.*\n(\s+at\s+.+\n)+/g,
  // Node.js internal stack frames
  /^\s*at\s+(?:internal|node:)/gm,
];

/**
 * Keywords that indicate user errors
 */
const USER_ERROR_KEYWORDS = [
  'invalid input',
  'validation failed',
  'required field',
  'not found',
  'permission denied',
  'access denied',
  'unauthorized',
  'bad request',
  'invalid format',
  'missing parameter',
  'already exists',
  'duplicate',
  'too long',
  'too short',
  'out of range',
];

/**
 * Keywords that indicate security errors
 */
const SECURITY_ERROR_KEYWORDS = [
  'injection',
  'blocked',
  'forbidden',
  'blacklist',
  'blocklist',
  'malicious',
  'suspicious',
  'rate limit',
  'throttle',
  'sandbox',
  'security',
  'unsafe',
  'dangerous',
];

export class ErrorSanitizer {
  private config: ErrorSanitizerConfig;
  private sensitivePatterns: RegExp[];

  constructor(config: Partial<ErrorSanitizerConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      genericMessages: {
        ...DEFAULT_CONFIG.genericMessages,
        ...config.genericMessages,
      },
    };
    this.sensitivePatterns = [...SENSITIVE_PATTERNS, ...(config.customSensitivePatterns || [])];
  }

  /**
   * Sanitize an error for safe user display.
   * Removes sensitive information while preserving useful context.
   *
   * @param error - The error to sanitize (Error object or string)
   * @param context - Optional context about where the error occurred
   * @returns Sanitized error with separate user and log messages
   */
  sanitize(error: Error | string, context?: string): SanitizedError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Classify the error
    const classification = this.classifyError(errorMessage);

    // Check for sensitive information
    const containedSensitiveInfo =
      this.containsSensitiveInfo(errorMessage) ||
      (errorStack ? this.containsSensitiveInfo(errorStack) : false);

    // Create detailed log message (includes all info)
    const logMessage = this.createLogMessage(errorMessage, errorStack, context);

    // Create sanitized user message
    const userMessage = this.createUserMessage(
      errorMessage,
      classification,
      containedSensitiveInfo
    );

    // Extract error code if present
    const code = this.extractErrorCode(errorMessage);

    return {
      originalMessage: errorMessage,
      userMessage,
      logMessage,
      classification,
      code,
      containedSensitiveInfo,
    };
  }

  /**
   * Classify an error based on its message content.
   *
   * @param message - The error message to classify
   * @returns Error classification
   */
  classifyError(message: string): ErrorClassification {
    const lowerMessage = message.toLowerCase();

    // Check for security-related errors first (highest priority)
    if (SECURITY_ERROR_KEYWORDS.some((keyword) => lowerMessage.includes(keyword))) {
      return 'security';
    }

    // Check for user errors
    if (USER_ERROR_KEYWORDS.some((keyword) => lowerMessage.includes(keyword))) {
      return 'user';
    }

    // Default to system error
    return 'system';
  }

  /**
   * Check if a message contains sensitive information.
   *
   * @param message - The message to check
   * @returns true if sensitive information is detected
   */
  containsSensitiveInfo(message: string): boolean {
    if (!message) {
      return false;
    }

    for (const pattern of this.sensitivePatterns) {
      // Reset lastIndex for patterns with 'g' flag
      pattern.lastIndex = 0;
      if (pattern.test(message)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a message contains stack traces.
   *
   * @param message - The message to check
   * @returns true if stack traces are detected
   */
  containsStackTrace(message: string): boolean {
    if (!message) {
      return false;
    }

    for (const pattern of STACK_TRACE_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(message)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Remove sensitive information from a message.
   *
   * @param message - The message to sanitize
   * @returns Message with sensitive information removed
   */
  removeSensitiveInfo(message: string): string {
    if (!message) {
      return '';
    }

    let sanitized = message;

    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Remove stack traces from a message.
   *
   * @param message - The message to sanitize
   * @returns Message with stack traces removed
   */
  removeStackTrace(message: string): string {
    if (!message) {
      return '';
    }

    let sanitized = message;

    for (const pattern of STACK_TRACE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Clean up multiple newlines left by removal
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

    return sanitized.trim();
  }

  /**
   * Create a detailed log message for debugging.
   * Includes all information including sensitive data.
   *
   * @param message - The error message
   * @param stack - Optional stack trace
   * @param context - Optional context
   * @returns Detailed log message
   */
  private createLogMessage(message: string, stack?: string, context?: string): string {
    const parts: string[] = [];

    if (context) {
      parts.push(`[Context: ${context}]`);
    }

    parts.push(`[Message: ${message}]`);

    if (stack) {
      parts.push(`[Stack: ${stack}]`);
    }

    parts.push(`[Timestamp: ${new Date().toISOString()}]`);

    return parts.join(' ');
  }

  /**
   * Create a sanitized user-facing message.
   * Removes sensitive information and stack traces.
   *
   * @param message - The original error message
   * @param classification - The error classification
   * @param containedSensitiveInfo - Whether sensitive info was detected
   * @returns Safe user-facing message
   */
  private createUserMessage(
    message: string,
    classification: ErrorClassification,
    containedSensitiveInfo: boolean
  ): string {
    // If the message contained sensitive info, use generic message
    if (containedSensitiveInfo) {
      return this.config.genericMessages[classification];
    }

    // Remove any stack traces
    const sanitized = this.removeStackTrace(message);

    // Double-check for sensitive info after stack trace removal
    if (this.containsSensitiveInfo(sanitized)) {
      return this.config.genericMessages[classification];
    }

    // If the message is too technical or long, use generic message
    if (sanitized.length > 200 || this.isTooTechnical(sanitized)) {
      return this.config.genericMessages[classification];
    }

    return sanitized || this.config.genericMessages[classification];
  }

  /**
   * Check if a message is too technical for end users.
   *
   * @param message - The message to check
   * @returns true if the message is too technical
   */
  private isTooTechnical(message: string): boolean {
    const technicalPatterns = [
      /ENOENT|EACCES|EPERM|ECONNREFUSED|ETIMEDOUT/,
      /TypeError|ReferenceError|SyntaxError/,
      /undefined is not|cannot read property/i,
      /null pointer|segmentation fault/i,
      /heap|memory|buffer overflow/i,
    ];

    return technicalPatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Extract an error code from the message if present.
   *
   * @param message - The error message
   * @returns Error code or undefined
   */
  private extractErrorCode(message: string): string | undefined {
    // Look for common error code patterns
    const patterns = [
      /\b([A-Z]{2,}_[A-Z0-9_]+)\b/, // SOME_ERROR_CODE
      /\berror[_-]?code[:\s]+([A-Z0-9_-]+)/i, // error_code: ABC123
      /\bcode[:\s]+([A-Z0-9_-]+)/i, // code: ABC123
      /\[([A-Z]{2,}[0-9]+)\]/, // [ERR001]
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): ErrorSanitizerConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration.
   */
  updateConfig(config: Partial<ErrorSanitizerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      genericMessages: {
        ...this.config.genericMessages,
        ...config.genericMessages,
      },
    };

    if (config.customSensitivePatterns) {
      this.sensitivePatterns = [...SENSITIVE_PATTERNS, ...config.customSensitivePatterns];
    }
  }
}
