/**
 * Unit tests for ConversationManager
 *
 * Tests conversation state persistence, pagination, and title generation.
 */

import { ConversationManager } from '../ConversationManager';
import { ConversationStorage, Conversation } from '../../types/ChatTypes';
import { Message } from '../../../../shared/types/CommonTypes';

// Extended storage interface for testing with preloadCache
interface TestStorage extends ConversationStorage {
    _data: Map<string, any>;
    preloadCache: jest.Mock;
}

// Mock storage implementation
function createMockStorage(): TestStorage {
    const data = new Map<string, any>();

    const storage: TestStorage = {
        _data: data,
        get: jest.fn().mockImplementation(<T>(key: string, defaultValue: T): T => {
            return data.has(key) ? data.get(key) : defaultValue;
        }),
        update: jest.fn().mockImplementation(async (key: string, value: unknown): Promise<void> => {
            data.set(key, value);
        }),
        preloadCache: jest.fn().mockResolvedValue(undefined),
    };

    return storage;
}

describe('ConversationManager', () => {
    let manager: ConversationManager;
    let mockStorage: TestStorage;

    beforeEach(() => {
        mockStorage = createMockStorage();
        manager = new ConversationManager(mockStorage);
    });

    describe('getConversations', () => {
        it('should return empty array when no conversations exist', () => {
            const result = manager.getConversations();
            expect(result).toEqual([]);
        });

        it('should return conversations from storage', () => {
            const conversations: Conversation[] = [
                {
                    id: 'conv-1',
                    title: 'Test Conversation',
                    timestamp: Date.now(),
                    messages: [],
                },
            ];
            mockStorage._data.set('conversationHistory', conversations);

            const result = manager.getConversations();
            expect(result).toEqual(conversations);
        });
    });

    describe('refreshConversations', () => {
        it('should call preloadCache if available', async () => {
            const result = await manager.refreshConversations();

            expect(mockStorage.preloadCache).toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should return conversations after refresh', async () => {
            const conversations: Conversation[] = [
                {
                    id: 'conv-1',
                    title: 'Test',
                    timestamp: Date.now(),
                    messages: [],
                },
            ];
            mockStorage._data.set('conversationHistory', conversations);

            const result = await manager.refreshConversations();
            expect(result).toEqual(conversations);
        });
    });

    describe('getConversation', () => {
        it('should return undefined for non-existent conversation', () => {
            const result = manager.getConversation('non-existent');
            expect(result).toBeUndefined();
        });

        it('should return specific conversation by ID', () => {
            const conversation: Conversation = {
                id: 'conv-1',
                title: 'Test',
                timestamp: Date.now(),
                messages: [],
            };
            mockStorage._data.set('conversationHistory', [conversation]);

            const result = manager.getConversation('conv-1');
            expect(result).toEqual(conversation);
        });
    });

    describe('saveConversation', () => {
        it('should create new conversation with messages', async () => {
            const messages: Message[] = [
                { role: 'user', text: 'Hello' },
                { role: 'model', text: 'Hi there!' },
            ];

            const result = await manager.saveConversation('new-conv', messages);

            expect(result.id).toBe('new-conv');
            expect(result.messages).toEqual(messages);
            expect(result.title).toBeTruthy();
        });

        it('should update existing conversation', async () => {
            // First save
            const initialMessages: Message[] = [{ role: 'user', text: 'Hello' }];
            await manager.saveConversation('conv-1', initialMessages);

            // Update
            const updatedMessages: Message[] = [
                { role: 'user', text: 'Hello' },
                { role: 'model', text: 'Hi!' },
            ];
            const result = await manager.saveConversation('conv-1', updatedMessages);

            expect(result.messages).toEqual(updatedMessages);
        });

        it('should trim messages if exceeding max limit', async () => {
            // Create 110 messages (exceeds MAX_MESSAGES_PER_CONVERSATION = 100)
            const messages: Message[] = Array.from({ length: 110 }, (_, i) => ({
                role: i % 2 === 0 ? 'user' as const : 'model' as const,
                text: `Message ${i}`,
            }));

            const result = await manager.saveConversation('conv-1', messages);

            // Should be trimmed to 100
            expect(result.messages.length).toBe(100);
        });
    });

    describe('deleteConversation', () => {
        it('should return false for non-existent conversation', async () => {
            const result = await manager.deleteConversation('non-existent');
            expect(result).toBe(false);
        });

        it('should delete existing conversation', async () => {
            // Add conversation
            const conversations: Conversation[] = [
                { id: 'conv-1', title: 'Test', timestamp: Date.now(), messages: [] },
            ];
            mockStorage._data.set('conversationHistory', conversations);

            const result = await manager.deleteConversation('conv-1');

            expect(result).toBe(true);
            expect(manager.getConversations().length).toBe(0);
        });
    });

    describe('restoreConversation', () => {
        it('should return null for non-existent conversation', () => {
            const result = manager.restoreConversation('non-existent');
            expect(result).toBeNull();
        });

        it('should restore existing conversation', () => {
            const conversation: Conversation = {
                id: 'conv-1',
                title: 'Test',
                timestamp: Date.now(),
                messages: [{ role: 'user', text: 'Hello' }],
            };
            mockStorage._data.set('conversationHistory', [conversation]);

            const result = manager.restoreConversation('conv-1');

            expect(result).toEqual(conversation);
        });
    });

    describe('generateTitle', () => {
        it('should return "New Conversation" for empty messages', () => {
            const result = manager.generateTitle([]);
            expect(result).toBe('New Conversation');
        });

        it('should generate title from first user message', () => {
            const messages: Message[] = [
                { role: 'user', text: 'How do I create a React component?' },
            ];

            const result = manager.generateTitle(messages);

            expect(result).toContain('React');
        });

        it('should truncate long titles', () => {
            const messages: Message[] = [
                { role: 'user', text: 'A'.repeat(100) },
            ];

            const result = manager.generateTitle(messages);

            expect(result.length).toBeLessThanOrEqual(60);
        });
    });

    describe('paginateMessages', () => {
        it('should return correct page of messages', () => {
            const messages: Message[] = Array.from({ length: 50 }, (_, i) => ({
                role: 'user' as const,
                text: `Message ${i}`,
            }));

            // Default page size is 20
            const result = manager.paginateMessages(messages, 1, 20);

            expect(result.messages.length).toBe(20);
            expect(result.page).toBe(1);
            expect(result.totalPages).toBe(3);
            expect(result.hasNextPage).toBe(true);
            expect(result.hasPreviousPage).toBe(false);
        });

        it('should handle last page correctly', () => {
            const messages: Message[] = Array.from({ length: 50 }, (_, i) => ({
                role: 'user' as const,
                text: `Message ${i}`,
            }));

            const result = manager.paginateMessages(messages, 3, 20);

            expect(result.messages.length).toBe(10); // Remaining messages
            expect(result.hasNextPage).toBe(false);
            expect(result.hasPreviousPage).toBe(true);
        });
    });

    describe('clearAllConversations', () => {
        it('should clear all conversations', async () => {
            const conversations: Conversation[] = [
                { id: 'conv-1', title: 'Test 1', timestamp: Date.now(), messages: [] },
                { id: 'conv-2', title: 'Test 2', timestamp: Date.now(), messages: [] },
            ];
            mockStorage._data.set('conversationHistory', conversations);

            await manager.clearAllConversations();

            expect(manager.getConversations()).toEqual([]);
        });
    });

    describe('validateSchema', () => {
        it('should validate correct conversation schema', () => {
            const conversation = {
                id: 'conv-1',
                title: 'Test',
                timestamp: Date.now(),
                messages: [],
            };

            // Access private method through any
            const result = (manager as any).validateSchema(conversation);
            expect(result).toBe(true);
        });

        it('should reject invalid schema', () => {
            const invalidConversation = {
                id: 123, // Should be string
                title: 'Test',
            };

            const result = (manager as any).validateSchema(invalidConversation);
            expect(result).toBe(false);
        });

        it('should reject null or undefined', () => {
            expect((manager as any).validateSchema(null)).toBe(false);
            expect((manager as any).validateSchema(undefined)).toBe(false);
        });
    });
});
