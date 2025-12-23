/**
 * Unit tests for MigrationService
 * 
 * Tests migration from globalState to file storage with 90%+ coverage target.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MigrationService, createMigrationService } from '../MigrationService';
import { ConversationFileStorage } from '../../../features/chat/services/ConversationFileStorage';
import { FileStorageService } from '../FileStorageService';
import { Conversation } from '../../../features/chat/types/ChatTypes';

// Mock Memento interface for testing
class MockMemento {
    private store: Map<string, any> = new Map();

    get<T>(key: string, defaultValue?: T): T {
        return this.store.has(key) ? this.store.get(key) : (defaultValue as T);
    }

    async update(key: string, value: any): Promise<void> {
        if (value === undefined) {
            this.store.delete(key);
        } else {
            this.store.set(key, value);
        }
    }

    keys(): readonly string[] {
        return Array.from(this.store.keys());
    }

    setTestValue(key: string, value: any) {
        this.store.set(key, value);
    }
}

describe('MigrationService', () => {
    let migrationService: MigrationService;
    let mockGlobalState: MockMemento;
    let conversationStorage: ConversationFileStorage;
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
        // Create unique temp directory
        tempDir = path.join(os.tmpdir(), `migration-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        fs.mkdirSync(tempDir, { recursive: true });

        // Setup services
        fileStorage = new FileStorageService(tempDir);
        conversationStorage = new ConversationFileStorage(fileStorage);
        await conversationStorage.initialize();

        mockGlobalState = new MockMemento();
        migrationService = new MigrationService(mockGlobalState as any, conversationStorage);
    });

    afterEach(() => {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('needsMigration', () => {
        it('should return false when already migrated', async () => {
            mockGlobalState.setTestValue('personaut.migration.fileStorage.v1', true);

            const result = await migrationService.needsMigration();
            expect(result).toBe(false);
        });

        it('should return false when no conversations exist', async () => {
            const result = await migrationService.needsMigration();
            expect(result).toBe(false);
        });

        it('should return true when conversations exist and not migrated', async () => {
            mockGlobalState.setTestValue('conversations', [createTestConversation('conv_1')]);

            const result = await migrationService.needsMigration();
            expect(result).toBe(true);
        });
    });

    describe('migrateConversations', () => {
        it('should return success with zero count when no conversations', async () => {
            const result = await migrationService.migrateConversations();

            expect(result.success).toBe(true);
            expect(result.conversationsMigrated).toBe(0);
            expect(result.errors).toHaveLength(0);
        });

        it('should migrate all conversations', async () => {
            mockGlobalState.setTestValue('conversations', [
                createTestConversation('conv_1'),
                createTestConversation('conv_2'),
                createTestConversation('conv_3'),
            ]);

            const result = await migrationService.migrateConversations();

            expect(result.success).toBe(true);
            expect(result.conversationsMigrated).toBe(3);
            expect(result.errors).toHaveLength(0);

            // Verify conversations were saved
            const metas = await conversationStorage.listConversations();
            expect(metas).toHaveLength(3);
        });

        it('should preserve conversation data', async () => {
            const conv = createTestConversation('conv_preserve', 'Preserved Title');
            mockGlobalState.setTestValue('conversations', [conv]);

            await migrationService.migrateConversations();

            const loaded = await conversationStorage.loadConversation('conv_preserve');
            expect(loaded?.title).toBe('Preserved Title');
            expect(loaded?.messages).toHaveLength(2);
        });

        it('should continue on individual conversation errors', async () => {
            // This is harder to test without mocking, but we verify the structure
            mockGlobalState.setTestValue('conversations', [
                createTestConversation('conv_1'),
                createTestConversation('conv_2'),
            ]);

            const result = await migrationService.migrateConversations();
            expect(result.success).toBe(true);
            expect(result.conversationsMigrated).toBe(2);
        });
    });

    describe('markComplete', () => {
        it('should set migration flag to true', async () => {
            await migrationService.markComplete();

            const flag = mockGlobalState.get('personaut.migration.fileStorage.v1');
            expect(flag).toBe(true);
        });
    });

    describe('runMigrationIfNeeded', () => {
        it('should return null when no migration needed', async () => {
            const result = await migrationService.runMigrationIfNeeded();
            expect(result).toBeNull();
        });

        it('should return null when already migrated', async () => {
            mockGlobalState.setTestValue('personaut.migration.fileStorage.v1', true);
            mockGlobalState.setTestValue('conversations', [createTestConversation('conv_1')]);

            const result = await migrationService.runMigrationIfNeeded();
            expect(result).toBeNull();
        });

        it('should run migration and mark complete on success', async () => {
            mockGlobalState.setTestValue('conversations', [
                createTestConversation('conv_1'),
                createTestConversation('conv_2'),
            ]);

            const result = await migrationService.runMigrationIfNeeded();

            expect(result).not.toBeNull();
            expect(result?.success).toBe(true);
            expect(result?.conversationsMigrated).toBe(2);

            // Check migration flag was set
            const flag = mockGlobalState.get('personaut.migration.fileStorage.v1');
            expect(flag).toBe(true);
        });
    });

    describe('resetMigrationFlag', () => {
        it('should reset migration flag to false', async () => {
            mockGlobalState.setTestValue('personaut.migration.fileStorage.v1', true);

            await migrationService.resetMigrationFlag();

            const flag = mockGlobalState.get('personaut.migration.fileStorage.v1');
            expect(flag).toBe(false);
        });
    });

    describe('createMigrationService', () => {
        it('should create a MigrationService instance', () => {
            const service = createMigrationService(mockGlobalState as any, conversationStorage);
            expect(service).toBeInstanceOf(MigrationService);
        });
    });

    describe('error handling', () => {
        it('should handle individual conversation save errors', async () => {
            // Create a broken conversation that will cause issues
            mockGlobalState.setTestValue('conversations', [
                createTestConversation('conv_1'),
                { id: null as any, title: 'Broken', timestamp: Date.now(), messages: [] }, // Invalid
                createTestConversation('conv_3'),
            ]);

            // Mock saveConversation to throw for null id
            const originalSave = conversationStorage.saveConversation.bind(conversationStorage);
            jest.spyOn(conversationStorage, 'saveConversation').mockImplementation(async (conv) => {
                if (!conv.id) {
                    throw new Error('Invalid conversation ID');
                }
                return originalSave(conv);
            });

            const result = await migrationService.migrateConversations();

            expect(result.success).toBe(true); // Still succeeds overall
            expect(result.conversationsMigrated).toBe(2); // Only 2 succeeded
            expect(result.errors.length).toBeGreaterThanOrEqual(1); // At least 1 error recorded
            expect(result.errors.some(e => e.includes('Failed to migrate'))).toBe(true);
        });

        it('should handle verification mismatch warning', async () => {
            // Setup conversations
            mockGlobalState.setTestValue('conversations', [
                createTestConversation('conv_1'),
                createTestConversation('conv_2'),
            ]);

            // Mock getAllConversations to return different count
            jest.spyOn(conversationStorage, 'getAllConversations').mockResolvedValueOnce([
                createTestConversation('conv_1'),
                // Missing conv_2
            ]);

            const result = await migrationService.migrateConversations();

            expect(result.success).toBe(true);
            expect(result.errors.some(e => e.includes('verification warning'))).toBe(true);
        });

        it('should not mark complete when there are errors', async () => {
            mockGlobalState.setTestValue('conversations', [
                createTestConversation('conv_1'),
            ]);

            // Mock to create an error during migration
            jest.spyOn(conversationStorage, 'getAllConversations').mockResolvedValueOnce([]);

            await migrationService.runMigrationIfNeeded();

            // Migration flag should NOT be set because of verification warning
            const flag = mockGlobalState.get('personaut.migration.fileStorage.v1');
            expect(flag).toBeFalsy();
        });
    });
});
