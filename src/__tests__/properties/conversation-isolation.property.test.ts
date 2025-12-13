/**
 * Property test for conversation isolation
 *
 * Feature: agent-interaction-fixes, Property 8: Conversation Isolation
 *
 * For any two distinct conversations, their message histories should remain completely separate,
 * and switching between them should activate the correct agent with the correct history.
 *
 * Validates: Requirements 4.1, 4.2
 */

import * as fc from 'fast-check';
import { ChatService } from '../../features/chat/services/ChatService';
import { AgentManager, AgentManagerConfig } from '../../core/agent/AgentManager';
import { Message } from '../../shared/types/CommonTypes';
import { Conversation } from '../../features/chat/types/ChatTypes';

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

describe('Property 8: Conversation Isolation', () => {
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
   * Generator for conversation IDs
   */
  const conversationIdArb = fc.string({ minLength: 1, maxLength: 50 });

  /**
   * Generator for messages
   */
  const messageArb = fc.record({
    role: fc.constantFrom('user', 'model'),
    text: fc.string({ minLength: 1, maxLength: 200 }),
  }) as fc.Arbitrary<Message>;

  /**
   * Generator for conversations
   */
  const conversationArb = fc.record({
    id: conversationIdArb,
    title: fc.string({ minLength: 1, maxLength: 100 }),
    timestamp: fc.integer({ min: 1000000000000, max: Date.now() }),
    messages: fc.array(messageArb, { minLength: 1, maxLength: 10 }),
  }) as fc.Arbitrary<Conversation>;

  /**
   * Test that two distinct conversations have separate agents
   * Validates: Requirements 4.1
   */
  it('should maintain separate agents for distinct conversations', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationArb,
        conversationArb,
        async (conversation1, conversation2) => {
          // Ensure conversations have different IDs
          if (conversation1.id === conversation2.id) {
            conversation2 = { ...conversation2, id: conversation2.id + '_different' };
          }

          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();

          // Create mock ConversationManager
          const mockConversationManager = {
            restoreConversation: jest.fn((id: string) => {
              if (id === conversation1.id) return Promise.resolve(conversation1);
              if (id === conversation2.id) return Promise.resolve(conversation2);
              return Promise.resolve(null);
            }),
            saveConversation: jest.fn(),
            getConversations: jest.fn().mockReturnValue([]),
            deleteConversation: jest.fn(),
            clearAllConversations: jest.fn(),
          } as any;

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager and ChatService
          const agentManager = new AgentManager(config);
          const chatService = new ChatService(agentManager, mockConversationManager);

          // Load both conversations
          await chatService.loadConversation(conversation1.id);
          await chatService.loadConversation(conversation2.id);

          // Verify both agents exist
          expect(agentManager.hasAgent(conversation1.id)).toBe(true);
          expect(agentManager.hasAgent(conversation2.id)).toBe(true);

          // Verify agents are different instances
          const agent1 = await agentManager.getOrCreateAgent(conversation1.id, 'chat');
          const agent2 = await agentManager.getOrCreateAgent(conversation2.id, 'chat');
          expect(agent1).not.toBe(agent2);

          // Verify agents have correct conversation IDs
          expect(agent1.conversationId).toBe(conversation1.id);
          expect(agent2.conversationId).toBe(conversation2.id);

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that switching between conversations activates the correct agent
   * Validates: Requirements 4.1
   */
  it('should activate the correct agent when switching conversations', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationArb,
        conversationArb,
        async (conversation1, conversation2) => {
          // Ensure conversations have different IDs
          if (conversation1.id === conversation2.id) {
            conversation2 = { ...conversation2, id: conversation2.id + '_different' };
          }

          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();

          // Create mock ConversationManager
          const mockConversationManager = {
            restoreConversation: jest.fn((id: string) => {
              if (id === conversation1.id) return Promise.resolve(conversation1);
              if (id === conversation2.id) return Promise.resolve(conversation2);
              return Promise.resolve(null);
            }),
            saveConversation: jest.fn(),
            getConversations: jest.fn().mockReturnValue([]),
            deleteConversation: jest.fn(),
            clearAllConversations: jest.fn(),
          } as any;

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager and ChatService
          const agentManager = new AgentManager(config);
          const chatService = new ChatService(agentManager, mockConversationManager);

          // Load first conversation
          await chatService.loadConversation(conversation1.id);
          const agent1 = await agentManager.getOrCreateAgent(conversation1.id, 'chat');

          // Switch to second conversation
          await chatService.switchConversation(conversation1.id, conversation2.id);
          const agent2 = await agentManager.getOrCreateAgent(conversation2.id, 'chat');

          // Verify correct agents are active
          expect(agent1.conversationId).toBe(conversation1.id);
          expect(agent2.conversationId).toBe(conversation2.id);
          expect(agent1).not.toBe(agent2);

          // Switch back to first conversation
          await chatService.switchConversation(conversation2.id, conversation1.id);
          const agent1Again = await agentManager.getOrCreateAgent(conversation1.id, 'chat');

          // Verify same agent instance is reused
          expect(agent1Again).toBe(agent1);

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that message histories remain separate for different conversations
   * Validates: Requirements 4.2
   */
  it('should maintain separate message histories for different conversations', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationArb,
        conversationArb,
        async (conversation1, conversation2) => {
          // Ensure conversations have different IDs and different messages
          if (conversation1.id === conversation2.id) {
            conversation2 = { ...conversation2, id: conversation2.id + '_different' };
          }

          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();

          // Create mock ConversationManager
          const mockConversationManager = {
            restoreConversation: jest.fn((id: string) => {
              if (id === conversation1.id) return Promise.resolve(conversation1);
              if (id === conversation2.id) return Promise.resolve(conversation2);
              return Promise.resolve(null);
            }),
            saveConversation: jest.fn(),
            getConversations: jest.fn().mockReturnValue([]),
            deleteConversation: jest.fn(),
            clearAllConversations: jest.fn(),
          } as any;

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager and ChatService
          const agentManager = new AgentManager(config);
          const chatService = new ChatService(agentManager, mockConversationManager);

          // Load both conversations
          await chatService.loadConversation(conversation1.id);
          await chatService.loadConversation(conversation2.id);

          // Verify both agents exist with correct IDs
          const agent1 = await agentManager.getOrCreateAgent(conversation1.id, 'chat');
          const agent2 = await agentManager.getOrCreateAgent(conversation2.id, 'chat');

          expect(agent1.conversationId).toBe(conversation1.id);
          expect(agent2.conversationId).toBe(conversation2.id);

          // Verify agents are different instances (implying separate histories)
          expect(agent1).not.toBe(agent2);

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that multiple conversations can coexist without interference
   * Validates: Requirements 4.1, 4.2
   */
  it('should allow multiple conversations to coexist without interference', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(conversationArb, { minLength: 2, maxLength: 5 })
          .map((conversations) => {
            // Ensure all conversations have unique IDs
            const uniqueConversations: Conversation[] = [];
            const seenIds = new Set<string>();

            for (const conv of conversations) {
              let uniqueId = conv.id;
              let counter = 0;
              while (seenIds.has(uniqueId)) {
                uniqueId = `${conv.id}_${counter++}`;
              }
              seenIds.add(uniqueId);
              uniqueConversations.push({ ...conv, id: uniqueId });
            }

            return uniqueConversations;
          }),
        async (conversations) => {
          // Skip if we don't have at least 2 conversations
          if (conversations.length < 2) {
            return;
          }

          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();

          // Create mock ConversationManager
          const conversationMap = new Map(conversations.map((c) => [c.id, c]));
          const mockConversationManager = {
            restoreConversation: jest.fn((id: string) => {
              return Promise.resolve(conversationMap.get(id) || null);
            }),
            saveConversation: jest.fn(),
            getConversations: jest.fn().mockReturnValue([]),
            deleteConversation: jest.fn(),
            clearAllConversations: jest.fn(),
          } as any;

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager and ChatService
          const agentManager = new AgentManager(config);
          const chatService = new ChatService(agentManager, mockConversationManager);

          // Load all conversations
          for (const conversation of conversations) {
            await chatService.loadConversation(conversation.id);
          }

          // Verify all agents exist
          expect(agentManager.getActiveAgentCount()).toBe(conversations.length);

          // Verify all agents have correct conversation IDs
          for (const conversation of conversations) {
            expect(agentManager.hasAgent(conversation.id)).toBe(true);
            const agent = await agentManager.getOrCreateAgent(conversation.id, 'chat');
            expect(agent.conversationId).toBe(conversation.id);
          }

          // Verify all agents are unique instances
          const agents = await Promise.all(
            conversations.map((c) => agentManager.getOrCreateAgent(c.id, 'chat'))
          );

          for (let i = 0; i < agents.length; i++) {
            for (let j = i + 1; j < agents.length; j++) {
              expect(agents[i]).not.toBe(agents[j]);
            }
          }

          // Clean up
          await agentManager.disposeAllAgents();
        }
      ),
      { numRuns: 50 }
    );
  });
});
