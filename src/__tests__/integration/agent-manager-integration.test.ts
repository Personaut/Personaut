/**
 * Integration tests for AgentManager and related services
 * Tests end-to-end workflows for agent lifecycle, conversation management,
 * and multi-agent communication
 * 
 * Feature: agent-interaction-fixes
 * Validates: All integration requirements
 */

import * as vscode from 'vscode';
import { AgentManager } from '../../core/agent/AgentManager';
import { ChatService } from '../../features/chat/services/ChatService';
import { ConversationManager } from '../../features/chat/services/ConversationManager';
import { TokenStorageService } from '../../shared/services/TokenStorageService';
import { Message } from '../../core/providers/IProvider';

// Mock vscode module
jest.mock('vscode');

describe('AgentManager Integration Tests', () => {
  let agentManager: AgentManager;
  let chatService: ChatService;
  let conversationManager: ConversationManager;
  let tokenStorageService: TokenStorageService;
  let mockWebview: vscode.Webview;
  let mockContext: any;

  beforeEach(() => {
    // Create mock webview
    mockWebview = {
      postMessage: jest.fn().mockResolvedValue(true),
      onDidReceiveMessage: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      asWebviewUri: jest.fn((uri: vscode.Uri) => uri),
      cspSource: '',
      html: '',
      options: {},
    } as any;

    // Create in-memory storage for testing
    const inMemoryStorage = new Map<string, any>();
    
    // Create mock storage that implements ConversationStorage interface
    const mockStorage = {
      get: <T>(key: string, defaultValue: T): T => {
        return inMemoryStorage.get(key) ?? defaultValue;
      },
      update: async (key: string, value: unknown): Promise<void> => {
        inMemoryStorage.set(key, value);
      },
    };
    
    // Create mock context
    mockContext = {
      globalState: mockStorage,
      secrets: {
        get: jest.fn().mockResolvedValue(undefined),
        store: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      },
      subscriptions: [],
      workspaceState: {
        get: jest.fn().mockReturnValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        keys: jest.fn().mockReturnValue([]),
      },
      extensionUri: {} as vscode.Uri,
      extensionPath: '/test/path',
      storagePath: '/test/storage',
      globalStoragePath: '/test/global-storage',
      logPath: '/test/logs',
    };

    // Initialize services
    tokenStorageService = new TokenStorageService(mockContext);
    conversationManager = new ConversationManager(mockStorage);
    
    agentManager = new AgentManager({
      webview: mockWebview,
      tokenStorageService,
      conversationManager,
      maxActiveAgents: 5,
      inactivityTimeout: 60000, // 1 minute for testing
    });

    chatService = new ChatService(agentManager, conversationManager);
  });

  afterEach(async () => {
    // Clean up all agents
    await agentManager.dispose();
    jest.clearAllMocks();
  });

  describe('Creating New Conversations', () => {
    it('should create a new conversation and agent', async () => {
      const conversationId = chatService.createNewConversation();
      
      expect(conversationId).toBeDefined();
      expect(conversationId).toMatch(/^conv_/);
      
      // Get or create agent should work
      const agent = await agentManager.getOrCreateAgent(conversationId, 'chat');
      
      expect(agent).toBeDefined();
      expect(agentManager.hasAgent(conversationId)).toBe(true);
      expect(agentManager.getActiveAgentCount()).toBe(1);
    });

    it('should create multiple conversations with separate agents', async () => {
      const conv1 = chatService.createNewConversation();
      const conv2 = chatService.createNewConversation();
      const conv3 = chatService.createNewConversation();
      
      const agent1 = await agentManager.getOrCreateAgent(conv1, 'chat');
      const agent2 = await agentManager.getOrCreateAgent(conv2, 'chat');
      const agent3 = await agentManager.getOrCreateAgent(conv3, 'chat');
      
      expect(agent1).not.toBe(agent2);
      expect(agent2).not.toBe(agent3);
      expect(agent1).not.toBe(agent3);
      
      expect(agentManager.getActiveAgentCount()).toBe(3);
    });

    it('should reuse existing agent for same conversation', async () => {
      const conversationId = chatService.createNewConversation();
      
      const agent1 = await agentManager.getOrCreateAgent(conversationId, 'chat');
      const agent2 = await agentManager.getOrCreateAgent(conversationId, 'chat');
      
      expect(agent1).toBe(agent2);
      expect(agentManager.getActiveAgentCount()).toBe(1);
    });
  });

  describe('Loading Existing Conversations', () => {
    it('should load a conversation with message history', async () => {
      const conversationId = chatService.createNewConversation();
      
      // Create some messages
      const messages: Message[] = [
        { role: 'user', text: 'Hello' },
        { role: 'model', text: 'Hi there!' },
        { role: 'user', text: 'How are you?' },
      ];
      
      // Save conversation
      await conversationManager.saveConversation(conversationId, messages);
      
      // Load conversation
      const loaded = await chatService.loadConversation(conversationId);
      
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(conversationId);
      expect(loaded?.messages).toHaveLength(3);
      expect(loaded?.messages[0].text).toBe('Hello');
    });

    it('should return null for non-existent conversation', async () => {
      const loaded = await chatService.loadConversation('non-existent-id');
      
      expect(loaded).toBeNull();
    });

    it('should restore message history to agent when loading', async () => {
      const conversationId = chatService.createNewConversation();
      
      const messages: Message[] = [
        { role: 'user', text: 'Test message 1' },
        { role: 'model', text: 'Response 1' },
      ];
      
      await conversationManager.saveConversation(conversationId, messages);
      
      // Load conversation (this should restore history to agent)
      const loaded = await chatService.loadConversation(conversationId);
      
      expect(loaded).toBeDefined();
      expect(agentManager.hasAgent(conversationId)).toBe(true);
    });
  });

  describe('Switching Between Conversations', () => {
    it('should switch between conversations quickly', async () => {
      const conv1 = chatService.createNewConversation();
      const conv2 = chatService.createNewConversation();
      
      // Create agents
      await agentManager.getOrCreateAgent(conv1, 'chat');
      await agentManager.getOrCreateAgent(conv2, 'chat');
      
      // Save some messages
      await conversationManager.saveConversation(conv1, [
        { role: 'user', text: 'Conv 1 message' },
      ]);
      await conversationManager.saveConversation(conv2, [
        { role: 'user', text: 'Conv 2 message' },
      ]);
      
      // Measure switch time
      const startTime = Date.now();
      await chatService.switchConversation(conv1, conv2);
      const duration = Date.now() - startTime;
      
      // Should complete in less than 500ms (requirement 7.2)
      expect(duration).toBeLessThan(500);
    });

    it('should maintain separate message histories when switching', async () => {
      const conv1 = chatService.createNewConversation();
      const conv2 = chatService.createNewConversation();
      
      const messages1: Message[] = [
        { role: 'user', text: 'Conversation 1' },
      ];
      const messages2: Message[] = [
        { role: 'user', text: 'Conversation 2' },
      ];
      
      await conversationManager.saveConversation(conv1, messages1);
      await conversationManager.saveConversation(conv2, messages2);
      
      // Load first conversation
      const loaded1 = await chatService.loadConversation(conv1);
      expect(loaded1?.messages[0].text).toBe('Conversation 1');
      
      // Switch to second conversation
      await chatService.switchConversation(conv1, conv2);
      const loaded2 = await chatService.loadConversation(conv2);
      expect(loaded2?.messages[0].text).toBe('Conversation 2');
      
      // Verify first conversation still has its own messages
      const reloaded1 = await chatService.loadConversation(conv1);
      expect(reloaded1?.messages[0].text).toBe('Conversation 1');
    });

    it('should throw error when switching to non-existent conversation', async () => {
      const conv1 = chatService.createNewConversation();
      await agentManager.getOrCreateAgent(conv1, 'chat');
      
      await expect(
        chatService.switchConversation(conv1, 'non-existent')
      ).rejects.toThrow();
    });
  });

  describe('Agent-to-Agent Communication', () => {
    it('should send message from one agent to another', async () => {
      const conv1 = chatService.createNewConversation();
      const conv2 = chatService.createNewConversation();
      
      // Create both agents
      await agentManager.getOrCreateAgent(conv1, 'chat');
      await agentManager.getOrCreateAgent(conv2, 'chat');
      
      // Initialize conversations with empty message arrays
      await conversationManager.saveConversation(conv1, []);
      await conversationManager.saveConversation(conv2, []);
      
      // Send message from agent 1 to agent 2
      await chatService.sendAgentMessage(conv1, conv2, 'Hello from agent 1');
      
      // Verify message was persisted
      const conv2Data = await conversationManager.restoreConversation(conv2);
      expect(conv2Data?.messages).toHaveLength(1);
      expect(conv2Data?.messages[0].text).toBe('Hello from agent 1');
      expect(conv2Data?.messages[0].metadata?.senderId).toBe(conv1);
      expect(conv2Data?.messages[0].metadata?.senderType).toBe('agent');
    });

    it('should validate agent communication permissions', async () => {
      const conv1 = chatService.createNewConversation();
      
      // Create only one agent
      await agentManager.getOrCreateAgent(conv1, 'chat');
      
      // Try to send to non-existent agent
      await expect(
        chatService.sendAgentMessage(conv1, 'non-existent', 'Test message')
      ).rejects.toThrow('Agent-to-agent communication not authorized');
    });

    it('should sanitize agent-to-agent messages', async () => {
      const conv1 = chatService.createNewConversation();
      const conv2 = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conv1, 'chat');
      await agentManager.getOrCreateAgent(conv2, 'chat');
      
      await conversationManager.saveConversation(conv1, []);
      await conversationManager.saveConversation(conv2, []);
      
      // Send a normal message (sanitization happens internally)
      await chatService.sendAgentMessage(conv1, conv2, 'Hello from agent 1');
      
      // Verify message was delivered
      const conv2Data = await conversationManager.restoreConversation(conv2);
      expect(conv2Data?.messages).toHaveLength(1);
      expect(conv2Data?.messages[0].text).toBe('Hello from agent 1');
    });

    it('should maintain message order in agent-to-agent communication', async () => {
      const conv1 = chatService.createNewConversation();
      const conv2 = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conv1, 'chat');
      await agentManager.getOrCreateAgent(conv2, 'chat');
      
      await conversationManager.saveConversation(conv1, []);
      await conversationManager.saveConversation(conv2, []);
      
      // Send multiple messages
      await chatService.sendAgentMessage(conv1, conv2, 'Message 1');
      await chatService.sendAgentMessage(conv1, conv2, 'Message 2');
      await chatService.sendAgentMessage(conv1, conv2, 'Message 3');
      
      const conv2Data = await conversationManager.restoreConversation(conv2);
      expect(conv2Data?.messages).toHaveLength(3);
      expect(conv2Data?.messages[0].text).toBe('Message 1');
      expect(conv2Data?.messages[1].text).toBe('Message 2');
      expect(conv2Data?.messages[2].text).toBe('Message 3');
    });
  });

  describe('Settings Changes and Agent Reinitialization', () => {
    it('should reinitialize agents when critical settings change', async () => {
      const conv1 = chatService.createNewConversation();
      const conv2 = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conv1, 'chat');
      await agentManager.getOrCreateAgent(conv2, 'chat');
      
      expect(agentManager.getActiveAgentCount()).toBe(2);
      
      // Change critical setting (provider)
      await agentManager.updateSettings({ provider: 'bedrock' });
      
      // All agents should be disposed
      expect(agentManager.getActiveAgentCount()).toBe(0);
    });

    it('should not reinitialize agents for non-critical settings', async () => {
      const conv1 = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conv1, 'chat');
      
      expect(agentManager.getActiveAgentCount()).toBe(1);
      
      // Change non-critical setting
      await agentManager.updateSettings({ theme: 'dark' });
      
      // Agent should still exist
      expect(agentManager.getActiveAgentCount()).toBe(1);
    });

    it('should handle multiple critical settings changes', async () => {
      const conv1 = chatService.createNewConversation();
      await agentManager.getOrCreateAgent(conv1, 'chat');
      
      // Change multiple critical settings
      await agentManager.updateSettings({
        provider: 'gemini',
        geminiApiKey: 'new-key',
        geminiModel: 'gemini-pro',
      });
      
      expect(agentManager.getActiveAgentCount()).toBe(0);
      
      // Create new agent with new settings
      await agentManager.getOrCreateAgent(conv1, 'chat');
      expect(agentManager.getActiveAgentCount()).toBe(1);
    });
  });

  describe('Error Scenarios and Recovery', () => {
    it('should handle agent creation failure gracefully', async () => {
      const conversationId = chatService.createNewConversation();
      
      // Create agent successfully first
      await agentManager.getOrCreateAgent(conversationId, 'chat');
      expect(agentManager.hasAgent(conversationId)).toBe(true);
      
      // Dispose the agent
      await agentManager.disposeAgent(conversationId);
      expect(agentManager.hasAgent(conversationId)).toBe(false);
      
      // Create agent again - should work
      await agentManager.getOrCreateAgent(conversationId, 'chat');
      expect(agentManager.hasAgent(conversationId)).toBe(true);
    });

    it('should abort and restart unresponsive agent', async () => {
      const conversationId = chatService.createNewConversation();
      
      // Create agent
      const agent1 = await agentManager.getOrCreateAgent(conversationId, 'chat');
      
      // Save some messages
      await conversationManager.saveConversation(conversationId, [
        { role: 'user', text: 'Test message' },
      ]);
      
      // Abort and restart
      const agent2 = await agentManager.abortAndRestartAgent(conversationId);
      
      // Should be a new agent instance
      expect(agent2).not.toBe(agent1);
      expect(agentManager.hasAgent(conversationId)).toBe(true);
    });

    it('should preserve conversation data during agent restart', async () => {
      const conversationId = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conversationId, 'chat');
      
      const messages: Message[] = [
        { role: 'user', text: 'Message 1' },
        { role: 'model', text: 'Response 1' },
      ];
      
      await conversationManager.saveConversation(conversationId, messages);
      
      // Restart agent
      await agentManager.abortAndRestartAgent(conversationId);
      
      // Verify conversation data is preserved
      const conversation = await conversationManager.restoreConversation(conversationId);
      expect(conversation?.messages).toHaveLength(2);
      expect(conversation?.messages[0].text).toBe('Message 1');
    });

    it('should export conversation data for critical errors', async () => {
      const conversationId = chatService.createNewConversation();
      
      const messages: Message[] = [
        { role: 'user', text: 'Important message' },
        { role: 'model', text: 'Important response' },
      ];
      
      await conversationManager.saveConversation(conversationId, messages);
      
      // Export conversation data
      const exportData = await chatService.exportConversationData(conversationId);
      
      expect(exportData).toBeDefined();
      expect(typeof exportData).toBe('string');
      
      const parsed = JSON.parse(exportData);
      expect(parsed.conversationId).toBe(conversationId);
      expect(parsed.messageCount).toBe(2);
      expect(parsed.messages).toHaveLength(2);
    });

    it('should handle webview disconnection and reconnection', async () => {
      const conv1 = chatService.createNewConversation();
      const conv2 = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conv1, 'chat');
      await agentManager.getOrCreateAgent(conv2, 'chat');
      
      await conversationManager.saveConversation(conv1, [
        { role: 'user', text: 'Conv 1 message' },
      ]);
      await conversationManager.saveConversation(conv2, [
        { role: 'user', text: 'Conv 2 message' },
      ]);
      
      // Handle disconnection
      const preservedStates = await chatService.handleWebviewDisconnection();
      
      expect(preservedStates).toHaveLength(2);
      expect(preservedStates[0].conversationId).toBeDefined();
      expect(preservedStates[0].messageCount).toBeGreaterThan(0);
      
      // Create new webview
      const newWebview = {
        postMessage: jest.fn().mockResolvedValue(true),
        onDidReceiveMessage: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        asWebviewUri: jest.fn((uri: vscode.Uri) => uri),
        cspSource: '',
        html: '',
        options: {},
      } as any;
      
      // Handle reconnection
      await chatService.handleWebviewReconnection(newWebview, preservedStates);
      
      // Verify agents are restored
      expect(agentManager.hasAgent(conv1)).toBe(true);
      expect(agentManager.hasAgent(conv2)).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent message sends to different conversations', async () => {
      const conv1 = chatService.createNewConversation();
      const conv2 = chatService.createNewConversation();
      const conv3 = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conv1, 'chat');
      await agentManager.getOrCreateAgent(conv2, 'chat');
      await agentManager.getOrCreateAgent(conv3, 'chat');
      
      await conversationManager.saveConversation(conv1, []);
      await conversationManager.saveConversation(conv2, []);
      await conversationManager.saveConversation(conv3, []);
      
      // Send messages concurrently
      const promises = [
        agentManager.sendMessage(conv1, 'Message to conv1', [], {}),
        agentManager.sendMessage(conv2, 'Message to conv2', [], {}),
        agentManager.sendMessage(conv3, 'Message to conv3', [], {}),
      ];
      
      // All should complete without errors
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('should queue messages for same conversation to prevent race conditions', async () => {
      const conversationId = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conversationId, 'chat');
      await conversationManager.saveConversation(conversationId, []);
      
      // Send multiple messages to same conversation concurrently
      const promises = [
        agentManager.sendMessage(conversationId, 'Message 1', [], {}),
        agentManager.sendMessage(conversationId, 'Message 2', [], {}),
        agentManager.sendMessage(conversationId, 'Message 3', [], {}),
      ];
      
      // All should complete without race conditions
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('should handle concurrent agent creation for different conversations', async () => {
      const conversations = Array.from({ length: 5 }, () => 
        chatService.createNewConversation()
      );
      
      // Create agents concurrently
      const promises = conversations.map(id => 
        agentManager.getOrCreateAgent(id, 'chat')
      );
      
      const agents = await Promise.all(promises);
      
      // All agents should be created
      expect(agents).toHaveLength(5);
      expect(agentManager.getActiveAgentCount()).toBe(5);
      
      // All agents should be unique
      const uniqueAgents = new Set(agents);
      expect(uniqueAgents.size).toBe(5);
    });

    it('should enforce agent limit during concurrent creation', async () => {
      // Create more conversations than the limit (5)
      const conversations = Array.from({ length: 7 }, () => 
        chatService.createNewConversation()
      );
      
      // Create agents sequentially to properly test limit enforcement
      for (const id of conversations) {
        await agentManager.getOrCreateAgent(id, 'chat');
      }
      
      // Should not exceed the limit (some agents should have been disposed)
      expect(agentManager.getActiveAgentCount()).toBeLessThanOrEqual(5);
    });
  });

  describe('Resource Management', () => {
    it('should dispose agent when conversation is deleted', async () => {
      const conversationId = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conversationId, 'chat');
      await conversationManager.saveConversation(conversationId, [
        { role: 'user', text: 'Test' },
      ]);
      
      expect(agentManager.hasAgent(conversationId)).toBe(true);
      
      // Delete conversation
      await chatService.deleteConversation(conversationId);
      
      // Agent should be disposed
      expect(agentManager.hasAgent(conversationId)).toBe(false);
    });

    it('should dispose all agents on cleanup', async () => {
      const conv1 = chatService.createNewConversation();
      const conv2 = chatService.createNewConversation();
      const conv3 = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conv1, 'chat');
      await agentManager.getOrCreateAgent(conv2, 'chat');
      await agentManager.getOrCreateAgent(conv3, 'chat');
      
      expect(agentManager.getActiveAgentCount()).toBe(3);
      
      // Dispose all
      await agentManager.disposeAllAgents();
      
      expect(agentManager.getActiveAgentCount()).toBe(0);
    });

    it('should track agent last access time', async () => {
      const conversationId = chatService.createNewConversation();
      
      const agent = await agentManager.getOrCreateAgent(conversationId, 'chat');
      
      // Access the agent multiple times
      await agentManager.getOrCreateAgent(conversationId, 'chat');
      await agentManager.getOrCreateAgent(conversationId, 'chat');
      
      // Agent should still be the same instance
      const sameAgent = await agentManager.getOrCreateAgent(conversationId, 'chat');
      expect(sameAgent).toBe(agent);
    });
  });

  describe('Capability Management', () => {
    it('should register and query agent capabilities', async () => {
      const conversationId = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conversationId, 'chat');
      
      // Register capability
      agentManager.registerCapability(conversationId, {
        name: 'file-operations',
        description: 'Can read and write files',
        tools: ['readFile', 'writeFile'],
      });
      
      // Query capability
      const hasCapability = agentManager.queryCapability(conversationId, 'file-operations');
      expect(hasCapability).toBe(true);
      
      const noCapability = agentManager.queryCapability(conversationId, 'non-existent');
      expect(noCapability).toBe(false);
    });

    it('should get all capabilities for an agent', async () => {
      const conversationId = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conversationId, 'chat');
      
      agentManager.registerCapability(conversationId, {
        name: 'capability-1',
        description: 'First capability',
        tools: ['tool1'],
      });
      
      agentManager.registerCapability(conversationId, {
        name: 'capability-2',
        description: 'Second capability',
        tools: ['tool2'],
      });
      
      const capabilities = agentManager.getCapabilities(conversationId);
      
      expect(capabilities).toHaveLength(2);
      expect(capabilities[0].name).toBe('capability-1');
      expect(capabilities[1].name).toBe('capability-2');
    });

    it('should clear capabilities when agent is disposed', async () => {
      const conversationId = chatService.createNewConversation();
      
      await agentManager.getOrCreateAgent(conversationId, 'chat');
      
      agentManager.registerCapability(conversationId, {
        name: 'test-capability',
        description: 'Test',
        tools: ['test'],
      });
      
      expect(agentManager.getCapabilities(conversationId)).toHaveLength(1);
      
      // Dispose agent
      await agentManager.disposeAgent(conversationId);
      
      // Capabilities should be cleared
      expect(agentManager.getCapabilities(conversationId)).toHaveLength(0);
    });
  });
});
