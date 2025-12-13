/**
 * Common type definitions shared across the application
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.5, 12.1
 */

/**
 * Message in a conversation between user and AI
 */
export interface Message {
  role: 'user' | 'model' | 'error';
  text: string;
  images?: string[]; // Base64 encoded images
}

/**
 * API configuration for AI providers
 */
export interface ApiConfiguration {
  provider: string;
  apiKey?: string;
  modelId?: string;
  awsRegion?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsProfile?: string;
  awsUseProfile?: boolean;
}

/**
 * Response from an AI provider
 */
export interface ProviderResponse {
  text: string;
  usage?: TokenUsage;
}

/**
 * Token usage data for a single request
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Context files that can be attached to a chat message
 */
export interface ContextFile {
  path: string;
  content: string;
}

/**
 * Agent mode determines the context and behavior
 */
export type AgentMode = 'chat' | 'build' | 'feedback';

/**
 * Settings that control agent behavior and permissions
 */
export interface AgentSettings {
  autoRead?: boolean;
  autoWrite?: boolean;
  autoExecute?: boolean;
  [key: string]: any;
}

/**
 * Configuration for initializing an Agent instance
 */
export interface AgentConfig {
  conversationId: string;
  mode?: AgentMode;
  onDidUpdateMessages: (messages: Message[]) => void;
}

/**
 * Webview message structure for communication between webview and extension
 */
export interface WebviewMessage {
  type: string;
  mode?: AgentMode;
  [key: string]: any;
}

/**
 * Tool call structure for agent tool execution
 */
export interface ToolCall {
  tool: string;
  args: Record<string, any>;
  content?: string;
}

/**
 * Result of a write operation
 */
export interface WriteResult {
  success: boolean;
  filePath: string;
  error?: string;
}

/**
 * Provider pricing information (per 1M tokens)
 */
export interface ProviderPricing {
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

/**
 * Provider-specific usage data
 */
export interface ProviderUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

/**
 * Persistent token usage data structure
 */
export interface PersistentTokenUsage {
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, ProviderUsage>;
  lastReset: number;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxTokens: number;
  windowMs: number;
}

/**
 * Operation type for loading states
 */
export type OperationType =
  | 'chat'
  | 'file-read'
  | 'file-write'
  | 'command-execution'
  | 'ai-generation'
  | 'persona-generation'
  | 'feedback-generation'
  | 'build-stage';

/**
 * Loading state for a single operation
 */
export interface LoadingState {
  id: string;
  operationType: OperationType;
  startTime: number;
  message?: string;
}

/**
 * Progress update for multi-step operations
 */
export interface ProgressUpdate {
  operationId: string;
  currentStep: number;
  totalSteps: number;
  message?: string;
}

/**
 * Feature handler interface for processing webview messages
 * All feature handlers must implement this interface
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 10.1, 10.2
 */
export interface IFeatureHandler {
  handle(message: WebviewMessage, webview: any): Promise<void>;
}
