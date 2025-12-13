/**
 * Property test for agent recovery
 *
 * Feature: agent-interaction-fixes, Property 29: Agent Recovery
 *
 * For any unresponsive agent, the system should provide abort functionality that terminates
 * the agent and allows creation of a new agent for that conversation.
 *
 * Validates: Requirements 11.3
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

describe('Property 29: Agent Recovery', () => {
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
   * Create mock ConversationManager with message history
   */
  function createMockConversationManager(messages: Message[] = []) {
    return {
      saveConversation: jest.fn().mockResolvedValue({
        id: 'test-id',
        title: 'Test Conversation',
        timestamp: Date.now(),
        messages: messages,
        lastUpdated: Date.now(),
      }),
      restoreConversation: jest.fn().mockResolvedValue({
        id: 'test-id',
        title: 'Test Conversation',
        timestamp: Date.now(),
        messages: messages,
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
   * Generator for message arrays
   */
  const messagesArb = fc.array(
    fc.record({
      role: fc.constantFrom<'user' | 'model' | 'error'>('user', 'model'),
      text: fc.string({ minLength: 1, maxLength: 200 }),
    }) as fc.Arbitrary<Message>,
    { minLength: 0, maxLength: 10 }
  );

  /**
   * Test that aborting and restarting an agent creates a new agent instance
   * Validates: Requirements 11.3
   */
  it('should create new agent instance after abort and restart', async () => {
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

        try {
          // Create initial agent
          const agent1 = await agentManager.getOrCreateAgent(conversationId, mode);
          expect(agentManager.hasAgent(conversationId)).toBe(true);

          // Abort and restart agent
          const agent2 = await agentManager.abortAndRestartAgent(conversationId);

          // Verify new agent was created
          expect(agentManager.hasAgent(conversationId)).toBe(true);
          expect(agent2).not.toBe(agent1);
        } finally {
          // Clean up
          await agentManager.dispose();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that abort and restart preserves conversation history
   * Validates: Requirements 11.3
   */
  it('should preserve conversation history after abort and restart', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        messagesArb,
        async (conversationId, mode, messages) => {
          // Skip if no messages
          if (messages.length === 0) {
            return;
          }

          // Create mocks with message history
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager(messages);

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager
          const agentManager = new AgentManager(config);

          try {
            // Create initial agent
            await agentManager.getOrCreateAgent(conversationId, mode);

            // Abort and restart agent
            await agentManager.abortAndRestartAgent(conversationId);

            // Verify conversation was restored
            expect(mockConversationManager.restoreConversation).toHaveBeenCalledWith(conversationId);
          } finally {
            // Clean up
            await agentManager.dispose();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that abort and restart works for non-existent agents
   * Validates: Requirements 11.3
   */
  it('should handle abort and restart for non-existent agents', async () => {
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

        try {
          // Abort and restart non-existent agent (should create new agent)
          const agent = await agentManager.abortAndRestartAgent(conversationId);

          // Verify agent was created
          expect(agentManager.hasAgent(conversationId)).toBe(true);
          expect(agent).toBeDefined();
        } finally {
          // Clean up
          await agentManager.dispose();
        }
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test that abort and restart cleans up old agent resources
   * Validates: Requirements 11.3
   */
  it('should clean up old agent resources after abort and restart', async () => {
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

        try {
          // Create initial agent
          await agentManager.getOrCreateAgent(conversationId, mode);
          expect(agentManager.getActiveAgentCount()).toBe(1);

          // Abort and restart agent
          await agentManager.abortAndRestartAgent(conversationId);

          // Verify only one agent exists (old one was cleaned up)
          expect(agentManager.getActiveAgentCount()).toBe(1);
          expect(agentManager.hasAgent(conversationId)).toBe(true);
        } finally {
          // Clean up
          await agentManager.dispose();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that multiple abort and restart operations work correctly
   * Validates: Requirements 11.3
   */
  it('should handle multiple abort and restart operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        fc.integer({ min: 2, max: 5 }),
        async (conversationId, mode, restartCount) => {
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

          try {
            // Create initial agent
            let previousAgent = await agentManager.getOrCreateAgent(conversationId, mode);

            // Perform multiple restart operations
            for (let i = 0; i < restartCount; i++) {
              const newAgent = await agentManager.abortAndRestartAgent(conversationId);

              // Verify new agent is different from previous
              expect(newAgent).not.toBe(previousAgent);
              expect(agentManager.hasAgent(conversationId)).toBe(true);
              expect(agentManager.getActiveAgentCount()).toBe(1);

              previousAgent = newAgent;
            }
          } finally {
            // Clean up
            await agentManager.dispose();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that abort and restart maintains agent mode
   * Validates: Requirements 11.3
   */
  it('should maintain agent mode after abort and restart', async () => {
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

        try {
          // Create initial agent with specific mode
          const agent1 = await agentManager.getOrCreateAgent(conversationId, mode);
          expect(agent1.mode).toBe(mode);

          // Abort and restart agent
          const agent2 = await agentManager.abortAndRestartAgent(conversationId);

          // Verify mode is preserved
          expect(agent2.mode).toBe(mode);
        } finally {
          // Clean up
          await agentManager.dispose();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that abort and restart doesn't affect other agents
   * Validates: Requirements 11.3
   */
  it('should not affect other agents when restarting one agent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(conversationIdArb, { minLength: 2, maxLength: 5 }).map((ids) => {
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

          try {
            // Create multiple agents
            const agents = new Map();
            for (const id of conversationIds) {
              const agent = await agentManager.getOrCreateAgent(id, mode);
              agents.set(id, agent);
            }

            const initialCount = agentManager.getActiveAgentCount();
            expect(initialCount).toBe(conversationIds.length);

            // Restart first agent
            const restartedId = conversationIds[0];
            const newAgent = await agentManager.abortAndRestartAgent(restartedId);

            // Verify restarted agent is different
            expect(newAgent).not.toBe(agents.get(restartedId));

            // Verify other agents still exist and are unchanged
            expect(agentManager.getActiveAgentCount()).toBe(initialCount);
            for (let i = 1; i < conversationIds.length; i++) {
              expect(agentManager.hasAgent(conversationIds[i])).toBe(true);
            }
          } finally {
            // Clean up
            await agentManager.dispose();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
