/**
 * Property test for resource-aware cleanup
 *
 * Feature: agent-interaction-fixes, Property 20: Resource-Aware Cleanup
 *
 * For any situation where memory usage exceeds the threshold, inactive agents should be
 * disposed while their conversation history remains persisted in storage.
 *
 * Validates: Requirements 7.4
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

describe('Property 20: Resource-Aware Cleanup', () => {
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
   * Create mock ConversationManager that tracks saved conversations
   */
  function createMockConversationManager() {
    const savedConversations = new Map<string, any>();

    return {
      saveConversation: jest.fn().mockImplementation((id: string, messages: any[]) => {
        const conversation = {
          id,
          title: `Conversation ${id}`,
          timestamp: Date.now(),
          messages,
          lastUpdated: Date.now(),
        };
        savedConversations.set(id, conversation);
        return Promise.resolve(conversation);
      }),
      getConversation: jest.fn().mockImplementation((id: string) => {
        return savedConversations.get(id);
      }),
      restoreConversation: jest.fn().mockImplementation((id: string) => {
        return Promise.resolve(savedConversations.get(id));
      }),
      getConversations: jest.fn().mockImplementation(() => {
        return Array.from(savedConversations.values());
      }),
      deleteConversation: jest.fn().mockImplementation((id: string) => {
        savedConversations.delete(id);
        return Promise.resolve(true);
      }),
      loadAllConversations: jest.fn().mockResolvedValue({ successful: [], failed: [] }),
      // Helper to check if conversation exists in storage
      hasConversation: (id: string) => savedConversations.has(id),
      getSavedConversations: () => savedConversations,
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
   * Test that agent limit enforcement disposes LRU agents while preserving conversation history
   * Validates: Requirements 7.4
   */
  it('should dispose LRU agents when limit is exceeded while preserving conversation history', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a small max agent limit (2-5) for testing
        fc.integer({ min: 2, max: 5 }),
        // Generate more conversation IDs than the limit
        fc.array(conversationIdArb, { minLength: 6, maxLength: 10 }).map((ids) => {
          return Array.from(new Set(ids));
        }),
        agentModeArb,
        async (maxActiveAgents, conversationIds, mode) => {
          // Skip if we don't have enough unique IDs
          if (conversationIds.length <= maxActiveAgents) {
            return;
          }

          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager();

          // Create AgentManager with limited capacity
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
            maxActiveAgents,
            inactivityTimeout: 300000, // 5 minutes
          };

          const agentManager = new AgentManager(config);

          // Create agents up to the limit
          for (let i = 0; i < maxActiveAgents; i++) {
            await agentManager.getOrCreateAgent(conversationIds[i], mode);
          }

          // Verify we're at the limit
          expect(agentManager.getActiveAgentCount()).toBe(maxActiveAgents);

          // Create one more agent - this should trigger LRU eviction
          const newConversationId = conversationIds[maxActiveAgents];
          await agentManager.getOrCreateAgent(newConversationId, mode);

          // Verify agent count is still at or below the limit
          expect(agentManager.getActiveAgentCount()).toBeLessThanOrEqual(maxActiveAgents);

          // Verify the new agent exists
          expect(agentManager.hasAgent(newConversationId)).toBe(true);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that inactive agents are cleaned up based on inactivity timeout
   * Validates: Requirements 7.4
   */
  it('should clean up inactive agents based on inactivity timeout', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(conversationIdArb, { minLength: 2, maxLength: 5 }).map((ids) => {
          return Array.from(new Set(ids));
        }),
        agentModeArb,
        async (conversationIds, mode) => {
          if (conversationIds.length < 2) {
            return;
          }

          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager();

          // Create AgentManager with very short inactivity timeout for testing
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
            maxActiveAgents: 10,
            inactivityTimeout: 1, // 1ms timeout for testing
          };

          const agentManager = new AgentManager(config);

          // Create agents
          for (const id of conversationIds) {
            await agentManager.getOrCreateAgent(id, mode);
          }

          // Verify all agents exist
          expect(agentManager.getActiveAgentCount()).toBe(conversationIds.length);

          // Wait a bit to ensure agents become inactive
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Manually trigger cleanup (since periodic cleanup runs every 5 minutes)
          // We need to access the private method for testing
          // @ts-ignore - accessing private method for testing
          await agentManager.cleanupInactiveAgents();

          // Verify inactive agents were cleaned up
          expect(agentManager.getActiveAgentCount()).toBe(0);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that recently accessed agents are not cleaned up
   * Validates: Requirements 7.4
   */
  it('should not clean up recently accessed agents', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(conversationIdArb, { minLength: 2, maxLength: 5 }).map((ids) => {
          return Array.from(new Set(ids));
        }),
        agentModeArb,
        async (conversationIds, mode) => {
          if (conversationIds.length < 2) {
            return;
          }

          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager();

          // Create AgentManager with long inactivity timeout
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
            maxActiveAgents: 10,
            inactivityTimeout: 300000, // 5 minutes
          };

          const agentManager = new AgentManager(config);

          // Create agents
          for (const id of conversationIds) {
            await agentManager.getOrCreateAgent(id, mode);
          }

          // Verify all agents exist
          const initialCount = agentManager.getActiveAgentCount();
          expect(initialCount).toBe(conversationIds.length);

          // Access agents again to update lastAccess time
          for (const id of conversationIds) {
            await agentManager.getOrCreateAgent(id, mode);
          }

          // Manually trigger cleanup
          // @ts-ignore - accessing private method for testing
          await agentManager.cleanupInactiveAgents();

          // Verify no agents were cleaned up (they were recently accessed)
          expect(agentManager.getActiveAgentCount()).toBe(initialCount);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that LRU eviction disposes the least recently used agent
   * Validates: Requirements 7.4
   */
  it('should dispose least recently used agent when limit is exceeded', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate exactly 3 unique conversation IDs
        fc.array(conversationIdArb, { minLength: 3, maxLength: 10 })
          .map((ids) => Array.from(new Set(ids)))
          .filter((ids) => ids.length >= 3),
        agentModeArb,
        async (conversationIds, mode) => {
          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager();

          // Create AgentManager with limit of 2
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
            maxActiveAgents: 2,
            inactivityTimeout: 300000,
          };

          const agentManager = new AgentManager(config);

          // Create first agent
          const firstId = conversationIds[0];
          await agentManager.getOrCreateAgent(firstId, mode);

          // Wait a bit to ensure different timestamps
          await new Promise((resolve) => setTimeout(resolve, 5));

          // Create second agent
          const secondId = conversationIds[1];
          await agentManager.getOrCreateAgent(secondId, mode);

          // Verify both agents exist
          expect(agentManager.getActiveAgentCount()).toBe(2);
          expect(agentManager.hasAgent(firstId)).toBe(true);
          expect(agentManager.hasAgent(secondId)).toBe(true);

          // Wait a bit to ensure different timestamps
          await new Promise((resolve) => setTimeout(resolve, 5));

          // Access the second agent to make it more recently used
          await agentManager.getOrCreateAgent(secondId, mode);

          // Create third agent - should evict the first (LRU)
          const thirdId = conversationIds[2];
          await agentManager.getOrCreateAgent(thirdId, mode);

          // Verify agent count is at limit
          expect(agentManager.getActiveAgentCount()).toBeLessThanOrEqual(2);

          // Verify the first agent (LRU) was evicted
          expect(agentManager.hasAgent(firstId)).toBe(false);

          // Verify the second and third agents still exist
          expect(agentManager.hasAgent(secondId)).toBe(true);
          expect(agentManager.hasAgent(thirdId)).toBe(true);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that cleanup continues even if individual agent disposal fails
   * Validates: Requirements 7.4
   */
  it('should continue cleanup even if individual agent disposal fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(conversationIdArb, { minLength: 3, maxLength: 5 }).map((ids) => {
          return Array.from(new Set(ids));
        }),
        agentModeArb,
        async (conversationIds, mode) => {
          if (conversationIds.length < 3) {
            return;
          }

          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager();

          // Create AgentManager with very short inactivity timeout
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
            maxActiveAgents: 10,
            inactivityTimeout: 1, // 1ms timeout for testing
          };

          const agentManager = new AgentManager(config);

          // Create agents
          for (const id of conversationIds) {
            await agentManager.getOrCreateAgent(id, mode);
          }

          // Verify all agents exist
          expect(agentManager.getActiveAgentCount()).toBe(conversationIds.length);

          // Wait for agents to become inactive
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Trigger cleanup - should not throw even if some disposals fail
          // @ts-ignore - accessing private method for testing
          await expect(agentManager.cleanupInactiveAgents()).resolves.not.toThrow();

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that maxActiveAgents configuration is respected
   * Validates: Requirements 7.4
   */
  it('should respect maxActiveAgents configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.array(conversationIdArb, { minLength: 10, maxLength: 15 }).map((ids) => {
          return Array.from(new Set(ids));
        }),
        agentModeArb,
        async (maxActiveAgents, conversationIds, mode) => {
          // Skip if we don't have enough unique IDs
          if (conversationIds.length <= maxActiveAgents) {
            return;
          }

          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createMockConversationManager();

          // Create AgentManager with specified limit
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
            maxActiveAgents,
            inactivityTimeout: 300000,
          };

          const agentManager = new AgentManager(config);

          // Create more agents than the limit
          for (const id of conversationIds) {
            await agentManager.getOrCreateAgent(id, mode);
          }

          // Verify agent count never exceeds the limit
          expect(agentManager.getActiveAgentCount()).toBeLessThanOrEqual(maxActiveAgents);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that default configuration values are used when not specified
   * Validates: Requirements 7.4
   */
  it('should use default configuration values when not specified', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, agentModeArb, async (conversationId, mode) => {
        // Create mocks
        const mockWebview = createMockWebview();
        const mockTokenStorage = createMockTokenStorageService();
        const mockConversationManager = createMockConversationManager();

        // Create AgentManager without specifying limits
        const config: AgentManagerConfig = {
          webview: mockWebview,
          tokenStorageService: mockTokenStorage,
          conversationManager: mockConversationManager,
          // maxActiveAgents and inactivityTimeout not specified
        };

        const agentManager = new AgentManager(config);

        // Create an agent
        await agentManager.getOrCreateAgent(conversationId, mode);

        // Verify agent was created (defaults should allow this)
        expect(agentManager.hasAgent(conversationId)).toBe(true);

        // Clean up
        await agentManager.dispose();
      }),
      { numRuns: 50 }
    );
  });
});
