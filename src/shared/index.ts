/**
 * Barrel export for shared module
 * Exports both services and types
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1, 8.5, 12.1, 12.5
 */

// Export all services (which include their own type definitions)
export * from './services';

// Export all utility functions
export * from './utils';

// Export additional types not already exported by services
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
  OperationType,
  LoadingState,
  ProgressUpdate,
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
  IStorage,
  ScreenshotResult,
  DisposableResource,
  BuildSession,
  StageTransition,
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
} from './types';
