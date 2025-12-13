/**
 * Barrel export for shared types
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.5, 12.1, 12.5
 */

// Common Types
export type {
  Message,
  ApiConfiguration,
  ProviderResponse,
  TokenUsage,
  ContextFile,
  AgentMode,
  AgentSettings,
  AgentConfig,
  WebviewMessage,
  ToolCall,
  WriteResult,
  ProviderPricing,
  ProviderUsage,
  PersistentTokenUsage,
  RateLimitConfig,
  OperationType,
  LoadingState,
  ProgressUpdate,
} from './CommonTypes';

// Storage Types
export type {
  Conversation,
  ConversationMetadata,
  Persona,
  FeedbackEntry,
  BuildProject,
  StageFile,
  BuildState,
  BuildLogEntry,
  BuildLog,
  Settings,
  ApiKeys,
  MigrationResult,
  IStorage,
  ScreenshotResult,
  DisposableResource,
  BuildSession,
  StageTransition,
} from './StorageTypes';

// Validation Types
export type {
  InputValidationResult,
  InputValidatorConfig,
  SanitizedError,
  ErrorSanitizerConfig,
  PathValidationResult,
  FileSizeValidationResult,
  PathValidatorConfig,
  CommandValidationResult,
  URLValidationResult,
  MCPServerConfig,
  MCPValidationResult,
  MCPValidatorConfig,
  AriaValidationResult,
  KeyboardNavigationResult,
  ColorContrastResult,
  AccessibilityIssue,
  UIStyleValidationResult,
  LoadingStateValidation,
  ProgressBarValidation,
  BuildStateValidationResult,
  MCPServerStatus,
  MCPToolInfo,
  MCPConnectionError,
  MCPReconnectResult,
  MCPHealthCheckResult,
  MCPSchemaValidationResult,
  ProviderImageSupport,
} from './ValidationTypes';
