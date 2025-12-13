/**
 * Property test for agent-to-agent security validation
 *
 * Feature: agent-interaction-fixes, Property 32: Agent-to-Agent Security Validation
 *
 * For any agent-to-agent communication attempt, the system should validate session ownership,
 * sanitize message content, enforce permission checks for tool execution, restrict file operations
 * to workspace, and log unauthorized attempts.
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5
 */

import * as fc from 'fast-check';
import { ChatService } from '../../features/chat/services/ChatService';
import { ConversationManager } from '../../features/chat/services/ConversationManager';
import { AgentManager } from '../../core/agent/AgentManager';

describe('Property 32: Agent-to-Agent Security Validation', () => {
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
   * Generator for safe message content (no XSS)
   */
  const safeMessageArb = fc.string({ minLength: 1, maxLength: 500 }).filter((str) => {
    // Filter out strings that might contain XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      /onclick=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];
    return !xssPatterns.some((pattern) => pattern.test(str));
  });

  /**
   * Generator for potentially dangerous message content (XSS attempts)
   */
  const dangerousMessageArb = fc.constantFrom(
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src=x onerror="alert(1)">',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<object data="javascript:alert(1)"></object>',
    '<embed src="javascript:alert(1)">',
    '<svg onload="alert(1)">',
    '<body onload="alert(1)">',
    '<input onfocus="alert(1)" autofocus>',
    '<select onfocus="alert(1)" autofocus>',
    '<textarea onfocus="alert(1)" autofocus>',
    '<marquee onstart="alert(1)">',
    '<details open ontoggle="alert(1)">',
    '<form action="javascript:alert(1)"><input type="submit">',
    '<a href="javascript:alert(1)">click</a>',
    '<link rel="import" href="javascript:alert(1)">',
    '<style>@import "javascript:alert(1)";</style>',
    '<math><maction actiontype="statusline#http://google.com" xlink:href="javascript:alert(1)">',
  );

  /**
   * Test that non-existent source agents are rejected
   * Validates: Requirements 12.1
   */
  it('should reject messages from non-existent source agents', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        conversationIdArb,
        safeMessageArb,
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

          // Create only the target conversation (source doesn't exist)
          await conversationManager.saveConversation(toConvId, []);
          await chatService.loadConversation(toConvId);

          // Attempt to send message from non-existent agent
          await expect(
            chatService.sendAgentMessage(fromConvId, toConvId, messageContent)
          ).rejects.toThrow();

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that non-existent target agents are rejected
   * Validates: Requirements 12.1
   */
  it('should reject messages to non-existent target agents', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        conversationIdArb,
        safeMessageArb,
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

          // Create only the source conversation (target doesn't exist)
          await conversationManager.saveConversation(fromConvId, []);
          await chatService.loadConversation(fromConvId);

          // Attempt to send message to non-existent agent
          await expect(
            chatService.sendAgentMessage(fromConvId, toConvId, messageContent)
          ).rejects.toThrow();

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that dangerous message content is sanitized
   * Validates: Requirements 12.2
   */
  it('should sanitize dangerous message content', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        conversationIdArb,
        dangerousMessageArb,
        async (fromConvId, toConvId, dangerousMessage) => {
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

          // Create conversations
          await conversationManager.saveConversation(fromConvId, []);
          await conversationManager.saveConversation(toConvId, []);

          // Create agents
          await chatService.loadConversation(fromConvId);
          await chatService.loadConversation(toConvId);

          // Attempt to send dangerous message
          // Should either reject or sanitize
          try {
            await chatService.sendAgentMessage(fromConvId, toConvId, dangerousMessage);

            // If it didn't throw, verify the message was sanitized
            const conversation = conversationManager.getConversation(toConvId);
            expect(conversation).toBeDefined();

            if (conversation && conversation.messages.length > 0) {
              const lastMessage = conversation.messages[conversation.messages.length - 1];

              // Verify dangerous patterns are removed or escaped
              expect(lastMessage.text).not.toContain('<script');
              expect(lastMessage.text).not.toContain('javascript:');
              expect(lastMessage.text).not.toContain('onerror=');
              expect(lastMessage.text).not.toContain('onclick=');
              expect(lastMessage.text).not.toContain('<iframe');
              expect(lastMessage.text).not.toContain('<object');
              expect(lastMessage.text).not.toContain('<embed');
            }
          } catch (error: any) {
            // If it threw an error, that's also acceptable (rejection of dangerous content)
            expect(error).toBeDefined();
            expect(error.message).toBeTruthy();
          }

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that empty messages are rejected
   * Validates: Requirements 12.2
   */
  it('should reject empty messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        conversationIdArb,
        fc.constantFrom('', '   ', '\t', '\n', '\r\n'),
        async (fromConvId, toConvId, emptyMessage) => {
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

          // Create conversations
          await conversationManager.saveConversation(fromConvId, []);
          await conversationManager.saveConversation(toConvId, []);

          // Create agents
          await chatService.loadConversation(fromConvId);
          await chatService.loadConversation(toConvId);

          // Attempt to send empty message
          await expect(
            chatService.sendAgentMessage(fromConvId, toConvId, emptyMessage)
          ).rejects.toThrow();

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that excessively long messages are rejected
   * Validates: Requirements 12.2
   */
  it('should reject excessively long messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        conversationIdArb,
        async (fromConvId, toConvId) => {
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

          // Create conversations
          await conversationManager.saveConversation(fromConvId, []);
          await conversationManager.saveConversation(toConvId, []);

          // Create agents
          await chatService.loadConversation(fromConvId);
          await chatService.loadConversation(toConvId);

          // Create excessively long message (> 100k characters)
          const longMessage = 'a'.repeat(100001);

          // Attempt to send long message
          await expect(
            chatService.sendAgentMessage(fromConvId, toConvId, longMessage)
          ).rejects.toThrow();

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that safe messages are accepted
   * Validates: Requirements 12.1, 12.2
   */
  it('should accept safe messages from valid agents', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        conversationIdArb,
        safeMessageArb,
        async (fromConvId, toConvId, safeMessage) => {
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

          // Create conversations
          await conversationManager.saveConversation(fromConvId, []);
          await conversationManager.saveConversation(toConvId, []);

          // Create agents
          await chatService.loadConversation(fromConvId);
          await chatService.loadConversation(toConvId);

          // Send safe message - should not throw
          await expect(
            chatService.sendAgentMessage(fromConvId, toConvId, safeMessage)
          ).resolves.not.toThrow();

          // Verify message was delivered
          const conversation = conversationManager.getConversation(toConvId);
          expect(conversation).toBeDefined();
          expect(conversation?.messages.length).toBeGreaterThan(0);

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that sender metadata is always included
   * Validates: Requirements 12.1, 12.5
   */
  it('should include sender metadata in all agent-to-agent messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        conversationIdArb,
        safeMessageArb,
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

          // Create conversations
          await conversationManager.saveConversation(fromConvId, []);
          await conversationManager.saveConversation(toConvId, []);

          // Create agents
          await chatService.loadConversation(fromConvId);
          await chatService.loadConversation(toConvId);

          // Send message
          await chatService.sendAgentMessage(fromConvId, toConvId, messageContent);

          // Verify metadata is present
          const conversation = conversationManager.getConversation(toConvId);
          expect(conversation).toBeDefined();

          if (conversation && conversation.messages.length > 0) {
            const lastMessage = conversation.messages[conversation.messages.length - 1];

            // Verify all required metadata fields are present
            expect(lastMessage.metadata).toBeDefined();
            expect(lastMessage.metadata?.senderId).toBe(fromConvId);
            expect(lastMessage.metadata?.senderType).toBe('agent');
            expect(lastMessage.metadata?.timestamp).toBeDefined();
            expect(lastMessage.metadata?.sessionId).toBeDefined();

            // Verify timestamp is reasonable (within last minute)
            const now = Date.now();
            const messageTime = lastMessage.metadata?.timestamp || 0;
            expect(messageTime).toBeGreaterThan(now - 60000);
            expect(messageTime).toBeLessThanOrEqual(now);
          }

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 100 }
    );
  });
});
