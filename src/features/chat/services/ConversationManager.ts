/**
 * ConversationManager handles conversation state persistence, pagination, and title updates.
 *
 * Features:
 * - Conversation state persistence and restoration
 * - Pagination for large conversations
 * - Dynamic title updates based on conversation content
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 2.2, 2.3
 */

import { Message } from '../../../shared/types/CommonTypes';
import { Conversation, PaginatedMessages, ConversationStorage } from '../types/ChatTypes';
import { retryWithBackoff } from '../../../shared/utils/retryUtils';

/**
 * Configuration constants for conversation management
 */
const STORAGE_KEY = 'conversationHistory';
const DEFAULT_PAGE_SIZE = 50;
const MAX_TITLE_LENGTH = 50;



/**
 * V1 Conversation schema (legacy)
 */
interface ConversationV1 {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
  lastUpdated?: number;
}

/**
 * V2 Conversation schema (current)
 */
interface ConversationV2 {
  version: 2;
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
  lastUpdated: number;
  metadata: {
    agentMode?: string;
    participatingAgents?: string[];
    tags?: string[];
    archived?: boolean;
  };
}

/**
 * Result of loading all conversations
 */
interface LoadAllResult {
  successful: Conversation[];
  failed: Array<{ id: string; error: string }>;
}

export class ConversationManager {
  constructor(private readonly storage: ConversationStorage) {}

  /**
   * Get all conversations from storage
   */
  getConversations(): Conversation[] {
    return this.storage.get<Conversation[]>(STORAGE_KEY, []);
  }

  /**
   * Validate conversation schema
   * Validates: Requirements 8.1
   */
  private validateSchema(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check required fields
    if (typeof data.id !== 'string' || !data.id) {
      return false;
    }
    if (typeof data.title !== 'string') {
      return false;
    }
    if (typeof data.timestamp !== 'number') {
      return false;
    }
    if (!Array.isArray(data.messages)) {
      return false;
    }

    // Validate messages array
    for (const message of data.messages) {
      if (!message || typeof message !== 'object') {
        return false;
      }
      if (typeof message.role !== 'string' || !message.role) {
        return false;
      }
      if (typeof message.text !== 'string') {
        return false;
      }
    }

    return true;
  }

  /**
   * Migrate conversation from V1 to V2 schema
   * Validates: Requirements 8.2
   */
  private migrateConversation(data: any): ConversationV2 {
    // If already V2, return as-is
    if (data.version === 2) {
      return data as ConversationV2;
    }

    // Migrate V1 to V2
    const v1Data = data as ConversationV1;
    
    const v2Data: ConversationV2 = {
      version: 2,
      id: v1Data.id,
      title: v1Data.title,
      timestamp: v1Data.timestamp,
      messages: v1Data.messages,
      lastUpdated: v1Data.lastUpdated || v1Data.timestamp,
      metadata: {
        agentMode: undefined,
        participatingAgents: undefined,
        tags: undefined,
        archived: false,
      },
    };

    return v2Data;
  }

  /**
   * Load all conversations with migration and validation
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
   */
  async loadAllConversations(): Promise<LoadAllResult> {
    const rawConversations = this.storage.get<any[]>(STORAGE_KEY, []);
    const successful: Conversation[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const rawConv of rawConversations) {
      try {
        // Validate schema
        if (!this.validateSchema(rawConv)) {
          failed.push({
            id: rawConv?.id || 'unknown',
            error: 'Invalid conversation schema',
          });
          console.error(`[ConversationManager] Schema validation failed for conversation:`, rawConv?.id);
          continue;
        }

        // Migrate if needed
        const migratedConv = this.migrateConversation(rawConv);

        // Convert to Conversation type (V2 schema maps to Conversation)
        const conversation: Conversation = {
          id: migratedConv.id,
          title: migratedConv.title,
          timestamp: migratedConv.timestamp,
          messages: migratedConv.messages,
          lastUpdated: migratedConv.lastUpdated,
        };

        successful.push(conversation);
      } catch (error) {
        // Log and skip failed migrations
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failed.push({
          id: rawConv?.id || 'unknown',
          error: errorMessage,
        });
        console.error(`[ConversationManager] Migration failed for conversation ${rawConv?.id}:`, error);
      }
    }

    // Save migrated conversations back to storage
    if (successful.length > 0) {
      try {
        await this.storage.update(STORAGE_KEY, successful);
      } catch (error) {
        console.error('[ConversationManager] Failed to save migrated conversations:', error);
      }
    }

    return { successful, failed };
  }

  /**
   * Get a specific conversation by ID
   */
  getConversation(id: string): Conversation | undefined {
    const conversations = this.getConversations();
    return conversations.find((c) => c.id === id);
  }

  /**
   * Save a conversation to storage with retry logic
   * Implements conversation state persistence with exponential backoff
   * Validates: Requirements 11.2
   */
  async saveConversation(id: string, messages: Message[]): Promise<Conversation> {
    const conversations = this.getConversations();
    const existingIndex = conversations.findIndex((c) => c.id === id);

    // Generate dynamic title based on content
    const title = this.generateTitle(messages);

    const conversation: Conversation = {
      id,
      title,
      timestamp: existingIndex !== -1 ? conversations[existingIndex].timestamp : Date.now(),
      messages,
      lastUpdated: Date.now(),
    };

    if (existingIndex !== -1) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.unshift(conversation);
    }

    // Save with retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
    await retryWithBackoff(
      async () => await this.storage.update(STORAGE_KEY, conversations),
      3,
      1000,
      (attempt, error) => {
        console.log(`[ConversationManager] Save retry attempt ${attempt} for conversation ${id}: ${error.message}`);
      }
    );

    return conversation;
  }

  /**
   * Restore a conversation from storage
   * Implements conversation state persistence
   */
  restoreConversation(id: string): Conversation | null {
    const conversation = this.getConversation(id);
    if (!conversation) {
      return null;
    }
    return { ...conversation };
  }

  /**
   * Delete a conversation from storage
   */
  async deleteConversation(id: string): Promise<boolean> {
    const conversations = this.getConversations();
    const filteredConversations = conversations.filter((c) => c.id !== id);

    if (filteredConversations.length === conversations.length) {
      return false; // Conversation not found
    }

    await this.storage.update(STORAGE_KEY, filteredConversations);
    return true;
  }

  /**
   * Get paginated messages from a conversation
   * Implements conversation pagination
   */
  getPaginatedMessages(
    conversationId: string,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): PaginatedMessages | null {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      return null;
    }

    return this.paginateMessages(conversation.messages, page, pageSize);
  }

  /**
   * Paginate an array of messages
   * Implements conversation pagination
   */
  paginateMessages(
    messages: Message[],
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): PaginatedMessages {
    const totalMessages = messages.length;
    const totalPages = Math.ceil(totalMessages / pageSize);

    // Ensure page is within bounds
    const validPage = Math.max(1, Math.min(page, totalPages || 1));

    // Calculate start and end indices
    const startIndex = (validPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalMessages);

    // Get the messages for this page
    const paginatedMessages = messages.slice(startIndex, endIndex);

    return {
      messages: paginatedMessages,
      page: validPage,
      pageSize,
      totalMessages,
      totalPages: totalPages || 1,
      hasNextPage: validPage < totalPages,
      hasPreviousPage: validPage > 1,
    };
  }

  /**
   * Generate a dynamic title based on conversation content
   * Implements dynamic title updates
   */
  generateTitle(messages: Message[]): string {
    if (messages.length === 0) {
      return 'New Conversation';
    }

    // Find the first user message
    const firstUserMessage = messages.find((m) => m.role === 'user');
    if (!firstUserMessage) {
      return 'New Conversation';
    }

    // Extract the first line and truncate
    const firstLine = firstUserMessage.text.split('\n')[0].trim();

    // Handle empty or whitespace-only messages
    if (firstLine.length === 0) {
      return 'New Conversation';
    }

    if (firstLine.length <= MAX_TITLE_LENGTH) {
      return firstLine;
    }

    return firstLine.substring(0, MAX_TITLE_LENGTH) + '...';
  }

  /**
   * Update the title of a conversation
   * Implements dynamic title updates
   */
  async updateTitle(conversationId: string, title?: string): Promise<Conversation | null> {
    const conversations = this.getConversations();
    const index = conversations.findIndex((c) => c.id === conversationId);

    if (index === -1) {
      return null;
    }

    const conversation = conversations[index];

    // If no title provided, generate one from messages
    const newTitle = title || this.generateTitle(conversation.messages);

    conversations[index] = {
      ...conversation,
      title: newTitle,
      lastUpdated: Date.now(),
    };

    await this.storage.update(STORAGE_KEY, conversations);
    return conversations[index];
  }

  /**
   * Check if a conversation needs pagination
   */
  needsPagination(conversationId: string, pageSize: number = DEFAULT_PAGE_SIZE): boolean {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      return false;
    }
    return conversation.messages.length > pageSize;
  }

  /**
   * Get the total number of pages for a conversation
   */
  getTotalPages(conversationId: string, pageSize: number = DEFAULT_PAGE_SIZE): number {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      return 0;
    }
    return Math.ceil(conversation.messages.length / pageSize);
  }

  /**
   * Clear all conversations
   */
  async clearAllConversations(): Promise<void> {
    await this.storage.update(STORAGE_KEY, []);
  }

  /**
   * Verify conversation state integrity (for testing)
   */
  verifyStateIntegrity(original: Conversation, restored: Conversation): boolean {
    if (original.id !== restored.id) {
      return false;
    }
    if (original.title !== restored.title) {
      return false;
    }
    if (original.messages.length !== restored.messages.length) {
      return false;
    }

    // Verify each message
    for (let i = 0; i < original.messages.length; i++) {
      const origMsg = original.messages[i];
      const restMsg = restored.messages[i];
      if (origMsg.role !== restMsg.role || origMsg.text !== restMsg.text) {
        return false;
      }
    }

    return true;
  }
}
