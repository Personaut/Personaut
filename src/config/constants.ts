/**
 * Centralized configuration constants for the Personaut extension.
 *
 * This file externalizes all hardcoded values to make the extension
 * more flexible and maintainable.
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4
 */

// ============================================================================
// Model Identifiers (Requirements 17.1)
// ============================================================================

/**
 * Default model identifiers for each AI provider.
 */
export const MODEL_IDENTIFIERS = {
  gemini: {
    default: 'gemini-2.5-flash',
    // Latest models (December 2025)
    'gemini-3-pro': 'gemini-3-pro-preview',
    'gemini-2.5-pro': 'gemini-2.5-pro',
    'gemini-2.5-flash': 'gemini-2.5-flash',
    'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
    // Legacy models (still available)
    'gemini-2.0-flash': 'gemini-2.0-flash',
    'gemini-1.5-pro': 'gemini-1.5-pro',
    'gemini-1.5-flash': 'gemini-1.5-flash',
  },
  bedrock: {
    default: 'claude-sonnet-4',
    // Full Bedrock model IDs
    modelIds: {
      // Claude 4
      'claude-sonnet-4': 'anthropic.claude-sonnet-4-20250514-v1:0',
      'claude-opus-4': 'anthropic.claude-opus-4-20250514-v1:0',
      // Claude 3.7
      'claude-3-7-sonnet': 'anthropic.claude-3-7-sonnet-20250219-v1:0',
      // Claude 3.5
      'claude-3-5-sonnet-v2': 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      'claude-3-5-haiku': 'anthropic.claude-3-5-haiku-20241022-v1:0',
      // Claude 3
      'claude-3-opus': 'anthropic.claude-3-opus-20240229-v1:0',
      'claude-3-haiku': 'anthropic.claude-3-haiku-20240307-v1:0',
      // Amazon Nova
      'nova-premier': 'amazon.nova-premier-v1:0',
      'nova-pro': 'amazon.nova-pro-v1:0',
      'nova-lite': 'amazon.nova-lite-v1:0',
      'nova-micro': 'amazon.nova-micro-v1:0',
      // Meta Llama
      'llama4-scout': 'meta.llama4-scout-17b-instruct-v1:0',
      'llama4-maverick': 'meta.llama4-maverick-17b-instruct-v1:0',
      'llama3-3-70b': 'meta.llama3-3-70b-instruct-v1:0',
      // Mistral
      'mistral-large': 'mistral.mistral-large-2411-v1:0',
      'pixtral-large': 'mistral.pixtral-large-2502-v1:0',
      // DeepSeek
      'deepseek-r1': 'deepseek.r1-v1:0',
    } as Record<string, string>,
  },
  nativeIde: {
    // Native IDE uses dynamic model selection via vscode.lm API
    fallbackOrder: ['gpt-4', 'claude-3.5', 'copilot'],
  },
} as const;

// ============================================================================
// Token Limits (Requirements 17.2)
// ============================================================================

/**
 * Token limits for various operations.
 */
export const TOKEN_LIMITS = {
  /** Maximum tokens for AI response generation */
  maxResponseTokens: 4096,

  /** Default rate limit: tokens per window */
  rateLimitTokens: 100000,

  /** Rate limit window in milliseconds (1 hour) */
  rateLimitWindowMs: 3600000,

  /** Maximum input tokens for context */
  maxInputTokens: 128000,

  /** Token estimation: average characters per token */
  avgCharsPerToken: 4,
} as const;

// ============================================================================
// Threshold Values (Requirements 17.3)
// ============================================================================

/**
 * Various threshold values used throughout the extension.
 */
export const THRESHOLDS = {
  /** Maximum file size in bytes (10MB) */
  maxFileSize: 10 * 1024 * 1024,

  /** Maximum input length in characters (10MB) */
  maxInputLength: 10 * 1024 * 1024,

  /** Maximum conversation messages before pruning */
  maxConversationMessages: 100,

  /** Conversation retention period in days */
  conversationRetentionDays: 7,

  /** Browser page load timeout in milliseconds */
  browserTimeout: 30000,

  /** Command execution rate limit (commands per minute) */
  commandRateLimit: 60,

  /** Command rate limit window in milliseconds */
  commandRateLimitWindowMs: 60000,

  /** API request timeout in milliseconds */
  apiTimeout: 60000,

  /** MCP server connection timeout in milliseconds */
  mcpConnectionTimeout: 10000,

  /** MCP health check interval in milliseconds */
  mcpHealthCheckInterval: 30000,
} as const;

// ============================================================================
// Pricing Configuration (Requirements 17.2)
// ============================================================================

/**
 * Pricing data for token cost calculation.
 * Prices are per million tokens.
 */
export const PRICING = {
  bedrock: {
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
  },
  gemini: {
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
  },
  // Gemini 3 (Preview)
  'gemini-3-pro-preview': {
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 15.0,
  },
  // Gemini 2.5
  'gemini-2.5-pro': {
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 10.0,
  },
  'gemini-2.5-flash': {
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
  },
  'gemini-2.5-flash-lite': {
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.3,
  },
  // Gemini 2.0
  'gemini-2.0-flash': {
    inputPricePerMillion: 0.1,
    outputPricePerMillion: 0.4,
  },
  // Legacy Gemini 1.5
  'gemini-1.5-flash': {
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.3,
  },
  'gemini-1.5-pro': {
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.0,
  },
  nativeIde: {
    // Native IDE (via Copilot) - typically free/included with subscription
    inputPricePerMillion: 0,
    outputPricePerMillion: 0,
  },
  // Claude 4
  'claude-sonnet-4': {
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
  },
  'claude-opus-4': {
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 75.0,
  },
  // Claude 3.7
  'claude-3-7-sonnet': {
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
  },
  // Claude 3.5
  'claude-3-5-sonnet': {
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
  },
  'claude-3-5-haiku': {
    inputPricePerMillion: 0.8,
    outputPricePerMillion: 4.0,
  },
  // Claude 3
  'claude-3-opus': {
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 75.0,
  },
  'claude-3-haiku': {
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
  },
  // Amazon Nova
  'nova-premier': {
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10.0,
  },
  'nova-pro': {
    inputPricePerMillion: 0.8,
    outputPricePerMillion: 3.2,
  },
  'nova-lite': {
    inputPricePerMillion: 0.06,
    outputPricePerMillion: 0.24,
  },
  'nova-micro': {
    inputPricePerMillion: 0.035,
    outputPricePerMillion: 0.14,
  },
  // Meta Llama
  'llama4-scout': {
    inputPricePerMillion: 0.17,
    outputPricePerMillion: 0.17,
  },
  'llama4-maverick': {
    inputPricePerMillion: 0.17,
    outputPricePerMillion: 0.17,
  },
  'llama3-3-70b': {
    inputPricePerMillion: 0.72,
    outputPricePerMillion: 0.72,
  },
  // Mistral
  'mistral-large': {
    inputPricePerMillion: 2.0,
    outputPricePerMillion: 6.0,
  },
  'pixtral-large': {
    inputPricePerMillion: 2.0,
    outputPricePerMillion: 6.0,
  },
  // DeepSeek
  'deepseek-r1': {
    inputPricePerMillion: 1.35,
    outputPricePerMillion: 5.4,
  },
} as const;

// ============================================================================
// Security Configuration
// ============================================================================

/**
 * Security-related configuration values.
 */
export const SECURITY = {
  /** Sensitive directories that should be blocked */
  blockedDirectories: ['.ssh', '.aws', '.gnupg', '.config', '/etc', '/var'],

  /** Sensitive environment variable patterns */
  sensitiveEnvPatterns: [
    /api[_-]?key/i,
    /secret/i,
    /token/i,
    /password/i,
    /credential/i,
    /auth/i,
    /private/i,
    /aws/i,
  ],

  /** Blacklisted command patterns */
  blacklistedCommands: [
    'rm -rf /',
    'rm -rf ~',
    'dd if=',
    'mkfs',
    'format',
    ':(){:|:&};:',
    '> /dev/sda',
    'chmod -R 777 /',
    'wget | sh',
    'curl | sh',
  ],

  /** Internal network patterns to block */
  internalNetworkPatterns: [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^0\.0\.0\.0$/,
    /^\[::1\]$/,
  ],
} as const;

// ============================================================================
// Conversation Configuration (Requirements 18.1, 18.3, 18.4)
// ============================================================================

/**
 * Configuration for conversation management.
 */
export const CONVERSATION = {
  /** Default page size for pagination */
  DEFAULT_PAGE_SIZE: 20,

  /** Maximum title length for conversations */
  MAX_TITLE_LENGTH: 50,

  /** Storage key for conversation history */
  STORAGE_KEY: 'conversationHistory',
} as const;

// ============================================================================
// Default Team Personas
// ============================================================================

/**
 * Default team personas that can be added to the user base.
 * These represent common team roles for product feedback.
 */
export const DEFAULT_TEAM_PERSONAS = [
  {
    name: 'UX Designer',
    attributes: {
      Role: 'UX Designer',
      Focus: 'User experience, visual design, accessibility',
      Perspective: 'Evaluates usability, visual hierarchy, and user flow',
      Concerns: 'Accessibility compliance, design consistency, user delight',
      'Technical Level': 'Moderate - understands frontend constraints',
    },
  },
  {
    name: 'Software Developer',
    attributes: {
      Role: 'Software Developer',
      Focus: 'Code quality, architecture, maintainability',
      Perspective: 'Evaluates technical implementation and scalability',
      Concerns: 'Performance, security, code complexity, technical debt',
      'Technical Level': 'High - deep understanding of systems',
    },
  },
  {
    name: 'Data Engineer',
    attributes: {
      Role: 'Data Engineer',
      Focus: 'Data pipelines, analytics, data quality',
      Perspective: 'Evaluates data architecture and analytics capabilities',
      Concerns: 'Data integrity, pipeline reliability, query performance',
      'Technical Level': 'High - expertise in data systems',
    },
  },
  {
    name: 'Product Manager',
    attributes: {
      Role: 'Product Manager',
      Focus: 'Product strategy, user needs, business value',
      Perspective: 'Evaluates feature value and market fit',
      Concerns: 'User adoption, competitive advantage, ROI',
      'Technical Level': 'Moderate - understands technical tradeoffs',
    },
  },
  {
    name: 'QA Engineer',
    attributes: {
      Role: 'QA Engineer',
      Focus: 'Quality assurance, testing, edge cases',
      Perspective: 'Evaluates reliability and edge case handling',
      Concerns: 'Bug prevention, test coverage, regression risks',
      'Technical Level': 'High - understands system behavior deeply',
    },
  },
  {
    name: 'DevOps Engineer',
    attributes: {
      Role: 'DevOps Engineer',
      Focus: 'Infrastructure, deployment, monitoring',
      Perspective: 'Evaluates operational readiness and reliability',
      Concerns: 'Deployment complexity, monitoring, incident response',
      'Technical Level': 'High - expertise in infrastructure',
    },
  },
] as const;

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * Keys used for persistent storage.
 */
export const STORAGE_KEYS = {
  tokenUsage: 'personaut.tokenUsage',
  rateLimitData: 'personaut.rateLimitData',
  conversations: 'personaut.conversations',
  settings: 'personaut.settings',
  apiKeyPrefix: 'personaut.apiKey.',
} as const;

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default configuration values.
 */
export const DEFAULTS = {
  /** Default AWS region */
  awsRegion: 'us-east-1',

  /** Default AWS profile */
  awsProfile: 'default',

  /** Default provider */
  provider: 'gemini',

  /** Default temperature for AI responses */
  temperature: 0.7,

  /** Default Bedrock API version */
  bedrockApiVersion: 'bedrock-2023-05-31',
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type ModelProvider = keyof typeof MODEL_IDENTIFIERS;
export type PricingModel = keyof typeof PRICING;

// ============================================================================
// Combined Configuration Export
// ============================================================================

/**
 * Combined configuration object for easy access.
 */
export const CONFIG = {
  MODELS: MODEL_IDENTIFIERS,
  TOKENS: TOKEN_LIMITS,
  THRESHOLDS,
  PRICING,
  SECURITY,
  STORAGE_KEYS,
  DEFAULTS,
  CONVERSATION,
} as const;
