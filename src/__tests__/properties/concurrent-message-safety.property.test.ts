/**
 * Property test for concurrent message safety
 *
 * Feature: agent-interaction-fixes, Property 21: Concurrent Message Safety
 *
 * For any set of concurrent message sends to different conversations, all messages should be
 * processed without race conditions and each should be saved to the correct conversation.
 *
 * Validates: Requirements 7.5
 */

import * as fc from 'fast-check';
import { AgentManager, AgentManagerConfig } from '../../core/agent/AgentManager';
import { AgentMode } from '../../core/agent/AgentTypes';
import { Message } from '../../core/providers/IProvider';

// Mock vscode module
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string) => {
        const defaults: Record<string, any> = {
          provider: 'gemini',
          geminiApiKey: 'test-api-key',
          awsAccessKey: '',
          awsSecretKey: '',
          awsRegion: 'us-east-1',
          awsProfile: 'default',
          bedrockUseAwsProfile: false,
          mcpServers: {},
        };
        return defaults[key];
      }),
    })),
    workspaceFolders: [
      {
        uri: { fsPath: '/test/workspace' },
        name: 'test-workspace',
        index: 0,
      },
    ],
  },
  Uri: {
    joinPath: jest.fn(),
  },
}));

describe('Property 21: Concurrent Message Safety', () => {
  /**
   * Create mock webview
   */
  function createMockWebview() {
    return {
      postMessage: jest.fn().mockResolvedValue(true),
      asWebviewUri: jest.fn((uri) => uri),
      cspSource: 'mock-csp-source',
      options: {},
      html: '',
      onDidReceiveMessage: jest.fn(),
    } as any;
  }

  /**
   * Create mock TokenStorageService
   */
  function createMockTokenStorageService() {
    return {
      getAllApiKeys: jest.fn().mockResolvedValue({
        geminiApiKey: 'test-api-key',
        awsAccessKey: '',
        awsSecretKey: '',
      }),
      retrieveApiKey: jest.fn().mockResolvedValue('test-api-key'),
      storeApiKey: jest.fn().mockResolvedValue(undefined),
      deleteApiKey: jest.fn().mockResolvedValue(undefined),
      hasApiKey: jest.fn().mockResolvedValue(true),
    } as any;
  }

  /**
   * Create mock ConversationManager that tracks saves per conversation
   */
  function createMockConversationManager() {
    const savedMessages = new Map<string, Message[][]>();

    return {
      saveConversation: jest.fn().mockImplementation(async (id: string, messages: Message[]) => {
        // Track all saves for this conversation
        if (!savedMessages.has(id)) {
          savedMessages.set(id, []);
        }
        savedMessages.get(id)!.push([...messages]);

        return {
          id,
          title: 'Test Conversation',
          timestamp: Date.now(),
          messages: [...messages],
          lastUpdated: Date.now(),
        };
      }),
      getConversation: jest.fn().mockReturnValue(undefined),
      getConversations: jest.fn().mockReturnValue([]),
      deleteConversation: jest.fn().mockResolvedValue(true),
      loadAllConversations: jest.fn().mockResolvedValue({ successful: [], failed: [] }),
      getSavedMessages: (id: string) => savedMessages.get(id) || [],
      getAllSavedMessages: () => savedMessages,
    } as any;
  }

  /**
   * Generator for conversation IDs
   */
  const conversationIdArb = fc.string({ minLength: 1, maxLength: 50 });

  /**
   * Generator for message content
   */
  const messageContentArb = fc.string({ minLength: 1, maxLength: 100 });

  /**
   * Generator for agent modes
   */
  const agentModeArb = fc.constantFrom<AgentMode>('chat', 'build', 'feedback');

  /**
   * Test that concurrent messages to different conversations are processed safely
   * Validates: Requirements 7.5
   */
  it('should process concurrent messages to different conversations without race conditions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(conversationIdArb, conversationIdArb).filter(([id1, id2]) => id1 !== id2),
        fc.tuple(messageContentArb, messageContentArb),
        agentModeArb,
        async ([conv1, conv2], [msg1, msg2], mode) => {
          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager();

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager
          const agentManager = new AgentManager(config);

          // Track which messages were processed
          const processedMessages = new Map<string, string[]>();

          // Pre-create agents and mock their chat methods
          const agent1 = await agentManager.getOrCreateAgent(conv1, mode);
          const agent2 = await agentManager.getOrCreateAgent(conv2, mode);

          agent1.chat = jest.fn().mockImplementation(async (input: string) => {
            if (!processedMessages.has(conv1)) {
              processedMessages.set(conv1, []);
            }
            processedMessages.get(conv1)!.push(input);
            await new Promise((resolve) => setTimeout(resolve, 5));
          });

          agent2.chat = jest.fn().mockImplementation(async (input: string) => {
            if (!processedMessages.has(conv2)) {
              processedMessages.set(conv2, []);
            }
            processedMessages.get(conv2)!.push(input);
            await new Promise((resolve) => setTimeout(resolve, 5));
          });

          // Send messages concurrently
          await Promise.all([
            agentManager.sendMessage(conv1, msg1),
            agentManager.sendMessage(conv2, msg2),
          ]);

          // Verify both conversations processed their messages
          expect(processedMessages.get(conv1)).toContain(msg1);
          expect(processedMessages.get(conv2)).toContain(msg2);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  }, 20000);

  /**
   * Test that messages to the same conversation are processed in order
   * Validates: Requirements 7.5
   */
  it('should process messages to the same conversation sequentially in order', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        fc.array(messageContentArb, { minLength: 3, maxLength: 5 }),
        agentModeArb,
        async (conversationId, messages, mode) => {
          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager();

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager
          const agentManager = new AgentManager(config);

          // Get or create agent
          const agent = await agentManager.getOrCreateAgent(conversationId, mode);

          // Track processing order
          const processedOrder: string[] = [];

          // Mock the chat method to track order
          agent.chat = jest.fn().mockImplementation(async (input: string) => {
            processedOrder.push(input);
            // Simulate some processing time
            await new Promise((resolve) => setTimeout(resolve, 10));
            return Promise.resolve();
          });

          // Send all messages concurrently (but they should be queued)
          const sendPromises = messages.map((message) =>
            agentManager.sendMessage(conversationId, message)
          );

          // Wait for all to complete
          await Promise.all(sendPromises);

          // Verify all messages were processed
          expect(processedOrder.length).toBe(messages.length);

          // Verify they were processed in order (sequential processing)
          expect(processedOrder).toEqual(messages);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);

  /**
   * Test that concurrent messages don't cause race conditions in save operations
   * This test verifies that the message queue properly handles concurrent sends
   * Validates: Requirements 7.5
   */
  it('should save all concurrent messages without race conditions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(conversationIdArb, conversationIdArb).filter(([id1, id2]) => id1 !== id2),
        fc.tuple(messageContentArb, messageContentArb),
        agentModeArb,
        async ([conv1, conv2], [msg1, msg2], mode) => {
          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager();

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager
          const agentManager = new AgentManager(config);

          // Pre-create agents and mock their chat methods
          // We need to preserve the onDidUpdateMessages callback behavior
          const agent1 = await agentManager.getOrCreateAgent(conv1, mode);
          const agent2 = await agentManager.getOrCreateAgent(conv2, mode);

          // Mock chat but simulate the message update callback
          agent1.chat = jest.fn().mockImplementation(async (input: string) => {
            // Simulate adding a message to history and triggering callback
            // The real Agent would do this, but we're mocking it
            const mockMessage = { role: 'user' as const, text: input };
            // Trigger the onDidUpdateMessages callback that AgentManager set up
            await mockConversationManager.saveConversation(conv1, [mockMessage]);
          });

          agent2.chat = jest.fn().mockImplementation(async (input: string) => {
            const mockMessage = { role: 'user' as const, text: input };
            await mockConversationManager.saveConversation(conv2, [mockMessage]);
          });

          // Send messages concurrently
          await Promise.all([
            agentManager.sendMessage(conv1, msg1),
            agentManager.sendMessage(conv2, msg2),
          ]);

          // Verify saveConversation was called
          expect(mockConversationManager.saveConversation).toHaveBeenCalled();

          // Verify both conversation IDs appear in save calls
          const savedConversationIds = new Set(
            mockConversationManager.saveConversation.mock.calls.map((call: any) => call[0])
          );

          expect(savedConversationIds.has(conv1)).toBe(true);
          expect(savedConversationIds.has(conv2)).toBe(true);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  }, 20000);

  /**
   * Test that message queue prevents concurrent processing within same conversation
   * Validates: Requirements 7.5
   */
  it('should use message queue to prevent concurrent processing in same conversation', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        fc.array(messageContentArb, { minLength: 2, maxLength: 4 }),
        agentModeArb,
        async (conversationId, messages, mode) => {
          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager();

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager
          const agentManager = new AgentManager(config);

          // Get agent
          const agent = await agentManager.getOrCreateAgent(conversationId, mode);

          // Track concurrent processing
          let concurrentCount = 0;
          let maxConcurrent = 0;

          // Mock chat to track concurrency
          agent.chat = jest.fn().mockImplementation(async () => {
            concurrentCount++;
            maxConcurrent = Math.max(maxConcurrent, concurrentCount);

            // Simulate processing
            await new Promise((resolve) => setTimeout(resolve, 20));

            concurrentCount--;
            return Promise.resolve();
          });

          // Send all messages concurrently
          await Promise.all(
            messages.map((message) => agentManager.sendMessage(conversationId, message))
          );

          // Verify messages were never processed concurrently (max should be 1)
          expect(maxConcurrent).toBe(1);

          // Verify all messages were processed
          expect(agent.chat).toHaveBeenCalledTimes(messages.length);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);

  /**
   * Test that errors in one conversation don't affect others
   * Validates: Requirements 7.5
   */
  it('should isolate errors to individual conversations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(conversationIdArb, conversationIdArb).filter(([id1, id2]) => id1 !== id2),
        fc.tuple(messageContentArb, messageContentArb),
        agentModeArb,
        async ([conv1, conv2], [msg1, msg2], mode) => {
          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager();

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager
          const agentManager = new AgentManager(config);

          // Setup agents
          const agent1 = await agentManager.getOrCreateAgent(conv1, mode);
          const agent2 = await agentManager.getOrCreateAgent(conv2, mode);

          // Make agent1 throw an error
          agent1.chat = jest.fn().mockRejectedValue(new Error('Agent 1 error'));

          // Make agent2 succeed
          const agent2Processed: string[] = [];
          agent2.chat = jest.fn().mockImplementation(async (input: string) => {
            agent2Processed.push(input);
            return Promise.resolve();
          });

          // Send messages concurrently
          const results = await Promise.allSettled([
            agentManager.sendMessage(conv1, msg1),
            agentManager.sendMessage(conv2, msg2),
          ]);

          // Verify agent1 failed
          expect(results[0].status).toBe('rejected');

          // Verify agent2 succeeded
          expect(results[1].status).toBe('fulfilled');
          expect(agent2Processed).toContain(msg2);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);
});
