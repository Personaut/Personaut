/**
 * PersonaFileStorage - File-based persona storage
 * 
 * Implements persona storage using file-based storage.
 * Replaces globalState storage to avoid size limits.
 * 
 * Storage structure:
 * - personas/index.json - Lightweight index for fast listing
 * - personas/{id}/persona.json - Full persona data
 * 
 * Features:
 * - Memory cache for sync get() compatibility
 * - Automatic index management
 * - Favorites management with 5-item limit
 * 
 * @module features/personas/services/PersonaFileStorage
 */

import { FileStorageService } from '../../../shared/services/FileStorageService';
import {
    Persona,
    PersonaIndex,
    PersonaFile,
    PersonaMeta,
    LegacyPersona,
    createEmptyPersonaIndex,
    createPersonaMeta,
    createPersonaFile,
    MAX_FAVORITES,
} from '../types/PersonaFileTypes';

const PERSONAS_DIR = 'personas';
const INDEX_FILE = 'personas/index.json';

/**
 * Error class for favorites limit exceeded
 */
export class FavoritesLimitError extends Error {
    constructor() {
        super(`Cannot add more than ${MAX_FAVORITES} favorites`);
        this.name = 'FavoritesLimitError';
    }
}

/**
 * Error class for persona database errors
 */
export class PersonaDatabaseError extends Error {
    constructor(message: string, public cause?: Error) {
        super(message);
        this.name = 'PersonaDatabaseError';
    }
}

/**
 * File-based persona storage
 */
export class PersonaFileStorage {
    private memoryCache: Map<string, any> = new Map();
    private indexCache: PersonaIndex | null = null;

    constructor(private fileStorage: FileStorageService) { }

    /**
     * Initialize storage and load index into cache
     */
    async initialize(): Promise<void> {
        console.log('[PersonaFileStorage] Initializing...');

        // Ensure personas directory exists
        await this.fileStorage.ensureDirectory(PERSONAS_DIR);

        // Load index
        await this.loadIndex();

        console.log('[PersonaFileStorage] Initialized with', this.indexCache?.personas.length || 0, 'personas');
    }

    /**
     * Load the persona index from disk
     */
    private async loadIndex(): Promise<PersonaIndex> {
        if (!this.indexCache) {
            const index = await this.fileStorage.read<PersonaIndex>(INDEX_FILE);
            this.indexCache = index || createEmptyPersonaIndex();
        }
        return this.indexCache;
    }

    /**
     * Save the index to disk
     */
    private async saveIndex(): Promise<void> {
        if (!this.indexCache) return;

        this.indexCache.lastUpdated = Date.now();
        await this.fileStorage.write(INDEX_FILE, this.indexCache);
    }

    // ==================== CRUD OPERATIONS ====================

    /**
     * Get all personas
     */
    async getAllPersonas(): Promise<Persona[]> {
        const index = await this.loadIndex();
        const personas: Persona[] = [];

        for (const meta of index.personas) {
            const persona = await this.getPersonaById(meta.id);
            if (persona) {
                personas.push(persona);
            }
        }

        // Sort by updatedAt descending
        return personas.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    /**
     * Get a persona by ID
     */
    async getPersonaById(id: string): Promise<Persona | null> {
        // Check cache first
        const cacheKey = `persona_${id}`;
        if (this.memoryCache.has(cacheKey)) {
            return this.memoryCache.get(cacheKey);
        }

        const personaPath = `${PERSONAS_DIR}/${id}/persona.json`;
        const file = await this.fileStorage.read<PersonaFile>(personaPath);

        if (!file) {
            return null;
        }

        // Cache and return
        this.memoryCache.set(cacheKey, file.persona);
        return file.persona;
    }

    /**
     * Search personas by name
     */
    async searchPersonas(query: string): Promise<Persona[]> {
        const personas = await this.getAllPersonas();
        const lowerQuery = query.toLowerCase();
        return personas.filter((p) => p.name.toLowerCase().includes(lowerQuery));
    }

    /**
     * Get persona count
     */
    async getPersonaCount(): Promise<number> {
        const index = await this.loadIndex();
        return index.personas.length;
    }

    /**
     * CreatePersona a new persona
     * Validates: Requirements 1.2, 2.5
     */
    async createPersona(
        name: string,
        attributes: Record<string, string>,
        options?: {
            backstory?: string;
            additionalContext?: string;
            generationPrompt?: string;
            inputTokens?: number;
            outputTokens?: number;
            totalTokens?: number;
            apiUsed?: string;
            modelUsed?: string;
        }
    ): Promise<Persona> {
        const newPersona: Persona = {
            id: crypto.randomUUID(),
            name,
            attributes,
            backstory: options?.backstory,
            additionalContext: options?.additionalContext,
            generationPrompt: options?.generationPrompt,
            inputTokens: options?.inputTokens ?? 0,
            outputTokens: options?.outputTokens ?? 0,
            totalTokens: options?.totalTokens ?? 0,
            apiUsed: options?.apiUsed,
            modelUsed: options?.modelUsed,
            versionNumber: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        // Save persona file
        await this.savePersona(newPersona);

        return newPersona;
    }

    /**
     * Save a persona to disk
     */
    private async savePersona(persona: Persona): Promise<void> {
        const personaPath = `${PERSONAS_DIR}/${persona.id}/persona.json`;
        const index = await this.loadIndex();

        // Check if it's a favorite
        const isFavorite = index.favoriteIds.includes(persona.id);

        // Create file
        const file = createPersonaFile(persona, isFavorite);

        // Write persona file
        await this.fileStorage.write(personaPath, file);

        // Update index
        await this.updateIndex(createPersonaMeta(persona, isFavorite));

        // Update cache
        this.memoryCache.set(`persona_${persona.id}`, persona);
    }

    /**
     * Update an existing persona
     */
    async updatePersona(
        id: string,
        updates: Partial<Omit<Persona, 'id' | 'createdAt'>>
    ): Promise<Persona | null> {
        const persona = await this.getPersonaById(id);

        if (!persona) {
            return null;
        }

        const updatedPersona: Persona = {
            ...persona,
            ...updates,
            updatedAt: Date.now(),
        };

        await this.savePersona(updatedPersona);
        return updatedPersona;
    }

    /**
     * Regenerate a persona with version increment
     * Validates: Requirements 2.1, 2.2, 2.3, 2.4
     */
    async regeneratePersona(
        id: string,
        updates: {
            name?: string;
            attributes?: Record<string, string>;
            additionalContext?: string;
            backstory?: string;
            generationPrompt?: string;
            inputTokens?: number;
            outputTokens?: number;
            totalTokens?: number;
            apiUsed?: string;
            modelUsed?: string;
        }
    ): Promise<Persona | null> {
        const persona = await this.getPersonaById(id);

        if (!persona) {
            return null;
        }

        // Preserve original persona_id and created_at, increment version
        const regeneratedPersona: Persona = {
            ...persona,
            ...updates,
            versionNumber: (persona.versionNumber ?? 1) + 1,
            updatedAt: Date.now(),
        };

        await this.savePersona(regeneratedPersona);
        return regeneratedPersona;
    }

    /**
     * Delete a persona
     */
    async deletePersona(id: string): Promise<boolean> {
        const personaDir = `${PERSONAS_DIR}/${id}`;

        // Delete directory
        const deleted = await this.fileStorage.deleteDirectory(personaDir);

        // Remove from index
        await this.removeFromIndex(id);

        // Remove from favorites if present
        await this.removeFromFavorites(id);

        // Remove from cache
        this.memoryCache.delete(`persona_${id}`);

        return deleted;
    }

    /**
     * Update the persona index with new metadata
     */
    private async updateIndex(meta: PersonaMeta): Promise<void> {
        const index = await this.loadIndex();

        // Find and update or add
        const existingIndex = index.personas.findIndex((p) => p.id === meta.id);
        if (existingIndex >= 0) {
            index.personas[existingIndex] = meta;
        } else {
            index.personas.push(meta);
        }

        // Sort by updatedAt descending
        index.personas.sort((a, b) => b.updatedAt - a.updatedAt);

        await this.saveIndex();
    }

    /**
     * Remove a persona from the index
     */
    private async removeFromIndex(id: string): Promise<void> {
        const index = await this.loadIndex();
        index.personas = index.personas.filter((p) => p.id !== id);
        await this.saveIndex();
    }

    /**
     * List all personas (from index - metadata only)
     */
    async listPersonas(): Promise<PersonaMeta[]> {
        const index = await this.loadIndex();
        return index.personas;
    }

    // ==================== FAVORITES MANAGEMENT ====================
    // Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5

    /**
     * Get all favorite persona IDs
     */
    async getFavoriteIds(): Promise<string[]> {
        const index = await this.loadIndex();
        return index.favoriteIds;
    }

    /**
     * Get all favorite personas with full data
     */
    async getFavorites(): Promise<Persona[]> {
        const favoriteIds = await this.getFavoriteIds();
        const favorites: Persona[] = [];

        for (const id of favoriteIds) {
            const persona = await this.getPersonaById(id);
            if (persona) {
                favorites.push(persona);
            }
        }

        return favorites;
    }

    /**
     * Get favorites count
     */
    async getFavoritesCount(): Promise<number> {
        const index = await this.loadIndex();
        return index.favoriteIds.length;
    }

    /**
     * Check if a persona is a favorite
     */
    async isFavorite(id: string): Promise<boolean> {
        const index = await this.loadIndex();
        return index.favoriteIds.includes(id);
    }

    /**
     * Add a persona to favorites
     * Validates: Requirements 4.1, 4.2
     * @throws FavoritesLimitError if limit exceeded
     */
    async addFavorite(id: string): Promise<void> {
        const index = await this.loadIndex();

        // Check if already a favorite
        if (index.favoriteIds.includes(id)) {
            return;
        }

        // Check limit
        if (index.favoriteIds.length >= MAX_FAVORITES) {
            throw new FavoritesLimitError();
        }

        // Verify persona exists
        const persona = await this.getPersonaById(id);
        if (!persona) {
            throw new PersonaDatabaseError(`Persona with id ${id} not found`);
        }

        // Add to favorites
        index.favoriteIds.push(id);

        // Update index in personas list
        const metaIndex = index.personas.findIndex((p) => p.id === id);
        if (metaIndex >= 0) {
            index.personas[metaIndex].isFavorite = true;
        }

        await this.saveIndex();

        // Update persona file to reflect favorite status
        await this.savePersona(persona);
    }

    /**
     * Remove a persona from favorites
     * Validates: Requirements 4.3
     */
    async removeFavorite(id: string): Promise<void> {
        await this.removeFromFavorites(id);
    }

    /**
     * Internal method to remove from favorites without triggering persona save
     */
    private async removeFromFavorites(id: string): Promise<void> {
        const index = await this.loadIndex();

        index.favoriteIds = index.favoriteIds.filter((fid) => fid !== id);

        // Update index in personas list
        const metaIndex = index.personas.findIndex((p) => p.id === id);
        if (metaIndex >= 0) {
            index.personas[metaIndex].isFavorite = false;
        }

        await this.saveIndex();
    }

    /**
     * Toggle favorite status
     */
    async toggleFavorite(id: string): Promise<boolean> {
        if (await this.isFavorite(id)) {
            await this.removeFavorite(id);
            return false;
        } else {
            await this.addFavorite(id);
            return true;
        }
    }

    // ==================== MIGRATION ====================
    // Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5

    /**
     * Migrate personas from legacy globalState format
     */
    async migrateFromLegacy(legacyPersonas: LegacyPersona[]): Promise<{
        succeeded: number;
        failed: number;
        errors: Array<{ persona: LegacyPersona; error: string }>;
    }> {
        const results = {
            succeeded: 0,
            failed: 0,
            errors: [] as Array<{ persona: LegacyPersona; error: string }>,
        };

        for (const legacy of legacyPersonas) {
            try {
                await this.createPersona(legacy.name, legacy.attributes ?? {}, {
                    backstory: legacy.backstory,
                    additionalContext: legacy.additionalContext,
                });
                results.succeeded++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    persona: legacy,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return results;
    }

    // ==================== CACHE MANAGEMENT ====================

    /**
     * Preload all personas into memory cache
     */
    async preloadCache(): Promise<void> {
        console.log('[PersonaFileStorage] Preloading cache...');

        const personas = await this.getAllPersonas();
        for (const persona of personas) {
            this.memoryCache.set(`persona_${persona.id}`, persona);
        }

        console.log('[PersonaFileStorage] Loaded', personas.length, 'personas into cache');
    }

    /**
     * Clear all cached data
     */
    clearCache(): void {
        this.memoryCache.clear();
        this.indexCache = null;
    }

    /**
     * Clear all personas
     */
    async clearAll(): Promise<void> {
        const index = await this.loadIndex();

        // Make a copy to avoid modifying while iterating
        const toDelete = [...index.personas];

        // Delete each persona directory
        for (const meta of toDelete) {
            await this.fileStorage.deleteDirectory(`${PERSONAS_DIR}/${meta.id}`);
        }

        // Reset index
        this.indexCache = createEmptyPersonaIndex();
        await this.saveIndex();

        // Clear cache
        this.memoryCache.clear();
    }

    // ==================== UTILITY ====================

    /**
     * Generate a natural language prompt from persona attributes
     */
    generatePrompt(persona: Persona): string {
        const attrs = persona.attributes;
        if (Object.keys(attrs).length === 0) {
            return `Create a backstory for an individual named "${persona.name}".`;
        }

        const attributeDescriptions = Object.entries(attrs)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

        return `Create a backstory for an individual that is described with the following characteristics, traits, or demographics: ${attributeDescriptions}`;
    }

    /**
     * Get copyable text for a persona field
     */
    getCopyableText(persona: Persona, field: 'prompt' | 'backstory'): string | null {
        switch (field) {
            case 'prompt':
                return persona.generationPrompt ?? this.generatePrompt(persona);
            case 'backstory':
                return persona.backstory ?? null;
            default:
                return null;
        }
    }

    /**
     * Get storage statistics
     */
    async getStats(): Promise<{ personaCount: number; favoritesCount: number; indexSize: number }> {
        const index = await this.loadIndex();
        const stat = await this.fileStorage.stat(INDEX_FILE);

        return {
            personaCount: index.personas.length,
            favoritesCount: index.favoriteIds.length,
            indexSize: stat?.size || 0,
        };
    }
}

/**
 * Create and initialize a PersonaFileStorage
 */
export async function createPersonaFileStorage(
    fileStorage: FileStorageService
): Promise<PersonaFileStorage> {
    const storage = new PersonaFileStorage(fileStorage);
    await storage.initialize();
    await storage.preloadCache();
    return storage;
}
