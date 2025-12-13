# AgentManager Architecture

## Overview

The `AgentManager` is the central component responsible for managing the lifecycle of AI agent instances across conversations in the Personaut extension. It implements a factory pattern for agent creation, maintains a registry of active agents, handles resource management, and provides comprehensive error recovery mechanisms.

## Design Goals

1. **Proper Agent Lifecycle**: Factory pattern for agent creation with proper initialization and cleanup
2. **Automatic Persistence**: Wire up message update callbacks to automatically save conversations
3. **Conversation Isolation**: Maintain separate agent instances per conversation with proper context switching
4. **Agent-to-Agent Communication**: Enable secure, capability-aware multi-agent workflows
5. **Error Resilience**: Implement retry logic, graceful degradation, and comprehensive error handling
6. **Performance**: Support concurrent conversations with efficient resource management

## Architecture

### Component Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│                      AgentManager                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Agent Registry                             │ │
│  │  Map<conversationId, AgentRegistryEntry>               │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Capability Registry                        │ │
│  │  Map<conversationId, AgentCapability[]>                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Message Queues                             │ │
│  │  Per-agent sequential processing                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Agent Instances                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Agent 1  │  │ Agent 2  │  │ Agent N  │                  │
│  │ (conv_1) │  │ (conv_2) │  │ (conv_n) │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

#### 1. Factory Pattern
- Creates agents with proper configuration per conversation
- Provides `onDidUpdateMessages` callback for automatic persistence
- Configures agent mode (chat, build, feedback)
- Registers capabilities during creation

#### 2. Registry Management
- Maps conversation IDs to agent instances
- Tracks metadata: creation time, last access, mode, message queue
- Enables fast agent lookup and reuse
- Supports agent disposal and cleanup

#### 3. Resource Management
- **LRU Cache**: Least Recently Used eviction when limit reached
- **Inactivity Timeout**: Automatic disposal after 5 minutes (configurable)
- **Agent Limit**: Maximum 10 active agents (configurable)
- **Periodic Cleanup**: Runs every 5 minutes to clean up inactive agents

#### 4. Message Queuing
- Per-agent message queue for sequential processing
- Prevents race conditions in concurrent scenarios
- Maintains message order within a conversation
- Allows concurrent processing across different conversations

#### 5. Capability Registry
- Tracks available tools and capabilities per agent
- Enables capability discovery for agent-to-agent communication
- Supports capability queries and validation
- Updates when agent capabilities change

#### 6. Error Recovery
- **Abort/Restart**: Terminate unresponsive agents and create new ones
- **Webview Reconnection**: Preserve and restore agent state
- **Conversation Export**: Save conversation data for critical errors
- **Retry Logic**: Exponential backoff for transient failures

## API Reference

### Configuration

```typescript
interface AgentManagerConfig {
  webview: vscode.Webview;
  tokenStorageService: TokenStorageService;
  conversationManager: ConversationManager;
  maxActiveAgents?: number;      // Default: 10
  inactivityTimeout?: number;    // Default: 300000 (5 minutes)
}
```

### Agent Lifecycle Methods

#### `getOrCreateAgent(conversationId, mode)`
Get an existing agent or create a new one for a conversation.

**Parameters:**
- `conversationId: string` - Unique identifier for the conversation
- `mode: AgentMode` - Agent mode ('chat', 'build', 'feedback')

**Returns:** `Promise<Agent>`

**Behavior:**
- Returns existing agent if found (updates last access time)
- Creates new agent if not found
- Enforces agent limit before creation (LRU eviction)
- Registers agent with message queue
- Logs creation with context

**Throws:** `AgentError` with type `CREATION_FAILED` if creation fails

#### `disposeAgent(conversationId)`
Dispose of a specific agent and clean up resources.

**Parameters:**
- `conversationId: string` - Conversation ID of the agent to dispose

**Returns:** `Promise<void>`

**Behavior:**
- Calls agent's `dispose()` method
- Removes agent from registry
- Removes capabilities from registry
- Logs disposal with lifetime metrics

**Throws:** `AgentError` if disposal fails

#### `disposeAllAgents()`
Dispose of all active agents. Called during extension deactivation.

**Returns:** `Promise<void>`

**Behavior:**
- Disposes all agents in parallel
- Clears agent registry
- Clears capability registry
- Continues disposing even if individual agents fail
- Logs comprehensive disposal summary

### Message Handling Methods

#### `sendMessage(conversationId, input, contextFiles, settings, systemInstruction, isPersonaChat)`
Send a message to an agent with automatic queuing.

**Parameters:**
- `conversationId: string` - Target conversation ID
- `input: string` - User input message
- `contextFiles: any[]` - Optional context files
- `settings: any` - Optional agent settings
- `systemInstruction?: string` - Optional system instruction
- `isPersonaChat: boolean` - Whether this is a persona chat

**Returns:** `Promise<void>`

**Behavior:**
- Updates agent's last access time
- Adds message to agent's queue
- Starts queue processing if not already processing
- Processes messages sequentially per agent
- Allows concurrent processing across agents

**Throws:** `AgentError` with type `COMMUNICATION_FAILED` if agent not found

#### `switchConversation(fromConversationId, toConversationId, mode)`
Switch between conversations with performance tracking.

**Parameters:**
- `fromConversationId: string` - Current conversation ID
- `toConversationId: string` - Target conversation ID
- `mode: AgentMode` - Agent mode for target conversation

**Returns:** `Promise<void>`

**Behavior:**
- Gets or creates target agent
- Tracks switch duration
- Logs warning if switch exceeds 500ms target
- Fast operation (just registry lookup or creation)

### Settings Management Methods

#### `updateSettings(settings)`
Update settings and reinitialize agents if critical settings changed.

**Parameters:**
- `settings: Partial<Settings>` - New settings to apply

**Returns:** `Promise<void>`

**Behavior:**
- Checks if critical settings changed (provider, API keys, model)
- If critical: disposes all agents and clears registry
- If non-critical: updates stored settings only
- Logs settings changes with context

**Critical Settings:**
- `provider`, `geminiApiKey`, `awsAccessKey`, `awsSecretKey`
- `geminiModel`, `bedrockModel`, `awsRegion`, `awsProfile`, `awsUseProfile`

#### `reinitializeAgents()`
Manually reinitialize all agents by disposing them and clearing the registry.

**Returns:** `Promise<void>`

**Behavior:**
- Disposes all active agents
- Clears agent registry
- Clears capability registry
- New agents created with updated settings on next request
- Logs agent count before and after

### Capability Management Methods

#### `registerCapability(conversationId, capability)`
Register a capability for an agent.

**Parameters:**
- `conversationId: string` - Agent's conversation ID
- `capability: AgentCapability` - Capability to register

**Returns:** `void`

**Behavior:**
- Adds capability to agent's capability list
- Logs registration with capability name and count

#### `getCapabilities(conversationId)`
Get all capabilities for an agent.

**Parameters:**
- `conversationId: string` - Agent's conversation ID

**Returns:** `AgentCapability[]`

**Behavior:**
- Returns array of capabilities
- Returns empty array if agent not found

#### `queryCapability(conversationId, capabilityName)`
Query if an agent has a specific capability.

**Parameters:**
- `conversationId: string` - Agent's conversation ID
- `capabilityName: string` - Name of the capability to check

**Returns:** `boolean`

**Behavior:**
- Returns true if agent has the capability
- Returns false if agent not found or doesn't have capability

### Error Recovery Methods

#### `abortAndRestartAgent(conversationId)`
Abort and restart an unresponsive agent.

**Parameters:**
- `conversationId: string` - Conversation ID of the unresponsive agent

**Returns:** `Promise<Agent>`

**Behavior:**
- Aborts current agent operation
- Disposes the agent
- Creates new agent with same mode
- Restores conversation history from storage
- Logs abort and restart with timestamps

#### `exportConversationData(conversationId)`
Export conversation data for critical errors.

**Parameters:**
- `conversationId: string` - Conversation ID to export

**Returns:** `Promise<string>` - JSON string of conversation data

**Behavior:**
- Retrieves conversation from storage
- Creates export data with metadata
- Includes export timestamp and reason
- Returns formatted JSON string
- Logs export with data size

**Throws:** `AgentError` with type `LOAD_FAILED` if conversation not found

#### `handleWebviewDisconnection()`
Handle webview disconnection by preserving agent states.

**Returns:** `Promise<Array<PreservedState>>`

**Behavior:**
- Preserves state for all active agents
- Includes conversation ID, mode, message count, last access, capabilities
- Continues preserving even if individual agents fail
- Logs preserved agent count

#### `handleWebviewReconnection(webview, preservedStates)`
Handle webview reconnection by restoring agent states.

**Parameters:**
- `webview: vscode.Webview` - New webview instance
- `preservedStates: Array<PreservedState>` - States to restore

**Returns:** `Promise<void>`

**Behavior:**
- Updates webview reference
- Restores agent states from preserved data
- Restores conversation history
- Restores capabilities
- Continues restoring even if individual agents fail
- Logs restored agent count

### Utility Methods

#### `getActiveAgentCount()`
Get the number of active agents.

**Returns:** `number`

#### `hasAgent(conversationId)`
Check if an agent exists for a conversation.

**Parameters:**
- `conversationId: string` - Conversation ID to check

**Returns:** `boolean`

#### `validateAgentCommunication(fromConversationId, toConversationId)`
Validate agent-to-agent communication permissions.

**Parameters:**
- `fromConversationId: string` - Source agent conversation ID
- `toConversationId: string` - Target agent conversation ID

**Returns:** `boolean`

**Behavior:**
- Checks if both agents exist
- Validates session ownership (all agents in same session for now)
- Logs validation result
- Returns false if either agent not found

#### `retryWithBackoff(operation, maxAttempts, baseDelay, operationName)`
Retry an operation with exponential backoff.

**Parameters:**
- `operation: () => Promise<T>` - Async operation to retry
- `maxAttempts: number` - Maximum retry attempts (default: 3)
- `baseDelay: number` - Base delay in milliseconds (default: 1000)
- `operationName: string` - Name for logging (default: 'operation')

**Returns:** `Promise<T>`

**Behavior:**
- Retries operation up to maxAttempts times
- Uses exponential backoff: delay = baseDelay * 2^(attempt-1)
- Logs each attempt and retry
- Throws wrapped AgentError after all retries fail

## Message Persistence

The AgentManager automatically wires up message persistence for all agents:

```typescript
private async onDidUpdateMessages(conversationId: string, messages: Message[]): Promise<void> {
  try {
    // Save conversation to storage
    await this.config.conversationManager.saveConversation(conversationId, messages);
    
    // Log success
    console.log('[AgentManager] Conversation saved successfully');
  } catch (error) {
    // Wrap as AgentError
    const agentError = wrapAsAgentError(error, AgentErrorType.PERSISTENCE_FAILED, conversationId);
    
    // Log error but don't crash (requirement 2.5)
    console.error('[AgentManager] Failed to save conversation:', agentError.toJSON());
    
    // Don't throw - continue operating even if save fails
  }
}
```

**Key Points:**
- Called automatically when agent updates messages
- Saves to ConversationManager with retry logic
- Logs errors but doesn't crash extension
- Provides full error context for debugging

## Resource Management

### LRU Eviction

When the agent limit is reached, the least recently used agents are disposed:

```typescript
private async enforceAgentLimit(): Promise<void> {
  if (this.agents.size < this.maxActiveAgents) {
    return;
  }
  
  // Sort agents by last access time (oldest first)
  const sortedAgents = Array.from(this.agents.entries())
    .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
  
  // Dispose least recently used agents
  const agentsToDispose = this.agents.size - this.maxActiveAgents + 1;
  for (let i = 0; i < agentsToDispose; i++) {
    await this.disposeAgent(sortedAgents[i][0]);
  }
}
```

### Inactivity Cleanup

Inactive agents are automatically disposed after the timeout:

```typescript
private async cleanupInactiveAgents(): Promise<void> {
  const now = Date.now();
  const inactiveAgents: string[] = [];
  
  // Find inactive agents
  for (const [conversationId, entry] of this.agents.entries()) {
    const inactiveDuration = now - entry.lastAccess;
    if (inactiveDuration > this.inactivityTimeout) {
      inactiveAgents.push(conversationId);
    }
  }
  
  // Dispose inactive agents
  for (const conversationId of inactiveAgents) {
    await this.disposeAgent(conversationId);
  }
}
```

### Periodic Cleanup

Cleanup runs automatically every 5 minutes:

```typescript
private startPeriodicCleanup(): void {
  const cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes
  
  this.cleanupInterval = setInterval(async () => {
    await this.cleanupInactiveAgents();
  }, cleanupIntervalMs);
}
```

## Message Queue Processing

Each agent has its own message queue to prevent race conditions:

```typescript
private async processMessageQueue(conversationId: string): Promise<void> {
  const entry = this.agents.get(conversationId);
  if (!entry) return;
  
  entry.isProcessing = true;
  
  try {
    while (entry.messageQueue.length > 0) {
      const message = entry.messageQueue.shift();
      if (!message) break;
      
      try {
        // Process the message
        await entry.agent.chat(
          message.input,
          message.contextFiles,
          message.settings,
          message.systemInstruction,
          message.isPersonaChat
        );
        
        // Resolve the promise
        message.resolve();
      } catch (error) {
        // Reject with AgentError
        message.reject(wrapAsAgentError(error, AgentErrorType.MESSAGE_PROCESSING_FAILED, conversationId));
      }
    }
  } finally {
    entry.isProcessing = false;
  }
}
```

**Key Points:**
- Messages processed sequentially per agent
- Concurrent processing across different agents
- Maintains message order within conversation
- Prevents race conditions
- Proper error handling with AgentError

## Error Handling

All errors are wrapped as `AgentError` with proper context:

```typescript
enum AgentErrorType {
  CREATION_FAILED = 'CREATION_FAILED',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  MESSAGE_PROCESSING_FAILED = 'MESSAGE_PROCESSING_FAILED',
  PERSISTENCE_FAILED = 'PERSISTENCE_FAILED',
  LOAD_FAILED = 'LOAD_FAILED',
  COMMUNICATION_FAILED = 'COMMUNICATION_FAILED',
  CAPABILITY_NOT_FOUND = 'CAPABILITY_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

class AgentError extends Error {
  constructor(
    public type: AgentErrorType,
    message: string,
    public conversationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
  }
  
  toJSON() {
    return {
      type: this.type,
      message: this.message,
      conversationId: this.conversationId,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}
```

## Logging

All operations are comprehensively logged with context:

```typescript
console.log('[AgentManager] Operation:', {
  conversationId,
  mode,
  timestamp: Date.now(),
  additionalContext: value,
});
```

**Logged Operations:**
- Agent creation and disposal
- Message queuing and processing
- Conversation switching
- Settings updates
- Capability registration
- Error recovery operations
- Resource cleanup
- Webview reconnection

## Performance Considerations

1. **Agent Limit**: Maximum 10 active agents by default (configurable)
2. **Inactivity Timeout**: Dispose agents after 5 minutes of inactivity
3. **Conversation Switching**: Target < 500ms for switching
4. **Memory Management**: Monitor and enforce limits with LRU eviction
5. **Lazy Loading**: Create agents on-demand, not at startup
6. **Concurrent Processing**: Messages processed concurrently across agents
7. **Sequential Processing**: Messages processed sequentially within agent

## Security Considerations

1. **Agent Isolation**: Each agent operates in its own context
2. **Permission Validation**: All tool executions require permission checks
3. **Message Sanitization**: Sanitize all agent-to-agent messages
4. **Workspace Restriction**: File operations limited to workspace
5. **Audit Logging**: Log all agent-to-agent communication attempts
6. **API Key Security**: API keys stored in VS Code secure storage
7. **Session Validation**: Validate session ownership for agent communication

## Integration with Other Components

### ChatService
- Uses AgentManager to get/create agents
- Routes messages through AgentManager
- Coordinates conversation switching

### ConversationManager
- Receives save requests from AgentManager
- Provides conversation data for loading
- Handles schema migration and validation

### SettingsService
- Notifies AgentManager of settings changes
- Triggers agent reinitialization for critical settings
- Validates provider configuration

### BuildModeService, FeedbackService, PersonasService
- Use AgentManager to create mode-specific agents
- Wire up progress callbacks for streaming
- Dispose agents after operations complete

## Testing

The AgentManager is tested with:

1. **Unit Tests**: Individual method behavior
2. **Integration Tests**: End-to-end conversation flows
3. **Property-Based Tests**: Universal properties across all inputs
   - Agent creation completeness
   - Message routing correctness
   - Conversation persistence round-trip
   - Resource cleanup
   - Capability discovery
   - Security validation
   - Error resilience
   - Performance characteristics

## Future Enhancements

1. **Multi-Session Support**: Support multiple user sessions
2. **Agent Pooling**: Reuse agents across conversations
3. **Capability Negotiation**: Dynamic capability discovery and negotiation
4. **Advanced Resource Management**: Memory-based limits, CPU monitoring
5. **Distributed Agents**: Support for remote agent instances
6. **Agent Collaboration**: Coordinated multi-agent workflows
7. **Telemetry**: Performance metrics and usage analytics
