/**
 * Property test for capability discovery completeness
 *
 * Feature: agent-interaction-fixes, Property 33: Capability Discovery Completeness
 *
 * For any agent, querying its capabilities should return an accurate list of available
 * tools with descriptions that matches what was registered during agent creation.
 *
 * Validates: Requirements 13.2
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

describe('Property 33: Capability Discovery Completeness', () => {
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
   * Generator for capabilities
   */
  const capabilityArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 30 }),
    description: fc.string({ maxLength: 200 }),
    tools: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 10 }),
  });

  /**
   * Test that querying capabilities returns exactly what was registered
   * Validates: Requirements 13.2
   */
  it('should return accurate list of capabilities matching what was registered', async () => {
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

          // Query capabilities
          const retrievedCapabilities = agentManager.getCapabilities(conversationId);

          // Verify count matches
          expect(retrievedCapabilities.length).toBe(capabilities.length);

          // Verify each capability matches exactly
          for (let i = 0; i < capabilities.length; i++) {
            expect(retrievedCapabilities[i].name).toBe(capabilities[i].name);
            expect(retrievedCapabilities[i].description).toBe(capabilities[i].description);
            expect(retrievedCapabilities[i].tools).toEqual(capabilities[i].tools);
          }

          // Clean up
          await agentManager.disposeAgent(conversationId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that capabilities are preserved across multiple queries
   * Validates: Requirements 13.2
   */
  it('should return consistent capabilities across multiple queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        fc.array(capabilityArb, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 2, max: 10 }),
        async (conversationId, mode, capabilities, queryCount) => {
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

          // Query capabilities multiple times
          const results: AgentCapability[][] = [];
          for (let i = 0; i < queryCount; i++) {
            results.push(agentManager.getCapabilities(conversationId));
          }

          // Verify all queries return the same results
          for (let i = 1; i < results.length; i++) {
            expect(results[i].length).toBe(results[0].length);
            for (let j = 0; j < results[i].length; j++) {
              expect(results[i][j].name).toBe(results[0][j].name);
              expect(results[i][j].description).toBe(results[0][j].description);
              expect(results[i][j].tools).toEqual(results[0][j].tools);
            }
          }

          // Clean up
          await agentManager.disposeAgent(conversationId);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that querying non-existent agent returns empty capabilities
   * Validates: Requirements 13.2
   */
  it('should return empty array for non-existent agent', async () => {
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

        // Query capabilities for non-existent agent
        const capabilities = agentManager.getCapabilities(conversationId);

        // Verify empty array is returned
        expect(capabilities).toEqual([]);
        expect(capabilities.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that capabilities include all registered tools
   * Validates: Requirements 13.2
   */
  it('should include all tools in capability descriptions', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        fc.array(capabilityArb, { minLength: 1, maxLength: 5 }),
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

          // Query capabilities
          const retrievedCapabilities = agentManager.getCapabilities(conversationId);

          // Verify all tools are included
          for (let i = 0; i < capabilities.length; i++) {
            const originalTools = capabilities[i].tools;
            const retrievedTools = retrievedCapabilities[i].tools;

            // Verify tool count matches
            expect(retrievedTools.length).toBe(originalTools.length);

            // Verify all tools are present
            for (const tool of originalTools) {
              expect(retrievedTools).toContain(tool);
            }
          }

          // Clean up
          await agentManager.disposeAgent(conversationId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that capabilities are cleared when agent is disposed
   * Validates: Requirements 13.2
   */
  it('should clear capabilities when agent is disposed', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        agentModeArb,
        fc.array(capabilityArb, { minLength: 1, maxLength: 5 }),
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
          const beforeDisposal = agentManager.getCapabilities(conversationId);
          expect(beforeDisposal.length).toBe(capabilities.length);

          // Dispose agent
          await agentManager.disposeAgent(conversationId);

          // Verify capabilities are cleared
          const afterDisposal = agentManager.getCapabilities(conversationId);
          expect(afterDisposal).toEqual([]);
          expect(afterDisposal.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
