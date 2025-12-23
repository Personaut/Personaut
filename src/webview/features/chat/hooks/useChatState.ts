import { useState, useCallback, useEffect, useRef } from 'react';
import { useVSCode } from '../../../shared/hooks/useVSCode';
import {
    ChatMessage,
    ContextFile,
    ChatPersona,
    ConversationSummary,
    ChatView,
    DEFAULT_PERSONA,
} from '../types';

/**
 * Return type for useChatState hook
 */
export interface UseChatStateReturn {
    // State
    messages: ChatMessage[];
    input: string;
    isTyping: boolean;
    contextFiles: ContextFile[];
    selectedPersona: ChatPersona;
    status: string;
    view: ChatView;
    history: ConversationSummary[];

    // Setters
    setInput: (input: string) => void;
    setView: (view: ChatView) => void;
    setSelectedPersona: (persona: ChatPersona) => void;

    // Actions
    sendMessage: (message?: string) => void;
    addContextFile: (file: ContextFile) => void;
    removeContextFile: (path: string) => void;
    addActiveFile: () => void;
    newChat: () => void;
    loadConversation: (id: string) => void;
    deleteConversation: (id: string) => void;

    // Refs
    bottomRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook for managing chat state and actions.
 *
 * Provides all state and actions needed for the chat feature.
 *
 * @example
 * ```tsx
 * function ChatView() {
 *   const {
 *     messages,
 *     input,
 *     setInput,
 *     sendMessage,
 *     isTyping,
 *   } = useChatState();
 *
 *   return (
 *     <div>
 *       <MessageList messages={messages} isTyping={isTyping} />
 *       <ChatInput
 *         value={input}
 *         onChange={setInput}
 *         onSubmit={sendMessage}
 *       />
 *     </div>
 *   );
 * }
 * ```
 *
 * **Validates: Requirements 4.1, 25.1**
 */
export function useChatState(): UseChatStateReturn {
    const { postMessage, onMessage, getState, setState } = useVSCode();
    const savedState = getState();

    // State
    const [messages, setMessages] = useState<ChatMessage[]>(
        (savedState as any)?.messages || []
    );
    const [input, setInput] = useState((savedState as any)?.input || '');
    const [isTyping, setIsTyping] = useState(false);
    const [contextFiles, setContextFiles] = useState<ContextFile[]>(
        (savedState as any)?.contextFiles || []
    );
    const [selectedPersona, setSelectedPersona] = useState<ChatPersona>(
        (savedState as any)?.selectedChatPersona || DEFAULT_PERSONA
    );
    const [status, setStatus] = useState('');
    const [view, setView] = useState<ChatView>((savedState as any)?.view || 'chat');
    const [history, setHistory] = useState<ConversationSummary[]>(
        (savedState as any)?.history || []
    );

    // Track current conversation ID to maintain conversation continuity
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(
        (savedState as any)?.currentConversationId || null
    );

    // Refs
    const bottomRef = useRef<HTMLDivElement>(null);

    // Persist state changes
    useEffect(() => {
        const currentState = getState() || {};
        setState({
            ...currentState,
            messages,
            input,
            contextFiles,
            selectedChatPersona: selectedPersona,
            view,
            history,
        });
    }, [messages, input, contextFiles, selectedPersona, view, history]);

    // Handle messages from extension
    useEffect(() => {
        const unsubscribe = onMessage((message: any) => {
            switch (message.type) {
                case 'add-message':
                    // Only add model/error messages - user messages are added locally in sendMessage
                    if (message.mode !== 'build' && message.role !== 'user') {
                        setMessages((prev) => [...prev, {
                            role: message.role,
                            text: message.text,
                            // Store persona info so it persists even when persona changes
                            personaId: message.role === 'model' ? selectedPersona?.id : undefined,
                            personaName: message.role === 'model' ? selectedPersona?.name : undefined,
                            personaIcon: message.role === 'model' ? selectedPersona?.name?.charAt(0) : undefined,
                        }]);
                        if (message.role === 'model' || message.role === 'error') {
                            setIsTyping(false);
                        }
                    }
                    setStatus('');
                    break;

                case 'status':
                    if (message.mode !== 'build') {
                        setStatus(message.text);
                    }
                    break;

                case 'add-context':
                    setContextFiles((prev) => {
                        if (prev.some((f) => f.path === message.data.path)) {
                            return prev;
                        }
                        return [...prev, message.data];
                    });
                    break;

                case 'history-updated':
                    setHistory(message.history);
                    break;

                case 'load-conversation':
                    setMessages(message.messages);
                    setView('chat');
                    break;

                case 'new-conversation-created':
                    // Store the new conversation ID and clear messages
                    console.log('[useChatState] Received new-conversation-created:', message);
                    setCurrentConversationId(message.conversationId);
                    setMessages([]);
                    setInput('');
                    setContextFiles([]);
                    setView('chat');
                    setIsTyping(false);
                    setStatus('');
                    break;

                case 'session-messages-loaded':
                    // Load messages from a selected session
                    console.log('[useChatState] Received session-messages-loaded:', message);
                    if (message.messages && Array.isArray(message.messages)) {
                        setMessages(message.messages);
                        setView('chat');
                        setIsTyping(false);
                        setStatus('');
                    }
                    break;
            }
        });

        return unsubscribe;
    }, [onMessage]);

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Actions
    const sendMessage = useCallback(
        (overrideMessage?: string) => {
            const messageToSend = overrideMessage || input;
            if (!messageToSend.trim()) return;

            // Add user message to UI
            setMessages((prev) => [...prev, { role: 'user', text: messageToSend }]);
            setIsTyping(true);
            setInput('');

            // Send to extension
            console.log('[useChatState] Sending message with conversationId:', currentConversationId);
            postMessage({
                type: 'send-message',
                value: messageToSend,
                contextFiles,
                persona: selectedPersona,
                mode: 'chat',
                conversationId: currentConversationId, // Include current conversation ID
            });
        },
        [input, contextFiles, selectedPersona, currentConversationId, postMessage]
    );

    const addContextFile = useCallback((file: ContextFile) => {
        setContextFiles((prev) => {
            if (prev.some((f) => f.path === file.path)) {
                return prev;
            }
            return [...prev, file];
        });
    }, []);

    const removeContextFile = useCallback((path: string) => {
        setContextFiles((prev) => prev.filter((f) => f.path !== path));
    }, []);

    const addActiveFile = useCallback(() => {
        postMessage({ type: 'add-active-file' });
    }, [postMessage]);

    const newChat = useCallback(() => {
        setMessages([]);
        setInput('');
        setContextFiles([]);
        setView('chat');
        postMessage({ type: 'new-chat' });
    }, [postMessage]);

    const loadConversation = useCallback(
        (id: string) => {
            postMessage({ type: 'load-conversation', id });
        },
        [postMessage]
    );

    const deleteConversation = useCallback(
        (id: string) => {
            console.log('[useChatState] Deleting conversation:', id);
            postMessage({ type: 'delete-conversation', conversationId: id });
        },
        [postMessage]
    );

    return {
        // State
        messages,
        input,
        isTyping,
        contextFiles,
        selectedPersona,
        status,
        view,
        history,

        // Setters
        setInput,
        setView,
        setSelectedPersona,

        // Actions
        sendMessage,
        addContextFile,
        removeContextFile,
        addActiveFile,
        newChat,
        loadConversation,
        deleteConversation,

        // Refs
        bottomRef,
    };
}

export default useChatState;
