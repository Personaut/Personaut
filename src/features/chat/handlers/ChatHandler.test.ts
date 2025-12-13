/**
 * Unit tests for ChatHandler
 *
 * Tests:
 * - Message routing for all chat message types
 * - Input validation
 * - Error handling
 * - Context file handling
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 2.1, 10.1, 10.2
 */

import { ChatHandler } from './ChatHandler';
import { ChatService } from '../services/ChatService';
import { InputValidator } from '../../../shared/services/InputValidator';
import { WebviewMessage, ContextFile } from '../../../shared/types/CommonTypes';
import { Conversation } from '../types/ChatTypes';

// Mock dependencies
jest.mock('../services/ChatService');
jest.mock('../../../shared/services/InputValidator');

describe('ChatHandler', () => {
  let chatHandler: ChatHandler;
  let mockChatService: jest.Mocked<ChatService>;
  let mockInputValidator: jest.Mocked<InputValidator>;
  let mockWebview: any;

  beforeEach(() => {
    // Create mock instances
    mockChatService = {
      sendMessage: jest.fn(),
      loadConversation: jest.fn(),
      getConversations: jest.fn(),
      deleteConversation: jest.fn(),
      clearAllConversations: jest.fn(),
      createNewConversation: jest.fn().mockReturnValue('test-conversation-id'),
    } as any;

    mockInputValidator = {
      validateInput: jest.fn(),
    } as any;

    mockWebview = {
      postMessage: jest.fn(),
    };

    chatHandler = new ChatHandler(mockChatService, mockInputValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle - user-input', () => {
    it('should handle valid user input', async () => {
      const message: WebviewMessage = {
        type: 'user-input',
        value: 'Hello, world!',
        contextFiles: [],
      };

      mockInputValidator.validateInput.mockReturnValue({ valid: true });

      await chatHandler.handle(message, mockWebview);

      expect(mockInputValidator.validateInput).toHaveBeenCalledWith('Hello, world!');
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        expect.any(String), // conversationId
        'Hello, world!',
        [],
        undefined,
        undefined,
        undefined
      );
    });

    it('should handle user input with context files', async () => {
      const contextFiles: ContextFile[] = [{ path: '/test/file.ts', content: 'const x = 1;' }];

      const message: WebviewMessage = {
        type: 'user-input',
        value: 'Analyze this file',
        contextFiles,
      };

      mockInputValidator.validateInput.mockReturnValue({ valid: true });

      await chatHandler.handle(message, mockWebview);

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        expect.any(String), // conversationId
        'Analyze this file',
        contextFiles,
        undefined,
        undefined,
        undefined
      );
    });

    it('should reject invalid input', async () => {
      const message: WebviewMessage = {
        type: 'user-input',
        value: '<script>alert("xss")</script>',
        contextFiles: [],
      };

      mockInputValidator.validateInput.mockReturnValue({
        valid: false,
        reason: 'Input contains potentially malicious content',
      });

      await chatHandler.handle(message, mockWebview);

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          context: 'chat',
        })
      );
    });

    it('should reject invalid context files', async () => {
      const message: WebviewMessage = {
        type: 'user-input',
        value: 'Test',
        contextFiles: [{ path: '', content: '' }],
      };

      mockInputValidator.validateInput.mockReturnValue({ valid: true });

      await chatHandler.handle(message, mockWebview);

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          context: 'chat',
        })
      );
    });
  });

  describe('handle - get-conversations', () => {
    it('should return all conversations', async () => {
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

      mockChatService.getConversations.mockReturnValue(mockConversations);

      const message: WebviewMessage = {
        type: 'get-conversations',
      };

      await chatHandler.handle(message, mockWebview);

      expect(mockChatService.getConversations).toHaveBeenCalled();
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'conversations-list',
        conversations: mockConversations,
      });
    });
  });

  describe('handle - load-conversation', () => {
    it('should load conversation by ID', async () => {
      const mockConversation: Conversation = {
        id: 'conv_123',
        title: 'Test Conversation',
        timestamp: Date.now(),
        messages: [
          { role: 'user', text: 'Hello' },
          { role: 'model', text: 'Hi!' },
        ],
      };

      mockChatService.loadConversation.mockResolvedValue(mockConversation);

      const message: WebviewMessage = {
        type: 'load-conversation',
        conversationId: 'conv_123',
      };

      await chatHandler.handle(message, mockWebview);

      expect(mockChatService.loadConversation).toHaveBeenCalledWith('conv_123');
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'conversation-loaded',
        conversation: mockConversation,
      });
    });

    it('should handle missing conversation ID', async () => {
      const message: WebviewMessage = {
        type: 'load-conversation',
      };

      await chatHandler.handle(message, mockWebview);

      expect(mockChatService.loadConversation).not.toHaveBeenCalled();
      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          context: 'chat',
        })
      );
    });

    it('should handle non-existent conversation', async () => {
      mockChatService.loadConversation.mockResolvedValue(null);

      const message: WebviewMessage = {
        type: 'load-conversation',
        conversationId: 'non_existent',
      };

      await chatHandler.handle(message, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          context: 'chat',
        })
      );
    });
  });

  describe('handle - delete-conversation', () => {
    it('should delete conversation successfully', async () => {
      mockChatService.deleteConversation.mockResolvedValue(true);

      const message: WebviewMessage = {
        type: 'delete-conversation',
        conversationId: 'conv_123',
      };

      await chatHandler.handle(message, mockWebview);

      expect(mockChatService.deleteConversation).toHaveBeenCalledWith('conv_123');
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'conversation-deleted',
        conversationId: 'conv_123',
        success: true,
      });
    });

    it('should handle missing conversation ID', async () => {
      const message: WebviewMessage = {
        type: 'delete-conversation',
      };

      await chatHandler.handle(message, mockWebview);

      expect(mockChatService.deleteConversation).not.toHaveBeenCalled();
      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          context: 'chat',
        })
      );
    });
  });

  describe('handle - clear-conversations', () => {
    it('should clear all conversations', async () => {
      const message: WebviewMessage = {
        type: 'clear-conversations',
      };

      await chatHandler.handle(message, mockWebview);

      expect(mockChatService.clearAllConversations).toHaveBeenCalled();
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'conversations-cleared',
        success: true,
      });
    });
  });

  describe('handle - new-conversation', () => {
    it('should create new conversation', async () => {
      mockChatService.createNewConversation.mockReturnValue('conv_new_123');

      const message: WebviewMessage = {
        type: 'new-conversation',
      };

      await chatHandler.handle(message, mockWebview);

      expect(mockChatService.createNewConversation).toHaveBeenCalled();
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'new-conversation-created',
        conversationId: 'conv_new_123',
      });
    });
  });

  describe('handle - get-history', () => {
    it('should return conversation history', async () => {
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

      mockChatService.getConversations.mockReturnValue(mockConversations);

      const message: WebviewMessage = {
        type: 'get-history',
      };

      await chatHandler.handle(message, mockWebview);

      expect(mockChatService.getConversations).toHaveBeenCalled();
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'history-updated',
        history: mockConversations,
      });
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      const message: WebviewMessage = {
        type: 'user-input',
        value: 'Test',
        contextFiles: [],
      };

      mockInputValidator.validateInput.mockReturnValue({ valid: true });
      mockChatService.sendMessage.mockRejectedValue(new Error('Service error'));

      await chatHandler.handle(message, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          context: 'chat',
        })
      );
    });

    it('should handle unknown message types', async () => {
      const message: WebviewMessage = {
        type: 'unknown-type',
      };

      // Should not throw, just log warning
      await expect(chatHandler.handle(message, mockWebview)).resolves.not.toThrow();
    });
  });
});
