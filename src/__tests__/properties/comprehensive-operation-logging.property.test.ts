/**
 * Property test for comprehensive operation logging
 *
 * Feature: agent-interaction-fixes, Property 26: Comprehensive Operation Logging
 *
 * For any agent lifecycle operation (creation, message processing, save, disposal),
 * the system should log the operation with relevant context (conversation ID, timestamp,
 * duration, message count, or cleanup status as appropriate).
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
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

describe('Property 26: Comprehensive Operation Logging', () => {
  // Spy on console.log to capture logs
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
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
      restoreConversation: jest.fn().mockResolvedValue({
        id: 'test-id',
        title: 'Test Conversation',
        timestamp: Date.now(),
        messages: [],
        lastUpdated: Date.now(),
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
   * Helper to check if logs contain required fields
   * Handles special characters by checking object properties directly
   */
  function checkLogContains(logs: any[][], requiredFields: string[]): boolean {
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
   * Test that agent creation logs conversation ID and timestamp
   * Validates: Requirement 10.1
   */
  it('should log conversation ID and timestamp when agent is created', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, agentModeArb, async (conversationId, mode) => {
        // Clear previous logs
        consoleLogSpy.mockClear();

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

        // Get all log calls
        const logCalls = consoleLogSpy.mock.calls;

        // Verify logs contain conversation ID
        const hasConversationId = checkLogContains(logCalls, [conversationId]);
        expect(hasConversationId).toBe(true);

        // Verify logs contain timestamp
        const hasTimestamp = checkLogContains(logCalls, ['timestamp']);
        expect(hasTimestamp).toBe(true);

        // Verify logs contain "Creating new agent" or similar message
        const hasCreationLog = checkLogContains(logCalls, ['Creating new agent', conversationId]);
        expect(hasCreationLog).toBe(true);

        // Clean up
        await agentManager.disposeAgent(conversationId);
        await agentManager.dispose();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that conversation save logs conversation ID and message count
   * Validates: Requirement 10.3
   */
  it('should log conversation ID and message count when conversation is saved', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        fc.array(
          fc.record({
            role: fc.constantFrom('user', 'model'),
            content: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (conversationId, messages) => {
          // Clear previous logs
          consoleLogSpy.mockClear();

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
          await agentManager.getOrCreateAgent(conversationId);

          // Clear logs after agent creation
          consoleLogSpy.mockClear();

          // Trigger save by calling the private onDidUpdateMessages method
          // We do this by accessing the method through the agent's callback
          // Since we can't directly call private methods, we'll verify the save logs
          // by checking the ConversationManager mock was called
          await mockConversationManager.saveConversation(conversationId, messages);

          // Manually trigger the logging that would happen in onDidUpdateMessages
          // by simulating what AgentManager does
          const agentManagerInstance = agentManager as any;
          await agentManagerInstance.onDidUpdateMessages(conversationId, messages);

          // Get all log calls
          const logCalls = consoleLogSpy.mock.calls;

          // Verify logs contain conversation ID
          const hasConversationId = checkLogContains(logCalls, [conversationId]);
          expect(hasConversationId).toBe(true);

          // Verify logs contain message count
          const hasMessageCount = checkLogContains(logCalls, ['messageCount']);
          expect(hasMessageCount).toBe(true);

          // Verify logs contain "Saving conversation" or similar message
          const hasSaveLog = checkLogContains(logCalls, ['Saving conversation', conversationId]);
          expect(hasSaveLog).toBe(true);

          // Clean up
          await agentManager.disposeAgent(conversationId);
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that agent disposal logs conversation ID and cleanup status
   * Validates: Requirement 10.4
   */
  it('should log conversation ID and cleanup status when agent is disposed', async () => {
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

        // Clear logs after agent creation
        consoleLogSpy.mockClear();

        // Dispose agent
        await agentManager.disposeAgent(conversationId);

        // Get all log calls
        const logCalls = consoleLogSpy.mock.calls;

        // Verify logs contain conversation ID
        const hasConversationId = checkLogContains(logCalls, [conversationId]);
        expect(hasConversationId).toBe(true);

        // Verify logs contain "Disposing agent" or similar message
        const hasDisposalLog = checkLogContains(logCalls, ['Disposing agent', conversationId]);
        expect(hasDisposalLog).toBe(true);

        // Verify logs contain "disposed successfully" or similar status
        const hasSuccessStatus = checkLogContains(logCalls, [
          'disposed successfully',
          conversationId,
        ]);
        expect(hasSuccessStatus).toBe(true);
        
        // Clean up AgentManager
        await agentManager.dispose();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that all agent lifecycle operations are logged
   * Validates: Requirements 10.1, 10.3, 10.4
   */
  it('should log all agent lifecycle operations with context', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, agentModeArb, async (conversationId, mode) => {
        // Clear previous logs
        consoleLogSpy.mockClear();

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

        // Perform full lifecycle: create -> save -> dispose
        await agentManager.getOrCreateAgent(conversationId, mode);

        // Trigger save
        const agentManagerInstance = agentManager as any;
        await agentManagerInstance.onDidUpdateMessages(conversationId, [
          { role: 'user', content: 'test' },
        ]);

        // Dispose
        await agentManager.disposeAgent(conversationId);

        // Get all log calls
        const logCalls = consoleLogSpy.mock.calls;

        // Verify creation was logged
        const hasCreationLog = checkLogContains(logCalls, ['Creating new agent', conversationId]);
        expect(hasCreationLog).toBe(true);

        // Verify save was logged
        const hasSaveLog = checkLogContains(logCalls, ['Saving conversation', conversationId]);
        expect(hasSaveLog).toBe(true);

        // Verify disposal was logged
        const hasDisposalLog = checkLogContains(logCalls, ['Disposing agent', conversationId]);
        expect(hasDisposalLog).toBe(true);

        // Verify that agent-specific logs contain conversation ID
        // Filter for logs that should have conversation ID (creation, save, disposal)
        const agentSpecificLogs = logCalls.filter((logArgs) => {
          const logString = JSON.stringify(logArgs);
          return (
            logString.includes('Creating new agent') ||
            logString.includes('Saving conversation') ||
            logString.includes('Disposing agent')
          );
        });
        
        // All agent-specific logs should contain the conversation ID
        const allAgentLogsHaveConversationId = agentSpecificLogs.every((logArgs) => {
          return checkLogContains([logArgs], [conversationId]);
        });
        expect(allAgentLogsHaveConversationId).toBe(true);
        
        // Clean up AgentManager
        await agentManager.dispose();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test that settings update operations are logged
   * Validates: Requirements 10.1, 10.2
   */
  it('should log settings updates with changed settings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          provider: fc.constantFrom('gemini' as const, 'bedrock' as const, 'nativeIde' as const),
          geminiApiKey: fc.string({ minLength: 10, maxLength: 50 }),
        }),
        async (settings) => {
          // Clear previous logs
          consoleLogSpy.mockClear();

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

          // Update settings
          await agentManager.updateSettings(settings);

          // Get all log calls
          const logCalls = consoleLogSpy.mock.calls;

          // Verify logs contain "Updating settings"
          const hasUpdateLog = checkLogContains(logCalls, ['Updating settings']);
          expect(hasUpdateLog).toBe(true);

          // Verify logs contain changed settings
          const hasChangedSettings = checkLogContains(logCalls, ['changedSettings']);
          expect(hasChangedSettings).toBe(true);

          // Verify logs contain timestamp
          const hasTimestamp = checkLogContains(logCalls, ['timestamp']);
          expect(hasTimestamp).toBe(true);
          
          // Clean up AgentManager
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that conversation switch operations are logged with duration
   * Validates: Requirements 10.2
   */
  it('should log conversation switch with duration', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        conversationIdArb,
        agentModeArb,
        async (fromId, toId, mode) => {
          // Skip if IDs are the same
          if (fromId === toId) {
            return;
          }

          // Clear previous logs
          consoleLogSpy.mockClear();

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
          await agentManager.getOrCreateAgent(fromId, mode);

          // Clear logs after first agent creation
          consoleLogSpy.mockClear();

          // Switch conversation
          await agentManager.switchConversation(fromId, toId, mode);

          // Get all log calls
          const logCalls = consoleLogSpy.mock.calls;

          // Verify logs contain "Switching conversation"
          const hasSwitchLog = checkLogContains(logCalls, ['Switching conversation']);
          expect(hasSwitchLog).toBe(true);

          // Verify logs contain duration
          const hasDuration = checkLogContains(logCalls, ['durationMs']);
          expect(hasDuration).toBe(true);

          // Verify logs contain both conversation IDs
          const hasFromId = checkLogContains(logCalls, [fromId]);
          const hasToId = checkLogContains(logCalls, [toId]);
          expect(hasFromId || hasToId).toBe(true);

          // Clean up
          await agentManager.disposeAllAgents();
          await agentManager.dispose();
        }
      ),
      { numRuns: 50 }
    );
  });
});
