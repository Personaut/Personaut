/**
 * Validation-related type definitions
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.5
 */

/**
 * Result of input validation
 */
export interface InputValidationResult {
  valid: boolean;
  sanitizedValue?: string;
  reason?: string;
  originalLength?: number;
  sanitizedLength?: number;
}

/**
 * Configuration for InputValidator
 */
export interface InputValidatorConfig {
  maxContentLength: number;
  maxInputLength: number;
  allowHtml: boolean;
  stripHtml: boolean;
}

/**
 * Result of error sanitization
 */
export interface SanitizedError {
  originalMessage: string;
  userMessage: string;
  errorCode?: string;
  timestamp: number;
  context?: Record<string, any>;
}

/**
 * Configuration for ErrorSanitizer
 */
export interface ErrorSanitizerConfig {
  includeErrorCodes: boolean;
  includeStackTrace: boolean;
  maxMessageLength: number;
}

/**
 * Result of path validation
 */
export interface PathValidationResult {
  allowed: boolean;
  normalizedPath?: string;
  reason?: string;
  isInWorkspace?: boolean;
}

/**
 * Result of file size validation
 */
export interface FileSizeValidationResult {
  allowed: boolean;
  reason?: string;
  fileSize?: number;
}

/**
 * Configuration for PathValidator
 */
export interface PathValidatorConfig {
  maxFileSize: number;
  allowOutOfWorkspace: boolean;
  blockedPaths: string[];
}

/**
 * Result of command validation
 */
export interface CommandValidationResult {
  allowed: boolean;
  sanitizedCommand?: string;
  reason?: string;
  isDangerous?: boolean;
}

/**
 * Result of URL validation
 */
export interface URLValidationResult {
  valid: boolean;
  sanitizedUrl?: string;
  reason?: string;
  protocol?: string;
}

/**
 * MCP server configuration
 */
export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Result of MCP validation
 */
export interface MCPValidationResult {
  valid: boolean;
  executable: boolean;
  reason?: string;
  securityIssues?: string[];
}

/**
 * Configuration for MCPValidator
 */
export interface MCPValidatorConfig {
  allowlist?: string[];
  blocklist?: string[];
  requireAbsolutePath: boolean;
}

/**
 * ARIA validation result
 */
export interface AriaValidationResult {
  valid: boolean;
  hasAriaLabel: boolean;
  hasAriaDescribedBy: boolean;
  hasRole: boolean;
  issues?: string[];
}

/**
 * Keyboard navigation validation result
 */
export interface KeyboardNavigationResult {
  valid: boolean;
  supportedKeys: string[];
  missingKeys?: string[];
  issues?: string[];
}

/**
 * Color contrast validation result
 */
export interface ColorContrastResult {
  valid: boolean;
  contrastRatio: number;
  meetsWCAG_AA: boolean;
  meetsWCAG_AAA: boolean;
  issues?: string[];
}

/**
 * Accessibility issue
 */
export interface AccessibilityIssue {
  type: 'aria' | 'keyboard' | 'contrast';
  severity: 'error' | 'warning';
  message: string;
  element?: string;
}

/**
 * UI style validation result
 */
export interface UIStyleValidationResult {
  valid: boolean;
  issues?: string[];
  warnings?: string[];
}

/**
 * Loading state validation result
 */
export interface LoadingStateValidation {
  valid: boolean;
  shouldShowIndicator: boolean;
  reason?: string;
}

/**
 * Progress bar validation result
 */
export interface ProgressBarValidation {
  valid: boolean;
  percentage: number;
  reason?: string;
}

/**
 * Build state validation result
 */
export interface BuildStateValidationResult {
  valid: boolean;
  reason?: string;
  missingFields?: string[];
}

/**
 * MCP server status
 */
export interface MCPServerStatus {
  name: string;
  connected: boolean;
  toolCount: number;
  lastError?: string;
  lastConnected?: number;
}

/**
 * MCP tool information
 */
export interface MCPToolInfo {
  name: string;
  description: string;
  serverName: string;
  inputSchema?: any;
}

/**
 * MCP connection error
 */
export interface MCPConnectionError {
  serverName: string;
  errorCode: string;
  message: string;
  timestamp: number;
  retryable: boolean;
}

/**
 * MCP reconnect result
 */
export interface MCPReconnectResult {
  success: boolean;
  serverName: string;
  error?: string;
}

/**
 * MCP health check result
 */
export interface MCPHealthCheckResult {
  serverName: string;
  healthy: boolean;
  latency?: number;
  error?: string;
}

/**
 * MCP schema validation result
 */
export interface MCPSchemaValidationResult {
  valid: boolean;
  toolName: string;
  errors?: string[];
}

/**
 * Provider image support configuration
 */
export interface ProviderImageSupport {
  provider: string;
  supportsImages: boolean;
  maxImageSize?: number;
  supportedFormats?: string[];
}
