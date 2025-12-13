"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const ChatService_1 = require("./ChatService");
// Mock Agent
jest.mock('../../../core/agent/Agent');
// Mock ConversationManager
jest.mock('./ConversationManager');
describe('ChatService', () => {
    let chatService;
    let mockAgent;
    let mockConversationManager;
    beforeEach(() => {
        // Create mock instances
        mockAgent = {
            chat: jest.fn(),
        };
        mockConversationManager = {
            restoreConversation: jest.fn(),
            getConversations: jest.fn(),
            deleteConversation: jest.fn(),
            clearAllConversations: jest.fn(),
            saveConversation: jest.fn(),
        };
        chatService = new ChatService_1.ChatService(mockAgent, mockConversationManager);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('sendMessage', () => {
        it('should send message through agent', async () => {
            const input = 'Hello, world!';
            const contextFiles = [];
            await chatService.sendMessage(input, contextFiles);
            expect(mockAgent.chat).toHaveBeenCalledWith(input, contextFiles);
        });
        it('should send message with context files', async () => {
            const input = 'Analyze this file';
            const contextFiles = [{ path: '/test/file.ts', content: 'const x = 1;' }];
            await chatService.sendMessage(input, contextFiles);
            expect(mockAgent.chat).toHaveBeenCalledWith(input, contextFiles);
        });
        it('should throw error for empty input', async () => {
            await expect(chatService.sendMessage('', [])).rejects.toThrow('Message cannot be empty');
        });
        it('should throw error for whitespace-only input', async () => {
            await expect(chatService.sendMessage('   ', [])).rejects.toThrow('Message cannot be empty');
        });
    });
    describe('loadConversation', () => {
        it('should load conversation by ID', async () => {
            const mockConversation = {
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
        });
        it('should return null for non-existent conversation', async () => {
            mockConversationManager.restoreConversation.mockReturnValue(null);
            const result = await chatService.loadConversation('non_existent');
            expect(result).toBeNull();
        });
    });
    describe('getConversations', () => {
        it('should return all conversations', () => {
            const mockConversations = [
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
            mockConversationManager.deleteConversation.mockResolvedValue(true);
            const result = await chatService.deleteConversation('conv_123');
            expect(result).toBe(true);
            expect(mockConversationManager.deleteConversation).toHaveBeenCalledWith('conv_123');
        });
        it('should return false when conversation not found', async () => {
            mockConversationManager.deleteConversation.mockResolvedValue(false);
            const result = await chatService.deleteConversation('non_existent');
            expect(result).toBe(false);
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
            const messages = [
                { role: 'user', text: 'Hello' },
                { role: 'model', text: 'Hi!' },
            ];
            const mockSavedConversation = {
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
//# sourceMappingURL=ChatService.test.js.map