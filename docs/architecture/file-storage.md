# File Storage Architecture

This document describes the file-based storage architecture used for data persistence in Personaut.

## Overview

Personaut uses a file-based storage system for persisting:
- Chat conversations
- Personas
- Feedback
- Settings

This approach replaces both the original `globalState` storage (which had size limits) and the SQLite-based storage (which had native module issues).

## Storage Location

All data is stored in VS Code's `globalStorageUri` directory:

```
~/.vscode/extensions/[publisher].personaut/
├── conversations/
│   ├── index.json                    # Quick lookup index
│   └── {conversationId}/
│       └── conversation.json         # Full conversation data
├── personas/
│   └── {personaId}.json
├── feedback/
│   └── {feedbackId}.json
└── settings/
    └── settings.json
```

## Key Components

### FileStorageService

Core service that provides low-level file operations:

- **Location**: `src/shared/services/FileStorageService.ts`
- **Features**:
  - Atomic writes (temp file + rename)
  - Automatic directory creation
  - JSON serialization
  - Error handling with graceful fallbacks

```typescript
// Example usage
const fileStorage = new FileStorageService(context.globalStorageUri.fsPath);
await fileStorage.write('conversations/index.json', indexData);
const data = await fileStorage.read<ConversationIndex>('conversations/index.json');
```

### ConversationFileStorage

Implements `ConversationStorage` interface using file storage:

- **Location**: `src/features/chat/services/ConversationFileStorage.ts`
- **Features**:
  - In-memory cache for sync `get()` operations
  - Index file for fast listing
  - Individual files per conversation
  - Automatic index management

```typescript
// Example usage
const storage = new ConversationFileStorage(fileStorage);
await storage.initialize();
await storage.saveConversation(conversation);
const convs = await storage.listConversations();
```

### MigrationService

Handles one-time migration from globalState:

- **Location**: `src/shared/services/MigrationService.ts`
- **Features**:
  - Automatic migration on first run
  - Data integrity verification
  - Non-destructive (keeps original data)

```typescript
const migration = new MigrationService(globalState, storage);
await migration.runMigrationIfNeeded();
```

## Design Decisions

### Why File-Based Storage?

1. **No Native Dependencies**: SQLite required native modules that caused code signing issues on macOS
2. **No Size Limits**: `globalState` has a ~1MB soft limit; files have no practical limit
3. **Human Readable**: JSON files can be inspected and debugged easily
4. **VS Code Compatible**: Uses official `globalStorageUri` API

### Why Individual Files?

1. **Granular Updates**: Only modified conversations are written
2. **Reduced Corruption Risk**: One corrupted file doesn't affect others
3. **Better Performance**: Load only what's needed

### Why an Index File?

1. **Fast Listing**: List conversations without loading all data
2. **Sorting**: Pre-sorted by lastUpdated
3. **Small Size**: Only metadata, not full content

## File Formats

### conversations/index.json
```json
{
  "version": 1,
  "lastUpdated": 1702756800000,
  "conversations": [
    {
      "id": "conv_123",
      "title": "Chat about React",
      "lastUpdated": 1702756800000,
      "createdAt": 1702756000000,
      "messageCount": 15
    }
  ]
}
```

### conversations/{id}/conversation.json
```json
{
  "version": 1,
  "metadata": {
    "id": "conv_123",
    "title": "Chat about React",
    "lastUpdated": 1702756800000,
    "createdAt": 1702756000000,
    "messageCount": 15
  },
  "messages": [
    { "role": "user", "text": "How do I use hooks?" },
    { "role": "model", "text": "React hooks are..." }
  ]
}
```

## Error Handling

- **Read Errors**: Return null, continue with defaults
- **Write Errors**: Log and retry with backoff
- **Corruption**: JSON parse errors return null, log warning
- **Missing Dirs**: Auto-create on first write

## Testing

All components have 90%+ test coverage:

```bash
npm test -- --testPathPattern="FileStorageService"
npm test -- --testPathPattern="ConversationFileStorage"
npm test -- --testPathPattern="MigrationService"
```

## Migration

When upgrading from an older version:

1. Extension detects unmigrated data on startup
2. Conversations are copied from globalState to files
3. Migration flag is set to prevent re-migration
4. Original globalState data is preserved as backup

To manually clear cache (including file storage):
```
Command Palette > Personaut: Clear Cache
```

## Related Files

- `src/shared/services/FileStorageService.ts` - Core file operations
- `src/features/chat/services/ConversationFileStorage.ts` - Conversation storage
- `src/features/chat/types/ConversationFileTypes.ts` - Type definitions
- `src/shared/services/MigrationService.ts` - Migration handling
- `.kiro/specs/file-storage-architecture/` - Design documents
