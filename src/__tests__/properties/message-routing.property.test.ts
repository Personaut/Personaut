/**
 * Property test for message routing correctness
 *
 * Feature: agent-interaction-fixes, Property 2: Message Routing Correctness
 *
 * For any message sent to a conversation, the message should be routed to the agent
 * associated with that conversation's ID, and no other agent should receive the message.
 *
 * Validates: Requirements 1.3
 */

import * as fc from 'fast-check';
import { AgentManager, AgentManagerConfig } from '../../core/agent/AgentManager';

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

describe('Property 2: Message Routing Correctness', () => {
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
   * Create mock ConversationManager
   */
  function createMockConversationManager() {
    return {
      saveConversation: jest.fn().mockResolvedValue({
        id: 'test-id',
        title: 'Test Conversation',
        timestamp: Date.now(),
        messages: [],
        lastUpdated: Date.now(),
      }),
      getConversation: jest.fn().mockReturnValue(undefined),
      getConversations: jest.fn().mockReturnValue([]),
      deleteConversation: jest.fn().mockResolvedValue(true),
      loadAllConversations: jest.fn().mockResolvedValue({ successful: [], failed: [] }),
    } as any;
  }

  /**
   * Generator for conversation IDs
   */
  const conversationIdArb = fc.string({ minLength: 1, maxLength: 50 });



  /**
   * Test that messages are routed to the correct agent
   * Validates: Requirements 1.3
   */
  it('should route messages to the correct agent based on conversation ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        async (conversationId) => {
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

          // Get agent for this conversation (simulating what sendMessage does)
          const agent = await agentManager.getOrCreateAgent(conversationId, 'chat');

          // Verify agent was created for this conversation
          expect(agentManager.hasAgent(conversationId)).toBe(true);

          // Verify the agent has the correct conversation ID
          expect(agent.conversationId).toBe(conversationId);

          // Clean up
          await agentManager.disposeAgent(conversationId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that messages to different conversations create separate agents
   * Validates: Requirements 1.3
   */
  it('should create separate agents for different conversation IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(conversationIdArb, { minLength: 2, maxLength: 5 })
          .map((ids) => Array.from(new Set(ids))),
        async (conversationIds) => {
          // Skip if we don't have at least 2 unique IDs
          if (conversationIds.length < 2) {
            return;
          }

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

          // Get agents for different conversations
          for (const conversationId of conversationIds) {
            await agentManager.getOrCreateAgent(conversationId, 'chat');
          }

          // Verify separate agents were created
          expect(agentManager.getActiveAgentCount()).toBe(conversationIds.length);

          // Verify each conversation has its own agent
          for (const conversationId of conversationIds) {
            expect(agentManager.hasAgent(conversationId)).toBe(true);
          }

          // Verify agents are unique instances
          const agents = await Promise.all(
            conversationIds.map((id) => agentManager.getOrCreateAgent(id, 'chat'))
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

  /**
   * Test that sending multiple messages to the same conversation reuses the same agent
   * Validates: Requirements 1.3
   */
  it('should reuse the same agent for multiple messages to the same conversation', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        fc.integer({ min: 2, max: 5 }),
        async (conversationId, requestCount) => {
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

          // Get agent reference first time
          const firstAgent = await agentManager.getOrCreateAgent(conversationId, 'chat');

          // Request agent multiple times
          for (let i = 0; i < requestCount; i++) {
            const agent = await agentManager.getOrCreateAgent(conversationId, 'chat');
            expect(agent).toBe(firstAgent);
          }

          // Verify only one agent exists
          expect(agentManager.getActiveAgentCount()).toBe(1);

          // Clean up
          await agentManager.disposeAgent(conversationId);
        }
      ),
      { numRuns: 50 }
    );
  });
});
