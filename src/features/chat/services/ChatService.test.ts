/**
 * Unit tests for ChatService
 *
 * Tests:
 * - sendMessage method
 * - loadConversation method
 * - deleteConversation method
 * - conversation history management
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 2.1, 2.2
 */

import { ChatService } from './ChatService';
import { ConversationManager } from './ConversationManager';
import { Agent } from '../../../core/agent/Agent';
import { AgentManager } from '../../../core/agent/AgentManager';
import { Message, ContextFile } from '../../../shared/types/CommonTypes';
import { Conversation } from '../types/ChatTypes';

// Mock Agent
jest.mock('../../../core/agent/Agent');

// Mock AgentManager
jest.mock('../../../core/agent/AgentManager');

// Mock ConversationManager
jest.mock('./ConversationManager');

describe('ChatService', () => {
  let chatService: ChatService;
  let mockAgent: jest.Mocked<Agent>;
  let mockAgentManager: jest.Mocked<AgentManager>;
  let mockConversationManager: jest.Mocked<ConversationManager>;

  beforeEach(() => {
    // Create mock agent instance
    mockAgent = {
      chat: jest.fn(),
      loadHistory: jest.fn(),
      abort: jest.fn(),
      dispose: jest.fn(),
    } as any;

    // Create mock agent manager
    mockAgentManager = {
      getOrCreateAgent: jest.fn().mockResolvedValue(mockAgent),
      hasAgent: jest.fn().mockReturnValue(false),
      disposeAgent: jest.fn(),
    } as any;

    mockConversationManager = {
      restoreConversation: jest.fn(),
      getConversations: jest.fn(),
      deleteConversation: jest.fn(),
      clearAllConversations: jest.fn(),
      saveConversation: jest.fn(),
    } as any;

    chatService = new ChatService(mockAgentManager, mockConversationManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send message through agent', async () => {
      const conversationId = 'conv_123';
      const input = 'Hello, world!';
      const contextFiles: ContextFile[] = [];

      await chatService.sendMessage(conversationId, input, contextFiles);

      expect(mockAgentManager.getOrCreateAgent).toHaveBeenCalledWith(conversationId, 'chat');
      expect(mockAgent.chat).toHaveBeenCalledWith(input, contextFiles, {}, undefined, false);
    });

    it('should send message with context files', async () => {
      const conversationId = 'conv_456';
      const input = 'Analyze this file';
      const contextFiles: ContextFile[] = [{ path: '/test/file.ts', content: 'const x = 1;' }];

      await chatService.sendMessage(conversationId, input, contextFiles);

      expect(mockAgentManager.getOrCreateAgent).toHaveBeenCalledWith(conversationId, 'chat');
      expect(mockAgent.chat).toHaveBeenCalledWith(input, contextFiles, {}, undefined, false);
    });

    it('should throw error for empty input', async () => {
      await expect(chatService.sendMessage('conv_123', '', [])).rejects.toThrow('Message cannot be empty');
    });

    it('should throw error for whitespace-only input', async () => {
      await expect(chatService.sendMessage('conv_123', '   ', [])).rejects.toThrow('Message cannot be empty');
    });
  });

  describe('loadConversation', () => {
    it('should load conversation by ID', async () => {
      const mockConversation: Conversation = {
        id: 'conv_123',
        title: 'Test Conversation',
        timestamp: Date.now(),
        messages: [
          { role: 'user', text: 'Hello' },
          { role: 'model', text: 'Hi there!' },
        ],
      };

      mockConversationManager.restoreConversation.mockReturnValue(mockConversation);

      const result = await chatService.loadConversation('conv_123');

      expect(result).toEqual(mockConversation);
      expect(mockConversationManager.restoreConversation).toHaveBeenCalledWith('conv_123');
      expect(mockAgentManager.getOrCreateAgent).toHaveBeenCalledWith('conv_123', 'chat');
      expect(mockAgent.loadHistory).toHaveBeenCalledWith(mockConversation.messages);
    });

    it('should return null for non-existent conversation', async () => {
      mockConversationManager.restoreConversation.mockReturnValue(null);

      const result = await chatService.loadConversation('non_existent');

      expect(result).toBeNull();
      expect(mockAgentManager.getOrCreateAgent).not.toHaveBeenCalled();
    });
  });

  describe('getConversations', () => {
    it('should return all conversations', () => {
      const mockConversations: Conversation[] = [
        {
          id: 'conv_1',
          title: 'Conversation 1',
          timestamp: Date.now(),
          messages: [],
        },
        {
          id: 'conv_2',
          title: 'Conversation 2',
          timestamp: Date.now(),
          messages: [],
        },
      ];

      mockConversationManager.getConversations.mockReturnValue(mockConversations);

      const result = chatService.getConversations();

      expect(result).toEqual(mockConversations);
      expect(mockConversationManager.getConversations).toHaveBeenCalled();
    });

    it('should return empty array when no conversations exist', () => {
      mockConversationManager.getConversations.mockReturnValue([]);

      const result = chatService.getConversations();

      expect(result).toEqual([]);
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation successfully', async () => {
      mockAgentManager.hasAgent.mockReturnValue(true);
      mockConversationManager.deleteConversation.mockResolvedValue(true);

      const result = await chatService.deleteConversation('conv_123');

      expect(result).toBe(true);
      expect(mockAgentManager.hasAgent).toHaveBeenCalledWith('conv_123');
      expect(mockAgentManager.disposeAgent).toHaveBeenCalledWith('conv_123');
      expect(mockConversationManager.deleteConversation).toHaveBeenCalledWith('conv_123');
    });

    it('should return false when conversation not found', async () => {
      mockAgentManager.hasAgent.mockReturnValue(false);
      mockConversationManager.deleteConversation.mockResolvedValue(false);

      const result = await chatService.deleteConversation('non_existent');

      expect(result).toBe(false);
      expect(mockAgentManager.disposeAgent).not.toHaveBeenCalled();
    });
  });

  describe('clearAllConversations', () => {
    it('should clear all conversations', async () => {
      await chatService.clearAllConversations();

      expect(mockConversationManager.clearAllConversations).toHaveBeenCalled();
    });
  });

  describe('saveConversation', () => {
    it('should save conversation with messages', async () => {
      const messages: Message[] = [
        { role: 'user', text: 'Hello' },
        { role: 'model', text: 'Hi!' },
      ];

      const mockSavedConversation: Conversation = {
        id: 'conv_123',
        title: 'Hello',
        timestamp: Date.now(),
        messages,
      };

      mockConversationManager.saveConversation.mockResolvedValue(mockSavedConversation);

      const result = await chatService.saveConversation('conv_123', messages);

      expect(result).toEqual(mockSavedConversation);
      expect(mockConversationManager.saveConversation).toHaveBeenCalledWith('conv_123', messages);
    });
  });

  describe('createNewConversation', () => {
    it('should create a new conversation ID', () => {
      const id1 = chatService.createNewConversation();
      const id2 = chatService.createNewConversation();

      expect(id1).toMatch(/^conv_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^conv_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});
