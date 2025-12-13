"use strict";
/**
 * ChatService handles chat business logic
 *
 * Responsibilities:
 * - Send messages through the Agent
 * - Load and manage conversations
 * - Delete conversations
 * - Manage conversation history
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 2.1, 2.2, 2.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
class ChatService {
    constructor(agent, conversationManager) {
        this.agent = agent;
        this.conversationManager = conversationManager;
    }
    /**
     * Send a message through the agent
     * Validates: Requirements 2.1
     */
    async sendMessage(input, contextFiles) {
        if (!input || input.trim().length === 0) {
            throw new Error('Message cannot be empty');
        }
        // Send message through agent
        await this.agent.chat(input, contextFiles);
    }
    /**
     * Load a conversation by ID
     * Validates: Requirements 2.2
     */
    async loadConversation(id) {
        return this.conversationManager.restoreConversation(id);
    }
    /**
     * Get all conversations
     * Validates: Requirements 2.2
     */
    getConversations() {
        return this.conversationManager.getConversations();
    }
    /**
     * Delete a conversation
     * Validates: Requirements 2.2
     */
    async deleteConversation(id) {
        return this.conversationManager.deleteConversation(id);
    }
    /**
     * Clear all conversations
     * Validates: Requirements 2.2
     */
    async clearAllConversations() {
        await this.conversationManager.clearAllConversations();
    }
    /**
     * Save current conversation
     * Validates: Requirements 2.2
     */
    async saveConversation(id, messages) {
        return this.conversationManager.saveConversation(id, messages);
    }
    /**
     * Create a new conversation
     * Validates: Requirements 2.1
     */
    createNewConversation() {
        // Generate a unique conversation ID
        return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=ChatService.js.map