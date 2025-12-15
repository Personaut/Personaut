/**
 * Token monitor type definitions
 * 
 * Feature: llm-token-monitoring
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 7.1, 7.2, 7.3, 7.4, 7.5
 */

/**
 * Represents token consumption for a single conversation session
 */
export interface TokenUsage {
    conversationId: string;      // Unique identifier for the conversation
    totalTokens: number;         // Cumulative total tokens used
    inputTokens: number;         // Cumulative input tokens
    outputTokens: number;        // Cumulative output tokens
    lastUpdated: number;         // Timestamp of last update
    limit?: number;              // Optional conversation-specific limit
}

/**
 * Result of checking whether a call is allowed under current limits
 */
export interface TokenCheckResult {
    allowed: boolean;            // Whether the call should proceed
    reason?: string;             // Explanation if not allowed
    currentUsage: number;        // Current token count
    limit: number;               // Effective limit being enforced
    remaining: number;           // Tokens remaining before limit
}

/**
 * Persisted format for token usage data in VS Code globalState
 */
export interface StoredTokenUsage {
    [conversationId: string]: {
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        lastUpdated: number;
        limit?: number;
    };
}

/**
 * Token usage update message for webview
 */
export interface TokenUsageMessage {
    type: 'token-usage-update';
    conversationId: string;
    usage: {
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        limit: number;
        remaining: number;
        percentUsed: number;
        warningThreshold: number;
    };
}

/**
 * Token limit error message for webview
 */
export interface TokenLimitErrorMessage {
    type: 'token-limit-error';
    message: string;
    currentUsage: number;
    limit: number;
}

/**
 * Token reset message for webview
 */
export interface TokenResetMessage {
    type: 'token-reset';
    conversationId: string;
}

/**
 * Usage data for recording after a provider call
 */
export interface UsageData {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

/**
 * Default token limit when not configured
 */
export const DEFAULT_TOKEN_LIMIT = 100000;

/**
 * Default warning threshold percentage
 */
export const DEFAULT_WARNING_THRESHOLD = 80;
