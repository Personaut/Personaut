/**
 * Property test for capability verification
 *
 * Feature: agent-interaction-fixes, Property 34: Capability Verification
 *
 * For any capability request from one agent to another, the system should verify
 * the target agent supports that capability before allowing the operation, and
 * should return a descriptive error if the capability is missing.
 *
 * Validates: Requirements 13.3, 13.4
 */

import * as fc from 'fast-check';
import { AgentManager, AgentManagerConfig, AgentCapability } from '../../core/agent/AgentManager';
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

describe('Property 34: Capability Verification', () => {
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
   * Generator for capability names
   */
  const capabilityNameArb = fc.string({ minLength: 1, maxLength: 30 });

  /**
   * Generator for capabilities
   */
  const capabilityArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 30 }),
    description: fc.string({ maxLength: 200 }),
    tools: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 10 }),
  });

  /**
   * Test that queryCapability returns true for registered capabilities
   * Validates: Requirements 13.3
   */
  it('should verify that agent supports registered capabilities', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        fc.array(capabilityArb, { minLength: 1, maxLength: 10 }),
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

          // Verify each registered capability returns true
          for (const capability of capabilities) {
            const hasCapability = agentManager.queryCapability(conversationId, capability.name);
            expect(hasCapability).toBe(true);
          }

          // Clean up
          await agentManager.disposeAgent(conversationId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that queryCapability returns false for non-existent capabilities
   * Validates: Requirements 13.4
   */
  it('should return false for capabilities that are not registered', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        fc.array(capabilityArb, { minLength: 1, maxLength: 5 }),
        capabilityNameArb,
        async (conversationId, mode, capabilities, nonExistentCapability) => {
          // Ensure the non-existent capability is not in the registered list
          const registeredNames = capabilities.map((c) => c.name);
          if (registeredNames.includes(nonExistentCapability)) {
            // Skip this test case if the random capability happens to match
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

          // Create agent
          await agentManager.getOrCreateAgent(conversationId, mode);

          // Register capabilities
          for (const capability of capabilities) {
            agentManager.registerCapability(conversationId, capability);
          }

          // Verify non-existent capability returns false
          const hasCapability = agentManager.queryCapability(
            conversationId,
            nonExistentCapability
          );
          expect(hasCapability).toBe(false);

          // Clean up
          await agentManager.disposeAgent(conversationId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that queryCapability returns false for non-existent agent
   * Validates: Requirements 13.4
   */
  it('should return false when querying capabilities of non-existent agent', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        capabilityNameArb,
        async (conversationId, capabilityName) => {
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

          // Query capability for non-existent agent
          const hasCapability = agentManager.queryCapability(conversationId, capabilityName);

          // Verify returns false
          expect(hasCapability).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that capability verification is case-sensitive
   * Validates: Requirements 13.3
   */
  it('should perform case-sensitive capability verification', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.toLowerCase() !== s.toUpperCase()),
        async (conversationId, mode, capabilityName) => {
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

          // Register capability with specific case
          const capability: AgentCapability = {
            name: capabilityName,
            description: 'Test capability',
            tools: ['tool1'],
          };
          agentManager.registerCapability(conversationId, capability);

          // Verify exact match returns true
          expect(agentManager.queryCapability(conversationId, capabilityName)).toBe(true);

          // Verify different case returns false
          const differentCase =
            capabilityName === capabilityName.toLowerCase()
              ? capabilityName.toUpperCase()
              : capabilityName.toLowerCase();

          if (differentCase !== capabilityName) {
            expect(agentManager.queryCapability(conversationId, differentCase)).toBe(false);
          }

          // Clean up
          await agentManager.disposeAgent(conversationId);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that multiple agents can have different capabilities
   * Validates: Requirements 13.3
   */
  it('should maintain separate capabilities for different agents', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(conversationIdArb, { minLength: 2, maxLength: 5 }).map((ids) => {
          // Ensure unique IDs
          return Array.from(new Set(ids));
        }),
        agentModeArb,
        fc.array(capabilityArb, { minLength: 1, maxLength: 5 }),
        async (conversationIds, mode, capabilities) => {
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

          // Create agents
          for (const id of conversationIds) {
            await agentManager.getOrCreateAgent(id, mode);
          }

          // Register different capabilities for each agent
          for (let i = 0; i < conversationIds.length; i++) {
            const agentCapabilities = capabilities.slice(i, i + 1);
            for (const capability of agentCapabilities) {
              agentManager.registerCapability(conversationIds[i], capability);
            }
          }

          // Verify each agent has only its own capabilities
          for (let i = 0; i < conversationIds.length; i++) {
            const agentCapabilities = capabilities.slice(i, i + 1);
            const retrievedCapabilities = agentManager.getCapabilities(conversationIds[i]);

            // Verify count
            expect(retrievedCapabilities.length).toBe(agentCapabilities.length);

            // Verify capabilities match
            for (let j = 0; j < agentCapabilities.length; j++) {
              expect(retrievedCapabilities[j].name).toBe(agentCapabilities[j].name);
            }

            // Verify this agent doesn't have other agents' capabilities
            for (let k = 0; k < conversationIds.length; k++) {
              if (k !== i && k < capabilities.length) {
                const otherCapability = capabilities[k];
                const hasOtherCapability = agentManager.queryCapability(
                  conversationIds[i],
                  otherCapability.name
                );
                // Only expect false if the capability name is different
                if (otherCapability.name !== agentCapabilities[0]?.name) {
                  expect(hasOtherCapability).toBe(false);
                }
              }
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
   * Test that capability verification works after agent reuse
   * Validates: Requirements 13.3
   */
  it('should maintain capabilities when agent is reused', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        fc.array(capabilityArb, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 2, max: 5 }),
        async (conversationId, mode, capabilities, reuseCount) => {
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

          // Reuse agent multiple times and verify capabilities persist
          for (let i = 0; i < reuseCount; i++) {
            await agentManager.getOrCreateAgent(conversationId, mode);

            // Verify all capabilities are still present
            for (const capability of capabilities) {
              const hasCapability = agentManager.queryCapability(conversationId, capability.name);
              expect(hasCapability).toBe(true);
            }
          }

          // Clean up
          await agentManager.disposeAgent(conversationId);
        }
      ),
      { numRuns: 50 }
    );
  });
});
