/**
 * Property test for agent cleanup
 *
 * Feature: agent-interaction-fixes, Property 12: Resource Cleanup
 *
 * For any agent that is no longer needed, calling dispose should clean up all resources
 * (MCP connections, terminal managers) and the agent should be removed from the active registry.
 *
 * Validates: Requirements 5.3
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

describe('Property 12: Resource Cleanup', () => {
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
   * Test that disposing an agent removes it from the registry
   * Validates: Requirements 5.3
   */
  it('should remove agent from registry after disposal', async () => {
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

        // Create agent
        await agentManager.getOrCreateAgent(conversationId, mode);

        // Verify agent exists
        expect(agentManager.hasAgent(conversationId)).toBe(true);
        expect(agentManager.getActiveAgentCount()).toBe(1);

        // Dispose agent
        await agentManager.disposeAgent(conversationId);

        // Verify agent is removed from registry
        expect(agentManager.hasAgent(conversationId)).toBe(false);
        expect(agentManager.getActiveAgentCount()).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that disposing a non-existent agent doesn't throw errors
   * Validates: Requirements 5.3
   */
  it('should handle disposal of non-existent agents gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, async (conversationId) => {
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

        // Try to dispose non-existent agent (should not throw)
        await expect(agentManager.disposeAgent(conversationId)).resolves.not.toThrow();

        // Verify no agents exist
        expect(agentManager.hasAgent(conversationId)).toBe(false);
        expect(agentManager.getActiveAgentCount()).toBe(0);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test that disposing all agents clears the registry
   * Validates: Requirements 5.3
   */
  it('should clear all agents from registry when disposing all', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(conversationIdArb, { minLength: 1, maxLength: 10 }).map((ids) => {
          // Ensure unique IDs
          return Array.from(new Set(ids));
        }),
        agentModeArb,
        async (conversationIds, mode) => {
          // Skip if we don't have at least 1 unique ID
          if (conversationIds.length < 1) {
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

          // Create multiple agents
          for (const id of conversationIds) {
            await agentManager.getOrCreateAgent(id, mode);
          }

          // Verify all agents exist
          expect(agentManager.getActiveAgentCount()).toBe(conversationIds.length);
          for (const id of conversationIds) {
            expect(agentManager.hasAgent(id)).toBe(true);
          }

          // Dispose all agents
          await agentManager.disposeAllAgents();

          // Verify all agents are removed
          expect(agentManager.getActiveAgentCount()).toBe(0);
          for (const id of conversationIds) {
            expect(agentManager.hasAgent(id)).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that capabilities are cleaned up when agent is disposed
   * Validates: Requirements 5.3
   */
  it('should clean up capabilities when agent is disposed', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            description: fc.string({ maxLength: 100 }),
            tools: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (conversationId, mode, capabilities) => {
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

          // Create agent
          await agentManager.getOrCreateAgent(conversationId, mode);

          // Register capabilities
          for (const capability of capabilities) {
            agentManager.registerCapability(conversationId, capability);
          }

          // Verify capabilities are registered
          expect(agentManager.getCapabilities(conversationId).length).toBe(capabilities.length);

          // Dispose agent
          await agentManager.disposeAgent(conversationId);

          // Verify capabilities are cleaned up
          expect(agentManager.getCapabilities(conversationId).length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that disposing one agent doesn't affect other agents
   * Validates: Requirements 5.3
   */
  it('should not affect other agents when disposing one agent', async () => {
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

          // Create multiple agents
          for (const id of conversationIds) {
            await agentManager.getOrCreateAgent(id, mode);
          }

          // Verify all agents exist
          const initialCount = agentManager.getActiveAgentCount();
          expect(initialCount).toBe(conversationIds.length);

          // Dispose first agent
          const disposedId = conversationIds[0];
          await agentManager.disposeAgent(disposedId);

          // Verify disposed agent is removed
          expect(agentManager.hasAgent(disposedId)).toBe(false);

          // Verify other agents still exist
          expect(agentManager.getActiveAgentCount()).toBe(initialCount - 1);
          for (let i = 1; i < conversationIds.length; i++) {
            expect(agentManager.hasAgent(conversationIds[i])).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that agent can be recreated after disposal
   * Validates: Requirements 5.3
   */
  it('should allow recreating agent after disposal', async () => {
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

        // Create agent
        const agent1 = await agentManager.getOrCreateAgent(conversationId, mode);
        expect(agentManager.hasAgent(conversationId)).toBe(true);

        // Dispose agent
        await agentManager.disposeAgent(conversationId);
        expect(agentManager.hasAgent(conversationId)).toBe(false);

        // Recreate agent
        const agent2 = await agentManager.getOrCreateAgent(conversationId, mode);
        expect(agentManager.hasAgent(conversationId)).toBe(true);

        // Verify it's a new instance
        expect(agent2).not.toBe(agent1);

        // Clean up
        await agentManager.disposeAgent(conversationId);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that disposeAllAgents can be called multiple times safely
   * Validates: Requirements 5.3
   */
  it('should handle multiple disposeAllAgents calls safely', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(conversationIdArb, { minLength: 1, maxLength: 5 }).map((ids) => {
          return Array.from(new Set(ids));
        }),
        agentModeArb,
        async (conversationIds, mode) => {
          if (conversationIds.length < 1) {
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

          // Create agents
          for (const id of conversationIds) {
            await agentManager.getOrCreateAgent(id, mode);
          }

          // Dispose all agents first time
          await agentManager.disposeAllAgents();
          expect(agentManager.getActiveAgentCount()).toBe(0);

          // Dispose all agents second time (should not throw)
          await expect(agentManager.disposeAllAgents()).resolves.not.toThrow();
          expect(agentManager.getActiveAgentCount()).toBe(0);

          // Dispose all agents third time (should not throw)
          await expect(agentManager.disposeAllAgents()).resolves.not.toThrow();
          expect(agentManager.getActiveAgentCount()).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});
