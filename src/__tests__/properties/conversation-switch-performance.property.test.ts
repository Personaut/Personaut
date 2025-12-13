/**
 * Property test for conversation switch performance
 *
 * Feature: agent-interaction-fixes, Property 18: Conversation Switch Performance
 *
 * For any conversation switch operation, the switch should complete in less than 500 milliseconds.
 *
 * Validates: Requirements 7.2
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

describe('Property 18: Conversation Switch Performance', () => {
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
   * Test that conversation switches complete within 500ms
   * Validates: Requirements 7.2
   */
  it('should complete conversation switch within 500ms', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(conversationIdArb, conversationIdArb).filter(([id1, id2]) => id1 !== id2),
        agentModeArb,
        async ([fromId, toId], mode) => {
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

          // Create the source agent first
          await agentManager.getOrCreateAgent(fromId, mode);

          // Measure switch time
          const startTime = Date.now();
          await agentManager.switchConversation(fromId, toId, mode);
          const duration = Date.now() - startTime;

          // Verify switch completed within 500ms
          expect(duration).toBeLessThan(500);

          // Verify both agents exist
          expect(agentManager.hasAgent(fromId)).toBe(true);
          expect(agentManager.hasAgent(toId)).toBe(true);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that switching to an existing conversation is fast (agent already created)
   * Validates: Requirements 7.2
   */
  it('should switch to existing conversation very quickly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(conversationIdArb, conversationIdArb).filter(([id1, id2]) => id1 !== id2),
        agentModeArb,
        async ([fromId, toId], mode) => {
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

          // Create both agents first
          await agentManager.getOrCreateAgent(fromId, mode);
          await agentManager.getOrCreateAgent(toId, mode);

          // Measure switch time (should be very fast since agent exists)
          const startTime = Date.now();
          await agentManager.switchConversation(fromId, toId, mode);
          const duration = Date.now() - startTime;

          // Should be much faster than 500ms when agent already exists
          expect(duration).toBeLessThan(500);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that multiple consecutive switches all complete within 500ms
   * Validates: Requirements 7.2
   */
  it('should handle multiple consecutive switches within 500ms each', async () => {
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

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager
          const agentManager = new AgentManager(config);

          // Perform multiple consecutive switches
          for (let i = 0; i < conversationIds.length - 1; i++) {
            const fromId = conversationIds[i];
            const toId = conversationIds[i + 1];

            const startTime = Date.now();
            await agentManager.switchConversation(fromId, toId, mode);
            const duration = Date.now() - startTime;

            // Each switch should complete within 500ms
            expect(duration).toBeLessThan(500);
          }

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that switching with different modes completes within 500ms
   * Validates: Requirements 7.2
   */
  it('should switch between different modes within 500ms', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(conversationIdArb, conversationIdArb).filter(([id1, id2]) => id1 !== id2),
        fc.tuple(agentModeArb, agentModeArb),
        async ([fromId, toId], [fromMode, toMode]) => {
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

          // Create source agent with fromMode
          await agentManager.getOrCreateAgent(fromId, fromMode);

          // Measure switch time to different mode
          const startTime = Date.now();
          await agentManager.switchConversation(fromId, toId, toMode);
          const duration = Date.now() - startTime;

          // Verify switch completed within 500ms
          expect(duration).toBeLessThan(500);

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that switching back and forth between two conversations is fast
   * Validates: Requirements 7.2
   */
  it('should handle rapid back-and-forth switches within 500ms each', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(conversationIdArb, conversationIdArb).filter(([id1, id2]) => id1 !== id2),
        agentModeArb,
        fc.integer({ min: 2, max: 5 }),
        async ([id1, id2], mode, switchCount) => {
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

          // Perform rapid back-and-forth switches
          for (let i = 0; i < switchCount; i++) {
            const fromId = i % 2 === 0 ? id1 : id2;
            const toId = i % 2 === 0 ? id2 : id1;

            const startTime = Date.now();
            await agentManager.switchConversation(fromId, toId, mode);
            const duration = Date.now() - startTime;

            // Each switch should complete within 500ms
            expect(duration).toBeLessThan(500);
          }

          // Clean up
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  });
});
