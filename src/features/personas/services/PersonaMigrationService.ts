/**
 * PersonaMigrationService - Migrate persona data from globalState to file storage
 * 
 * Handles one-time migration of persona data from VS Code's
 * globalState to the new file-based storage system.
 * 
 * @module features/personas/services/PersonaMigrationService
 */

import * as vscode from 'vscode';
import { PersonaFileStorage } from './PersonaFileStorage';
import { LegacyPersona } from '../types/PersonaFileTypes';

const MIGRATION_KEY = 'personaut.migration.personaFileStorage.v2'; // v2: Added personaut.personas key check
const LEGACY_STORAGE_KEY = 'personaut.customerProfiles';
const LEGACY_FAVORITES_KEY = 'personaut.favoritePersonas';

export interface PersonaMigrationResult {
    success: boolean;
    personasMigrated: number;
    favoritesMigrated: number;
    errors: string[];
}

/**
 * Service to migrate persona data from globalState to file storage
 */
export class PersonaMigrationService {
    constructor(
        private globalState: vscode.Memento,
        private personaFileStorage: PersonaFileStorage
    ) { }

    /**
     * Check if migration is needed
     */
    async needsMigration(): Promise<boolean> {
        // Check if already migrated
        const migrated = this.globalState.get<boolean>(MIGRATION_KEY, false);
        if (migrated) {
            return false;
        }

        // Check if there's data to migrate from any of the possible keys
        const personas1 = this.globalState.get<LegacyPersona[]>(LEGACY_STORAGE_KEY, []); // personaut.customerProfiles
        const personas2 = this.globalState.get<LegacyPersona[]>('personaut.personas', []);
        return personas1.length > 0 || personas2.length > 0;
    }

    /**
     * Migrate all personas from globalState to file storage
     */
    async migratePersonas(): Promise<PersonaMigrationResult> {
        const result: PersonaMigrationResult = {
            success: true,
            personasMigrated: 0,
            favoritesMigrated: 0,
            errors: [],
        };

        try {
            // Get personas from all possible keys in globalState
            const personas1 = this.globalState.get<LegacyPersona[]>(LEGACY_STORAGE_KEY, []); // personaut.customerProfiles
            const personas2 = this.globalState.get<LegacyPersona[]>('personaut.personas', []);
            const legacyFavorites = this.globalState.get<string[]>(LEGACY_FAVORITES_KEY, []);

            // Merge and deduplicate by ID or name
            const allPersonas = [...personas1, ...personas2];
            const uniquePersonas = new Map<string, LegacyPersona>();
            for (const persona of allPersonas) {
                const key = persona.id || persona.name;
                if (key && !uniquePersonas.has(key)) {
                    uniquePersonas.set(key, persona);
                }
            }

            const legacyPersonas = Array.from(uniquePersonas.values());

            if (legacyPersonas.length === 0) {
                console.log('[PersonaMigrationService] No personas to migrate');
                return result;
            }

            console.log(`[PersonaMigrationService] Starting migration of ${legacyPersonas.length} personas...`);

            // Migrate each persona
            for (const legacy of legacyPersonas) {
                try {
                    const persona = await this.personaFileStorage.createPersona(
                        legacy.name,
                        legacy.attributes || {},
                        {
                            backstory: legacy.backstory,
                            additionalContext: legacy.additionalContext,
                            inputTokens: legacy.inputTokens,
                            outputTokens: legacy.outputTokens,
                            totalTokens: legacy.totalTokens,
                        }
                    );

                    // If this persona was a favorite, add it
                    if (legacy.id && legacyFavorites.includes(legacy.id)) {
                        try {
                            await this.personaFileStorage.addFavorite(persona.id);
                            result.favoritesMigrated++;
                        } catch {
                            // Ignore favorite add errors
                        }
                    }

                    result.personasMigrated++;
                } catch (error: any) {
                    const errorMsg = `Failed to migrate persona ${legacy.name}: ${error?.message || 'Unknown error'}`;
                    console.error(`[PersonaMigrationService] ${errorMsg}`);
                    result.errors.push(errorMsg);
                }
            }

            // Verify migration
            const migratedCount = await this.personaFileStorage.getPersonaCount();
            if (migratedCount !== legacyPersonas.length) {
                const warning = `Migration verification warning: Expected ${legacyPersonas.length}, got ${migratedCount}`;
                console.warn(`[PersonaMigrationService] ${warning}`);
                result.errors.push(warning);
            }

            console.log(`[PersonaMigrationService] Migration complete: ${result.personasMigrated} personas, ${result.favoritesMigrated} favorites migrated`);

        } catch (error: any) {
            result.success = false;
            result.errors.push(`Migration failed: ${error?.message || 'Unknown error'}`);
            console.error('[PersonaMigrationService] Migration failed:', error);
        }

        return result;
    }

    /**
     * Mark migration as complete
     */
    async markComplete(): Promise<void> {
        await this.globalState.update(MIGRATION_KEY, true);
        console.log('[PersonaMigrationService] Migration marked as complete');
    }

    /**
     * Run full migration if needed
     */
    async runMigrationIfNeeded(): Promise<PersonaMigrationResult | null> {
        const needsMigration = await this.needsMigration();

        if (!needsMigration) {
            console.log('[PersonaMigrationService] No migration needed');
            return null;
        }

        console.log('[PersonaMigrationService] Migration needed, starting...');
        const result = await this.migratePersonas();

        if (result.success && result.errors.length === 0) {
            await this.markComplete();

            // Clear old data from globalState to free up space
            console.log('[PersonaMigrationService] Clearing old globalState persona data...');
            await this.globalState.update(LEGACY_STORAGE_KEY, undefined);
            await this.globalState.update(LEGACY_FAVORITES_KEY, undefined);
            await this.globalState.update('personaut.personas', undefined);
            await this.globalState.update('personaut.favorites', undefined);
            console.log('[PersonaMigrationService] Old globalState persona data cleared');
        }

        return result;
    }

    /**
     * Force re-migration (for debugging)
     */
    async resetMigrationFlag(): Promise<void> {
        await this.globalState.update(MIGRATION_KEY, false);
        console.log('[PersonaMigrationService] Migration flag reset');
    }
}

/**
 * Create a persona migration service instance
 */
export function createPersonaMigrationService(
    globalState: vscode.Memento,
    personaFileStorage: PersonaFileStorage
): PersonaMigrationService {
    return new PersonaMigrationService(globalState, personaFileStorage);
}
