# Personaut Extension

> **🚀 Public Preview** | **v0.1.0**
>
> Personaut is now in **Public Preview**! We're excited to have you try out our empathetic development assistant. Please note that features and APIs may change as we continue to improve the extension based on your feedback.

This directory contains the Personaut extension with a feature-based architecture and centralized agent management.

## 🎯 Quick Start

### Get the Extension Working Now

The backend is complete and secure, but the UI needs to be copied from the old implementation:

```bash
# From project root
cp src/webview/App.tsx personaut/src/webview/App.tsx
cp src/webview/UserBaseTab.tsx personaut/src/webview/
cp src/webview/SettingsTab.tsx personaut/src/webview/
cp src/webview/FeedbackTab.tsx personaut/src/webview/
cp src/webview/BuildLogs.tsx personaut/src/webview/

# Rebuild
npm run compile
```

**See:** [Setup Guide](docs/getting-started/setup.mdx) for detailed instructions.

## 📊 Current Status

- ✅ **Backend:** Complete and secure (all tests passing)
- ✅ **Agent Management:** Centralized lifecycle management with AgentManager
- ✅ **Conversation Persistence:** Automatic save with retry logic
- ✅ **Multi-Agent Support:** Agent-to-agent communication with capability discovery
- ⚠️ **Frontend:** Needs UI implementation (quick fix available)

**See:** [Roadmap](docs/roadmap.mdx) for status.

## 🔒 Security

All critical security vulnerabilities have been fixed:
- ✅ Path traversal protection
- ✅ Input validation
- ✅ Workspace boundaries
- ✅ Error sanitization

**See:** [Architecture](docs/architecture/overview.mdx) for security details.

## 🐛 Bugs

All critical bugs have been resolved:
- ✅ Message routing complete
- ✅ Handler implementations complete
- ✅ AI provider initialization fixed

**See:** [Roadmap](docs/roadmap.mdx) for issue tracking.

## 📁 Directory Structure

```
personaut/
├── src/
│   ├── core/              # Core services
│   │   ├── agent/         # Agent and AgentManager (lifecycle management)
│   │   ├── providers/     # AI provider implementations (Gemini, Bedrock, Native)
│   │   ├── tools/         # Tool implementations (File, Terminal, Browser, MCP)
│   │   ├── integrations/  # External integrations (MCP, Terminal)
│   │   └── prompts/       # System prompts for different modes
│   ├── features/          # Feature modules
│   │   ├── build-mode/    # Build mode feature
│   │   ├── chat/          # Chat feature with ConversationManager
│   │   ├── personas/      # Personas feature
│   │   ├── feedback/      # Feedback feature
│   │   └── settings/      # Settings feature
│   ├── shared/            # Shared utilities and services
│   │   ├── services/      # Validation, storage, error handling
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   ├── presentation/      # SidebarProvider (routing layer)
│   ├── di/                # Dependency injection container
│   ├── webview/           # React UI (needs implementation)
│   └── extension.ts       # Extension entry point
├── __tests__/             # Test files
│   ├── integration/       # Integration tests
│   └── properties/        # Property-based tests
└── docs/                  # Documentation
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- BuildModeHandler

# Watch mode
npm test -- --watch
```

**Results:** 655 tests passing, 22 test suites passing

## 📚 Documentation

### Essential Reading
1. [Setup & Quick Start](docs/getting-started/setup.mdx) - Get the environment and UI running.
2. [Project Roadmap](docs/roadmap.mdx) - Future plans and status.

### Architecture
- [System Architecture](docs/architecture/overview.mdx)
- [Feature Guide](docs/features/overview.mdx)
- [Project Structure](docs/architecture/structure.mdx)

### Security
- See [Architecture](docs/architecture/overview.mdx) for security overview.

## 🚀 Development

### Build
```bash
npm run compile
```

### Watch Mode
```bash
npm run watch
```

### Package
```bash
vsce package
```

## 🔧 Architecture Highlights

### Centralized Agent Management
The **AgentManager** provides:
- **Factory Pattern**: Creates agents with proper configuration per conversation
- **Lifecycle Management**: Handles agent creation, disposal, and cleanup
- **Resource Management**: LRU cache with configurable limits (default: 10 agents, 5min timeout)
- **Capability Registry**: Tracks agent capabilities for discovery and validation
- **Message Queuing**: Sequential message processing to prevent race conditions
- **Error Recovery**: Abort/restart, webview reconnection, conversation export

### Automatic Conversation Persistence
- **Auto-Save**: Messages automatically saved via `onDidUpdateMessages` callback
- **Retry Logic**: Exponential backoff (3 attempts) for save failures
- **Schema Migration**: Automatic V1→V2 migration with validation
- **Round-Trip Integrity**: Conversation data preserved across save/load cycles

### Multi-Agent Communication
- **Agent-to-Agent Messaging**: Secure communication through shared conversations
- **Capability Discovery**: Agents can query each other's available tools
- **Security Validation**: Session ownership and permission checks
- **Message Sanitization**: Content sanitization to prevent injection attacks

### Feature-Based Structure
Each feature is self-contained with:
- Handler (message routing)
- Service (business logic)
- Types (TypeScript interfaces)
- Tests (unit + property-based)

### Security First
- Input validation on all handlers
- Path traversal protection
- Workspace boundary enforcement
- Error message sanitization
- API keys stored in VS Code secure storage

### Dependency Injection
- Clean service registration
- Easy testing and mocking
- Loose coupling between components

## 📝 Key Files

### Entry Points
- `src/extension.ts` - Extension activation and DI container setup
- `src/presentation/SidebarProvider.ts` - Webview management and message routing
- `src/webview/App.tsx` - UI entry point (needs implementation)

### Core Agent System
- `src/core/agent/AgentManager.ts` - **Centralized agent lifecycle management**
- `src/core/agent/Agent.ts` - Individual AI agent implementation
- `src/core/agent/AgentTypes.ts` - Agent configuration types
- `src/shared/types/AgentErrorTypes.ts` - Comprehensive error types

### Conversation Management
- `src/features/chat/services/ConversationManager.ts` - Persistence, migration, pagination
- `src/features/chat/services/ChatService.ts` - Message routing and agent coordination
- `src/shared/utils/retryUtils.ts` - Retry logic with exponential backoff

### AI Providers
- `src/core/providers/GeminiProvider.ts` - Google Gemini integration
- `src/core/providers/BedrockProvider.ts` - AWS Bedrock integration
- `src/core/providers/NativeIDEProvider.ts` - VS Code native AI integration

### Feature Services
- `src/features/build-mode/services/BuildModeService.ts` - Build mode with agent integration
- `src/features/feedback/services/FeedbackService.ts` - Feedback with agent integration
- `src/features/personas/services/PersonasService.ts` - Personas with agent integration
- `src/features/settings/services/SettingsService.ts` - Settings with agent notification

### Feature Handlers
- `src/features/build-mode/handlers/BuildModeHandler.ts`
- `src/features/chat/handlers/ChatHandler.ts`
- `src/features/personas/handlers/PersonasHandler.ts`
- `src/features/feedback/handlers/FeedbackHandler.ts`
- `src/features/settings/handlers/SettingsHandler.ts`

### Dependency Injection
- `src/di/Container.ts` - Service registration and resolution

## 🤖 AgentManager API

The `AgentManager` is the central component for managing AI agent lifecycles across conversations.

### Core Methods

#### Agent Lifecycle
```typescript
// Get or create an agent for a conversation
await agentManager.getOrCreateAgent(conversationId, mode);

// Dispose a specific agent
await agentManager.disposeAgent(conversationId);

// Dispose all agents (called during extension deactivation)
await agentManager.disposeAllAgents();
```

#### Message Handling
```typescript
// Send a message with automatic queuing
await agentManager.sendMessage(
  conversationId,
  input,
  contextFiles,
  settings,
  systemInstruction,
  isPersonaChat
);

// Switch between conversations (< 500ms target)
await agentManager.switchConversation(fromId, toId, mode);
```

#### Settings Management
```typescript
// Update settings (triggers reinitialization if critical settings changed)
await agentManager.updateSettings(settings);

// Manually reinitialize all agents
await agentManager.reinitializeAgents();
```

#### Capability Management
```typescript
// Register a capability for an agent
agentManager.registerCapability(conversationId, capability);

// Get all capabilities for an agent
const capabilities = agentManager.getCapabilities(conversationId);

// Query if an agent has a specific capability
const hasCapability = agentManager.queryCapability(conversationId, 'tool-name');
```

#### Error Recovery
```typescript
// Abort and restart an unresponsive agent
const newAgent = await agentManager.abortAndRestartAgent(conversationId);

// Export conversation data for critical errors
const jsonData = await agentManager.exportConversationData(conversationId);

// Handle webview disconnection/reconnection
const states = await agentManager.handleWebviewDisconnection();
await agentManager.handleWebviewReconnection(webview, states);
```

#### Resource Management
```typescript
// Get active agent count
const count = agentManager.getActiveAgentCount();

// Check if agent exists
const exists = agentManager.hasAgent(conversationId);

// Validate agent-to-agent communication
const allowed = agentManager.validateAgentCommunication(fromId, toId);
```

### Configuration

```typescript
const config: AgentManagerConfig = {
  webview: vscode.Webview,
  tokenStorageService: TokenStorageService,
  conversationManager: ConversationManager,
  maxActiveAgents: 10,        // Default: 10
  inactivityTimeout: 300000,  // Default: 5 minutes (ms)
};

const agentManager = new AgentManager(config);
```

### Automatic Features

- **Message Persistence**: All messages automatically saved via `onDidUpdateMessages` callback
- **Retry Logic**: Save operations retry 3 times with exponential backoff
- **Resource Cleanup**: Inactive agents disposed after timeout (default: 5 minutes)
- **LRU Eviction**: Least recently used agents disposed when limit reached
- **Periodic Cleanup**: Runs every 5 minutes to clean up inactive agents
- **Comprehensive Logging**: All operations logged with context for debugging

## ⚙️ Settings That Require Agent Restart

When these settings are changed, all active agents are automatically disposed and recreated with the new configuration:

### Critical Settings (Trigger Reinitialization)
- **`provider`** - AI provider selection (gemini, bedrock, nativeIde)
- **`geminiApiKey`** - Google Gemini API key
- **`geminiModel`** - Gemini model selection
- **`awsAccessKey`** - AWS access key for Bedrock
- **`awsSecretKey`** - AWS secret key for Bedrock
- **`awsRegion`** - AWS region for Bedrock
- **`awsProfile`** - AWS profile name
- **`awsUseProfile`** - Whether to use AWS profile
- **`bedrockModel`** - Bedrock model selection

### Non-Critical Settings (No Restart Required)
- **`theme`** - UI theme
- **`autoRead`** - Auto-read file permissions
- **`autoWrite`** - Auto-write file permissions
- **`autoExecute`** - Auto-execute command permissions
- **`rateLimit`** - Rate limit configuration
- **`rateLimitWarningThreshold`** - Warning threshold

### How It Works

1. User changes settings via SettingsService
2. SettingsService saves to VS Code config + secure storage
3. SettingsService calls `agentManager.updateSettings()`
4. AgentManager checks if critical settings changed
5. If critical: disposes all agents, clears registry
6. Next agent request creates fresh agent with new settings

## 🎯 Next Steps

### Immediate
1. Apply quick fix to get UI working
2. Test all features
3. Package extension

### Short-term
1. Add user documentation
2. Performance optimization
3. User feedback collection

### Long-term
1. Create spec for UI refactoring
2. Extract feature components
3. Add UI component tests
4. Implement remaining features

## 🤝 Contributing

See `CONTRIBUTING.md` in the project root.

## 📄 License

See `LICENSE` in the project root.

---

**Need Help?**
- Check [Setup Guide](docs/getting-started/setup.mdx) to get UI working
- Check [Roadmap](docs/roadmap.mdx) for overall status
- Check [Architecture](docs/architecture/overview.mdx) for security info
