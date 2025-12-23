/**
 * Conversation file types for file-based storage
 * 
 * Defines the structure of conversation data stored on disk.
 */

import { Message } from '../../../shared/types/CommonTypes';

/**
 * Lightweight metadata for conversation listing (index)
 */
export interface ConversationMeta {
    id: string;
    title: string;
    lastUpdated: number;
    createdAt: number;
    messageCount: number;
    archived?: boolean;
    tags?: string[];
}

/**
 * Index file structure - kept small for fast loading
 */
export interface ConversationIndex {
    version: number;
    lastUpdated: number;
    conversations: ConversationMeta[];
}

/**
 * Full conversation file structure with messages
 */
export interface ConversationFile {
    version: number;
    metadata: ConversationMeta;
    messages: Message[];
    sessionId?: string;
    agentMode?: string;
}

/**
 * Current schema versions
 */
export const CONVERSATION_INDEX_VERSION = 1;
export const CONVERSATION_FILE_VERSION = 1;

/**
 * Create a new empty conversation index
 */
export function createEmptyIndex(): ConversationIndex {
    return {
        version: CONVERSATION_INDEX_VERSION,
        lastUpdated: Date.now(),
        conversations: [],
    };
}

/**
 * Create a new conversation file from data
 */
export function createConversationFile(
    id: string,
    title: string,
    messages: Message[],
    options?: {
        sessionId?: string;
        agentMode?: string;
        tags?: string[];
    }
): ConversationFile {
    const now = Date.now();
    return {
        version: CONVERSATION_FILE_VERSION,
        metadata: {
            id,
            title,
            lastUpdated: now,
            createdAt: now,
            messageCount: messages.length,
            tags: options?.tags,
        },
        messages,
        sessionId: options?.sessionId,
        agentMode: options?.agentMode,
    };
}
