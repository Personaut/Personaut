/**
 * Chat feature module barrel export
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

// Services
export { ChatService } from './services/ChatService';
export { ConversationManager } from './services/ConversationManager';

// Handlers
export { ChatHandler } from './handlers/ChatHandler';

// Types
export type {
  Conversation,
  PaginatedMessages,
  ConversationStorage,
  ChatMessageType,
  ChatMessage,
  Message,
  ContextFile,
} from './types/ChatTypes';
