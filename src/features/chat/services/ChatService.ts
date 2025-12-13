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
    await agent.chat(
      input,
      contextFiles,
      settings || {},
      systemInstruction,
      isPersonaChat || false
    );
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

  /**
   * Abort and restart an unresponsive agent
   * Provides recovery mechanism for agents that become unresponsive
   * 
   * @param conversationId - Conversation ID of the unresponsive agent
   * 
   * Validates: Requirements 11.3
   */
  async abortAndRestartAgent(conversationId?: string): Promise<void> {
    const targetId = conversationId || this.currentConversationId;
    
    if (!targetId) {
      throw new Error('No conversation ID provided for agent restart');
    }

    console.log('[ChatService] Aborting and restarting agent:', {
      conversationId: targetId,
      timestamp: Date.now(),
    });

    // Use AgentManager to abort and restart
    await this.agentManager.abortAndRestartAgent(targetId);

    console.log('[ChatService] Agent restarted successfully:', {
      conversationId: targetId,
      timestamp: Date.now(),
    });
  }

  /**
   * Export conversation data for critical errors
   * Allows users to save conversation data when critical errors occur
   * 
   * @param conversationId - Conversation ID to export
   * @returns Conversation data as JSON string
   * 
   * Validates: Requirements 11.5
   */
  async exportConversationData(conversationId?: string): Promise<string> {
    const targetId = conversationId || this.currentConversationId;
    
    if (!targetId) {
      throw new Error('No conversation ID provided for export');
    }

    console.log('[ChatService] Exporting conversation data:', {
      conversationId: targetId,
      timestamp: Date.now(),
    });

    return await this.agentManager.exportConversationData(targetId);
  }

  /**
   * Handle webview disconnection
   * Preserves agent state for reconnection
   * 
   * @returns Array of preserved states
   * 
   * Validates: Requirements 11.4
   */
  async handleWebviewDisconnection(): Promise<any[]> {
    console.log('[ChatService] Handling webview disconnection');
    return await this.agentManager.handleWebviewDisconnection();
  }

  /**
   * Handle webview reconnection
   * Restores agent states after reconnection
   * 
   * @param webview - New webview instance
   * @param preservedStates - Array of preserved states to restore
   * 
   * Validates: Requirements 11.4
   */
  async handleWebviewReconnection(webview: any, preservedStates: any[]): Promise<void> {
    console.log('[ChatService] Handling webview reconnection');
    await this.agentManager.handleWebviewReconnection(webview, preservedStates);
  }

  /**
   * Send a message from one agent to another agent
   * Implements agent-to-agent communication with security validation
   * 
   * @param fromConversationId - Conversation ID of the sending agent
   * @param toConversationId - Conversation ID of the receiving agent
   * @param message - Message content to send
   * 
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 12.1, 12.2
   */
  async sendAgentMessage(
    fromConversationId: string,
    toConversationId: string,
    message: string
  ): Promise<void> {
    console.log('[ChatService] Agent-to-agent message:', {
      from: fromConversationId,
      to: toConversationId,
      messageLength: message.length,
      timestamp: Date.now(),
    });

    // Validate both agents exist and session ownership (Requirements 6.1, 12.1)
    if (!this.agentManager.validateAgentCommunication(fromConversationId, toConversationId)) {
      throw new Error('Agent-to-agent communication not authorized');
    }

    // Get or create agents for communication
    const fromAgent = await this.agentManager.getOrCreateAgent(fromConversationId, 'chat');
    const toAgent = await this.agentManager.getOrCreateAgent(toConversationId, 'chat');

    if (!fromAgent || !toAgent) {
      throw new Error('Failed to retrieve agents for communication');
    }

    // Sanitize message content (Requirement 12.2)
    const { InputValidator } = await import('../../../shared/services/InputValidator');
    const validator = new InputValidator();
    const validationResult = validator.validateInput(message, {
      maxLength: 100000, // 100k character limit for agent messages
      required: true,
      type: 'text',
    });

    if (!validationResult.valid) {
      throw new Error(`Message validation failed: ${validationResult.reason}`);
    }

    const sanitizedMessage = validationResult.sanitizedValue || message;

    // Check for XSS patterns
    if (validator.containsXss(sanitizedMessage)) {
      throw new Error('Message contains potentially dangerous content');
    }

    // Create message with sender metadata (Requirement 6.5)
    const agentMessage: Message = {
      role: 'user', // Agent messages are treated as user input to the receiving agent
      text: sanitizedMessage,
      metadata: {
        senderId: fromConversationId,
        senderType: 'agent',
        timestamp: Date.now(),
        sessionId: 'current-session', // In VS Code extension, single session
      },
    };

    // Get current conversation for the target agent
    const targetConversation = await this.conversationManager.restoreConversation(toConversationId);
    
    if (!targetConversation) {
      throw new Error(`Target conversation not found: ${toConversationId}`);
    }

    // Route message through conversation history (Requirement 6.3)
    const updatedMessages = [...targetConversation.messages, agentMessage];

    // Persist message to storage (Requirement 6.4)
    await this.conversationManager.saveConversation(toConversationId, updatedMessages);

    // Load the updated history into the target agent
    await toAgent.loadHistory(updatedMessages);

    console.log('[ChatService] Agent-to-agent message delivered:', {
      from: fromConversationId,
      to: toConversationId,
      messageCount: updatedMessages.length,
      timestamp: Date.now(),
    });
  }
}
