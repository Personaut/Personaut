/**
 * MigrationService - Migrate data from globalState to file storage
 * 
 * Handles one-time migration of conversation data from VS Code's
 * globalState to the new file-based storage system.
 * 
 * Features:
 * - Automatic migration detection
 * - Data integrity verification
 * - Graceful error handling
 * - Progress tracking
 * 
 * @module shared/services/MigrationService
 */

import * as vscode from 'vscode';
import { ConversationFileStorage } from '../../features/chat/services/ConversationFileStorage';
import { Conversation } from '../../features/chat/types/ChatTypes';

const MIGRATION_KEY = 'personaut.migration.fileStorage.v3'; // v3: Added Build mode data clearing

export interface MigrationResult {
    success: boolean;
    conversationsMigrated: number;
    errors: string[];
}

/**
 * Service to migrate data from globalState to file storage
 */
export class MigrationService {
    constructor(
        private globalState: vscode.Memento,
        private conversationFileStorage: ConversationFileStorage
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

        // Check if there's data to migrate from either key
        // (different parts of the codebase used different keys)
        const conversations1 = this.globalState.get<Conversation[]>('conversations', []);
        const conversations2 = this.globalState.get<Conversation[]>('conversationHistory', []);
        return conversations1.length > 0 || conversations2.length > 0;
    }

    /**
     * Migrate all conversations from globalState to file storage
     */
    async migrateConversations(): Promise<MigrationResult> {
        const result: MigrationResult = {
            success: true,
            conversationsMigrated: 0,
            errors: [],
        };

        try {
            // Get conversations from both possible keys in globalState
            const conversations1 = this.globalState.get<Conversation[]>('conversations', []);
            const conversations2 = this.globalState.get<Conversation[]>('conversationHistory', []);

            // Merge and deduplicate by ID
            const allConversations = [...conversations1, ...conversations2];
            const uniqueConversations = new Map<string, Conversation>();
            for (const conv of allConversations) {
                if (conv.id && !uniqueConversations.has(conv.id)) {
                    uniqueConversations.set(conv.id, conv);
                }
            }

            const conversations = Array.from(uniqueConversations.values());

            if (conversations.length === 0) {
                console.log('[MigrationService] No conversations to migrate');
                return result;
            }

            console.log(`[MigrationService] Starting migration of ${conversations.length} conversations...`);

            // Migrate each conversation
            for (const conv of conversations) {
                try {
                    await this.conversationFileStorage.saveConversation(conv);
                    result.conversationsMigrated++;
                } catch (error: any) {
                    const errorMsg = `Failed to migrate conversation ${conv.id}: ${error?.message || 'Unknown error'}`;
                    console.error(`[MigrationService] ${errorMsg}`);
                    result.errors.push(errorMsg);
                }
            }

            // Verify migration
            const migratedConvs = await this.conversationFileStorage.getAllConversations();
            if (migratedConvs.length !== conversations.length) {
                const warning = `Migration verification warning: Expected ${conversations.length}, got ${migratedConvs.length}`;
                console.warn(`[MigrationService] ${warning}`);
                result.errors.push(warning);
            }

            console.log(`[MigrationService] Migration complete: ${result.conversationsMigrated} conversations migrated`);

        } catch (error: any) {
            result.success = false;
            result.errors.push(`Migration failed: ${error?.message || 'Unknown error'}`);
            console.error('[MigrationService] Migration failed:', error);
        }

        return result;
    }

    /**
     * Mark migration as complete
     */
    async markComplete(): Promise<void> {
        await this.globalState.update(MIGRATION_KEY, true);
        console.log('[MigrationService] Migration marked as complete');
    }

    /**
     * Run full migration if needed
     */
    async runMigrationIfNeeded(): Promise<MigrationResult | null> {
        const needsMigration = await this.needsMigration();

        if (!needsMigration) {
            console.log('[MigrationService] No migration needed');
            return null;
        }

        console.log('[MigrationService] Migration needed, starting...');
        const result = await this.migrateConversations();

        if (result.success && result.errors.length === 0) {
            await this.markComplete();

            // Clear old data from globalState to free up space
            console.log('[MigrationService] Clearing old globalState data...');

            // Chat/Conversation data
            await this.globalState.update('conversations', undefined);
            await this.globalState.update('personaut.conversations', undefined);
            await this.globalState.update('conversationHistory', undefined);

            // Build mode data (ensure file system is source of truth)
            await this.globalState.update('personaut.build.currentStage', undefined);
            await this.globalState.update('personaut.build.projectName', undefined);
            await this.globalState.update('personaut.build.projectTitle', undefined);
            await this.globalState.update('personaut.build.completedStages', undefined);
            await this.globalState.update('personaut.build.generatedPersonas', undefined);
            await this.globalState.update('personaut.build.generatedFeatures', undefined);
            await this.globalState.update('personaut.build.userStories', undefined);
            await this.globalState.update('personaut.build.userFlows', undefined);
            await this.globalState.update('personaut.build.generatedScreens', undefined);

            console.log('[MigrationService] Old globalState data cleared');
        }

        return result;
    }

    /**
     * Force re-migration (for debugging)
     */
    async resetMigrationFlag(): Promise<void> {
        await this.globalState.update(MIGRATION_KEY, false);
        console.log('[MigrationService] Migration flag reset');
    }
}

/**
 * Create a migration service instance
 */
export function createMigrationService(
    globalState: vscode.Memento,
    conversationFileStorage: ConversationFileStorage
): MigrationService {
    return new MigrationService(globalState, conversationFileStorage);
}
