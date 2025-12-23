/**
 * ConversationFileStorage - File-based conversation storage
 * 
 * Implements ConversationStorage interface using file-based storage.
 * Replaces globalState storage to avoid size limits.
 * 
 * Storage structure:
 * - conversations/index.json - Lightweight index for fast listing
 * - conversations/{id}/conversation.json - Full conversation data
 * 
 * Features:
 * - Memory cache for sync get() compatibility
 * - Debounced writes to reduce disk I/O
 * - Automatic index management
 * 
 * @module features/chat/services/ConversationFileStorage
 */

import { ConversationStorage, Conversation } from '../types/ChatTypes';
import { FileStorageService } from '../../../shared/services/FileStorageService';
import {
    ConversationIndex,
    ConversationFile,
    ConversationMeta,
    createEmptyIndex,
} from '../types/ConversationFileTypes';

const CONVERSATIONS_DIR = 'conversations';
const INDEX_FILE = 'conversations/index.json';

/**
 * File-based conversation storage that implements ConversationStorage interface
 */
export class ConversationFileStorage implements ConversationStorage {
    private memoryCache: Map<string, any> = new Map();
    private indexCache: ConversationIndex | null = null;

    constructor(private fileStorage: FileStorageService) { }

    /**
     * Initialize storage and load index into cache
     */
    async initialize(): Promise<void> {
        console.log('[ConversationFileStorage] Initializing...');

        // Ensure conversations directory exists
        await this.fileStorage.ensureDirectory(CONVERSATIONS_DIR);

        // Load index
        await this.loadIndex();

        console.log('[ConversationFileStorage] Initialized with', this.indexCache?.conversations.length || 0, 'conversations');
    }

    /**
     * Load the conversation index from disk
     */
    private async loadIndex(): Promise<ConversationIndex> {
        if (!this.indexCache) {
            const index = await this.fileStorage.read<ConversationIndex>(INDEX_FILE);
            this.indexCache = index || createEmptyIndex();
        }
        return this.indexCache;
    }

    /**
     * Save the index to disk (debounced)
     */
    private async saveIndex(): Promise<void> {
        if (!this.indexCache) return;

        this.indexCache.lastUpdated = Date.now();
        await this.fileStorage.write(INDEX_FILE, this.indexCache);
    }

    /**
     * Get a value from storage (sync with cache)
     * Required by ConversationStorage interface
     */
    get<T>(key: string, defaultValue: T): T {
        const hasCached = this.memoryCache.has(key);
        const cachedValue = this.memoryCache.get(key);
        console.log('[ConversationFileStorage] get:', {
            key,
            hasCached,
            cachedCount: Array.isArray(cachedValue) ? cachedValue.length : 'not-array',
            memCacheSize: this.memoryCache.size,
        });
        if (hasCached) {
            return cachedValue as T;
        }
        return defaultValue;
    }

    /**
     * Update a value in storage
     * Required by ConversationStorage interface
     */
    async update(key: string, value: unknown): Promise<void> {
        // Update memory cache immediately
        if (value === undefined || value === null) {
            this.memoryCache.delete(key);
        } else {
            this.memoryCache.set(key, value);
        }

        // Handle special keys - both 'conversations' and 'conversationHistory' map to the same handler
        // ConversationManager uses 'conversationHistory' as STORAGE_KEY
        if (key === 'conversations' || key === 'conversationHistory') {
            console.log(`[ConversationFileStorage] Handling update for key: ${key}, conversations count: ${Array.isArray(value) ? value.length : 'not-array'}`);
            await this.handleConversationsUpdate(value as Conversation[] | undefined);
        }
    }

    /**
     * Handle updates to the main conversations array
     */
    private async handleConversationsUpdate(conversations: Conversation[] | undefined): Promise<void> {
        if (!conversations) {
            // Clear all conversations
            await this.clearAllConversations();
            return;
        }

        // Sync each conversation to disk
        for (const conv of conversations) {
            await this.saveConversation(conv);
        }

        // Remove conversations that are no longer in the list
        const currentIds = new Set(conversations.map(c => c.id));
        const index = await this.loadIndex();

        // Make a copy to avoid modifying while iterating
        const toRemove = index.conversations.filter(meta => !currentIds.has(meta.id));
        for (const meta of toRemove) {
            await this.deleteConversation(meta.id);
        }
    }

    /**
     * Save a single conversation to disk
     */
    async saveConversation(conversation: Conversation): Promise<void> {
        const convPath = `${CONVERSATIONS_DIR}/${conversation.id}/conversation.json`;

        const file: ConversationFile = {
            version: 1,
            metadata: {
                id: conversation.id,
                title: conversation.title || 'Untitled',
                lastUpdated: conversation.lastUpdated || Date.now(),
                createdAt: conversation.timestamp || Date.now(),
                messageCount: conversation.messages?.length || 0,
                archived: (conversation as any).archived,
                tags: (conversation as any).tags,
            },
            messages: conversation.messages || [],
            sessionId: (conversation as any).sessionId,
            agentMode: (conversation as any).agentMode,
        };

        // Write conversation file
        await this.fileStorage.write(convPath, file);

        // Update index
        await this.updateIndex(file.metadata);
    }

    /**
     * Load a conversation from disk
     */
    async loadConversation(id: string): Promise<Conversation | null> {
        const convPath = `${CONVERSATIONS_DIR}/${id}/conversation.json`;
        const file = await this.fileStorage.read<ConversationFile>(convPath);

        if (!file) {
            return null;
        }

        // Convert to Conversation format
        return {
            id: file.metadata.id,
            title: file.metadata.title,
            timestamp: file.metadata.createdAt,
            lastUpdated: file.metadata.lastUpdated,
            messages: file.messages,
        };
    }

    /**
     * Delete a conversation from disk
     */
    async deleteConversation(id: string): Promise<boolean> {
        const convDir = `${CONVERSATIONS_DIR}/${id}`;

        // Delete directory
        const deleted = await this.fileStorage.deleteDirectory(convDir);

        // Remove from index
        await this.removeFromIndex(id);

        // Remove from cache
        this.memoryCache.delete(`conv_${id}`);

        return deleted;
    }

    /**
     * Clear all conversations
     */
    async clearAllConversations(): Promise<void> {
        // Get all conversation IDs
        const index = await this.loadIndex();

        // Delete each conversation directory
        for (const meta of index.conversations) {
            await this.fileStorage.deleteDirectory(`${CONVERSATIONS_DIR}/${meta.id}`);
        }

        // Reset index
        this.indexCache = createEmptyIndex();
        await this.saveIndex();

        // Clear cache
        this.memoryCache.clear();
    }

    /**
     * Update the conversation index with new metadata
     */
    private async updateIndex(meta: ConversationMeta): Promise<void> {
        const index = await this.loadIndex();

        // Find and update or add
        const existingIndex = index.conversations.findIndex(c => c.id === meta.id);
        if (existingIndex >= 0) {
            index.conversations[existingIndex] = meta;
        } else {
            index.conversations.push(meta);
        }

        // Sort by lastUpdated descending
        index.conversations.sort((a, b) => b.lastUpdated - a.lastUpdated);

        await this.saveIndex();
    }

    /**
     * Remove a conversation from the index
     */
    private async removeFromIndex(id: string): Promise<void> {
        const index = await this.loadIndex();
        index.conversations = index.conversations.filter(c => c.id !== id);
        await this.saveIndex();
    }

    /**
     * List all conversations (from index)
     */
    async listConversations(): Promise<ConversationMeta[]> {
        const index = await this.loadIndex();
        return index.conversations;
    }

    /**
     * Get all conversations with full data
     */
    async getAllConversations(): Promise<Conversation[]> {
        const index = await this.loadIndex();
        const conversations: Conversation[] = [];

        for (const meta of index.conversations) {
            const conv = await this.loadConversation(meta.id);
            if (conv) {
                conversations.push(conv);
            }
        }

        return conversations;
    }

    /**
     * Preload all conversations into memory cache
     * Call this on startup for sync get() compatibility
     * IMPORTANT: Uses 'conversationHistory' key to match ConversationManager.STORAGE_KEY
     */
    async preloadCache(): Promise<void> {
        console.log('[ConversationFileStorage] Preloading cache...');

        const conversations = await this.getAllConversations();
        // Must use 'conversationHistory' to match ConversationManager.STORAGE_KEY
        this.memoryCache.set('conversationHistory', conversations);

        console.log('[ConversationFileStorage] Loaded', conversations.length, 'conversations into cache');
    }

    /**
     * Get storage statistics
     */
    async getStats(): Promise<{ conversationCount: number; indexSize: number }> {
        const index = await this.loadIndex();
        const stat = await this.fileStorage.stat(INDEX_FILE);

        return {
            conversationCount: index.conversations.length,
            indexSize: stat?.size || 0,
        };
    }
}

/**
 * Create and initialize a ConversationFileStorage
 */
export async function createConversationFileStorage(
    fileStorage: FileStorageService
): Promise<ConversationFileStorage> {
    const storage = new ConversationFileStorage(fileStorage);
    await storage.initialize();
    await storage.preloadCache();
    return storage;
}
