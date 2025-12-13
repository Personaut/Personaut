/**
 * Property test for error logging completeness
 *
 * Feature: agent-interaction-fixes, Property 27: Error Logging Completeness
 *
 * For any error that occurs, the system should log the full error stack trace
 * along with context information (conversation ID, operation type, timestamp).
 *
 * Validates: Requirements 10.5
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

describe('Property 27: Error Logging Completeness', () => {
  // Spy on console.error to capture error logs
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

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
   * Create mock ConversationManager that can fail
   */
  function createFailingConversationManager(shouldFail: boolean = true) {
    return {
      saveConversation: jest.fn().mockImplementation(() => {
        if (shouldFail) {
          throw new Error('Mock save failure');
        }
        return Promise.resolve({
          id: 'test-id',
          title: 'Test Conversation',
          timestamp: Date.now(),
          messages: [],
          lastUpdated: Date.now(),
        });
      }),
      getConversation: jest.fn().mockReturnValue(undefined),
      getConversations: jest.fn().mockReturnValue([]),
      deleteConversation: jest.fn().mockResolvedValue(true),
      loadAllConversations: jest.fn().mockResolvedValue({ successful: [], failed: [] }),
      restoreConversation: jest.fn().mockImplementation(() => {
        if (shouldFail) {
          throw new Error('Mock restore failure');
        }
        return Promise.resolve({
          id: 'test-id',
          title: 'Test Conversation',
          timestamp: Date.now(),
          messages: [],
          lastUpdated: Date.now(),
        });
      }),
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
   * Generator for error messages
   */
  const errorMessageArb = fc.string({ minLength: 5, maxLength: 100 });

  /**
   * Helper to check if error logs contain required fields
   * Handles special characters by checking object properties directly
   */
  function checkErrorLogContains(logs: any[][], requiredFields: string[]): boolean {
    return logs.some((logArgs) => {
      return requiredFields.every((field) => {
        // Check each argument
        for (const arg of logArgs) {
          if (typeof arg === 'string' && arg.includes(field)) {
            return true;
          }
          if (typeof arg === 'object' && arg !== null) {
            // Check if field is a key in the object
            if (field in arg) {
              return true;
            }
            // Check if field appears in any value
            const values = Object.values(arg);
            if (values.some(v => v === field || (typeof v === 'string' && v.includes(field)))) {
              return true;
            }
          }
        }
        return false;
      });
    });
  }

  /**
   * Helper to extract error information from logs
   */
  function extractErrorInfo(logs: any[][]): any[] {
    return logs
      .map((logArgs) => {
        // Look for AgentError JSON objects in the logs
        for (const arg of logArgs) {
          if (typeof arg === 'object' && arg !== null) {
            if (arg.type || arg.message || arg.conversationId || arg.stack) {
              return arg;
            }
          }
        }
        return null;
      })
      .filter((info) => info !== null);
  }

  /**
   * Test that save errors are logged with full context
   * Validates: Requirement 10.5
   */
  it('should log full error context when save operations fail', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, async (conversationId) => {
        // Clear previous logs
        consoleErrorSpy.mockClear();
        consoleLogSpy.mockClear();

        // Create mocks with failing save
        const mockWebview = createMockWebview();
        const mockTokenStorage = createMockTokenStorageService();
        const mockConversationManager = createFailingConversationManager(true);

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

        // Clear logs after agent creation
        consoleErrorSpy.mockClear();

        // Trigger save that will fail
        const agentManagerInstance = agentManager as any;
        await agentManagerInstance.onDidUpdateMessages(conversationId, [
          { role: 'user', content: 'test' },
        ]);

        // Get all error log calls
        const errorLogs = consoleErrorSpy.mock.calls;

        // Verify error was logged
        expect(errorLogs.length).toBeGreaterThan(0);

        // Verify error logs contain conversation ID
        const hasConversationId = checkErrorLogContains(errorLogs, [conversationId]);
        expect(hasConversationId).toBe(true);

        // Verify error logs contain error type or message
        const hasErrorInfo = checkErrorLogContains(errorLogs, ['Failed to save conversation']);
        expect(hasErrorInfo).toBe(true);

        // Extract error information
        const errorInfos = extractErrorInfo(errorLogs);
        expect(errorInfos.length).toBeGreaterThan(0);

        // Verify error info contains required fields
        const errorInfo = errorInfos[0];
        expect(errorInfo).toHaveProperty('type');
        expect(errorInfo).toHaveProperty('message');
        expect(errorInfo).toHaveProperty('conversationId');

        // Clean up
        await agentManager.disposeAgent(conversationId);
        await agentManager.dispose();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test that disposal errors are logged with full context
   * Validates: Requirement 10.5
   */
  it('should log full error context when agent disposal fails', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, agentModeArb, async (conversationId, mode) => {
        // Create mocks
        const mockWebview = createMockWebview();
        const mockTokenStorage = createMockTokenStorageService();
        const mockConversationManager = createFailingConversationManager(false);

        // Create AgentManager config
        const config: AgentManagerConfig = {
          webview: mockWebview,
          tokenStorageService: mockTokenStorage,
          conversationManager: mockConversationManager,
        };

        // Create AgentManager
        const agentManager = new AgentManager(config);

        // Create agent
        const agent = await agentManager.getOrCreateAgent(conversationId, mode);

        // Mock agent.dispose to throw an error
        jest.spyOn(agent, 'dispose').mockImplementation(() => {
          throw new Error('Mock disposal failure');
        });

        // Clear logs after agent creation
        consoleErrorSpy.mockClear();

        // Try to dispose agent (should fail and log error)
        try {
          await agentManager.disposeAgent(conversationId);
        } catch (error) {
          // Expected to throw
        }

        // Get all error log calls
        const errorLogs = consoleErrorSpy.mock.calls;

        // Verify error was logged
        expect(errorLogs.length).toBeGreaterThan(0);

        // Verify error logs contain conversation ID
        const hasConversationId = checkErrorLogContains(errorLogs, [conversationId]);
        expect(hasConversationId).toBe(true);

        // Verify error logs contain error information
        const hasErrorInfo = checkErrorLogContains(errorLogs, ['Error disposing agent']);
        expect(hasErrorInfo).toBe(true);

        // Extract error information
        const errorInfos = extractErrorInfo(errorLogs);
        expect(errorInfos.length).toBeGreaterThan(0);

        // Verify error info contains required fields
        const errorInfo = errorInfos[0];
        expect(errorInfo).toHaveProperty('type');
        expect(errorInfo).toHaveProperty('message');
        expect(errorInfo).toHaveProperty('conversationId');
        
        // Clean up
        await agentManager.dispose();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test that export errors are logged with full context
   * Validates: Requirement 10.5
   */
  it('should log full error context when conversation export fails', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, async (conversationId) => {
        // Clear previous logs
        consoleErrorSpy.mockClear();

        // Create mocks with failing restore
        const mockWebview = createMockWebview();
        const mockTokenStorage = createMockTokenStorageService();
        const mockConversationManager = createFailingConversationManager(true);

        // Create AgentManager config
        const config: AgentManagerConfig = {
          webview: mockWebview,
          tokenStorageService: mockTokenStorage,
          conversationManager: mockConversationManager,
        };

        // Create AgentManager
        const agentManager = new AgentManager(config);

        // Try to export conversation (should fail and log error)
        try {
          await agentManager.exportConversationData(conversationId);
        } catch (error) {
          // Expected to throw
        }

        // Get all error log calls
        const errorLogs = consoleErrorSpy.mock.calls;

        // Verify error was logged
        expect(errorLogs.length).toBeGreaterThan(0);

        // Verify error logs contain conversation ID
        const hasConversationId = checkErrorLogContains(errorLogs, [conversationId]);
        expect(hasConversationId).toBe(true);

        // Verify error logs contain error information
        const hasErrorInfo = checkErrorLogContains(errorLogs, [
          'Error exporting conversation data',
        ]);
        expect(hasErrorInfo).toBe(true);

        // Extract error information
        const errorInfos = extractErrorInfo(errorLogs);
        expect(errorInfos.length).toBeGreaterThan(0);

        // Verify error info contains required fields
        const errorInfo = errorInfos[0];
        expect(errorInfo).toHaveProperty('type');
        expect(errorInfo).toHaveProperty('message');
        expect(errorInfo).toHaveProperty('conversationId');
        
        // Clean up
        await agentManager.dispose();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test that all errors include stack traces
   * Validates: Requirement 10.5
   */
  it('should include stack traces in all error logs', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, errorMessageArb, async (conversationId, errorMsg) => {
        // Clear previous logs
        consoleErrorSpy.mockClear();

        // Create mocks with custom error
        const mockWebview = createMockWebview();
        const mockTokenStorage = createMockTokenStorageService();
        const mockConversationManager = {
          saveConversation: jest.fn().mockImplementation(() => {
            const error = new Error(errorMsg);
            throw error;
          }),
          getConversation: jest.fn().mockReturnValue(undefined),
          getConversations: jest.fn().mockReturnValue([]),
          deleteConversation: jest.fn().mockResolvedValue(true),
          loadAllConversations: jest.fn().mockResolvedValue({ successful: [], failed: [] }),
          restoreConversation: jest.fn().mockResolvedValue(null),
        } as any;

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

        // Clear logs after agent creation
        consoleErrorSpy.mockClear();

        // Trigger save that will fail
        const agentManagerInstance = agentManager as any;
        await agentManagerInstance.onDidUpdateMessages(conversationId, [
          { role: 'user', content: 'test' },
        ]);

        // Get all error log calls
        const errorLogs = consoleErrorSpy.mock.calls;

        // Verify error was logged
        expect(errorLogs.length).toBeGreaterThan(0);

        // Extract error information
        const errorInfos = extractErrorInfo(errorLogs);
        expect(errorInfos.length).toBeGreaterThan(0);

        // Verify error info contains stack trace
        const errorInfo = errorInfos[0];
        expect(errorInfo).toHaveProperty('stack');
        expect(typeof errorInfo.stack).toBe('string');
        expect(errorInfo.stack.length).toBeGreaterThan(0);

        // Clean up
        await agentManager.disposeAgent(conversationId);
        await agentManager.dispose();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test that errors include operation context
   * Validates: Requirement 10.5
   */
  it('should include operation context in error logs', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, async (conversationId) => {
        // Clear previous logs
        consoleErrorSpy.mockClear();

        // Create mocks with failing operations
        const mockWebview = createMockWebview();
        const mockTokenStorage = createMockTokenStorageService();
        const mockConversationManager = createFailingConversationManager(true);

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

        // Clear logs after agent creation
        consoleErrorSpy.mockClear();

        // Trigger save that will fail
        const agentManagerInstance = agentManager as any;
        await agentManagerInstance.onDidUpdateMessages(conversationId, [
          { role: 'user', content: 'test' },
        ]);

        // Get all error log calls
        const errorLogs = consoleErrorSpy.mock.calls;

        // Verify error was logged
        expect(errorLogs.length).toBeGreaterThan(0);

        // Extract error information
        const errorInfos = extractErrorInfo(errorLogs);
        expect(errorInfos.length).toBeGreaterThan(0);

        // Verify error info contains context
        const errorInfo = errorInfos[0];
        
        // Should have error type (operation context)
        expect(errorInfo).toHaveProperty('type');
        expect(typeof errorInfo.type).toBe('string');
        
        // Should have conversation ID (context)
        expect(errorInfo).toHaveProperty('conversationId');
        expect(errorInfo.conversationId).toBe(conversationId);
        
        // Should have message (error description)
        expect(errorInfo).toHaveProperty('message');
        expect(typeof errorInfo.message).toBe('string');
        expect(errorInfo.message.length).toBeGreaterThan(0);

        // Clean up
        await agentManager.disposeAgent(conversationId);
        await agentManager.dispose();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test that retry operation errors are logged with attempt information
   * Validates: Requirement 10.5
   */
  it(
    'should log retry attempts and final failure with full context',
    async () => {
      await fc.assert(
        fc.asyncProperty(errorMessageArb, async (errorMsg) => {
          // Clear previous logs
          consoleErrorSpy.mockClear();
          consoleLogSpy.mockClear();

          // Create mocks
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createFailingConversationManager(false);

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager
          const agentManager = new AgentManager(config);

          // Create a failing operation
          let attemptCount = 0;
          const failingOperation = async () => {
            attemptCount++;
            throw new Error(errorMsg);
          };

          // Try retry with backoff (should fail and log) - use minimal delays for testing
          try {
            await agentManager.retryWithBackoff(failingOperation, 3, 10, 'test-operation');
          } catch (error) {
            // Expected to throw
          }

          // Get all log calls (both console.log and console.error)
          const allLogs = [...consoleLogSpy.mock.calls, ...consoleErrorSpy.mock.calls];

          // Verify retry attempts were logged
          const hasAttemptLogs = allLogs.some((logArgs) => {
            const logString = JSON.stringify(logArgs);
            return logString.includes('Attempting operation') || logString.includes('attempt');
          });
          expect(hasAttemptLogs).toBe(true);

          // Verify final failure was logged
          const hasFailureLog = allLogs.some((logArgs) => {
            const logString = JSON.stringify(logArgs);
            return (
              logString.includes('Operation failed after all retries') ||
              logString.includes('failed after')
            );
          });
          expect(hasFailureLog).toBe(true);

          // Verify operation name was logged
          const hasOperationName = allLogs.some((logArgs) => {
            const logString = JSON.stringify(logArgs);
            return logString.includes('test-operation');
          });
          expect(hasOperationName).toBe(true);

          // Clean up
          await agentManager.dispose();
        }),
        { numRuns: 10 } // Reduced iterations for faster testing
      );
    },
    30000 // 30 second timeout
  );

  /**
   * Test that multiple concurrent errors are all logged
   * Validates: Requirement 10.5
   */
  it('should log all errors even when multiple operations fail concurrently', async () => {
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

          // Clear previous logs
          consoleErrorSpy.mockClear();

          // Create mocks with failing save
          const mockWebview = createMockWebview();
          const mockTokenStorage = createMockTokenStorageService();
          const mockConversationManager = createFailingConversationManager(true);

          // Create AgentManager config
          const config: AgentManagerConfig = {
            webview: mockWebview,
            tokenStorageService: mockTokenStorage,
            conversationManager: mockConversationManager,
          };

          // Create AgentManager
          const agentManager = new AgentManager(config);

          // Create agents
          await Promise.all(
            conversationIds.map((id) => agentManager.getOrCreateAgent(id))
          );

          // Clear logs after agent creation
          consoleErrorSpy.mockClear();

          // Trigger saves that will fail concurrently
          const agentManagerInstance = agentManager as any;
          await Promise.all(
            conversationIds.map((id) =>
              agentManagerInstance.onDidUpdateMessages(id, [
                { role: 'user', content: 'test' },
              ])
            )
          );

          // Get all error log calls
          const errorLogs = consoleErrorSpy.mock.calls;

          // Verify errors were logged for each conversation
          for (const conversationId of conversationIds) {
            const hasConversationError = checkErrorLogContains(errorLogs, [conversationId]);
            expect(hasConversationError).toBe(true);
          }

          // Verify we have at least as many error logs as conversations
          expect(errorLogs.length).toBeGreaterThanOrEqual(conversationIds.length);

          // Clean up
          await agentManager.disposeAllAgents();
          await agentManager.dispose();
        }
      ),
      { numRuns: 30 }
    );
  });
});
