import { useState, useCallback, useEffect } from 'react';
import { useVSCode } from '../../../shared/hooks/useVSCode';
import { ChatSettingsData } from '../components/ChatSettingsPanel';
import { SessionSummary } from '../components/ChatHistoryPanel';

/**
 * Chat settings state
 */
export interface ChatEnhancedSettings {
    trackHistory: boolean;
    userMessageColor: string;
    agentMessageColor: string;
    incognitoMode: boolean;
    selectedPersonaId: string;
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: ChatEnhancedSettings = {
    trackHistory: true,
    userMessageColor: '#3b82f6',
    agentMessageColor: '#10b981',
    incognitoMode: false,
    selectedPersonaId: 'pippet',
};

/**
 * Return type for useChatEnhancements hook
 */
export interface UseChatEnhancementsReturn {
    // Session state
    sessionId: string | null;
    isIncognito: boolean;
    sessionHistory: SessionSummary[];
    isHistoryLoading: boolean;

    // Settings state
    settings: ChatEnhancedSettings;
    isSettingsOpen: boolean;
    isHistoryOpen: boolean;

    // Actions
    createNewSession: (incognito?: boolean) => void;
    switchSession: (sessionId: string) => void;
    toggleIncognito: () => void;
    updateSettings: (settings: Partial<ChatSettingsData>) => void;
    loadSessionHistory: () => void;
    loadSessionMessages: (sessionId: string) => void;

    // UI toggles
    setSettingsOpen: (open: boolean) => void;
    setHistoryOpen: (open: boolean) => void;
}

/**
 * Hook for managing chat enhancements (sessions, settings, incognito mode).
 *
 * This hook provides additional functionality beyond the basic chat state,
 * handling session management, settings persistence, and privacy controls.
 *
 * @example
 * ```tsx
 * function Chat() {
 *   const {
 *     settings,
 *     isIncognito,
 *     toggleIncognito,
 *     updateSettings,
 *   } = useChatEnhancements();
 *
 *   return (
 *     <div>
 *       <ChatHeader
 *         isIncognito={isIncognito}
 *         onIncognitoToggle={toggleIncognito}
 *       />
 *     </div>
 *   );
 * }
 * ```
 *
 * **Validates: Requirements 5.1, 6.1, 7.1, 9.1**
 */
export function useChatEnhancements(): UseChatEnhancementsReturn {
    const { postMessage, onMessage, getState, setState } = useVSCode();
    const savedState = getState() as any;

    // Session state
    const [sessionId, setSessionId] = useState<string | null>(
        savedState?.enhancedSessionId || null
    );
    const [isIncognito, setIsIncognito] = useState<boolean>(
        savedState?.isIncognito || false
    );
    const [sessionHistory, setSessionHistory] = useState<SessionSummary[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // Settings state
    const [settings, setSettings] = useState<ChatEnhancedSettings>(
        savedState?.enhancedSettings || DEFAULT_SETTINGS
    );

    // UI state
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [isHistoryOpen, setHistoryOpen] = useState(false);

    // Persist state changes
    useEffect(() => {
        const currentState = getState() || {};
        setState({
            ...currentState,
            enhancedSessionId: sessionId,
            isIncognito,
            enhancedSettings: settings,
        });
    }, [sessionId, isIncognito, settings, getState, setState]);

    // Handle messages from extension
    useEffect(() => {
        const unsubscribe = onMessage((message: any) => {
            switch (message.type) {
                case 'session-created':
                    setSessionId(message.sessionId);
                    setIsIncognito(message.isIncognito || false);
                    break;

                case 'session-switched':
                    if (message.success) {
                        setSessionId(message.sessionId);
                        setIsIncognito(false); // Deactivate incognito when switching
                    }
                    break;

                case 'incognito-toggled':
                    console.log('[useChatEnhancements] Received incognito-toggled:', message);
                    if (message.success) {
                        setIsIncognito(message.enabled);
                    }
                    break;


                case 'session-history':
                    console.log('[useChatEnhancements] Received session-history:', message.sessions?.length, 'sessions');
                    setSessionHistory(message.sessions || []);
                    setIsHistoryLoading(false);
                    break;

                case 'conversation-deleted':
                    console.log('[useChatEnhancements] Conversation deleted:', message.conversationId);
                    if (message.success) {
                        // Refresh the session history to remove the deleted conversation
                        postMessage({ type: 'get-session-history' });
                    }
                    break;

                case 'add-message':
                    // When a new message is added, refresh history to show new conversations
                    console.log('[useChatEnhancements] Message added:', message.role);
                    if (message.role === 'model') {
                        console.log('[useChatEnhancements] Model message added, refreshing history in 500ms');
                        // Delay to allow backend to save conversation
                        setTimeout(() => {
                            console.log('[useChatEnhancements] Triggering history refresh');
                            postMessage({ type: 'get-session-history' });
                        }, 500);
                    }
                    break;

                case 'chat-settings':
                case 'chat-settings-updated':
                    if (message.settings) {
                        setSettings((prev) => ({ ...prev, ...message.settings }));
                    }
                    break;
            }
        });

        return unsubscribe;
    }, [onMessage, postMessage]);

    // Request initial settings on mount
    useEffect(() => {
        postMessage({ type: 'get-chat-settings' });
    }, [postMessage]);

    // Actions
    const createNewSession = useCallback(
        (incognito: boolean = false) => {
            postMessage({ type: 'create-session', incognito });
        },
        [postMessage]
    );

    const switchSession = useCallback(
        (targetSessionId: string) => {
            postMessage({ type: 'switch-session', sessionId: targetSessionId });
        },
        [postMessage]
    );

    const toggleIncognito = useCallback(() => {
        console.log('[useChatEnhancements] Toggling incognito, current:', isIncognito, 'new:', !isIncognito);
        postMessage({ type: 'toggle-incognito', enabled: !isIncognito });
    }, [isIncognito, postMessage]);

    const updateSettings = useCallback(
        (newSettings: Partial<ChatSettingsData>) => {
            postMessage({ type: 'update-chat-settings', settings: newSettings });
            setSettings((prev) => ({ ...prev, ...newSettings }));
        },
        [postMessage]
    );

    const loadSessionHistory = useCallback(() => {
        setIsHistoryLoading(true);
        postMessage({ type: 'get-session-history' });
    }, [postMessage]);

    const loadSessionMessages = useCallback(
        (targetSessionId: string) => {
            postMessage({ type: 'load-session-messages', sessionId: targetSessionId });
        },
        [postMessage]
    );

    return {
        // Session state
        sessionId,
        isIncognito,
        sessionHistory,
        isHistoryLoading,

        // Settings state
        settings,
        isSettingsOpen,
        isHistoryOpen,

        // Actions
        createNewSession,
        switchSession,
        toggleIncognito,
        updateSettings,
        loadSessionHistory,
        loadSessionMessages,

        // UI toggles
        setSettingsOpen,
        setHistoryOpen,
    };
}

export default useChatEnhancements;
