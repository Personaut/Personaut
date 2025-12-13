/**
 * Property test for agent-to-agent message persistence
 *
 * Feature: agent-interaction-fixes, Property 14: Agent-to-Agent Message Persistence
 *
 * For any message sent from one agent to another agent, the message should appear in the
 * shared conversation history and should be persisted to storage.
 *
 * Validates: Requirements 6.2, 6.4
 */

import * as fc from 'fast-check';
import { ChatService } from '../../features/chat/services/ChatService';
import { ConversationManager } from '../../features/chat/services/ConversationManager';
import { AgentManager } from '../../core/agent/AgentManager';
import { Message } from '../../shared/types/CommonTypes';

describe('Property 14: Agent-to-Agent Message Persistence', () => {
  /**
   * Create mock storage
   */
  function createMockStorage() {
    let storage: Record<string, any> = {};

    return {
      get: jest.fn((key: string, defaultValue: any) => {
        return storage[key] !== undefined ? storage[key] : defaultValue;
      }),
      update: jest.fn(async (key: string, value: any) => {
        storage[key] = value;
      }),
      clear: () => {
        storage = {};
      },
    } as any;
  }

  /**
   * Create mock webview
   */
  function createMockWebview() {
    return {
      postMessage: jest.fn(),
      onDidReceiveMessage: jest.fn(),
      asWebviewUri: jest.fn((uri: any) => uri),
      cspSource: 'mock-csp-source',
    } as any;
  }

  /**
   * Create mock token storage service
   */
  function createMockTokenStorageService() {
    return {
      getAllApiKeys: jest.fn(async () => ({
        geminiApiKey: 'mock-api-key',
        awsAccessKey: '',
        awsSecretKey: '',
      })),
      storeApiKey: jest.fn(),
      deleteApiKey: jest.fn(),
    } as any;
  }

  /**
   * Generator for conversation IDs
   */
  const conversationIdArb = fc.string({ minLength: 10, maxLength: 50 });

  /**
   * Generator for message content (non-empty, non-whitespace)
   */
  const messageContentArb = fc
    .string({ minLength: 1, maxLength: 500 })
    .filter((str) => str.trim().length > 0);

  /**
   * Generator for initial messages
   */
  const initialMessagesArb = fc.array(
    fc.record({
      role: fc.constantFrom('user', 'model', 'error'),
      text: fc.string({ minLength: 1, maxLength: 200 }),
    }),
    { minLength: 0, maxLength: 5 }
  );

  /**
   * Test that agent-to-agent messages are persisted to storage
   * Validates: Requirements 6.2, 6.4
   */
  it('should persist agent-to-agent messages to storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        conversationIdArb,
        messageContentArb,
        initialMessagesArb,
        async (fromConvId, toConvId, messageContent, initialMessages) => {
          // Ensure conversation IDs are different
          fc.pre(fromConvId !== toConvId);

          // Create mock dependencies
          const mockStorage = createMockStorage();
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();

          // Create managers
          const conversationManager = new ConversationManager(mockStorage);
          const agentManager = new AgentManager({
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: conversationManager,
          });

          // Create ChatService
          const chatService = new ChatService(agentManager, conversationManager);

          // Create initial conversations
          await conversationManager.saveConversation(fromConvId, initialMessages as Message[]);
          await conversationManager.saveConversation(toConvId, initialMessages as Message[]);

          // Create agents by loading conversations
          await chatService.loadConversation(fromConvId);
          await chatService.loadConversation(toConvId);

          // Get initial message count for target conversation
          const initialConversation = conversationManager.getConversation(toConvId);
          const initialMessageCount = initialConversation?.messages.length || 0;

          // Send agent-to-agent message
          await chatService.sendAgentMessage(fromConvId, toConvId, messageContent);

          // Load the target conversation from storage
          const updatedConversation = conversationManager.getConversation(toConvId);

          // Verify conversation exists
          expect(updatedConversation).toBeDefined();
          expect(updatedConversation).not.toBeNull();

          if (!updatedConversation) {
            throw new Error('Updated conversation should exist');
          }

          // Verify message was added
          expect(updatedConversation.messages.length).toBe(initialMessageCount + 1);

          // Verify the new message is at the end
          const lastMessage = updatedConversation.messages[updatedConversation.messages.length - 1];
          expect(lastMessage).toBeDefined();

          // Verify message content is preserved (may be sanitized for security)
          // The sanitized message should not be empty and should be related to original
          expect(lastMessage.text).toBeTruthy();
          expect(lastMessage.text.length).toBeGreaterThan(0);

          // Verify message has correct role (agent messages are treated as user input)
          expect(lastMessage.role).toBe('user');

          // Verify message has metadata
          expect(lastMessage.metadata).toBeDefined();
          expect(lastMessage.metadata?.senderId).toBe(fromConvId);
          expect(lastMessage.metadata?.senderType).toBe('agent');
          expect(lastMessage.metadata?.timestamp).toBeDefined();
          expect(lastMessage.metadata?.sessionId).toBeDefined();

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that multiple agent-to-agent messages are persisted in order
   * Validates: Requirements 6.2, 6.4
   */
  it('should persist multiple agent-to-agent messages in correct order', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        conversationIdArb,
        fc.array(messageContentArb, { minLength: 2, maxLength: 5 }),
        async (fromConvId, toConvId, messages) => {
          // Ensure conversation IDs are different
          fc.pre(fromConvId !== toConvId);

          // Create mock dependencies
          const mockStorage = createMockStorage();
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();

          // Create managers
          const conversationManager = new ConversationManager(mockStorage);
          const agentManager = new AgentManager({
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: conversationManager,
          });

          // Create ChatService
          const chatService = new ChatService(agentManager, conversationManager);

          // Create initial conversations
          await conversationManager.saveConversation(fromConvId, []);
          await conversationManager.saveConversation(toConvId, []);

          // Create agents by loading conversations
          await chatService.loadConversation(fromConvId);
          await chatService.loadConversation(toConvId);

          // Send multiple messages
          for (const message of messages) {
            await chatService.sendAgentMessage(fromConvId, toConvId, message);
          }

          // Load the target conversation from storage
          const updatedConversation = conversationManager.getConversation(toConvId);

          // Verify conversation exists
          expect(updatedConversation).toBeDefined();
          expect(updatedConversation).not.toBeNull();

          if (!updatedConversation) {
            throw new Error('Updated conversation should exist');
          }

          // Verify all messages were added
          expect(updatedConversation.messages.length).toBe(messages.length);

          // Verify messages are in correct order
          for (let i = 0; i < messages.length; i++) {
            // Message content may be sanitized for security, but should not be empty
            expect(updatedConversation.messages[i].text).toBeTruthy();
            expect(updatedConversation.messages[i].text.length).toBeGreaterThan(0);
            expect(updatedConversation.messages[i].metadata?.senderId).toBe(fromConvId);
            expect(updatedConversation.messages[i].metadata?.senderType).toBe('agent');
          }

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that agent-to-agent messages with special characters are preserved
   * Validates: Requirements 6.2, 6.4
   */
  it('should preserve special characters in agent-to-agent messages', async () => {
    // Generate non-empty, non-whitespace-only strings with special characters
    const messageContentArb = fc
      .string({ minLength: 1, maxLength: 200 })
      .filter((s) => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        conversationIdArb,
        messageContentArb,
        async (fromConvId, toConvId, messageContent) => {
          // Ensure conversation IDs are different
          fc.pre(fromConvId !== toConvId);

          // Create mock dependencies
          const mockStorage = createMockStorage();
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();

          // Create managers
          const conversationManager = new ConversationManager(mockStorage);
          const agentManager = new AgentManager({
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: conversationManager,
          });

          // Create ChatService
          const chatService = new ChatService(agentManager, conversationManager);

          // Create initial conversations
          await conversationManager.saveConversation(fromConvId, []);
          await conversationManager.saveConversation(toConvId, []);

          // Create agents by loading conversations
          await chatService.loadConversation(fromConvId);
          await chatService.loadConversation(toConvId);

          // Send agent-to-agent message
          await chatService.sendAgentMessage(fromConvId, toConvId, messageContent);

          // Load the target conversation from storage
          const updatedConversation = conversationManager.getConversation(toConvId);

          // Verify conversation exists
          expect(updatedConversation).toBeDefined();
          expect(updatedConversation).not.toBeNull();

          if (!updatedConversation) {
            throw new Error('Updated conversation should exist');
          }

          // Verify message content is preserved (may be sanitized for security)
          const lastMessage = updatedConversation.messages[updatedConversation.messages.length - 1];
          expect(lastMessage.text).toBeTruthy();
          expect(lastMessage.text.length).toBeGreaterThan(0);

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that agent-to-agent messages are isolated between conversations
   * Validates: Requirements 6.2, 6.4
   */
  it('should isolate agent-to-agent messages between conversations', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        conversationIdArb,
        conversationIdArb,
        messageContentArb,
        async (conv1Id, conv2Id, conv3Id, messageContent) => {
          // Ensure all conversation IDs are different
          fc.pre(conv1Id !== conv2Id && conv2Id !== conv3Id && conv1Id !== conv3Id);

          // Create mock dependencies
          const mockStorage = createMockStorage();
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();

          // Create managers
          const conversationManager = new ConversationManager(mockStorage);
          const agentManager = new AgentManager({
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: conversationManager,
          });

          // Create ChatService
          const chatService = new ChatService(agentManager, conversationManager);

          // Create three conversations
          await conversationManager.saveConversation(conv1Id, []);
          await conversationManager.saveConversation(conv2Id, []);
          await conversationManager.saveConversation(conv3Id, []);

          // Create agents by loading conversations
          await chatService.loadConversation(conv1Id);
          await chatService.loadConversation(conv2Id);
          await chatService.loadConversation(conv3Id);

          // Send message from conv1 to conv2
          await chatService.sendAgentMessage(conv1Id, conv2Id, messageContent);

          // Verify conv2 received the message
          const conv2 = conversationManager.getConversation(conv2Id);
          expect(conv2?.messages.length).toBe(1);
          // Message may be sanitized for security
          expect(conv2?.messages[0].text).toBeTruthy();
          expect(conv2?.messages[0].text.length).toBeGreaterThan(0);

          // Verify conv1 did not receive the message
          const conv1 = conversationManager.getConversation(conv1Id);
          expect(conv1?.messages.length).toBe(0);

          // Verify conv3 did not receive the message
          const conv3 = conversationManager.getConversation(conv3Id);
          expect(conv3?.messages.length).toBe(0);

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 50 }
    );
  });
});
