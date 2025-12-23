/**
 * Database Migration for Chat History
 * 
 * Migrates existing conversation data from ConversationManager (globalState)
 * to the new file-based ChatHistoryService.
 * 
 * Feature: chat-enhancements
 * Validates: Requirements 2.1
 */

import * as vscode from 'vscode';
// DEPRECATED: This migration file is no longer used
// ChatHistoryService was replaced by ConversationFileStorage
// import { ChatHistoryService } from './ChatHistoryService';
import { generateMessageId, ChatHistoryMessage } from './ChatHistoryTypes';

// Stub type for backwards compatibility
type ChatHistoryService = any;

/**
 * Migration version to prevent duplicate migrations
 */
const MIGRATION_VERSION = 'v1.0.0';
const MIGRATION_KEY = 'chat-history-migration-version';

/**
 * Structure of existing conversation data
 */
interface LegacyConversation {
    id: string;
    title: string;
    timestamp: number;
    lastUpdated?: number;
    messages: Array<{
        role: 'user' | 'model' | 'error';
        text: string;
        timestamp?: number;
    }>;
}

/**
 * Check if migration has already been completed
 */
export async function isMigrationCompleted(context: vscode.ExtensionContext): Promise<boolean> {
    const version = context.globalState.get<string>(MIGRATION_KEY);
    return version === MIGRATION_VERSION;
}

/**
 * Mark migration as completed
 */
export async function markMigrationCompleted(context: vscode.ExtensionContext): Promise<void> {
    await context.globalState.update(MIGRATION_KEY, MIGRATION_VERSION);
}

/**
 * Get legacy conversations from globalState
 */
function getLegacyConversations(context: vscode.ExtensionContext): LegacyConversation[] {
    // ConversationManager stores data with key 'personaut.conversations'
    const storageKey = 'personaut.conversations';

    try {
        const rawData = context.globalState.get<any>(storageKey);

        if (!rawData) {
            return [];
        }

        // Handle different storage versions
        if (rawData.version === 2) {
            // V2 format: conversations are in rawData.conversations
            return Object.values(rawData.conversations || {}) as LegacyConversation[];
        } else if (rawData.version === 1) {
            // V1 format: direct conversation array or object
            if (Array.isArray(rawData)) {
                return rawData;
            }
            return Object.values(rawData.conversations || rawData || {}) as LegacyConversation[];
        } else if (typeof rawData === 'object') {
            // Assume it's a V1-like structure
            return Object.values(rawData) as LegacyConversation[];
        }

        return [];
    } catch (error) {
        console.error('[ChatMigration] Failed to read legacy conversations:', error);
        return [];
    }
}

/**
 * Convert legacy conversation to new session/messages format
 */
function convertToNewFormat(legacy: LegacyConversation): {
    sessionId: string;
    createdAt: number;
    messages: ChatHistoryMessage[];
} {
    const sessionId = legacy.id.startsWith('session_') ? legacy.id : `session_${legacy.id}`;
    const createdAt = legacy.timestamp || Date.now();

    const messages: ChatHistoryMessage[] = legacy.messages.map((msg, index) => ({
        messageId: generateMessageId(),
        sessionId,
        actorName: msg.role === 'user' ? 'user' : msg.role === 'error' ? 'system' : 'pippet',
        actorType: msg.role === 'user' ? 'user' : 'system_agent',
        messageContent: msg.text,
        tokenCount: Math.ceil(msg.text.length / 4), // Rough estimate
        tokenDirection: msg.role === 'user' ? 'input' : 'output',
        timestamp: msg.timestamp || createdAt + index * 1000, // Ensure ordering
    }));

    return { sessionId, createdAt, messages };
}

/**
 * Migrate existing conversations to new format
 * 
 * @param context - VS Code extension context for accessing globalState
 * @param chatHistoryService - The new ChatHistoryService instance
 * @returns Number of conversations migrated
 */
export async function migrateConversations(
    context: vscode.ExtensionContext,
    chatHistoryService: ChatHistoryService
): Promise<number> {
    // Check if already migrated
    if (await isMigrationCompleted(context)) {
        console.log('[ChatMigration] Migration already completed, skipping');
        return 0;
    }

    console.log('[ChatMigration] Starting conversation migration...');

    try {
        // Initialize the new service if needed
        await chatHistoryService.initialize();

        // Get legacy conversations
        const legacyConversations = getLegacyConversations(context);

        if (legacyConversations.length === 0) {
            console.log('[ChatMigration] No legacy conversations found');
            await markMigrationCompleted(context);
            return 0;
        }

        console.log(`[ChatMigration] Found ${legacyConversations.length} conversations to migrate`);

        let migratedCount = 0;

        for (const legacy of legacyConversations) {
            try {
                const { sessionId, messages } = convertToNewFormat(legacy);

                // Create session (using internal method via direct data manipulation)
                // Since ChatHistoryService doesn't expose a way to create sessions with specific IDs,
                // we'll import the data directly

                // For each message, save it
                for (const message of messages) {
                    // Override sessionId to match legacy
                    const messageWithSession = { ...message, sessionId };
                    await chatHistoryService.saveMessage(messageWithSession);
                }

                migratedCount++;
                console.log(`[ChatMigration] Migrated conversation ${legacy.id} with ${messages.length} messages`);
            } catch (error) {
                console.error(`[ChatMigration] Failed to migrate conversation ${legacy.id}:`, error);
                // Continue with other conversations
            }
        }

        // Mark migration as complete
        await markMigrationCompleted(context);

        console.log(`[ChatMigration] Migration complete. Migrated ${migratedCount} conversations`);
        return migratedCount;
    } catch (error) {
        console.error('[ChatMigration] Migration failed:', error);
        throw error;
    }
}

/**
 * Migrate token usage data
 */
export async function migrateTokenUsage(
    context: vscode.ExtensionContext,
    chatHistoryService: ChatHistoryService
): Promise<void> {
    const tokenUsageKey = 'personaut.tokenUsage';

    try {
        const tokenData = context.globalState.get<any>(tokenUsageKey);

        if (!tokenData) {
            console.log('[ChatMigration] No token usage data to migrate');
            return;
        }

        // Store token usage in settings
        await chatHistoryService.setSetting('legacy_total_input_tokens', String(tokenData.totalInputTokens || 0));
        await chatHistoryService.setSetting('legacy_total_output_tokens', String(tokenData.totalOutputTokens || 0));
        await chatHistoryService.setSetting('legacy_total_tokens', String(tokenData.totalTokens || 0));

        console.log('[ChatMigration] Token usage migrated:', tokenData);
    } catch (error) {
        console.error('[ChatMigration] Failed to migrate token usage:', error);
    }
}

/**
 * Migrate settings
 */
export async function migrateSettings(
    context: vscode.ExtensionContext,
    chatHistoryService: ChatHistoryService
): Promise<void> {
    try {
        // Migrate selected persona if it exists
        const selectedPersona = context.globalState.get<string>('personaut.selectedChatPersona');
        if (selectedPersona) {
            await chatHistoryService.setSetting('selectedPersonaId', selectedPersona);
            console.log('[ChatMigration] Migrated selected persona:', selectedPersona);
        }
    } catch (error) {
        console.error('[ChatMigration] Failed to migrate settings:', error);
    }
}

/**
 * Run full migration
 */
export async function runFullMigration(
    context: vscode.ExtensionContext,
    chatHistoryService: ChatHistoryService
): Promise<{
    conversationsMigrated: number;
    success: boolean;
}> {
    try {
        // Migrate conversations
        const conversationsMigrated = await migrateConversations(context, chatHistoryService);

        // Migrate token usage
        await migrateTokenUsage(context, chatHistoryService);

        // Migrate settings
        await migrateSettings(context, chatHistoryService);

        return {
            conversationsMigrated,
            success: true,
        };
    } catch (error) {
        console.error('[ChatMigration] Full migration failed:', error);
        return {
            conversationsMigrated: 0,
            success: false,
        };
    }
}
