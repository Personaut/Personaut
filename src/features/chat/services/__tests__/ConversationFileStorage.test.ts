/**
 * Unit tests for ConversationFileStorage
 * 
 * Tests file-based conversation storage with 90%+ coverage target.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConversationFileStorage, createConversationFileStorage } from '../ConversationFileStorage';
import { FileStorageService } from '../../../../shared/services/FileStorageService';
import { Conversation } from '../../types/ChatTypes';

describe('ConversationFileStorage', () => {
    let storage: ConversationFileStorage;
    let fileStorage: FileStorageService;
    let tempDir: string;

    const createTestConversation = (id: string, title: string = 'Test Chat'): Conversation => ({
        id,
        title,
        timestamp: Date.now(),
        lastUpdated: Date.now(),
        messages: [
            { role: 'user', text: 'Hello' },
            { role: 'model', text: 'Hi there!' },
        ],
    });

    beforeEach(async () => {
        // Create unique temp directory for each test
        tempDir = path.join(os.tmpdir(), `conv-storage-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        fs.mkdirSync(tempDir, { recursive: true });

        fileStorage = new FileStorageService(tempDir);
        storage = new ConversationFileStorage(fileStorage);
        await storage.initialize();
    });

    afterEach(() => {
        // Clean up temp directory
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('initialize', () => {
        it('should create conversations directory', async () => {
            const exists = fs.existsSync(path.join(tempDir, 'conversations'));
            expect(exists).toBe(true);
        });

        it('should create empty index if none exists', async () => {
            const metas = await storage.listConversations();
            expect(metas).toEqual([]);
        });

        it('should load existing index', async () => {
            // Create a conversation first
            const conv = createTestConversation('conv_1');
            await storage.saveConversation(conv);

            // Create new storage instance
            const newStorage = new ConversationFileStorage(fileStorage);
            await newStorage.initialize();

            const metas = await newStorage.listConversations();
            expect(metas).toHaveLength(1);
            expect(metas[0].id).toBe('conv_1');
        });
    });

    describe('get and update', () => {
        it('should return defaultValue for non-existent key', () => {
            const result = storage.get('nonexistent', 'default');
            expect(result).toBe('default');
        });

        it('should return cached value after update', async () => {
            await storage.update('testKey', { value: 42 });

            const result = storage.get('testKey', null);
            expect(result).toEqual({ value: 42 });
        });

        it('should delete value when updated with null', async () => {
            await storage.update('deleteMe', { exists: true });
            expect(storage.get('deleteMe', null)).not.toBeNull();

            await storage.update('deleteMe', null);
            expect(storage.get('deleteMe', null)).toBeNull();
        });

        it('should delete value when updated with undefined', async () => {
            await storage.update('deleteMe2', { exists: true });
            await storage.update('deleteMe2', undefined);

            expect(storage.get('deleteMe2', 'default')).toBe('default');
        });
    });

    describe('saveConversation', () => {
        it('should save conversation to disk', async () => {
            const conv = createTestConversation('conv_save_1');
            await storage.saveConversation(conv);

            const filePath = path.join(tempDir, 'conversations', 'conv_save_1', 'conversation.json');
            expect(fs.existsSync(filePath)).toBe(true);
        });

        it('should update index after save', async () => {
            const conv = createTestConversation('conv_save_2', 'My Chat');
            await storage.saveConversation(conv);

            const metas = await storage.listConversations();
            expect(metas).toHaveLength(1);
            expect(metas[0].title).toBe('My Chat');
        });

        it('should handle conversations without title', async () => {
            const conv: Conversation = {
                id: 'conv_no_title',
                title: '',  // Empty title
                timestamp: Date.now(),
                messages: [],
            };
            await storage.saveConversation(conv);

            const loaded = await storage.loadConversation('conv_no_title');
            expect(loaded?.title).toBe('Untitled');
        });

        it('should preserve message data', async () => {
            const conv = createTestConversation('conv_messages');
            await storage.saveConversation(conv);

            const loaded = await storage.loadConversation('conv_messages');
            expect(loaded?.messages).toHaveLength(2);
            expect(loaded?.messages[0].text).toBe('Hello');
        });

        it('should update existing conversation', async () => {
            const conv = createTestConversation('conv_update');
            await storage.saveConversation(conv);

            // Update the conversation
            conv.title = 'Updated Title';
            conv.messages.push({ role: 'user', text: 'New message' });
            await storage.saveConversation(conv);

            const loaded = await storage.loadConversation('conv_update');
            expect(loaded?.title).toBe('Updated Title');
            expect(loaded?.messages).toHaveLength(3);
        });
    });

    describe('loadConversation', () => {
        it('should return null for non-existent conversation', async () => {
            const result = await storage.loadConversation('nonexistent');
            expect(result).toBeNull();
        });

        it('should load saved conversation', async () => {
            const conv = createTestConversation('conv_load_1', 'Load Test');
            await storage.saveConversation(conv);

            const loaded = await storage.loadConversation('conv_load_1');
            expect(loaded).not.toBeNull();
            expect(loaded?.id).toBe('conv_load_1');
            expect(loaded?.title).toBe('Load Test');
        });

        it('should return all conversation properties', async () => {
            const conv = createTestConversation('conv_props');
            await storage.saveConversation(conv);

            const loaded = await storage.loadConversation('conv_props');
            expect(loaded?.id).toBeDefined();
            expect(loaded?.title).toBeDefined();
            expect(loaded?.timestamp).toBeDefined();
            expect(loaded?.lastUpdated).toBeDefined();
            expect(loaded?.messages).toBeDefined();
        });
    });

    describe('deleteConversation', () => {
        it('should delete conversation from disk', async () => {
            const conv = createTestConversation('conv_delete_1');
            await storage.saveConversation(conv);

            const deleted = await storage.deleteConversation('conv_delete_1');

            expect(deleted).toBe(true);
            expect(fs.existsSync(path.join(tempDir, 'conversations', 'conv_delete_1'))).toBe(false);
        });

        it('should remove from index', async () => {
            const conv = createTestConversation('conv_delete_2');
            await storage.saveConversation(conv);
            await storage.deleteConversation('conv_delete_2');

            const metas = await storage.listConversations();
            expect(metas.find(m => m.id === 'conv_delete_2')).toBeUndefined();
        });

        it('should return true for non-existent conversation', async () => {
            const result = await storage.deleteConversation('nonexistent');
            expect(result).toBe(true); // deleteDirectory with force returns true
        });
    });

    describe('clearAllConversations', () => {
        it('should delete all conversations', async () => {
            await storage.saveConversation(createTestConversation('conv_clear_1'));
            await storage.saveConversation(createTestConversation('conv_clear_2'));
            await storage.saveConversation(createTestConversation('conv_clear_3'));

            await storage.clearAllConversations();

            const metas = await storage.listConversations();
            expect(metas).toHaveLength(0);
        });

        it('should clear memory cache', async () => {
            await storage.update('testData', { cached: true });
            await storage.clearAllConversations();

            expect(storage.get('testData', null)).toBeNull();
        });
    });

    describe('listConversations', () => {
        it('should return empty array when no conversations', async () => {
            const result = await storage.listConversations();
            expect(result).toEqual([]);
        });

        it('should return metadata for all conversations', async () => {
            await storage.saveConversation(createTestConversation('conv_list_1', 'First'));
            await storage.saveConversation(createTestConversation('conv_list_2', 'Second'));

            const metas = await storage.listConversations();
            expect(metas).toHaveLength(2);
        });

        it('should sort by lastUpdated descending', async () => {
            const conv1 = createTestConversation('conv_sort_1');
            conv1.lastUpdated = 1000;
            await storage.saveConversation(conv1);

            const conv2 = createTestConversation('conv_sort_2');
            conv2.lastUpdated = 3000;
            await storage.saveConversation(conv2);

            const conv3 = createTestConversation('conv_sort_3');
            conv3.lastUpdated = 2000;
            await storage.saveConversation(conv3);

            const metas = await storage.listConversations();
            expect(metas[0].id).toBe('conv_sort_2');
            expect(metas[1].id).toBe('conv_sort_3');
            expect(metas[2].id).toBe('conv_sort_1');
        });

        it('should include messageCount', async () => {
            const conv = createTestConversation('conv_count');
            await storage.saveConversation(conv);

            const metas = await storage.listConversations();
            expect(metas[0].messageCount).toBe(2);
        });
    });

    describe('getAllConversations', () => {
        it('should return empty array when no conversations', async () => {
            const result = await storage.getAllConversations();
            expect(result).toEqual([]);
        });

        it('should return all conversations with full data', async () => {
            await storage.saveConversation(createTestConversation('conv_all_1'));
            await storage.saveConversation(createTestConversation('conv_all_2'));

            const convs = await storage.getAllConversations();
            expect(convs).toHaveLength(2);
            expect(convs[0].messages).toBeDefined();
            expect(convs[1].messages).toBeDefined();
        });
    });

    describe('preloadCache', () => {
        it('should load all conversations into cache', async () => {
            await storage.saveConversation(createTestConversation('conv_cache_1'));
            await storage.saveConversation(createTestConversation('conv_cache_2'));

            await storage.preloadCache();

            const cached = storage.get('conversations', []);
            expect(cached).toHaveLength(2);
        });
    });

    describe('handleConversationsUpdate', () => {
        it('should sync conversations when updated via update()', async () => {
            const convs = [
                createTestConversation('conv_sync_1'),
                createTestConversation('conv_sync_2'),
            ];

            await storage.update('conversations', convs);

            const metas = await storage.listConversations();
            expect(metas).toHaveLength(2);
        });

        it('should remove conversations not in update', async () => {
            await storage.saveConversation(createTestConversation('conv_remove_1'));
            await storage.saveConversation(createTestConversation('conv_remove_2'));

            // Update with only one conversation
            await storage.update('conversations', [createTestConversation('conv_remove_1')]);

            const metas = await storage.listConversations();
            expect(metas).toHaveLength(1);
            expect(metas[0].id).toBe('conv_remove_1');
        });

        it('should clear all when updated with null', async () => {
            await storage.saveConversation(createTestConversation('conv_null_1'));
            await storage.update('conversations', null);

            const metas = await storage.listConversations();
            expect(metas).toHaveLength(0);
        });
    });

    describe('getStats', () => {
        it('should return conversation count', async () => {
            await storage.saveConversation(createTestConversation('conv_stats_1'));
            await storage.saveConversation(createTestConversation('conv_stats_2'));

            const stats = await storage.getStats();
            expect(stats.conversationCount).toBe(2);
        });

        it('should return index size', async () => {
            await storage.saveConversation(createTestConversation('conv_stats_size'));

            const stats = await storage.getStats();
            expect(stats.indexSize).toBeGreaterThan(0);
        });
    });

    describe('createConversationFileStorage', () => {
        it('should create and initialize storage', async () => {
            const created = await createConversationFileStorage(fileStorage);
            expect(created).toBeInstanceOf(ConversationFileStorage);
        });

        it('should preload cache on creation', async () => {
            await storage.saveConversation(createTestConversation('conv_create_1'));

            const created = await createConversationFileStorage(fileStorage);
            const cached = created.get('conversations', []);
            expect(cached).toHaveLength(1);
        });
    });
});
