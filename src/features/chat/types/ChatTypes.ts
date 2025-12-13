/**
 * Type definitions for the chat feature module
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 2.1, 2.5, 12.1
 */

import { Message, ContextFile } from '../../../shared/types/CommonTypes';

/**
 * Represents a conversation with metadata
 */
export interface Conversation {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
  lastUpdated?: number;
}

/**
 * Represents a paginated result of messages
 */
export interface PaginatedMessages {
  messages: Message[];
  page: number;
  pageSize: number;
  totalMessages: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Storage interface for conversation persistence
 */
export interface ConversationStorage {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): Promise<void>;
}

/**
 * Chat message types for webview communication
 */
export type ChatMessageType =
  | 'user-input'
  | 'get-conversations'
  | 'load-conversation'
  | 'delete-conversation'
  | 'clear-conversations'
  | 'new-conversation';

/**
 * Chat message structure
 */
export interface ChatMessage {
  type: ChatMessageType;
  value?: string;
  contextFiles?: ContextFile[];
  conversationId?: string;
}

/**
 * Export re-used types from shared
 */
export type { Message, ContextFile };
