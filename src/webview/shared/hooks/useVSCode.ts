import { useCallback, useEffect, useRef } from 'react';
import type { VSCodeMessage, SendMessageRequest } from '../types/messages';

/**
 * VS Code API interface
 */
interface VSCodeAPI {
    postMessage: (message: unknown) => void;
    getState: () => Record<string, unknown> | undefined;
    setState: (state: Record<string, unknown>) => void;
}

// Cache the VS Code API instance
let vscodeApiInstance: VSCodeAPI | null = null;

/**
 * Get or create the VS Code API instance.
 * This is cached since acquireVsCodeApi can only be called once.
 */
function getVSCodeAPI(): VSCodeAPI {
    if (!vscodeApiInstance) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const acquireVsCodeApi = (window as any).acquireVsCodeApi;
        if (typeof acquireVsCodeApi === 'function') {
            vscodeApiInstance = acquireVsCodeApi();
        } else {
            // Mock for development/testing outside VS Code
            console.warn('[useVSCode] Running outside VS Code, using mock API');
            vscodeApiInstance = {
                postMessage: (msg) => console.log('[Mock VSCode] postMessage:', msg),
                getState: () => undefined,
                setState: () => { },
            };
        }
    }
    return vscodeApiInstance!;
}

/**
 * Message handler function type
 */
export type MessageHandler<T = VSCodeMessage> = (message: T) => void;

/**
 * Return type for useVSCode hook
 */
export interface UseVSCodeReturn {
    /** Post a message to the extension */
    postMessage: (message: unknown) => void;
    /** Get the current persisted state */
    getState: <T = Record<string, unknown>>() => T | undefined;
    /** Set the persisted state */
    setState: (state: Record<string, unknown>) => void;
    /** Register a message handler */
    onMessage: (handler: MessageHandler) => () => void;
}

/**
 * Hook for interacting with VS Code extension.
 *
 * Provides methods for:
 * - Posting messages to the extension
 * - Getting and setting persisted state
 * - Registering message handlers
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { postMessage, getState, onMessage } = useVSCode();
 *
 *   useEffect(() => {
 *     const unsubscribe = onMessage((msg) => {
 *       if (msg.type === 'add-message') {
 *         console.log('New message:', msg.text);
 *       }
 *     });
 *     return unsubscribe;
 *   }, []);
 *
 *   const handleSend = () => {
 *     postMessage({ type: 'send-message', value: 'Hello!' });
 *   };
 *
 *   return <button onClick={handleSend}>Send</button>;
 * }
 * ```
 *
 * **Validates: Requirements 4.5, 14.3**
 */
export function useVSCode(): UseVSCodeReturn {
    const vscode = getVSCodeAPI();
    const handlersRef = useRef<Set<MessageHandler>>(new Set());

    // Set up global message listener
    useEffect(() => {
        const handleMessage = (event: MessageEvent<VSCodeMessage>) => {
            const message = event.data;
            handlersRef.current.forEach((handler) => {
                try {
                    handler(message);
                } catch (error) {
                    console.error('[useVSCode] Error in message handler:', error);
                }
            });
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const postMessage = useCallback((message: unknown) => {
        vscode.postMessage(message);
    }, []);

    const getState = useCallback(<T = Record<string, unknown>>(): T | undefined => {
        return vscode.getState() as T | undefined;
    }, []);

    const setState = useCallback((state: Record<string, unknown>) => {
        vscode.setState(state);
    }, []);

    const onMessage = useCallback((handler: MessageHandler): (() => void) => {
        handlersRef.current.add(handler);
        return () => {
            handlersRef.current.delete(handler);
        };
    }, []);

    return {
        postMessage,
        getState,
        setState,
        onMessage,
    };
}

/**
 * Convenience hook to send a chat message
 */
export function useSendMessage() {
    const { postMessage } = useVSCode();

    return useCallback(
        (value: string, options?: Partial<Omit<SendMessageRequest, 'type' | 'value'>>) => {
            postMessage({
                type: 'send-message',
                value,
                ...options,
            });
        },
        [postMessage]
    );
}

export default useVSCode;
