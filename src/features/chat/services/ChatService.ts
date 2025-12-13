/**
 * ChatService handles chat business logic
 *
 * Responsibilities:
 * - Send messages through the Agent
 * - Load and manage conversations
 * - Delete conversations
 * - Manage conversation history
 *
 * Feature: feature-based-architecture, agent-interaction-fixes
 * Validates: Requirements 2.1, 2.2, 2.3, 1.3, 3.1, 3.2, 3.3, 4.1
 */

import { AgentManager } from '../../../core/agent/AgentManager';
import { ContextFile, Message } from '../../../shared/types/CommonTypes';
import { Conversation } from '../types/ChatTypes';
import { ConversationManager } from './ConversationManager';

export class ChatService {
  private currentConversationId: string | null = null;

  constructor(
    private readonly agentManager: AgentManager,
    private readonly conversationManager: ConversationManager
  ) { }

  /**
   * Send a message through the agent
   * Validates: Requirements 2.1, 1.3
   */
  async sendMessage(
    conversationId: string,
    input: string,
    contextFiles: ContextFile[],
    settings?: Record<string, any>,
    systemInstruction?: string,
    isPersonaChat?: boolean
  ): Promise<void> {
    if (!input || input.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    // Get or create agent for this conversation
    const agent = await this.agentManager.getOrCreateAgent(conversationId, 'chat');
    this.currentConversationId = conversationId;

    // Send message through agent
    await agent.chat(input, contextFiles, settings || {}, systemInstruction, isPersonaChat || false);
  }

  /**
   * Load a conversation by ID
   * Validates: Requirements 2.2, 3.1, 3.2, 3.3
   */
  async loadConversation(id: string): Promise<Conversation | null> {
    // Restore conversation from storage
    const conversation = await this.conversationManager.restoreConversation(id);
    
    if (!conversation) {
      return null;
    }

    // Get or create agent for this conversation
    const agent = await this.agentManager.getOrCreateAgent(id, 'chat');
    
    // Restore message history to the agent
    await agent.loadHistory(conversation.messages);
    
    this.currentConversationId = id;

    return conversation;
  }

  /**
   * Get all conversations
   * Validates: Requirements 2.2
   */
  getConversations(): Conversation[] {
    return this.conversationManager.getConversations();
  }

  /**
   * Delete a conversation
   * Validates: Requirements 2.2, 4.4
   */
  async deleteConversation(id: string): Promise<boolean> {
    // Dispose agent if it exists
    if (this.agentManager.hasAgent(id)) {
      await this.agentManager.disposeAgent(id);
    }

    // Delete conversation from storage
    return this.conversationManager.deleteConversation(id);
  }

  /**
   * Clear all conversations
   * Validates: Requirements 2.2
   */
  async clearAllConversations(): Promise<void> {
    await this.conversationManager.clearAllConversations();
  }

  /**
   * Save current conversation
   * Validates: Requirements 2.2
   */
  async saveConversation(id: string, messages: Message[]): Promise<Conversation> {
    return this.conversationManager.saveConversation(id, messages);
  }

  /**
   * Create a new conversation
   * Validates: Requirements 2.1
   */
  createNewConversation(): string {
    // Generate a unique conversation ID
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Switch between conversations
   * Validates: Requirements 4.1
   */
  async switchConversation(fromId: string, toId: string): Promise<void> {
    console.log('[ChatService] Switching conversation:', { fromId, toId });

    // Load the target conversation
    const conversation = await this.loadConversation(toId);
    
    if (!conversation) {
      throw new Error(`Conversation ${toId} not found`);
    }

    this.currentConversationId = toId;
    
    console.log('[ChatService] Conversation switched successfully:', {
      toId,
      messageCount: conversation.messages.length,
    });
  }

  /**
   * Abort current operation
   * Validates: Requirements 1.3
   */
  async abort(conversationId?: string): Promise<void> {
    const targetId = conversationId || this.currentConversationId;
    
    if (!targetId) {
      console.warn('[ChatService] No conversation ID provided for abort');
      return;
    }

    // Get the agent for this conversation if it exists
    if (this.agentManager.hasAgent(targetId)) {
      const agent = await this.agentManager.getOrCreateAgent(targetId, 'chat');
      agent.abort();
    }
  }
}
