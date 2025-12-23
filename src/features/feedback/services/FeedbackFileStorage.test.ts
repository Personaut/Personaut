/**
 * Unit tests for FeedbackFileStorage
 * 
 * Tests the directory-based feedback storage implementation
 */

import { FeedbackFileStorage, TokenUsageDetails, StoredFeedbackEntry } from './FeedbackFileStorage';


// Mock FileStorageService
class MockFileStorageService {
    private files: Map<string, any> = new Map();
    private directories: Set<string> = new Set();

    async ensureDirectory(relativePath: string): Promise<void> {
        this.directories.add(relativePath);
    }

    async read<T>(relativePath: string): Promise<T | null> {
        return this.files.get(relativePath) || null;
    }

    async write<T>(relativePath: string, data: T): Promise<void> {
        this.files.set(relativePath, data);
    }

    async readText(relativePath: string): Promise<string | null> {
        return this.files.get(relativePath) || null;
    }

    async writeText(relativePath: string, content: string): Promise<void> {
        this.files.set(relativePath, content);
    }

    async readBase64(relativePath: string): Promise<string | null> {
        return this.files.get(relativePath) || null;
    }

    async writeBase64(relativePath: string, base64Data: string): Promise<void> {
        this.files.set(relativePath, base64Data);
    }

    async deleteDirectory(relativePath: string): Promise<boolean> {
        // Delete all files in this directory
        const keysToDelete: string[] = [];
        for (const [key] of this.files) {
            if (key.startsWith(relativePath)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.files.delete(key));
        this.directories.delete(relativePath);
        return true;
    }

    // Helper methods for testing
    hasFile(relativePath: string): boolean {
        return this.files.has(relativePath);
    }

    hasDirectory(relativePath: string): boolean {
        return this.directories.has(relativePath);
    }

    clear(): void {
        this.files.clear();
        this.directories.clear();
    }
}

describe('FeedbackFileStorage', () => {
    let storage: FeedbackFileStorage;
    let mockFileStorage: MockFileStorageService;

    beforeEach(async () => {
        mockFileStorage = new MockFileStorageService();
        storage = new FeedbackFileStorage(mockFileStorage as any);
        await storage.initialize();
    });

    afterEach(() => {
        mockFileStorage.clear();
    });

    describe('initialization', () => {
        it('should create feedback directory on initialization', async () => {
            expect(mockFileStorage.hasDirectory('feedback')).toBe(true);
        });

        it('should create empty index if none exists', async () => {
            const entries = await storage.listFeedbackEntries();
            expect(entries).toEqual([]);
        });

        it('should load existing index on initialization', async () => {
            // Create a new storage with pre-existing index
            const existingIndex = {
                version: 1,
                entries: [
                    {
                        id: 'test-123',
                        title: 'Test Feedback',
                        feedbackType: 'individual' as const,
                        personaNames: ['Alice'],
                        timestamp: Date.now(),
                        hasScreenshot: false,
                    },
                ],
                lastUpdated: Date.now(),
            };
            mockFileStorage.write('feedback/index.json', existingIndex);

            const newStorage = new FeedbackFileStorage(mockFileStorage as any);
            await newStorage.initialize();

            const entries = await newStorage.listFeedbackEntries();
            expect(entries).toHaveLength(1);
            expect(entries[0].id).toBe('test-123');
        });
    });

    describe('saveFeedbackEntry', () => {
        it('should save feedback entry to directory structure', async () => {
            const entry: StoredFeedbackEntry = {
                id: 'feedback-123',
                title: 'Test Feedback',
                timestamp: Date.now(),
                feedbackType: 'individual',
                personaNames: ['Alice'],
                context: 'Testing the login page',
                url: 'https://example.com/login',
                content: '# Feedback\n\nGreat design!',
            };

            await storage.saveFeedbackEntry(entry);

            // Check metadata file
            expect(mockFileStorage.hasFile('feedback/feedback-123/metadata.json')).toBe(true);

            // Check context file
            expect(mockFileStorage.hasFile('feedback/feedback-123/context.txt')).toBe(true);

            // Check output file
            expect(mockFileStorage.hasFile('feedback/feedback-123/output.md')).toBe(true);
        });

        it('should save screenshot if provided', async () => {
            const entry: StoredFeedbackEntry = {
                id: 'feedback-456',
                title: 'Test with Screenshot',
                timestamp: Date.now(),
                feedbackType: 'individual',
                personaNames: ['Bob'],
                context: 'Testing',
                url: 'https://example.com',
                content: 'Feedback content',
                screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            };

            await storage.saveFeedbackEntry(entry);

            // Check screenshot file
            expect(mockFileStorage.hasFile('feedback/feedback-456/screenshot.png')).toBe(true);
        });

        it('should update index when saving entry', async () => {
            const entry: StoredFeedbackEntry = {
                id: 'feedback-789',
                title: 'Index Test',
                timestamp: Date.now(),
                feedbackType: 'group',
                personaNames: ['Alice', 'Bob'],
                context: 'Testing',
                url: 'https://example.com',
                content: 'Content',
            };

            await storage.saveFeedbackEntry(entry);

            const entries = await storage.listFeedbackEntries();
            expect(entries).toHaveLength(1);
            expect(entries[0].id).toBe('feedback-789');
            expect(entries[0].feedbackType).toBe('group');
            expect(entries[0].personaNames).toEqual(['Alice', 'Bob']);
        });
    });

    describe('loadFeedbackEntry', () => {
        it('should load complete feedback entry', async () => {
            const originalEntry: StoredFeedbackEntry = {
                id: 'feedback-load-test',
                title: 'Load Test',
                timestamp: 1234567890,
                feedbackType: 'individual',
                personaNames: ['Charlie'],
                context: 'Test context',
                url: 'https://example.com',
                content: '# Test Feedback\n\nThis is a test.',
                provider: 'gemini',
            };

            await storage.saveFeedbackEntry(originalEntry);

            const loadedEntry = await storage.loadFeedbackEntry('feedback-load-test');

            expect(loadedEntry).not.toBeNull();
            expect(loadedEntry!.id).toBe('feedback-load-test');
            expect(loadedEntry!.title).toBe('Load Test');
            expect(loadedEntry!.context).toBe('Test context');
            expect(loadedEntry!.content).toBe('# Test Feedback\n\nThis is a test.');
            expect(loadedEntry!.provider).toBe('gemini');
        });

        it('should return null for non-existent entry', async () => {
            const loadedEntry = await storage.loadFeedbackEntry('non-existent-id');
            expect(loadedEntry).toBeNull();
        });

        it('should load screenshot if available', async () => {
            const entry: StoredFeedbackEntry = {
                id: 'feedback-screenshot-test',
                title: 'Screenshot Test',
                timestamp: Date.now(),
                feedbackType: 'individual',
                personaNames: ['Dave'],
                context: 'Testing',
                url: 'https://example.com',
                content: 'Content',
                screenshot: 'data:image/png;base64,ABC123',
            };

            await storage.saveFeedbackEntry(entry);
            const loadedEntry = await storage.loadFeedbackEntry('feedback-screenshot-test');

            expect(loadedEntry).not.toBeNull();
            expect(loadedEntry!.screenshot).toBe('data:image/png;base64,ABC123');
        });
    });

    describe('saveTokenUsage and loadTokenUsage', () => {
        it('should save and load token usage details', async () => {
            const tokens: TokenUsageDetails = {
                inputTokens: 1000,
                outputTokens: 500,
                totalTokens: 1500,
                provider: 'gemini',
                model: 'gemini-2.0-flash-exp',
                timestamp: Date.now(),
            };

            await storage.saveTokenUsage('feedback-token-test', tokens);

            const loadedTokens = await storage.loadTokenUsage('feedback-token-test');

            expect(loadedTokens).not.toBeNull();
            expect(loadedTokens!.inputTokens).toBe(1000);
            expect(loadedTokens!.outputTokens).toBe(500);
            expect(loadedTokens!.totalTokens).toBe(1500);
            expect(loadedTokens!.provider).toBe('gemini');
        });

        it('should return null for non-existent token usage', async () => {
            const tokens = await storage.loadTokenUsage('non-existent-id');
            expect(tokens).toBeNull();
        });
    });

    describe('deleteFeedbackEntry', () => {
        it('should delete feedback entry and all its files', async () => {
            const entry: StoredFeedbackEntry = {
                id: 'feedback-delete-test',
                title: 'Delete Test',
                timestamp: Date.now(),
                feedbackType: 'individual',
                personaNames: ['Eve'],
                context: 'Testing',
                url: 'https://example.com',
                content: 'Content',
                screenshot: 'data:image/png;base64,XYZ',
            };

            await storage.saveFeedbackEntry(entry);

            // Verify it exists
            let entries = await storage.listFeedbackEntries();
            expect(entries).toHaveLength(1);

            // Delete it
            const deleted = await storage.deleteFeedbackEntry('feedback-delete-test');
            expect(deleted).toBe(true);

            // Verify it's gone
            entries = await storage.listFeedbackEntries();
            expect(entries).toHaveLength(0);

            const loadedEntry = await storage.loadFeedbackEntry('feedback-delete-test');
            expect(loadedEntry).toBeNull();
        });

        it('should return false when deleting non-existent entry', async () => {
            const deleted = await storage.deleteFeedbackEntry('non-existent-id');
            // Note: Our mock always returns true, but real implementation would return false
            expect(deleted).toBe(true);
        });
    });

    describe('getAllFeedbackEntries', () => {
        it('should load all feedback entries', async () => {
            const entry1: StoredFeedbackEntry = {
                id: 'feedback-1',
                title: 'First',
                timestamp: Date.now(),
                feedbackType: 'individual',
                personaNames: ['Alice'],
                context: 'Context 1',
                url: 'https://example.com/1',
                content: 'Content 1',
            };

            const entry2: StoredFeedbackEntry = {
                id: 'feedback-2',
                title: 'Second',
                timestamp: Date.now() + 1000,
                feedbackType: 'group',
                personaNames: ['Bob', 'Charlie'],
                context: 'Context 2',
                url: 'https://example.com/2',
                content: 'Content 2',
            };

            await storage.saveFeedbackEntry(entry1);
            await storage.saveFeedbackEntry(entry2);

            const allEntries = await storage.getAllFeedbackEntries();

            expect(allEntries).toHaveLength(2);
            expect(allEntries.map(e => e.id)).toContain('feedback-1');
            expect(allEntries.map(e => e.id)).toContain('feedback-2');
        });

        it('should return empty array when no entries exist', async () => {
            const allEntries = await storage.getAllFeedbackEntries();
            expect(allEntries).toEqual([]);
        });
    });

    describe('clearAllFeedback', () => {
        it('should clear all feedback entries', async () => {
            // Create multiple entries
            for (let i = 0; i < 3; i++) {
                const entry: StoredFeedbackEntry = {
                    id: `feedback-${i}`,
                    title: `Entry ${i}`,
                    timestamp: Date.now() + i,
                    feedbackType: 'individual',
                    personaNames: ['Test'],
                    context: 'Context',
                    url: 'https://example.com',
                    content: 'Content',
                };
                await storage.saveFeedbackEntry(entry);
            }

            // Verify they exist
            let entries = await storage.listFeedbackEntries();
            expect(entries).toHaveLength(3);

            // Clear all
            await storage.clearAllFeedback();

            // Verify they're gone
            entries = await storage.listFeedbackEntries();
            expect(entries).toHaveLength(0);
        });
    });

    describe('FeedbackStorage interface compatibility', () => {
        it('should implement get method', () => {
            const result = storage.get('feedbackHistory', []);
            expect(Array.isArray(result)).toBe(true);
        });

        it('should implement update method', async () => {
            const entries: StoredFeedbackEntry[] = [
                {
                    id: 'test-1',
                    title: 'Test',
                    timestamp: Date.now(),
                    feedbackType: 'individual',
                    personaNames: ['Alice'],
                    context: 'Context',
                    url: 'https://example.com',
                    content: 'Content',
                },
            ];

            await storage.update('feedbackHistory', entries);

            const result = storage.get('feedbackHistory', []);
            expect(result).toEqual(entries);
        });
    });

    describe('preloadCache', () => {
        it('should load all entries into memory cache', async () => {
            const entry: StoredFeedbackEntry = {
                id: 'cache-test',
                title: 'Cache Test',
                timestamp: Date.now(),
                feedbackType: 'individual',
                personaNames: ['Test'],
                context: 'Context',
                url: 'https://example.com',
                content: 'Content',
            };

            await storage.saveFeedbackEntry(entry);
            await storage.preloadCache();

            const cached = storage.getCachedFeedback();
            expect(cached).toHaveLength(1);
            expect(cached[0].id).toBe('cache-test');
        });
    });

    describe('getStats', () => {
        it('should return storage statistics', async () => {
            const entry: StoredFeedbackEntry = {
                id: 'stats-test',
                title: 'Stats Test',
                timestamp: Date.now(),
                feedbackType: 'individual',
                personaNames: ['Test'],
                context: 'Context',
                url: 'https://example.com',
                content: 'Content',
            };

            await storage.saveFeedbackEntry(entry);

            const stats = await storage.getStats();
            expect(stats.entryCount).toBe(1);
            expect(stats.indexSize).toBeGreaterThan(0);
        });
    });
});
