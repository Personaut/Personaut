/**
 * FeedbackFileStorage - Directory-based feedback history storage
 * 
 * Implements persistent storage for feedback history using directory-based storage.
 * Similar to ConversationFileStorage pattern.
 * 
 * Storage structure:
 * - feedback/index.json - Index of all feedback entries (metadata)
 * - feedback/{id}/metadata.json - Feedback metadata (personas, rating, timestamp)
 * - feedback/{id}/screenshot.png - Screenshot image (if available)
 * - feedback/{id}/context.txt - Context text
 * - feedback/{id}/output.md - Feedback output in markdown format
 * - feedback/{id}/tokens.json - Token usage details
 * 
 * This structure makes it easy to browse feedback history in the file system
 * and allows for better organization of large feedback entries.
 */
import * as path from 'path';
import { FileStorageService } from '../../../shared/services/FileStorageService';
import { FeedbackStorage } from '../types/FeedbackTypes';

const FEEDBACK_DIR = 'feedback';
const INDEX_FILE = 'feedback/index.json';
const FEEDBACK_HISTORY_KEY = 'feedbackHistory';

/**
 * Feedback metadata stored in metadata.json
 */
export interface FeedbackMetadata {
    id: string;
    title: string;
    feedbackType: 'individual' | 'group';
    personaNames: string[];
    personaIds?: string[];
    timestamp: number;
    url?: string;
    provider?: string;
    hasScreenshot: boolean;
    hasContext: boolean;
    hasOutput: boolean;
    rating?: number;
}

/**
 * Token usage details stored in tokens.json
 */
export interface TokenUsageDetails {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    provider: string;
    model?: string;
    timestamp: number;
}

/**
 * Feedback index entry (for fast listing)
 */
export interface FeedbackIndexEntry {
    id: string;
    title: string;
    feedbackType: 'individual' | 'group';
    personaNames: string[];
    timestamp: number;
    hasScreenshot: boolean;
    rating?: number;
}

/**
 * Feedback index structure
 */
export interface FeedbackIndex {
    version: number;
    entries: FeedbackIndexEntry[];
    lastUpdated: number;
}

/**
 * Complete feedback entry (for compatibility with existing code)
 */
export interface StoredFeedbackEntry {
    id: string;
    title: string;
    timestamp: number;
    feedbackType: 'individual' | 'group';
    personaNames: string[];
    context: string;
    url: string;
    content: string;
    screenshot?: string;
    provider?: string;
    error?: string;
}

/**
 * Create empty feedback index
 */
function createEmptyIndex(): FeedbackIndex {
    return {
        version: 1,
        entries: [],
        lastUpdated: Date.now(),
    };
}

/**
 * File-based feedback storage service that implements FeedbackStorage interface
 */
export class FeedbackFileStorage implements FeedbackStorage {
    private indexCache: FeedbackIndex | null = null;
    private memoryCache: Map<string, any> = new Map();

    constructor(private fileStorage: FileStorageService) { }

    /**
     * Initialize storage and load index into cache
     */
    async initialize(): Promise<void> {
        try {
            // Ensure feedback directory exists
            await this.fileStorage.ensureDirectory(FEEDBACK_DIR);

            // MIGRATION: Clear old feedback entries (one-time)
            // This is needed because we changed the FeedbackEntry format
            const migrationFile = 'feedback/.migration_v2';

            try {
                const migrated = await this.fileStorage.exists(migrationFile);

                if (!migrated) {
                    console.log('[FeedbackFileStorage] Migrating to new feedback format...');

                    // Clear old index
                    this.indexCache = createEmptyIndex();
                    await this.saveIndex();

                    // Clear memory cache
                    this.memoryCache.clear();

                    // Mark migration as complete
                    await this.fileStorage.write(migrationFile, {
                        migrated: true,
                        timestamp: Date.now(),
                        version: 2,
                        reason: 'Changed FeedbackEntry format from personaNames[] to personaName'
                    });

                    console.log('[FeedbackFileStorage] Migration complete - old feedback cleared');
                } else {
                    // Load index into cache
                    this.indexCache = await this.loadIndex();
                }
            } catch (migrationError) {
                console.error('[FeedbackFileStorage] Migration error:', migrationError);
                // If migration fails, just load normally
                this.indexCache = await this.loadIndex();
            }

            console.log('[FeedbackFileStorage] Initialized with', this.indexCache.entries.length, 'entries');
        } catch (error) {
            console.error('[FeedbackFileStorage] Failed to initialize:', error);
            this.indexCache = createEmptyIndex();
        }
    }

    /**
     * Get a value from storage (sync with cache)
     * Required by FeedbackStorage interface
     */
    get<T>(key: string, defaultValue: T): T {
        if (key === FEEDBACK_HISTORY_KEY) {
            const cached = this.memoryCache.get(key);
            return (cached !== undefined ? cached : defaultValue) as T;
        }
        return this.memoryCache.get(key) ?? defaultValue;
    }

    /**
     * Update a value in storage
     * Required by FeedbackStorage interface
     */
    async update(key: string, value: unknown): Promise<void> {
        if (key === FEEDBACK_HISTORY_KEY && Array.isArray(value)) {
            // When updating feedback history, save each entry to its directory
            this.memoryCache.set(key, value);

            // Rebuild index and save each entry
            this.indexCache = createEmptyIndex();

            for (const entry of value as StoredFeedbackEntry[]) {
                if (entry && entry.id) {
                    await this.saveFeedbackEntry(entry);
                }
            }

            await this.saveIndex();
            console.log('[FeedbackFileStorage] Saved', value.length, 'feedback entries');
        } else {
            this.memoryCache.set(key, value);
        }
    }

    /**
     * Load the feedback index from disk
     */
    private async loadIndex(): Promise<FeedbackIndex> {
        try {
            const content = await this.fileStorage.read<FeedbackIndex>(INDEX_FILE);
            if (content) {
                return content;
            }
        } catch (error) {
            console.log('[FeedbackFileStorage] No existing index, creating new one');
        }
        return createEmptyIndex();
    }

    /**
     * Save the index to disk
     */
    private async saveIndex(): Promise<void> {
        if (!this.indexCache) return;
        this.indexCache.lastUpdated = Date.now();
        await this.fileStorage.write(INDEX_FILE, this.indexCache);
    }

    /**
     * Save a feedback entry to its directory
     */
    async saveFeedbackEntry(entry: StoredFeedbackEntry): Promise<void> {
        try {
            const feedbackDir = path.join(FEEDBACK_DIR, entry.id);
            await this.fileStorage.ensureDirectory(feedbackDir);

            // Save metadata
            const metadata: FeedbackMetadata = {
                id: entry.id,
                title: entry.title,
                feedbackType: entry.feedbackType,
                personaNames: entry.personaNames,
                timestamp: entry.timestamp,
                url: entry.url,
                provider: entry.provider,
                hasScreenshot: !!entry.screenshot,
                hasContext: !!entry.context,
                hasOutput: !!entry.content,
            };
            await this.fileStorage.write(path.join(feedbackDir, 'metadata.json'), metadata);

            // Save screenshot if available
            if (entry.screenshot) {
                // Screenshot is base64 data URL, extract the base64 part
                const base64Data = entry.screenshot.replace(/^data:image\/\w+;base64,/, '');
                await this.fileStorage.writeBase64(
                    path.join(feedbackDir, 'screenshot.png'),
                    base64Data
                );
            }

            // Save context
            if (entry.context) {
                await this.fileStorage.writeText(
                    path.join(feedbackDir, 'context.txt'),
                    entry.context
                );
            }

            // Save output
            if (entry.content) {
                await this.fileStorage.writeText(
                    path.join(feedbackDir, 'output.md'),
                    entry.content
                );
            }

            // Update index
            await this.updateIndex({
                id: entry.id,
                title: entry.title,
                feedbackType: entry.feedbackType,
                personaNames: entry.personaNames,
                timestamp: entry.timestamp,
                hasScreenshot: !!entry.screenshot,
            });

            console.log('[FeedbackFileStorage] Saved feedback entry:', entry.id);
        } catch (error) {
            console.error('[FeedbackFileStorage] Failed to save feedback entry:', error);
            throw error;
        }
    }

    /**
     * Save token usage details for a feedback entry
     */
    async saveTokenUsage(feedbackId: string, tokens: TokenUsageDetails): Promise<void> {
        try {
            const tokensPath = path.join(FEEDBACK_DIR, feedbackId, 'tokens.json');
            await this.fileStorage.write(tokensPath, tokens);
            console.log('[FeedbackFileStorage] Saved token usage for:', feedbackId);
        } catch (error) {
            console.error('[FeedbackFileStorage] Failed to save token usage:', error);
        }
    }

    /**
     * Load a feedback entry from disk
     */
    async loadFeedbackEntry(id: string): Promise<StoredFeedbackEntry | null> {
        try {
            const feedbackDir = path.join(FEEDBACK_DIR, id);

            // Load metadata
            const metadata = await this.fileStorage.read<FeedbackMetadata>(
                path.join(feedbackDir, 'metadata.json')
            );
            if (!metadata) {
                return null;
            }

            // Load context
            const context = await this.fileStorage.readText(
                path.join(feedbackDir, 'context.txt')
            ) || '';

            // Load output
            const content = await this.fileStorage.readText(
                path.join(feedbackDir, 'output.md')
            ) || '';

            // Load screenshot if available
            let screenshot: string | undefined;
            if (metadata.hasScreenshot) {
                const base64Data = await this.fileStorage.readBase64(
                    path.join(feedbackDir, 'screenshot.png')
                );
                if (base64Data) {
                    screenshot = `data:image/png;base64,${base64Data}`;
                }
            }

            return {
                id: metadata.id,
                title: metadata.title,
                timestamp: metadata.timestamp,
                feedbackType: metadata.feedbackType,
                personaNames: metadata.personaNames,
                context,
                url: metadata.url || '',
                content,
                screenshot,
                provider: metadata.provider,
            };
        } catch (error) {
            console.warn('[FeedbackFileStorage] Failed to load feedback entry:', id, error);
            return null;
        }
    }

    /**
     * Load token usage details for a feedback entry
     */
    async loadTokenUsage(feedbackId: string): Promise<TokenUsageDetails | null> {
        try {
            const tokensPath = path.join(FEEDBACK_DIR, feedbackId, 'tokens.json');
            return await this.fileStorage.read<TokenUsageDetails>(tokensPath);
        } catch (error) {
            console.warn('[FeedbackFileStorage] Failed to load token usage:', feedbackId);
            return null;
        }
    }

    /**
     * Delete a feedback entry from disk
     */
    async deleteFeedbackEntry(id: string): Promise<boolean> {
        try {
            const feedbackDir = path.join(FEEDBACK_DIR, id);
            await this.fileStorage.deleteDirectory(feedbackDir);
            await this.removeFromIndex(id);
            console.log('[FeedbackFileStorage] Deleted feedback entry:', id);
            return true;
        } catch (error) {
            console.error('[FeedbackFileStorage] Failed to delete feedback entry:', error);
            return false;
        }
    }

    /**
     * Update the feedback index with new metadata
     */
    private async updateIndex(entry: FeedbackIndexEntry): Promise<void> {
        if (!this.indexCache) {
            this.indexCache = createEmptyIndex();
        }

        // Remove existing entry with same ID
        this.indexCache.entries = this.indexCache.entries.filter(e => e.id !== entry.id);

        // Add new entry at the beginning (most recent first)
        this.indexCache.entries.unshift(entry);

        await this.saveIndex();
    }

    /**
     * Remove a feedback entry from the index
     */
    private async removeFromIndex(id: string): Promise<void> {
        if (!this.indexCache) return;
        this.indexCache.entries = this.indexCache.entries.filter(e => e.id !== id);
        await this.saveIndex();
    }

    /**
     * List all feedback entries (metadata only)
     */
    async listFeedbackEntries(): Promise<FeedbackIndexEntry[]> {
        if (!this.indexCache) {
            this.indexCache = await this.loadIndex();
        }
        return this.indexCache.entries;
    }

    /**
     * Get all feedback entries with full data
     */
    async getAllFeedbackEntries(): Promise<StoredFeedbackEntry[]> {
        const entries = await this.listFeedbackEntries();
        const feedbackEntries: StoredFeedbackEntry[] = [];

        for (const entry of entries) {
            const feedback = await this.loadFeedbackEntry(entry.id);
            if (feedback) {
                feedbackEntries.push(feedback);
            }
        }

        return feedbackEntries;
    }

    /**
     * Clear all feedback entries
     */
    async clearAllFeedback(): Promise<void> {
        try {
            const entries = await this.listFeedbackEntries();
            for (const entry of entries) {
                const feedbackDir = path.join(FEEDBACK_DIR, entry.id);
                await this.fileStorage.deleteDirectory(feedbackDir);
            }
            this.indexCache = createEmptyIndex();
            await this.saveIndex();
            console.log('[FeedbackFileStorage] Cleared all feedback entries');
        } catch (error) {
            console.error('[FeedbackFileStorage] Failed to clear feedback:', error);
        }
    }

    /**
     * Preload all feedback into memory cache
     */
    async preloadCache(): Promise<void> {
        console.log('[FeedbackFileStorage] Preloading cache...');
        const entries = await this.getAllFeedbackEntries();
        this.memoryCache.set(FEEDBACK_HISTORY_KEY, entries);
        console.log('[FeedbackFileStorage] Loaded', entries.length, 'feedback entries into cache');
    }

    /**
     * Get cached feedback entries (sync)
     */
    getCachedFeedback(): StoredFeedbackEntry[] {
        return this.memoryCache.get(FEEDBACK_HISTORY_KEY) || [];
    }

    /**
     * Get storage statistics
     */
    async getStats(): Promise<{ entryCount: number; indexSize: number }> {
        const entries = await this.listFeedbackEntries();
        return {
            entryCount: entries.length,
            indexSize: JSON.stringify(this.indexCache).length,
        };
    }
}

/**
 * Create and initialize a FeedbackFileStorage
 */
export async function createFeedbackFileStorage(
    fileStorage: FileStorageService
): Promise<FeedbackFileStorage> {
    const storage = new FeedbackFileStorage(fileStorage);
    await storage.initialize();
    return storage;
}

export default FeedbackFileStorage;
