/**
 * Property test for agent instance uniqueness
 *
 * Feature: agent-interaction-fixes, Property 17: Agent Instance Uniqueness
 *
 * For any set of active conversations, each conversation should have its own unique agent
 * instance in the registry.
 *
 * Validates: Requirements 7.1
 */

import * as fc from 'fast-check';
import { AgentManager, AgentManagerConfig } from '../../core/agent/AgentManager';
import { AgentMode } from '../../core/agent/AgentTypes';

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

describe('Property 17: Agent Instance Uniqueness', () => {
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
   * Generator for agent modes
   */
  const agentModeArb = fc.constantFrom<AgentMode>('chat', 'build', 'feedback');

  /**
   * Test that each conversation has its own unique agent instance
   * Validates: Requirements 7.1
   */
  it('should maintain unique agent instances for each conversation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(conversationIdArb, { minLength: 2, maxLength: 10 }).map((ids) => {
          // Ensure unique IDs
          return Array.from(new Set(ids));
        }),
        agentModeArb,
        async (conversationIds, mode) => {
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

          // Create agents for all conversations
          const agents = new Map();
          for (const id of conversationIds) {
            const agent = await agentManager.getOrCreateAgent(id, mode);
            agents.set(id, agent);
          }

          // Verify each conversation has an agent
          expect(agentManager.getActiveAgentCount()).toBe(conversationIds.length);
          for (const id of conversationIds) {
            expect(agentManager.hasAgent(id)).toBe(true);
          }

          // Verify all agent instances are unique
          const agentInstances = Array.from(agents.values());
          const uniqueInstances = new Set(agentInstances);
          expect(uniqueInstances.size).toBe(conversationIds.length);

          // Verify each conversation ID maps to a different agent instance
          for (let i = 0; i < conversationIds.length; i++) {
            for (let j = i + 1; j < conversationIds.length; j++) {
              const agent1 = agents.get(conversationIds[i]);
              const agent2 = agents.get(conversationIds[j]);
              expect(agent1).not.toBe(agent2);
            }
          }

          // Clean up - dispose AgentManager to stop periodic cleanup
          await agentManager.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that requesting the same conversation ID returns the same agent instance
   * Validates: Requirements 7.1
   */
  it('should return the same agent instance for the same conversation ID', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, agentModeArb, async (conversationId, mode) => {
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

        // Get agent multiple times with same conversation ID
        const agent1 = await agentManager.getOrCreateAgent(conversationId, mode);
        const agent2 = await agentManager.getOrCreateAgent(conversationId, mode);
        const agent3 = await agentManager.getOrCreateAgent(conversationId, mode);

        // Verify all references point to the same instance
        expect(agent1).toBe(agent2);
        expect(agent2).toBe(agent3);
        expect(agent1).toBe(agent3);

        // Verify only one agent exists
        expect(agentManager.getActiveAgentCount()).toBe(1);

        // Clean up - dispose AgentManager to stop periodic cleanup
        await agentManager.dispose();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that different conversation IDs always get different agent instances
   * Validates: Requirements 7.1
   */
  it('should never share agent instances between different conversations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(conversationIdArb, conversationIdArb).filter(([id1, id2]) => id1 !== id2),
        agentModeArb,
        async ([conversationId1, conversationId2], mode) => {
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

          // Create agents for both conversations
          const agent1 = await agentManager.getOrCreateAgent(conversationId1, mode);
          const agent2 = await agentManager.getOrCreateAgent(conversationId2, mode);

          // Verify they are different instances
          expect(agent1).not.toBe(agent2);

          // Verify both agents exist
          expect(agentManager.hasAgent(conversationId1)).toBe(true);
          expect(agentManager.hasAgent(conversationId2)).toBe(true);
          expect(agentManager.getActiveAgentCount()).toBe(2);

          // Clean up - dispose AgentManager to stop periodic cleanup
          await agentManager.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that agent instance uniqueness is maintained across different modes
   * Validates: Requirements 7.1
   */
  it('should maintain unique instances even with different modes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(conversationIdArb, { minLength: 2, maxLength: 5 }).map((ids) => {
          return Array.from(new Set(ids));
        }),
        fc.array(agentModeArb, { minLength: 2, maxLength: 5 }),
        async (conversationIds, modes) => {
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

          // Create agents with different modes
          const agents = new Map();
          for (let i = 0; i < conversationIds.length; i++) {
            const mode = modes[i % modes.length];
            const agent = await agentManager.getOrCreateAgent(conversationIds[i], mode);
            agents.set(conversationIds[i], agent);
          }

          // Verify all agent instances are unique
          const agentInstances = Array.from(agents.values());
          const uniqueInstances = new Set(agentInstances);
          expect(uniqueInstances.size).toBe(conversationIds.length);

          // Clean up - dispose AgentManager to stop periodic cleanup
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that recreating an agent after disposal creates a new unique instance
   * Validates: Requirements 7.1
   */
  it('should create new unique instance when recreating after disposal', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, agentModeArb, async (conversationId, mode) => {
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

        // Create first agent
        const agent1 = await agentManager.getOrCreateAgent(conversationId, mode);
        expect(agentManager.hasAgent(conversationId)).toBe(true);

        // Dispose agent
        await agentManager.disposeAgent(conversationId);
        expect(agentManager.hasAgent(conversationId)).toBe(false);

        // Create second agent with same conversation ID
        const agent2 = await agentManager.getOrCreateAgent(conversationId, mode);
        expect(agentManager.hasAgent(conversationId)).toBe(true);

        // Verify it's a different instance
        expect(agent1).not.toBe(agent2);

        // Clean up - dispose AgentManager to stop periodic cleanup
        await agentManager.dispose();
      }),
      { numRuns: 100 }
    );
  });
});
