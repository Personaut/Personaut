/**
 * Chat Services Index
 * 
 * Exports all chat-related services for the chat-enhancements feature.
 * 
 * NOTE: Storage has been migrated from SQLite to file-based storage.
 * Old SQLite services are deprecated and moved to _deprecated/
 */

// Types
export * from './ChatHistoryTypes';

// File-based Storage (PRIMARY - replaces globalState and SQLite)
export { ConversationFileStorage, createConversationFileStorage } from './ConversationFileStorage';

// Note: SQLite storage is deprecated and moved to _deprecated/
// For legacy imports, import directly from _deprecated folder

// Core Services
export { SessionManager } from './SessionManager';
export { PersonaManager } from './PersonaManager';
export type { PersonaStorageAdapter } from './PersonaManager';
export { ChatSettingsService } from './ChatSettingsService';

// Note: SessionLifecycleManager is deprecated and moved to _deprecated/

// Migration (for migrating from old globalState to SQLite)
export {
    migrateConversations,
    migrateTokenUsage,
    migrateSettings,
    runFullMigration,
    isMigrationCompleted,
    markMigrationCompleted,
} from './ChatMigration';

// Error Handling
export {
    ChatErrorType,
    createChatError,
    logChatError,
    ErrorRecovery,
    withErrorHandling,
    withRetry,
    isDatabaseError,
    formatUserError,
} from './ChatErrorHandler';
export type { ChatError } from './ChatErrorHandler';

/**
 * DEPRECATED FILES (moved to _deprecated/):
 * - ChatHistoryService.ts - Old JSON-based service
 * - ChatHistoryIntegration.ts - Old integration layer
 * - Related tests
 * 
 * These are kept for reference but should not be used.
 */
