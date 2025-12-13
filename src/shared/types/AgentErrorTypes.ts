/**
 * Error types and classes for Agent operations
 */

/**
 * Enum of all possible agent error types
 */
export enum AgentErrorType {
  CREATION_FAILED = 'CREATION_FAILED',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  MESSAGE_PROCESSING_FAILED = 'MESSAGE_PROCESSING_FAILED',
  PERSISTENCE_FAILED = 'PERSISTENCE_FAILED',
  LOAD_FAILED = 'LOAD_FAILED',
  COMMUNICATION_FAILED = 'COMMUNICATION_FAILED',
  CAPABILITY_NOT_FOUND = 'CAPABILITY_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  WEBVIEW_DISCONNECTED = 'WEBVIEW_DISCONNECTED',
  AGENT_UNRESPONSIVE = 'AGENT_UNRESPONSIVE',
}

/**
 * User-friendly error messages for each error type
 */
export const AgentErrorMessages: Record<AgentErrorType, string> = {
  [AgentErrorType.CREATION_FAILED]:
    'Failed to create agent. Please try creating a new conversation or restart the extension.',
  [AgentErrorType.INITIALIZATION_FAILED]:
    'Failed to initialize agent. Please check your settings and ensure your API keys are configured correctly.',
  [AgentErrorType.MESSAGE_PROCESSING_FAILED]:
    'Failed to process message. The agent encountered an error while processing your request.',
  [AgentErrorType.PERSISTENCE_FAILED]:
    'Failed to save conversation. Your messages may not be persisted. Please try again.',
  [AgentErrorType.LOAD_FAILED]:
    'Failed to load conversation. The conversation data may be corrupted. Would you like to create a new conversation?',
  [AgentErrorType.COMMUNICATION_FAILED]:
    'Failed to communicate between agents. Please check that both agents are active and try again.',
  [AgentErrorType.CAPABILITY_NOT_FOUND]:
    'The requested capability is not available. The target agent does not support this operation.',
  [AgentErrorType.UNAUTHORIZED]:
    'Unauthorized operation. This action is not permitted for security reasons.',
  [AgentErrorType.STORAGE_QUOTA_EXCEEDED]:
    'Storage quota exceeded. Please consider clearing old conversations to free up space.',
  [AgentErrorType.NETWORK_ERROR]:
    'Network error occurred while communicating with the AI provider. Please check your internet connection and try again.',
  [AgentErrorType.WEBVIEW_DISCONNECTED]:
    'The webview has been disconnected. Your conversation state has been preserved and will be restored when the webview reconnects.',
  [AgentErrorType.AGENT_UNRESPONSIVE]:
    'The agent has become unresponsive. You can abort the current operation and restart the agent.',
};

/**
 * Troubleshooting steps for each error type
 */
export const AgentErrorTroubleshooting: Partial<Record<AgentErrorType, string[]>> = {
  [AgentErrorType.CREATION_FAILED]: [
    'Check that your API keys are configured in settings',
    'Verify that the selected AI provider is available',
    'Try restarting the extension',
    'Check the output logs for more details',
  ],
  [AgentErrorType.INITIALIZATION_FAILED]: [
    'Verify your API keys in Settings',
    'Check that you have selected a valid AI provider',
    'Ensure your provider credentials have the necessary permissions',
    'Try switching to a different AI provider',
  ],
  [AgentErrorType.MESSAGE_PROCESSING_FAILED]: [
    'Try sending the message again',
    'Check if the message contains any invalid characters',
    'Verify that your API quota has not been exceeded',
    'Check the output logs for more details',
  ],
  [AgentErrorType.PERSISTENCE_FAILED]: [
    'Check available disk space',
    'Verify VS Code has write permissions',
    'Try closing and reopening the conversation',
    'Export your conversation data as a backup',
  ],
  [AgentErrorType.LOAD_FAILED]: [
    'The conversation data may be corrupted',
    'Try creating a new conversation',
    'Check the output logs for migration errors',
    'Contact support if the issue persists',
  ],
  [AgentErrorType.STORAGE_QUOTA_EXCEEDED]: [
    'Delete old conversations you no longer need',
    'Export important conversations before deleting',
    'Check VS Code storage settings',
    'Consider archiving conversations externally',
  ],
  [AgentErrorType.NETWORK_ERROR]: [
    'Check your internet connection',
    'Verify that the AI provider service is available',
    'Check if you are behind a proxy or firewall',
    'Try again in a few moments',
  ],
  [AgentErrorType.UNAUTHORIZED]: [
    'Verify that you have permission to perform this action',
    'Check that both agents belong to the same session',
    'Review security settings',
  ],
};

/**
 * Custom error class for agent-related errors
 * Includes conversation context and user-friendly messages
 */
export class AgentError extends Error {
  public readonly type: AgentErrorType;
  public readonly conversationId?: string;
  public readonly cause?: Error;
  public readonly userMessage: string;
  public readonly troubleshooting?: string[];

  constructor(
    type: AgentErrorType,
    message: string,
    conversationId?: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
    this.type = type;
    this.conversationId = conversationId;
    this.cause = cause;
    this.userMessage = AgentErrorMessages[type];
    this.troubleshooting = AgentErrorTroubleshooting[type];

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AgentError);
    }
  }

  /**
   * Get a formatted error message with context
   */
  getFormattedMessage(): string {
    let formatted = `[${this.type}] ${this.message}`;
    if (this.conversationId) {
      formatted += ` (Conversation: ${this.conversationId})`;
    }
    if (this.cause) {
      formatted += `\nCaused by: ${this.cause.message}`;
    }
    return formatted;
  }

  /**
   * Get user-friendly error message with troubleshooting steps
   */
  getUserFriendlyMessage(): string {
    let message = this.userMessage;
    if (this.troubleshooting && this.troubleshooting.length > 0) {
      message += '\n\nTroubleshooting steps:\n';
      message += this.troubleshooting.map((step, i) => `${i + 1}. ${step}`).join('\n');
    }
    return message;
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      conversationId: this.conversationId,
      userMessage: this.userMessage,
      cause: this.cause
        ? {
            name: this.cause.name,
            message: this.cause.message,
            stack: this.cause.stack,
          }
        : undefined,
      stack: this.stack,
    };
  }
}

/**
 * Type guard to check if an error is an AgentError
 */
export function isAgentError(error: any): error is AgentError {
  return error instanceof AgentError;
}

/**
 * Helper function to wrap unknown errors as AgentError
 */
export function wrapAsAgentError(
  error: unknown,
  type: AgentErrorType,
  conversationId?: string
): AgentError {
  if (isAgentError(error)) {
    return error;
  }

  const cause = error instanceof Error ? error : new Error(String(error));
  return new AgentError(type, cause.message, conversationId, cause);
}
