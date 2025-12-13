# Design Document

## Overview

This design document outlines the technical approach to fix critical issues in the Personaut extension's agent management system. The refactoring broke agent creation, message persistence, conversation loading, and agent lifecycle management. This design introduces an **Agent Manager** pattern that centralizes agent lifecycle management, implements proper factory patterns, and ensures robust conversation persistence.

### Key Design Goals

1. **Proper Agent Lifecycle**: Implement factory pattern for agent creation with proper initialization and cleanup
2. **Automatic Persistence**: Wire up message update callbacks to automatically save conversations
3. **Conversation Isolation**: Maintain separate agent instances per conversation with proper context switching
4. **Agent-to-Agent Communication**: Enable secure, capability-aware multi-agent workflows
5. **Error Resilience**: Implement retry logic, graceful degradation, and comprehensive error handling
6. **Performance**: Support concurrent conversations with efficient resource management

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Extension.ts                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Dependency Injection Container             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SidebarProvider                         │
│                   (Webview Management)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        ChatHandler                           │
│                   (Message Routing)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        ChatService                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    AgentManager                         │ │
│  │  • Agent Factory                                        │ │
│  │  • Agent Registry (Map<conversationId, Agent>)         │ │
│  │  • Lifecycle Management                                │ │
│  │  • Capability Registry                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              ConversationManager                        │ │
│  │  • Persistence                                         │ │
│  │  • Migration                                           │ │
│  │  • Pagination                                          │ │
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

### Component Responsibilities

#### AgentManager (New Component)
- **Factory Pattern**: Creates Agent instances with proper configuration
- **Registry**: Maintains a map of conversation IDs to Agent instances
- **Lifecycle**: Handles agent creation, disposal, and cleanup
- **Capability Registry**: Tracks agent capabilities for discovery
- **Resource Management**: Implements LRU cache for inactive agents
- **Security**: Validates agent-to-agent communication permissions
- **Mode Support**: Creates agents with different modes (chat, build, feedback)

#### ChatService (Modified)
- **Agent Delegation**: Delegates to AgentManager for agent operations
- **Message Routing**: Routes messages to appropriate agents via AgentManager
- **Conversation Operations**: Manages conversation CRUD through ConversationManager
- **Persistence Coordination**: Coordinates between agents and storage

#### ConversationManager (Enhanced)
- **Schema Migration**: Handles backward compatibility for stored conversations
- **Retry Logic**: Implements exponential backoff for save operations
- **Validation**: Validates conversation data structure on load

#### BuildModeService (Enhanced)
- **Agent Integration**: Uses AgentManager to create build-mode agents for content generation
- **Project Management**: Manages build projects and stages
- **Content Generation**: Coordinates with agents for AI-powered content generation
- **State Persistence**: Saves build state and logs

#### FeedbackService (Enhanced)
- **Agent Integration**: Uses AgentManager to create feedback-mode agents for feedback generation
- **Feedback Management**: Manages feedback history and entries
- **Image Support**: Handles screenshot capture and validation
- **Provider Validation**: Validates image support for different AI providers

#### PersonasService (Enhanced)
- **Agent Integration**: Uses AgentManager to create agents for persona backstory generation
- **Persona Management**: Manages persona CRUD operations
- **Prompt Generation**: Generates prompts from persona attributes
- **AI Generation**: Coordinates with agents for backstory generation

#### SettingsService (Enhanced)
- **Configuration Management**: Manages VS Code configuration and secure storage
- **API Key Storage**: Handles secure storage of API keys via TokenStorageService
- **Agent Reconfiguration**: Notifies AgentManager when settings change to trigger agent reinitialization
- **Provider Validation**: Validates that required settings exist for the selected provider

## Components and Interfaces

### AgentManager Interface

```typescript
interface AgentManagerConfig {
  webview: vscode.Webview;
  tokenStorageService: TokenStorageService;
  conversationManager: ConversationManager;
  maxActiveAgents?: number; // Default: 10
  inactivityTimeout?: number; // Default: 5 minutes
}

interface AgentCapability {
  name: string;
  description: string;
  tools: string[];
}

class AgentManager {
  private agents: Map<string, Agent>;
  private capabilities: Map<string, AgentCapability>;
  private lastAccess: Map<string, number>;
  private config: AgentManagerConfig;
  private currentSettings: Settings | null; // Cache current settings

  constructor(config: AgentManagerConfig);

  // Agent Lifecycle
  getOrCreateAgent(conversationId: string, mode?: AgentMode): Promise<Agent>;
  disposeAgent(conversationId: string): Promise<void>;
  disposeAllAgents(): Promise<void>;
  updateWebview(webview: vscode.Webview): void;

  // Settings Management
  updateSettings(settings: Partial<Settings>): Promise<void>;
  reinitializeAgents(): Promise<void>; // Recreate all agents with new settings
  
  // Capability Management
  registerCapability(agentId: string, capability: AgentCapability): void;
  getCapabilities(agentId: string): AgentCapability[];
  queryCapability(agentId: string, capabilityName: string): boolean;

  // Resource Management
  private cleanupInactiveAgents(): Promise<void>;
  private enforceAgentLimit(): Promise<void>;

  // Security
  private validateAgentCommunication(fromAgent: string, toAgent: string): boolean;
  
  // Provider Validation
  private validateProviderConfiguration(): Promise<boolean>;
}
```

### Modified ChatService Interface

```typescript
class ChatService {
  constructor(
    private readonly agentManager: AgentManager,
    private readonly conversationManager: ConversationManager
  ) {}

  async sendMessage(
    conversationId: string,
    input: string,
    contextFiles: ContextFile[],
    settings?: Record<string, any>,
    systemInstruction?: string,
    isPersonaChat?: boolean
  ): Promise<void>;

  async loadConversation(id: string): Promise<Conversation | null>;
  async switchConversation(fromId: string, toId: string): Promise<void>;
  
  // Agent-to-Agent Communication
  async sendAgentMessage(
    fromConversationId: string,
    toConversationId: string,
    message: string
  ): Promise<void>;
}
```

### Enhanced BuildModeService Interface

```typescript
class BuildModeService {
  constructor(
    private readonly stageManager: StageManager,
    private readonly buildLogManager: BuildLogManager,
    private readonly contentStreamer: ContentStreamer,
    private readonly agentManager: AgentManager // NEW
  ) {}

  // Existing methods...
  async initializeProject(projectName: string, projectTitle?: string): Promise<void>;
  async saveStage(projectName: string, stage: string, data: any, completed: boolean): Promise<void>;
  
  // NEW: AI-powered content generation
  async generateStageContent(
    projectName: string,
    stage: string,
    prompt: string,
    onProgress?: (chunk: string) => void
  ): Promise<string>;
}
```

### Enhanced FeedbackService Interface

```typescript
class FeedbackService {
  constructor(
    private readonly storage: FeedbackStorage,
    private readonly agentManager: AgentManager // NEW
  ) {}

  // Existing methods...
  async saveFeedbackEntry(entry: Omit<FeedbackEntry, 'id' | 'timestamp'>): Promise<FeedbackEntry>;
  
  // NEW: AI-powered feedback generation
  async generateFeedbackWithAI(
    params: GenerateFeedbackParams,
    onProgress?: (chunk: string) => void
  ): Promise<GenerateFeedbackResult>;
}
```

### Enhanced PersonasService Interface

```typescript
class PersonasService {
  constructor(
    private readonly personaStorage: PersonaStorage,
    private readonly agentManager: AgentManager // CHANGED from IProvider
  ) {}

  // Existing methods...
  async createPersona(request: CreatePersonaRequest): Promise<Persona>;
  async updatePersona(request: UpdatePersonaRequest): Promise<Persona | undefined>;
  
  // MODIFIED: Now uses AgentManager instead of direct IProvider
  async generateBackstory(
    id: string,
    onProgress?: (chunk: string) => void
  ): Promise<string>;
}
```

### Enhanced SettingsService Interface

```typescript
class SettingsService {
  constructor(
    private readonly tokenStorageService: TokenStorageService,
    private readonly agentManager?: AgentManager // NEW: Optional for settings change notifications
  ) {}

  // Existing methods...
  async getSettings(): Promise<Settings>;
  async saveSettings(settings: Partial<Settings>): Promise<void>;
  async resetSettings(): Promise<void>;
  
  // NEW: Validate provider configuration
  async validateProviderSettings(provider: string): Promise<{
    valid: boolean;
    missingSettings: string[];
  }>;
  
  // NEW: Notify agents of settings changes
  private async notifySettingsChanged(changedSettings: Partial<Settings>): Promise<void>;
}
```

### Enhanced ConversationManager Interface

```typescript
interface ConversationSchema {
  version: number;
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
  lastUpdated?: number;
  metadata?: Record<string, any>;
}

class ConversationManager {
  private readonly CURRENT_SCHEMA_VERSION = 2;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;

  // Enhanced save with retry
  async saveConversation(
    id: string,
    messages: Message[],
    retryCount?: number
  ): Promise<Conversation>;

  // Schema migration
  private migrateConversation(data: any): ConversationSchema;
  private validateSchema(data: any): boolean;

  // Batch operations
  async loadAllConversations(): Promise<{
    successful: Conversation[];
    failed: Array<{ id: string; error: string }>;
  }>;
}
```

### Agent Configuration Updates

```typescript
interface AgentConfig {
  conversationId: string;
  mode?: AgentMode; // 'chat' | 'build' | 'feedback'
  onDidUpdateMessages: (messages: Message[]) => Promise<void>; // Now async
  onError?: (error: Error) => void;
  onProgress?: (chunk: string) => void; // For streaming content
  capabilities?: AgentCapability[];
}

interface AgentMetadata {
  conversationId: string;
  mode: AgentMode;
  createdAt: number;
  lastActiveAt: number;
  messageCount: number;
  capabilities: string[];
}
```

### Build Mode Agent Configuration

```typescript
interface BuildModeAgentConfig extends AgentConfig {
  mode: 'build';
  projectName: string;
  stage: string;
  onProgress: (chunk: string) => void; // Required for build mode
}
```

### Feedback Mode Agent Configuration

```typescript
interface FeedbackModeAgentConfig extends AgentConfig {
  mode: 'feedback';
  personaNames: string[];
  feedbackType: 'individual' | 'group';
  onProgress?: (chunk: string) => void; // Optional for feedback mode
}
```

### Persona Mode Agent Configuration

```typescript
interface PersonaModeAgentConfig extends AgentConfig {
  mode: 'chat'; // Personas use chat mode with custom system prompts
  personaId: string;
  personaName: string;
  onProgress?: (chunk: string) => void; // Optional for backstory generation
}
```

## Data Models

### Conversation Schema V2

```typescript
interface ConversationV2 {
  version: 2;
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
  lastUpdated: number;
  metadata: {
    agentMode?: AgentMode;
    participatingAgents?: string[]; // For multi-agent conversations
    tags?: string[];
    archived?: boolean;
  };
}
```

### Agent Registry Entry

```typescript
interface AgentRegistryEntry {
  agent: Agent;
  metadata: AgentMetadata;
  lastAccess: number;
  refCount: number; // For multi-agent scenarios
}
```

### Capability Definition

```typescript
interface ToolCapability {
  name: string;
  description: string;
  parameters: Record<string, any>;
  permissions: string[];
}

interface AgentCapability {
  agentId: string;
  tools: ToolCapability[];
  modes: AgentMode[];
  version: string;
}
```

## Error Handling

### Error Types

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
}
```

### Error Handling Strategy

1. **Agent Creation Errors**
   - Log full error with context
   - Display user-friendly message in webview
   - Offer retry or fallback to new conversation

2. **Persistence Errors**
   - Retry with exponential backoff (3 attempts)
   - Cache unsaved messages in memory
   - Notify user if all retries fail
   - Provide export option for unsaved data

3. **Load Errors**
   - Attempt schema migration
   - Skip corrupted conversations
   - Report summary of load results
   - Offer to create new conversation

4. **Communication Errors**
   - Validate permissions before sending
   - Sanitize message content
   - Log unauthorized attempts
   - Return clear error messages

### Retry Logic

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry failed');
}
```

## Testing Strategy

### Unit Tests

1. **AgentManager Tests**
   - Agent creation and disposal
   - Registry management
   - Capability registration and query
   - Resource cleanup
   - Security validation

2. **ChatService Tests**
   - Message routing to correct agent
   - Conversation switching
   - Agent-to-agent communication
   - Error handling

3. **ConversationManager Tests**
   - Schema migration from V1 to V2
   - Retry logic for save operations
   - Batch load with error handling
   - Validation logic

### Integration Tests

1. **End-to-End Conversation Flow**
   - Create conversation → Send message → Save → Load → Verify
   - Test with multiple concurrent conversations
   - Test conversation switching

2. **Agent Lifecycle**
   - Create agent → Use agent → Dispose agent → Verify cleanup
   - Test webview reconnection
   - Test inactive agent cleanup

3. **Multi-Agent Communication**
   - Create two agents → Send message between them → Verify persistence
   - Test capability discovery
   - Test security validation

### Error Scenario Tests

1. Storage quota exceeded
2. Corrupted conversation data
3. Network failures during AI calls
4. Concurrent save conflicts
5. Agent initialization failures

## Implementation Notes

### Phase 1: Core Infrastructure
1. Create AgentManager class
2. Update ChatService to use AgentManager
3. Implement agent factory pattern
4. Wire up message persistence callbacks

### Phase 2: Conversation Management
1. Implement schema migration
2. Add retry logic to save operations
3. Update load logic with validation
4. Implement batch load with error reporting

### Phase 3: Settings Integration
1. Update SettingsService to accept AgentManager reference
2. Implement settings change notification to AgentManager
3. Implement provider configuration validation
4. Add agent reinitialization on critical settings changes (provider, API keys, model)
5. Test settings changes trigger proper agent updates

### Phase 4: Build Mode, Feedback & Personas Integration
1. Update BuildModeService to use AgentManager for content generation
2. Update FeedbackService to use AgentManager for feedback generation
3. Update PersonasService to use AgentManager instead of direct IProvider
4. Ensure build, feedback, and persona agents use correct mode configuration
5. Wire up progress callbacks for streaming content

### Phase 5: Multi-Agent Support
1. Implement capability registry
2. Add agent-to-agent messaging
3. Implement security validation
4. Add capability discovery API

### Phase 6: Resource Management
1. Implement LRU cache for agents
2. Add inactive agent cleanup
3. Implement agent limit enforcement
4. Add memory monitoring

### Phase 7: Error Handling & Resilience
1. Implement comprehensive error types
2. Add retry logic throughout
3. Implement graceful degradation
4. Add user notifications

### Migration Strategy

**Existing Conversations**: The system will automatically migrate V1 conversations to V2 schema on first load. The migration adds:
- `version` field set to 2
- `metadata` object with default values
- `lastUpdated` timestamp

**Backward Compatibility**: V1 conversations without version field will be detected and migrated. Failed migrations will be logged but won't crash the extension.

### Performance Considerations

1. **Agent Limit**: Maximum 10 active agents by default (configurable)
2. **Inactivity Timeout**: Dispose agents after 5 minutes of inactivity
3. **Conversation Switching**: Target < 500ms for switching
4. **Memory Management**: Monitor and enforce limits
5. **Lazy Loading**: Create agents on-demand, not at startup

### Security Considerations

1. **Agent Isolation**: Each agent operates in its own context
2. **Permission Validation**: All tool executions require permission checks
3. **Message Sanitization**: Sanitize all agent-to-agent messages
4. **Workspace Restriction**: File operations limited to workspace
5. **Audit Logging**: Log all agent-to-agent communication attempts
6. **API Key Security**: API keys stored in VS Code secure storage, never in plain text
7. **Settings Validation**: Validate all settings before applying to prevent injection attacks

### Settings and Agent Initialization Flow

```
User Changes Settings
        ↓
SettingsService.saveSettings()
        ↓
Save to VS Code Config + Secure Storage
        ↓
SettingsService.notifySettingsChanged()
        ↓
AgentManager.updateSettings()
        ↓
Validate Provider Configuration
        ↓
If Critical Settings Changed (provider, API keys, model):
    ↓
    AgentManager.reinitializeAgents()
    ↓
    Dispose All Existing Agents
    ↓
    Clear Agent Registry
    ↓
    Next Agent Request Creates Fresh Agent with New Settings
```

**Critical Settings** (require agent reinitialization):
- `provider` (gemini, bedrock, nativeIde)
- `geminiApiKey`
- `awsAccessKey` / `awsSecretKey`
- `geminiModel`
- `bedrockModel`
- `awsRegion`

**Non-Critical Settings** (don't require reinitialization):
- `theme`
- `autoRead` / `autoWrite` / `autoExecute`
- `rateLimit` / `rateLimitWarningThreshold`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Agent Creation Completeness
*For any* new conversation, creating an agent should result in a fully initialized agent with a valid webview reference, a non-null message update callback, and registered capabilities in the capability registry.
**Validates: Requirements 1.2, 1.4, 1.5, 13.1**

### Property 2: Message Routing Correctness
*For any* message sent to a conversation, the message should be routed to the agent associated with that conversation's ID, and no other agent should receive the message.
**Validates: Requirements 1.3**

### Property 3: Conversation Persistence Round-Trip
*For any* conversation with any set of messages, saving the conversation and then loading it should result in a conversation with identical message content, roles, and order.
**Validates: Requirements 2.1, 2.2, 2.3, 3.3**

### Property 4: Title Generation Determinism
*For any* conversation, the generated title should be deterministic based on the first user message and should not exceed the maximum title length.
**Validates: Requirements 2.4**

### Property 5: Error Resilience
*For any* operation that fails (save, load, agent creation), the system should log the error, display a user-friendly message, and continue operating without crashing.
**Validates: Requirements 2.5, 9.1, 9.2, 9.3, 9.5, 11.1**

### Property 6: Conversation Loading Completeness
*For any* valid conversation ID, loading the conversation should retrieve the data from storage, create or reuse an agent, restore the message history to that agent, and display all messages in the webview.
**Validates: Requirements 3.1, 3.2, 3.4**

### Property 7: Conversation Identity Preservation
*For any* loaded conversation, adding new messages and saving should update the same conversation ID without creating a new conversation.
**Validates: Requirements 3.5**

### Property 8: Conversation Isolation
*For any* two distinct conversations, their message histories should remain completely separate, and switching between them should activate the correct agent with the correct history.
**Validates: Requirements 4.1, 4.2**

### Property 9: New Conversation Initialization
*For any* newly created conversation, the associated agent should start with an empty message history (zero messages).
**Validates: Requirements 4.3**

### Property 10: Agent Cleanup on Deletion
*For any* conversation deletion, if an agent exists for that conversation, the agent's dispose method should be called and the agent should be removed from the registry.
**Validates: Requirements 4.4**

### Property 11: Factory Pattern Correctness
*For any* agent creation request with a conversation ID, the factory function should be invoked with that exact conversation ID and should return a valid agent instance.
**Validates: Requirements 5.2**

### Property 12: Resource Cleanup
*For any* agent that is no longer needed, calling dispose should clean up all resources (MCP connections, terminal managers) and the agent should be removed from the active registry.
**Validates: Requirements 5.3**

### Property 13: Webview Reference Update
*For any* webview recreation event, all active agents should have their webview reference updated to the new webview instance.
**Validates: Requirements 5.4**

### Property 14: Agent-to-Agent Message Persistence
*For any* message sent from one agent to another agent, the message should appear in the shared conversation history and should be persisted to storage.
**Validates: Requirements 6.2, 6.4**

### Property 15: Agent-to-Agent Processing Consistency
*For any* message received by an agent (whether from a user or another agent), the same message processing pipeline should be used.
**Validates: Requirements 6.3**

### Property 16: Agent-to-Agent Message Attribution
*For any* agent-to-agent message displayed in the webview, the message should clearly indicate which agent sent it.
**Validates: Requirements 6.5**

### Property 17: Agent Instance Uniqueness
*For any* set of active conversations, each conversation should have its own unique agent instance in the registry.
**Validates: Requirements 7.1**

### Property 18: Conversation Switch Performance
*For any* conversation switch operation, the switch should complete in less than 500 milliseconds.
**Validates: Requirements 7.2**

### Property 19: Concurrent Processing Independence
*For any* agent processing a message, other agents should remain responsive and able to receive and process their own messages concurrently.
**Validates: Requirements 7.3**

### Property 20: Resource-Aware Cleanup
*For any* situation where memory usage exceeds the threshold, inactive agents should be disposed while their conversation history remains persisted in storage.
**Validates: Requirements 7.4**

### Property 21: Concurrent Message Safety
*For any* set of concurrent message sends to different conversations, all messages should be processed without race conditions and each should be saved to the correct conversation.
**Validates: Requirements 7.5**

### Property 22: Schema Migration Success
*For any* conversation stored in V1 schema format, loading should automatically migrate it to V2 schema with all data preserved.
**Validates: Requirements 8.2**

### Property 23: Migration Failure Isolation
*For any* conversation that fails migration, the system should log the error, skip that conversation, and continue loading other conversations without crashing.
**Validates: Requirements 8.3**

### Property 24: Batch Load Accuracy
*For any* batch load operation, the sum of successfully loaded conversations and failed conversations should equal the total number of conversations in storage.
**Validates: Requirements 8.4**

### Property 25: Post-Migration Schema Consistency
*For any* conversation that has been migrated, subsequent save operations should use the V2 schema format.
**Validates: Requirements 8.5**

### Property 26: Comprehensive Operation Logging
*For any* agent lifecycle operation (creation, message processing, save, disposal), the system should log the operation with relevant context (conversation ID, timestamp, duration, message count, or cleanup status as appropriate).
**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

### Property 27: Error Logging Completeness
*For any* error that occurs, the system should log the full error stack trace along with context information (conversation ID, operation type, timestamp).
**Validates: Requirements 10.5**

### Property 28: Save Retry with Backoff
*For any* save operation that fails, the system should retry up to 3 times with exponential backoff before reporting final failure.
**Validates: Requirements 11.2**

### Property 29: Agent Recovery
*For any* unresponsive agent, the system should provide abort functionality that terminates the agent and allows creation of a new agent for that conversation.
**Validates: Requirements 11.3**

### Property 30: Webview Reconnection State Preservation
*For any* webview disconnect and reconnect cycle, agent state (message history, configuration) should be preserved and restored.
**Validates: Requirements 11.4**

### Property 31: Critical Error Data Preservation
*For any* critical error, conversation data should remain accessible and the system should provide export functionality to save the data externally.
**Validates: Requirements 11.5**

### Property 32: Agent-to-Agent Security Validation
*For any* agent-to-agent communication attempt, the system should validate session ownership, sanitize message content, enforce permission checks for tool execution, restrict file operations to workspace, and log unauthorized attempts.
**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

### Property 33: Capability Discovery Completeness
*For any* agent, querying its capabilities should return an accurate list of available tools with descriptions that matches what was registered during agent creation.
**Validates: Requirements 13.2**

### Property 34: Capability Verification
*For any* capability request from one agent to another, the system should verify the target agent supports that capability before allowing the operation, and should return a descriptive error if the capability is missing.
**Validates: Requirements 13.3, 13.4**

### Property 35: Capability Registry Synchronization
*For any* change to an agent's capabilities, the capability registry should be updated immediately and all connected agents should be notified of the change.
**Validates: Requirements 13.5**

## Summary

This design provides a comprehensive solution to fix the broken agent management system in Personaut. The key innovations are:

1. **AgentManager**: Centralized lifecycle management with factory pattern
2. **Automatic Persistence**: Proper callback wiring for conversation saves
3. **Schema Migration**: Backward compatibility for existing conversations
4. **Multi-Agent Support**: Secure, capability-aware agent-to-agent communication
5. **Resource Management**: LRU cache and cleanup for efficient memory usage
6. **Error Resilience**: Retry logic, graceful degradation, and comprehensive error handling

The implementation will be phased to ensure each component is thoroughly tested before moving to the next. The correctness properties provide a comprehensive test suite that validates all requirements across the full range of inputs and scenarios.
