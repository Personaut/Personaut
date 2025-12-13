"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationManager = void 0;
/**
 * Configuration constants for conversation management
 */
const STORAGE_KEY = 'conversationHistory';
const DEFAULT_PAGE_SIZE = 50;
const MAX_TITLE_LENGTH = 50;
class ConversationManager {
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Get all conversations from storage
     */
    getConversations() {
        return this.storage.get(STORAGE_KEY, []);
    }
    /**
     * Get a specific conversation by ID
     */
    getConversation(id) {
        const conversations = this.getConversations();
        return conversations.find((c) => c.id === id);
    }
    /**
     * Save a conversation to storage
     * Implements conversation state persistence
     */
    async saveConversation(id, messages) {
        const conversations = this.getConversations();
        const existingIndex = conversations.findIndex((c) => c.id === id);
        // Generate dynamic title based on content
        const title = this.generateTitle(messages);
        const conversation = {
            id,
            title,
            timestamp: existingIndex !== -1 ? conversations[existingIndex].timestamp : Date.now(),
            messages,
            lastUpdated: Date.now(),
        };
        if (existingIndex !== -1) {
            conversations[existingIndex] = conversation;
        }
        else {
            conversations.unshift(conversation);
        }
        await this.storage.update(STORAGE_KEY, conversations);
        return conversation;
    }
    /**
     * Restore a conversation from storage
     * Implements conversation state persistence
     */
    restoreConversation(id) {
        const conversation = this.getConversation(id);
        if (!conversation) {
            return null;
        }
        return { ...conversation };
    }
    /**
     * Delete a conversation from storage
     */
    async deleteConversation(id) {
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
    getPaginatedMessages(conversationId, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
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
    paginateMessages(messages, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
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
    generateTitle(messages) {
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
    async updateTitle(conversationId, title) {
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
    needsPagination(conversationId, pageSize = DEFAULT_PAGE_SIZE) {
        const conversation = this.getConversation(conversationId);
        if (!conversation) {
            return false;
        }
        return conversation.messages.length > pageSize;
    }
    /**
     * Get the total number of pages for a conversation
     */
    getTotalPages(conversationId, pageSize = DEFAULT_PAGE_SIZE) {
        const conversation = this.getConversation(conversationId);
        if (!conversation) {
            return 0;
        }
        return Math.ceil(conversation.messages.length / pageSize);
    }
    /**
     * Clear all conversations
     */
    async clearAllConversations() {
        await this.storage.update(STORAGE_KEY, []);
    }
    /**
     * Verify conversation state integrity (for testing)
     */
    verifyStateIntegrity(original, restored) {
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
exports.ConversationManager = ConversationManager;
//# sourceMappingURL=ConversationManager.js.map