/**
 * Error handling utilities for chat services
 * 
 * Provides centralized error handling, logging, and fallback behavior
 * for chat-related operations.
 * 
 * Feature: chat-enhancements
 * Validates: Requirements 2.5, 10.5, 11.2, 11.3, 11.4, 11.5
 */

/**
 * Error types for chat operations
 */
export enum ChatErrorType {
    DATABASE_ERROR = 'DATABASE_ERROR',
    PERSONA_ERROR = 'PERSONA_ERROR',
    SESSION_ERROR = 'SESSION_ERROR',
    SETTINGS_ERROR = 'SETTINGS_ERROR',
    MESSAGE_ERROR = 'MESSAGE_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured chat error
 */
export interface ChatError {
    type: ChatErrorType;
    message: string;
    originalError?: Error;
    context?: Record<string, any>;
    recoverable: boolean;
    fallbackAction?: string;
}

/**
 * Create a chat error with standardized structure
 */
export function createChatError(
    type: ChatErrorType,
    message: string,
    options?: {
        originalError?: Error;
        context?: Record<string, any>;
        recoverable?: boolean;
        fallbackAction?: string;
    }
): ChatError {
    return {
        type,
        message,
        originalError: options?.originalError,
        context: options?.context,
        recoverable: options?.recoverable ?? true,
        fallbackAction: options?.fallbackAction,
    };
}

/**
 * Log chat error with context
 */
export function logChatError(error: ChatError): void {
    const logMessage = `[ChatError:${error.type}] ${error.message}`;

    if (error.recoverable) {
        console.warn(logMessage, {
            context: error.context,
            fallback: error.fallbackAction,
        });
    } else {
        console.error(logMessage, {
            context: error.context,
            originalError: error.originalError,
        });
    }
}

/**
 * Error recovery strategies
 */
export const ErrorRecovery = {
    /**
     * Use memory-only mode when database fails
     */
    useMemoryOnlyMode: (error: Error): ChatError => {
        return createChatError(
            ChatErrorType.DATABASE_ERROR,
            'Database operation failed, using memory-only mode',
            {
                originalError: error,
                recoverable: true,
                fallbackAction: 'Operations will continue in memory. Data will not be persisted.',
            }
        );
    },

    /**
     * Use default persona when selected persona fails
     */
    useDefaultPersona: (personaId: string, error?: Error): ChatError => {
        return createChatError(
            ChatErrorType.PERSONA_ERROR,
            `Failed to load persona "${personaId}", using default`,
            {
                originalError: error,
                context: { personaId },
                recoverable: true,
                fallbackAction: 'Using Pippet as the default persona.',
            }
        );
    },

    /**
     * Create new session when session loading fails
     */
    createNewSession: (sessionId: string, error?: Error): ChatError => {
        return createChatError(
            ChatErrorType.SESSION_ERROR,
            `Failed to load session "${sessionId}", creating new session`,
            {
                originalError: error,
                context: { sessionId },
                recoverable: true,
                fallbackAction: 'Creating a new chat session.',
            }
        );
    },

    /**
     * Use default settings when settings loading fails
     */
    useDefaultSettings: (error?: Error): ChatError => {
        return createChatError(
            ChatErrorType.SETTINGS_ERROR,
            'Failed to load settings, using defaults',
            {
                originalError: error,
                recoverable: true,
                fallbackAction: 'Using default chat settings.',
            }
        );
    },

    /**
     * Skip message persistence when saving fails
     */
    skipMessagePersistence: (error?: Error): ChatError => {
        return createChatError(
            ChatErrorType.MESSAGE_ERROR,
            'Failed to save message, continuing without persistence',
            {
                originalError: error,
                recoverable: true,
                fallbackAction: 'Message was sent but not saved to history.',
            }
        );
    },
};

/**
 * Wrap an async operation with error handling
 */
export async function withErrorHandling<T>(
    operation: () => Promise<T>,
    fallbackValue: T,
    errorHandler?: (error: Error) => ChatError
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (errorHandler) {
            const chatError = errorHandler(err);
            logChatError(chatError);
        } else {
            console.error('[ChatError] Unexpected error:', err);
        }

        return fallbackValue;
    }
}

/**
 * Retry an operation with exponential backoff
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    options?: {
        maxRetries?: number;
        initialDelayMs?: number;
        maxDelayMs?: number;
        onRetry?: (attempt: number, error: Error) => void;
    }
): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    const initialDelay = options?.initialDelayMs ?? 100;
    const maxDelay = options?.maxDelayMs ?? 2000;

    let lastError: Error = new Error('No attempts made');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < maxRetries) {
                const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);

                options?.onRetry?.(attempt, lastError);

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * Check if error indicates database is corrupted/inaccessible
 */
export function isDatabaseError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
        message.includes('enoent') ||
        message.includes('permission denied') ||
        message.includes('database') ||
        message.includes('sqlite') ||
        message.includes('json') ||
        message.includes('parse')
    );
}

/**
 * Format error for user display
 */
export function formatUserError(error: ChatError): string {
    let message = error.message;

    if (error.fallbackAction) {
        message += ` ${error.fallbackAction}`;
    }

    return message;
}
