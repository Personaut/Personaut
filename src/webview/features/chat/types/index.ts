/**
 * Chat Feature Types
 *
 * Type definitions for the Chat feature.
 *
 * **Validates: Requirements 4.1, 25.1, 27.1**
 */

/**
 * Chat message roles
 */
export type MessageRole = 'user' | 'model' | 'error';

/**
 * Chat message interface
 */
export interface ChatMessage {
    role: MessageRole;
    text: string;
    timestamp?: number;
    /** Persona ID that sent this message */
    personaId?: string;
    /** Persona name for display */
    personaName?: string;
    /** Persona icon (emoji or letter) */
    personaIcon?: string;
}

/**
 * Context file attached to chat
 */
export interface ContextFile {
    path: string;
    content: string;
}

/**
 * Chat persona selection
 */
export interface ChatPersona {
    type: 'agent' | 'team' | 'user';
    id: string;
    name: string;
    context?: string;
}

/**
 * Conversation summary for history
 */
export interface ConversationSummary {
    id: string;
    title: string;
    timestamp: number;
    messageCount: number;
    preview?: string;
}

/**
 * Chat view mode
 */
export type ChatView = 'chat' | 'history';

/**
 * Chat state interface
 */
export interface ChatState {
    /** Current messages in the conversation */
    messages: ChatMessage[];
    /** Current input text */
    input: string;
    /** Whether the AI is currently typing */
    isTyping: boolean;
    /** Attached context files */
    contextFiles: ContextFile[];
    /** Selected persona for chat */
    selectedPersona: ChatPersona;
    /** Current session ID */
    sessionId: string;
    /** Status message */
    status: string;
    /** Current view (chat or history) */
    view: ChatView;
    /** Conversation history list */
    history: ConversationSummary[];
}

/**
 * Default chat persona
 */
export const DEFAULT_PERSONA: ChatPersona = {
    type: 'agent',
    id: 'default',
    name: 'Pippet',
};

/**
 * Initial chat state
 */
export const INITIAL_CHAT_STATE: ChatState = {
    messages: [],
    input: '',
    isTyping: false,
    contextFiles: [],
    selectedPersona: DEFAULT_PERSONA,
    sessionId: '',
    status: '',
    view: 'chat',
    history: [],
};
