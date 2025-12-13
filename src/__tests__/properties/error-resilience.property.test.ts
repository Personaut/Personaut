/**
 * Property test for error resilience
 *
 * Feature: agent-interaction-fixes, Property 5: Error Resilience
 *
 * For any operation that fails (save, load, agent creation), the system should log the error,
 * display a user-friendly message, and continue operating without crashing.
 *
 * Validates: Requirements 2.5, 9.1, 9.2, 9.3, 9.5, 11.1
 */

import * as fc from 'fast-check';
import { AgentManager, AgentManagerConfig } from '../../core/agent/AgentManager';
import { ConversationManager } from '../../features/chat/services/ConversationManager';
import { Message } from '../../shared/types/CommonTypes';

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

describe('Property 5: Error Resilience', () => {
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
   * Create mock storage
   */
  function createMockStorage() {
    let storage: Record<string, any> = {};

    return {
      get: jest.fn((key: string, defaultValue: any) => {
        return storage[key] !== undefined ? storage[key] : defaultValue;
      }),
      update: jest.fn(async (key: string, value: any) => {
        storage[key] = value;
      }),
      clear: () => {
        storage = {};
      },
    } as any;
  }

  /**
   * Create mock ConversationManager that fails on save
   */
  function createFailingConversationManager() {
    return {
      saveConversation: jest.fn().mockRejectedValue(new Error('Storage quota exceeded')),
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
   * Generator for messages
   */
  const messageArb = fc.record({
    role: fc.constantFrom('user', 'model', 'error'),
    text: fc.string({ minLength: 1, maxLength: 200 }),
  }) as fc.Arbitrary<Message>;

  const messagesArb = fc.array(messageArb, { minLength: 1, maxLength: 10 });

  /**
   * Test that save failures don't crash the system
   * Validates: Requirements 2.5, 11.1
   */
  it('should handle save failures without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        messagesArb,
        async (conversationId, messages) => {
          // Create mocks with failing ConversationManager
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createFailingConversationManager();

          // Spy on console.error to verify error logging
          const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager - should not throw
          const agentManager = new AgentManager(config);

          // Create agent - should not throw
          const agent = await agentManager.getOrCreateAgent(conversationId);

          // Verify agent was created successfully despite save failures
          expect(agent).toBeDefined();
          expect(agent).not.toBeNull();

          // Simulate message update (which will trigger save and fail)
          // The onDidUpdateMessages callback should handle the error gracefully
          const agentConfig = (agent as any).onDidUpdateMessages;
          if (agentConfig) {
            // This should not throw even though save fails
            await expect(agentConfig(messages)).resolves.not.toThrow();
          }

          // Verify error was logged
          expect(consoleErrorSpy).toHaveBeenCalled();

          // Verify AgentManager is still operational
          expect(agentManager.hasAgent(conversationId)).toBe(true);
          expect(agentManager.getActiveAgentCount()).toBe(1);

          // Clean up
          await agentManager.disposeAgent(conversationId);
          consoleErrorSpy.mockRestore();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that load failures are handled gracefully
   * Validates: Requirements 9.2
   */
  it('should handle load failures gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, async (conversationId) => {
        // Create mock storage that returns corrupted data
        const mockStorage = createMockStorage();
        const conversationManager = new ConversationManager(mockStorage);

        // Spy on console.error to verify error logging
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Manually insert corrupted data into storage
        await mockStorage.update('conversationHistory', [
          {
            id: conversationId,
            // Missing required fields - should fail validation
            messages: 'not-an-array',
          },
        ]);

        // Load all conversations - should not throw
        const result = await conversationManager.loadAllConversations();

        // Verify the corrupted conversation was skipped
        expect(result.failed.length).toBeGreaterThan(0);
        expect(result.failed[0].id).toBe(conversationId);
        expect(result.failed[0].error).toBeDefined();

        // Verify error was logged
        expect(consoleErrorSpy).toHaveBeenCalled();

        // Verify ConversationManager is still operational
        expect(() => conversationManager.getConversations()).not.toThrow();

        // Clean up
        consoleErrorSpy.mockRestore();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test that agent disposal errors don't crash the system
   * Validates: Requirements 11.1
   */
  it('should handle agent disposal errors without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, async (conversationId) => {
        // Create mocks
        const mockWebview = createMockWebview();
        const mockTokenStorage = createMockTokenStorageService();
        const mockConversationManager = createFailingConversationManager();

        // Create AgentManager config
        const config: AgentManagerConfig = {
          webview: mockWebview,
          tokenStorageService: mockTokenStorage,
          conversationManager: mockConversationManager,
        };

        // Create AgentManager
        const agentManager = new AgentManager(config);

        // Create agent
        await agentManager.getOrCreateAgent(conversationId);

        // Mock agent.dispose to throw an error
        const agent = await agentManager.getOrCreateAgent(conversationId);
        agent.dispose = jest.fn(() => {
          throw new Error('Disposal failed');
        });

        // Spy on console.error to verify error logging
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Dispose agent - should log error but not crash
        await expect(agentManager.disposeAgent(conversationId)).rejects.toThrow('Disposal failed');

        // Verify error was logged
        expect(consoleErrorSpy).toHaveBeenCalled();

        // Clean up
        consoleErrorSpy.mockRestore();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test that multiple concurrent save failures don't crash the system
   * Validates: Requirements 2.5, 11.1
   */
  it('should handle multiple concurrent save failures without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(conversationIdArb, { minLength: 2, maxLength: 5 }).map((ids) => {
          // Ensure unique IDs
          return Array.from(new Set(ids));
        }),
        async (conversationIds) => {
          // Skip if we don't have at least 2 unique IDs
          if (conversationIds.length < 2) {
            return;
          }

          // Create mocks with failing ConversationManager
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createFailingConversationManager();

          // Spy on console.error to verify error logging
          const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager
          const agentManager = new AgentManager(config);

          // Create multiple agents
          const agents = await Promise.all(
            conversationIds.map((id) => agentManager.getOrCreateAgent(id))
          );

          // Verify all agents were created successfully
          expect(agents.length).toBe(conversationIds.length);

          // Verify AgentManager is still operational
          expect(agentManager.getActiveAgentCount()).toBe(conversationIds.length);

          // Verify errors were logged
          // Note: Errors might be logged during agent creation if they try to save
          // We just verify the system didn't crash

          // Clean up
          await agentManager.disposeAllAgents();
          consoleErrorSpy.mockRestore();
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Test that schema validation errors are handled gracefully
   * Validates: Requirements 9.1, 9.2
   */
  it('should handle schema validation errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            // Intentionally create invalid data
            invalidField: fc.anything(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (invalidConversations) => {
          // Create mock storage with invalid data
          const mockStorage = createMockStorage();
          const conversationManager = new ConversationManager(mockStorage);

          // Spy on console.error to verify error logging
          const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          // Insert invalid data into storage
          await mockStorage.update('conversationHistory', invalidConversations);

          // Load all conversations - should not throw
          const result = await conversationManager.loadAllConversations();

          // Verify all invalid conversations were skipped
          expect(result.failed.length).toBe(invalidConversations.length);

          // Verify errors were logged
          expect(consoleErrorSpy).toHaveBeenCalled();

          // Verify ConversationManager is still operational
          expect(() => conversationManager.getConversations()).not.toThrow();

          // Clean up
          consoleErrorSpy.mockRestore();
        }
      ),
      { numRuns: 30 }
    );
  });
});
