/**
 * Type definitions for Chat History and Session Management
 * 
 * Feature: chat-enhancements
 * Validates: Requirements 2.1, 2.2, 7.1, 7.2, 7.3, 7.4
 */

/**
 * Represents a chat session with metadata and token usage
 */
export interface ChatSession {
    sessionId: string;
    createdAt: number;
    closedAt?: number;
    isIncognito: boolean;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    messageCount: number;
}

/**
 * Represents a stored chat message
 */
export interface ChatHistoryMessage {
    messageId: string;
    sessionId: string;
    actorName: string;
    actorType: 'user' | 'system_agent' | 'user_persona';
    messageContent: string;
    tokenCount: number;
    tokenDirection: 'input' | 'output';
    timestamp: number;
    /** Optional persona ID for agent messages */
    personaId?: string;
    /** Optional persona type for agent messages */
    personaType?: string;
}

/**
 * Query options for retrieving chat history
 */
export interface ChatHistoryQuery {
    sessionId?: string;
    startDate?: number;
    endDate?: number;
    actorType?: string;
    limit?: number;
    offset?: number;
}

/**
 * System agent configuration
 */
export interface SystemAgent {
    id: 'pippet' | 'ux-designer' | 'developer';
    name: string;
    icon: string;
    promptKey: string;
}

/**
 * User persona definition
 */
export interface UserPersona {
    id: string;
    name: string;
    backstory: string;
    initial: string;
    createdAt: number;
}

/**
 * Selected persona for chat
 */
export interface SelectedPersona {
    type: 'default' | 'system_agent' | 'user_persona';
    id: string;
    name: string;
    displayIndicator: string;
}

/**
 * Chat settings configuration
 */
export interface ChatSettings {
    trackHistory: boolean;
    userMessageColor: string;
    agentMessageColor: string;
    selectedPersonaId: string;
    incognitoMode: boolean;
}

/**
 * Default chat settings
 */
export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
    trackHistory: true,
    userMessageColor: '#3b82f6', // Blue
    agentMessageColor: '#10b981', // Green
    selectedPersonaId: 'pippet',
    incognitoMode: false,
};

/**
 * System agents definition
 */
export const SYSTEM_AGENTS: SystemAgent[] = [
    {
        id: 'pippet',
        name: 'Pippet',
        icon: '🐾',
        promptKey: 'pippet',
    },
    {
        id: 'ux-designer',
        name: 'UX Designer',
        icon: '🎨',
        promptKey: 'ux-designer',
    },
    {
        id: 'developer',
        name: 'Developer',
        icon: '💻',
        promptKey: 'developer',
    },
];

/**
 * Chat history service interface
 */
export interface IChatHistoryService {
    initialize(): Promise<void>;
    createSession(isIncognito: boolean): Promise<ChatSession>;
    closeSession(sessionId: string): Promise<void>;
    saveMessage(message: ChatHistoryMessage): Promise<void>;
    getSessionMessages(sessionId: string): Promise<ChatHistoryMessage[]>;
    getSessionHistory(query?: ChatHistoryQuery): Promise<ChatSession[]>;
    updateSessionTokens(sessionId: string, inputTokens: number, outputTokens: number): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
    getSetting(key: string): Promise<string | null>;
    setSetting(key: string, value: string): Promise<void>;
    isMemoryOnlyMode(): boolean;
}

/**
 * Session manager interface
 */
export interface ISessionManager {
    getCurrentSession(): ChatSession | null;
    createNewSession(isIncognito: boolean): Promise<ChatSession>;
    switchSession(sessionId: string): Promise<ChatSession>;
    closeCurrentSession(): Promise<void>;
    isIncognitoActive(): boolean;
    setIncognitoMode(enabled: boolean): void;
}

/**
 * Persona manager interface
 */
export interface IPersonaManager {
    getSystemAgents(): SystemAgent[];
    getUserPersonas(limit?: number): Promise<UserPersona[]>;
    getPersonaPrompt(personaId: string, personaType: string): Promise<string>;
    selectPersona(personaId: string, personaType: string): Promise<SelectedPersona>;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `session_${timestamp}_${random}`;
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `msg_${timestamp}_${random}`;
}

/**
 * Validate session ID format
 * Supports both timestamp-based IDs and UUIDs
 */
export function isValidSessionId(sessionId: string): boolean {
    // Timestamp-based format: session_TIMESTAMP_RANDOM
    const timestampPattern = /^session_\d+_[a-z0-9]+$/;
    // UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    return timestampPattern.test(sessionId) || uuidPattern.test(sessionId);
}
