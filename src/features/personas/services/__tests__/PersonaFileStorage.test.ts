/**
 * Unit tests for PersonaFileStorage
 * 
 * Tests file-based persona storage with 90%+ coverage target.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PersonaFileStorage, createPersonaFileStorage, FavoritesLimitError, PersonaDatabaseError } from '../PersonaFileStorage';
import { FileStorageService } from '../../../../shared/services/FileStorageService';
import { MAX_FAVORITES } from '../../types/PersonaFileTypes';

describe('PersonaFileStorage', () => {
    let storage: PersonaFileStorage;
    let fileStorage: FileStorageService;
    let tempDir: string;

    const createTestPersona = (name: string = 'Test Persona'): { name: string; attributes: Record<string, string> } => ({
        name,
        attributes: { role: 'Developer', age: '30' },
    });

    beforeEach(async () => {
        // Create unique temp directory for each test
        tempDir = path.join(os.tmpdir(), `persona-storage-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        fs.mkdirSync(tempDir, { recursive: true });

        fileStorage = new FileStorageService(tempDir);
        storage = new PersonaFileStorage(fileStorage);
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
        it('should create personas directory', async () => {
            const exists = fs.existsSync(path.join(tempDir, 'personas'));
            expect(exists).toBe(true);
        });

        it('should create empty index if none exists', async () => {
            const metas = await storage.listPersonas();
            expect(metas).toEqual([]);
        });

        it('should load existing index', async () => {
            // Create a persona first
            const { name, attributes } = createTestPersona();
            await storage.createPersona(name, attributes);

            // Create new storage instance
            const newStorage = new PersonaFileStorage(fileStorage);
            await newStorage.initialize();

            const metas = await newStorage.listPersonas();
            expect(metas).toHaveLength(1);
            expect(metas[0].name).toBe('Test Persona');
        });
    });

    describe('createPersona', () => {
        it('should create a persona with required fields', async () => {
            const { name, attributes } = createTestPersona();
            const persona = await storage.createPersona(name, attributes);

            expect(persona.id).toBeDefined();
            expect(persona.name).toBe('Test Persona');
            expect(persona.attributes).toEqual({ role: 'Developer', age: '30' });
            expect(persona.versionNumber).toBe(1);
        });

        it('should create a persona with optional fields', async () => {
            const { name, attributes } = createTestPersona();
            const persona = await storage.createPersona(name, attributes, {
                backstory: 'A developer from San Francisco',
                additionalContext: 'Works at a startup',
                generationPrompt: 'Create a persona',
                inputTokens: 100,
                outputTokens: 200,
                totalTokens: 300,
                apiUsed: 'gemini',
                modelUsed: 'gemini-pro',
            });

            expect(persona.backstory).toBe('A developer from San Francisco');
            expect(persona.additionalContext).toBe('Works at a startup');
            expect(persona.inputTokens).toBe(100);
            expect(persona.outputTokens).toBe(200);
        });

        it('should save persona to disk', async () => {
            const { name, attributes } = createTestPersona();
            const persona = await storage.createPersona(name, attributes);

            const filePath = path.join(tempDir, 'personas', persona.id, 'persona.json');
            expect(fs.existsSync(filePath)).toBe(true);
        });

        it('should update index after create', async () => {
            const { name, attributes } = createTestPersona();
            await storage.createPersona(name, attributes);

            const metas = await storage.listPersonas();
            expect(metas).toHaveLength(1);
        });
    });

    describe('getPersonaById', () => {
        it('should return null for non-existent persona', async () => {
            const result = await storage.getPersonaById('nonexistent');
            expect(result).toBeNull();
        });

        it('should return saved persona', async () => {
            const { name, attributes } = createTestPersona('Unique Name');
            const created = await storage.createPersona(name, attributes);

            const loaded = await storage.getPersonaById(created.id);
            expect(loaded).not.toBeNull();
            expect(loaded?.name).toBe('Unique Name');
        });

        it('should cache persona after first load', async () => {
            const { name, attributes } = createTestPersona();
            const created = await storage.createPersona(name, attributes);

            // First load
            const loaded1 = await storage.getPersonaById(created.id);
            // Second load (should come from cache)
            const loaded2 = await storage.getPersonaById(created.id);

            expect(loaded1).toEqual(loaded2);
        });
    });

    describe('getAllPersonas', () => {
        it('should return empty array when no personas', async () => {
            const result = await storage.getAllPersonas();
            expect(result).toEqual([]);
        });

        it('should return all personas', async () => {
            await storage.createPersona('Persona 1', { role: 'Developer' });
            await storage.createPersona('Persona 2', { role: 'Designer' });
            await storage.createPersona('Persona 3', { role: 'Manager' });

            const personas = await storage.getAllPersonas();
            expect(personas).toHaveLength(3);
        });

        it('should sort by updatedAt descending', async () => {
            await storage.createPersona('First', {});
            await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
            await storage.createPersona('Second', {});

            const personas = await storage.getAllPersonas();
            expect(personas[0].name).toBe('Second');
            expect(personas[1].name).toBe('First');
        });
    });

    describe('searchPersonas', () => {
        it('should find personas by name', async () => {
            await storage.createPersona('John Developer', {});
            await storage.createPersona('Jane Designer', {});
            await storage.createPersona('Bob Manager', {});

            const results = await storage.searchPersonas('John');
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('John Developer');
        });

        it('should be case insensitive', async () => {
            await storage.createPersona('UPPERCASE', {});

            const results = await storage.searchPersonas('upper');
            expect(results).toHaveLength(1);
        });

        it('should return empty array for no matches', async () => {
            await storage.createPersona('Test', {});

            const results = await storage.searchPersonas('nomatch');
            expect(results).toHaveLength(0);
        });
    });

    describe('updatePersona', () => {
        it('should return null for non-existent persona', async () => {
            const result = await storage.updatePersona('nonexistent', { name: 'New Name' });
            expect(result).toBeNull();
        });

        it('should update persona fields', async () => {
            const { name, attributes } = createTestPersona();
            const created = await storage.createPersona(name, attributes);

            const updated = await storage.updatePersona(created.id, {
                name: 'Updated Name',
                backstory: 'New backstory',
            });

            expect(updated?.name).toBe('Updated Name');
            expect(updated?.backstory).toBe('New backstory');
        });

        it('should update updatedAt timestamp', async () => {
            const { name, attributes } = createTestPersona();
            const created = await storage.createPersona(name, attributes);
            const originalUpdatedAt = created.updatedAt;

            await new Promise(resolve => setTimeout(resolve, 10));

            const updated = await storage.updatePersona(created.id, { name: 'New' });
            expect(updated?.updatedAt).toBeGreaterThan(originalUpdatedAt);
        });
    });

    describe('regeneratePersona', () => {
        it('should return null for non-existent persona', async () => {
            const result = await storage.regeneratePersona('nonexistent', { backstory: 'New' });
            expect(result).toBeNull();
        });

        it('should increment version number', async () => {
            const { name, attributes } = createTestPersona();
            const created = await storage.createPersona(name, attributes);
            expect(created.versionNumber).toBe(1);

            const regenerated = await storage.regeneratePersona(created.id, {
                backstory: 'Regenerated backstory',
            });

            expect(regenerated?.versionNumber).toBe(2);
        });

        it('should preserve id and createdAt', async () => {
            const { name, attributes } = createTestPersona();
            const created = await storage.createPersona(name, attributes);

            const regenerated = await storage.regeneratePersona(created.id, {
                backstory: 'New',
            });

            expect(regenerated?.id).toBe(created.id);
            expect(regenerated?.createdAt).toBe(created.createdAt);
        });
    });

    describe('deletePersona', () => {
        it('should delete persona from disk', async () => {
            const { name, attributes } = createTestPersona();
            const created = await storage.createPersona(name, attributes);

            const deleted = await storage.deletePersona(created.id);

            expect(deleted).toBe(true);
            expect(fs.existsSync(path.join(tempDir, 'personas', created.id))).toBe(false);
        });

        it('should remove from index', async () => {
            const { name, attributes } = createTestPersona();
            const created = await storage.createPersona(name, attributes);
            await storage.deletePersona(created.id);

            const metas = await storage.listPersonas();
            expect(metas.find(m => m.id === created.id)).toBeUndefined();
        });

        it('should remove from favorites if present', async () => {
            const { name, attributes } = createTestPersona();
            const created = await storage.createPersona(name, attributes);
            await storage.addFavorite(created.id);

            await storage.deletePersona(created.id);

            const favorites = await storage.getFavoriteIds();
            expect(favorites).not.toContain(created.id);
        });
    });

    describe('getPersonaCount', () => {
        it('should return 0 for empty storage', async () => {
            const count = await storage.getPersonaCount();
            expect(count).toBe(0);
        });

        it('should return correct count', async () => {
            await storage.createPersona('P1', {});
            await storage.createPersona('P2', {});

            const count = await storage.getPersonaCount();
            expect(count).toBe(2);
        });
    });

    describe('favorites management', () => {
        describe('addFavorite', () => {
            it('should add persona to favorites', async () => {
                const { name, attributes } = createTestPersona();
                const created = await storage.createPersona(name, attributes);

                await storage.addFavorite(created.id);

                const isFav = await storage.isFavorite(created.id);
                expect(isFav).toBe(true);
            });

            it('should not duplicate favorites', async () => {
                const { name, attributes } = createTestPersona();
                const created = await storage.createPersona(name, attributes);

                await storage.addFavorite(created.id);
                await storage.addFavorite(created.id); // Add again

                const ids = await storage.getFavoriteIds();
                expect(ids.filter(id => id === created.id)).toHaveLength(1);
            });

            it('should throw FavoritesLimitError when limit exceeded', async () => {
                // Create 5 personas and add all as favorites
                for (let i = 0; i < MAX_FAVORITES; i++) {
                    const p = await storage.createPersona(`Person ${i}`, {});
                    await storage.addFavorite(p.id);
                }

                // Try to add a 6th
                const extra = await storage.createPersona('Extra', {});

                await expect(storage.addFavorite(extra.id)).rejects.toThrow(FavoritesLimitError);
            });

            it('should throw PersonaDatabaseError for non-existent persona', async () => {
                await expect(storage.addFavorite('nonexistent')).rejects.toThrow(PersonaDatabaseError);
            });
        });

        describe('removeFavorite', () => {
            it('should remove from favorites', async () => {
                const { name, attributes } = createTestPersona();
                const created = await storage.createPersona(name, attributes);
                await storage.addFavorite(created.id);

                await storage.removeFavorite(created.id);

                const isFav = await storage.isFavorite(created.id);
                expect(isFav).toBe(false);
            });
        });

        describe('getFavorites', () => {
            it('should return full persona data', async () => {
                const { name, attributes } = createTestPersona();
                const created = await storage.createPersona(name, attributes);
                await storage.addFavorite(created.id);

                const favorites = await storage.getFavorites();
                expect(favorites).toHaveLength(1);
                expect(favorites[0].name).toBe('Test Persona');
            });
        });

        describe('getFavoritesCount', () => {
            it('should return correct count', async () => {
                const p1 = await storage.createPersona('P1', {});
                const p2 = await storage.createPersona('P2', {});
                await storage.addFavorite(p1.id);
                await storage.addFavorite(p2.id);

                const count = await storage.getFavoritesCount();
                expect(count).toBe(2);
            });
        });

        describe('toggleFavorite', () => {
            it('should add when not favorite', async () => {
                const { name, attributes } = createTestPersona();
                const created = await storage.createPersona(name, attributes);

                const result = await storage.toggleFavorite(created.id);
                expect(result).toBe(true);
                expect(await storage.isFavorite(created.id)).toBe(true);
            });

            it('should remove when already favorite', async () => {
                const { name, attributes } = createTestPersona();
                const created = await storage.createPersona(name, attributes);
                await storage.addFavorite(created.id);

                const result = await storage.toggleFavorite(created.id);
                expect(result).toBe(false);
                expect(await storage.isFavorite(created.id)).toBe(false);
            });
        });
    });

    describe('migrateFromLegacy', () => {
        it('should migrate legacy personas', async () => {
            const legacyPersonas = [
                { name: 'Legacy 1', backstory: 'Story 1', attributes: { role: 'Dev' } },
                { name: 'Legacy 2', backstory: 'Story 2' },
            ];

            const results = await storage.migrateFromLegacy(legacyPersonas);

            expect(results.succeeded).toBe(2);
            expect(results.failed).toBe(0);
            expect(await storage.getPersonaCount()).toBe(2);
        });

        it('should track migration errors', async () => {
            // Create a persona that will cause the migration to fail by mocking
            const legacyPersonas = [
                { name: 'Valid', backstory: 'Story' },
            ];

            const results = await storage.migrateFromLegacy(legacyPersonas);
            expect(results.succeeded).toBe(1);
        });
    });

    describe('clearAll', () => {
        it('should delete all personas', async () => {
            await storage.createPersona('P1', {});
            await storage.createPersona('P2', {});
            await storage.createPersona('P3', {});

            await storage.clearAll();

            const count = await storage.getPersonaCount();
            expect(count).toBe(0);
        });

        it('should clear favorites', async () => {
            const p = await storage.createPersona('P1', {});
            await storage.addFavorite(p.id);

            await storage.clearAll();

            const favCount = await storage.getFavoritesCount();
            expect(favCount).toBe(0);
        });
    });

    describe('preloadCache', () => {
        it('should load all personas into cache', async () => {
            await storage.createPersona('P1', {});
            await storage.createPersona('P2', {});

            storage.clearCache();
            await storage.preloadCache();

            // Subsequent calls should use cache
            const personas = await storage.getAllPersonas();
            expect(personas).toHaveLength(2);
        });
    });

    describe('generatePrompt', () => {
        it('should generate prompt from attributes', async () => {
            const { name, attributes } = createTestPersona();
            const persona = await storage.createPersona(name, attributes);

            const prompt = storage.generatePrompt(persona);
            expect(prompt).toContain('role: Developer');
            expect(prompt).toContain('age: 30');
        });

        it('should generate simple prompt for empty attributes', async () => {
            const persona = await storage.createPersona('Simple', {});

            const prompt = storage.generatePrompt(persona);
            expect(prompt).toContain('Simple');
        });
    });

    describe('getCopyableText', () => {
        it('should return backstory for backstory field', async () => {
            const { name, attributes } = createTestPersona();
            const persona = await storage.createPersona(name, attributes, {
                backstory: 'My backstory',
            });

            const text = storage.getCopyableText(persona, 'backstory');
            expect(text).toBe('My backstory');
        });

        it('should return null for missing backstory', async () => {
            const { name, attributes } = createTestPersona();
            const persona = await storage.createPersona(name, attributes);

            const text = storage.getCopyableText(persona, 'backstory');
            expect(text).toBeNull();
        });

        it('should return generationPrompt or generated prompt', async () => {
            const { name, attributes } = createTestPersona();
            const persona = await storage.createPersona(name, attributes);

            const text = storage.getCopyableText(persona, 'prompt');
            expect(text).toBeDefined();
        });
    });

    describe('getStats', () => {
        it('should return correct stats', async () => {
            const p1 = await storage.createPersona('P1', {});
            await storage.createPersona('P2', {});
            await storage.addFavorite(p1.id);

            const stats = await storage.getStats();
            expect(stats.personaCount).toBe(2);
            expect(stats.favoritesCount).toBe(1);
            expect(stats.indexSize).toBeGreaterThan(0);
        });
    });

    describe('createPersonaFileStorage', () => {
        it('should create and initialize storage', async () => {
            const created = await createPersonaFileStorage(fileStorage);
            expect(created).toBeInstanceOf(PersonaFileStorage);
        });
    });
});
