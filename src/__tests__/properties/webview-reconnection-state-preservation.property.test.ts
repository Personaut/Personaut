/**
 * Property test for webview reconnection state preservation
 *
 * Feature: agent-interaction-fixes, Property 30: Webview Reconnection State Preservation
 *
 * For any webview disconnect and reconnect cycle, agent state (message history, configuration)
 * should be preserved and restored.
 *
 * Validates: Requirements 11.4
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

describe('Property 30: Webview Reconnection State Preservation', () => {
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
   * Generator for capabilities
   */
  const capabilitiesArb = fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      description: fc.string({ maxLength: 100 }),
      tools: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
    }),
    { minLength: 0, maxLength: 5 }
  );

  /**
   * Test that webview disconnection preserves agent state
   * Validates: Requirements 11.4
   */
  it('should preserve agent state during webview disconnection', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        messagesArb,
        capabilitiesArb,
        async (conversationId, mode, messages, capabilities) => {
          // Create mocks
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
            // Create agent
            await agentManager.getOrCreateAgent(conversationId, mode);

            // Register capabilities
            for (const capability of capabilities) {
              agentManager.registerCapability(conversationId, capability);
            }

            // Preserve state
            const preservedState = await agentManager.preserveAgentState(conversationId);

            // Verify state was preserved
            expect(preservedState).not.toBeNull();
            if (preservedState) {
              expect(preservedState.conversationId).toBe(conversationId);
              expect(preservedState.mode).toBe(mode);
              expect(preservedState.messageCount).toBe(messages.length);
              expect(preservedState.capabilities.length).toBe(capabilities.length);
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
   * Test that webview reconnection restores agent state
   * Validates: Requirements 11.4
   */
  it('should restore agent state after webview reconnection', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        messagesArb,
        capabilitiesArb,
        async (conversationId, mode, messages, capabilities) => {
          // Create mocks
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
            // Create agent
            await agentManager.getOrCreateAgent(conversationId, mode);

            // Register capabilities
            for (const capability of capabilities) {
              agentManager.registerCapability(conversationId, capability);
            }

            // Preserve state
            const preservedState = await agentManager.preserveAgentState(conversationId);

            if (!preservedState) {
              return; // Skip if state couldn't be preserved
            }

            // Dispose agent (simulating disconnection)
            await agentManager.disposeAgent(conversationId);
            expect(agentManager.hasAgent(conversationId)).toBe(false);

            // Restore state (simulating reconnection)
            const restoredAgent = await agentManager.restoreAgentState(preservedState);

            // Verify agent was restored
            expect(agentManager.hasAgent(conversationId)).toBe(true);
            expect(restoredAgent).toBeDefined();
            expect(restoredAgent.mode).toBe(mode);

            // Verify capabilities were restored
            const restoredCapabilities = agentManager.getCapabilities(conversationId);
            expect(restoredCapabilities.length).toBe(capabilities.length);
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
   * Test that handleWebviewDisconnection preserves all active agents
   * Validates: Requirements 11.4
   */
  it('should preserve all active agents during webview disconnection', async () => {
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

          try {
            // Create multiple agents
            for (const id of conversationIds) {
              await agentManager.getOrCreateAgent(id, mode);
            }

            const activeAgentCount = agentManager.getActiveAgentCount();
            expect(activeAgentCount).toBe(conversationIds.length);

            // Handle disconnection
            const preservedStates = await agentManager.handleWebviewDisconnection();

            // Verify all agents were preserved
            expect(preservedStates.length).toBe(conversationIds.length);

            // Verify each preserved state
            for (const state of preservedStates) {
              expect(conversationIds).toContain(state.conversationId);
              expect(state.mode).toBe(mode);
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
   * Test that handleWebviewReconnection restores all agents
   * Validates: Requirements 11.4
   */
  it('should restore all agents after webview reconnection', async () => {
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
          const mockWebview1 = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager();

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview1,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager
          const agentManager = new AgentManager(config);

          try {
            // Create multiple agents
            for (const id of conversationIds) {
              await agentManager.getOrCreateAgent(id, mode);
            }

            // Handle disconnection
            const preservedStates = await agentManager.handleWebviewDisconnection();

            // Dispose all agents (simulating disconnection)
            await agentManager.disposeAllAgents();
            expect(agentManager.getActiveAgentCount()).toBe(0);

            // Handle reconnection with new webview
            const mockWebview2 = createMockWebview();
            await agentManager.handleWebviewReconnection(mockWebview2, preservedStates);

            // Verify all agents were restored
            expect(agentManager.getActiveAgentCount()).toBe(conversationIds.length);

            for (const id of conversationIds) {
              expect(agentManager.hasAgent(id)).toBe(true);
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
   * Test that message history is preserved through disconnect/reconnect cycle
   * Validates: Requirements 11.4
   */
  it('should preserve message history through disconnect/reconnect cycle', async () => {
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

          // Create mocks
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
            // Create agent
            await agentManager.getOrCreateAgent(conversationId, mode);

            // Preserve state
            const preservedState = await agentManager.preserveAgentState(conversationId);

            if (!preservedState) {
              return;
            }

            // Verify message count was preserved
            expect(preservedState.messageCount).toBe(messages.length);

            // Dispose agent
            await agentManager.disposeAgent(conversationId);

            // Restore state
            await agentManager.restoreAgentState(preservedState);

            // Verify conversation was restored with messages
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
   * Test that capabilities are preserved through disconnect/reconnect cycle
   * Validates: Requirements 11.4
   */
  it('should preserve capabilities through disconnect/reconnect cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        capabilitiesArb,
        async (conversationId, mode, capabilities) => {
          // Skip if no capabilities
          if (capabilities.length === 0) {
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
            // Create agent
            await agentManager.getOrCreateAgent(conversationId, mode);

            // Register capabilities
            for (const capability of capabilities) {
              agentManager.registerCapability(conversationId, capability);
            }

            // Verify capabilities are registered
            expect(agentManager.getCapabilities(conversationId).length).toBe(capabilities.length);

            // Preserve state
            const preservedState = await agentManager.preserveAgentState(conversationId);

            if (!preservedState) {
              return;
            }

            // Dispose agent
            await agentManager.disposeAgent(conversationId);
            expect(agentManager.getCapabilities(conversationId).length).toBe(0);

            // Restore state
            await agentManager.restoreAgentState(preservedState);

            // Verify capabilities were restored
            const restoredCapabilities = agentManager.getCapabilities(conversationId);
            expect(restoredCapabilities.length).toBe(capabilities.length);

            // Verify capability names match
            const originalNames = capabilities.map((c) => c.name).sort();
            const restoredNames = restoredCapabilities.map((c) => c.name).sort();
            expect(restoredNames).toEqual(originalNames);
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
   * Test that preserving non-existent agent returns null
   * Validates: Requirements 11.4
   */
  it('should return null when preserving non-existent agent', async () => {
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
          // Try to preserve non-existent agent
          const preservedState = await agentManager.preserveAgentState(conversationId);

          // Verify null is returned
          expect(preservedState).toBeNull();
        } finally {
          // Clean up
          await agentManager.dispose();
        }
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test that agent mode is preserved through disconnect/reconnect cycle
   * Validates: Requirements 11.4
   */
  it('should preserve agent mode through disconnect/reconnect cycle', async () => {
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
          // Create agent with specific mode
          const agent1 = await agentManager.getOrCreateAgent(conversationId, mode);
          expect(agent1.mode).toBe(mode);

          // Preserve state
          const preservedState = await agentManager.preserveAgentState(conversationId);

          if (!preservedState) {
            return;
          }

          expect(preservedState.mode).toBe(mode);

          // Dispose agent
          await agentManager.disposeAgent(conversationId);

          // Restore state
          const agent2 = await agentManager.restoreAgentState(preservedState);

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
});
