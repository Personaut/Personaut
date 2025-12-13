# Requirements Document

## Introduction

This document outlines the requirements for fixing critical issues in the Personaut extension related to agent creation, agent-to-human interactions, agent-to-agent interactions, and conversation persistence. After a recent refactoring, several core functionalities are broken:

1. **Agent Creation**: The ChatService is initialized with `null` as the Agent instance in extension.ts
2. **Agent Lifecycle**: No mechanism exists to create agents per conversation or manage agent instances
3. **Message Persistence**: The `onDidUpdateMessages` callback is not properly wired to save conversations
4. **Webview Communication**: Agent instances don't have access to the webview for posting messages
5. **Conversation Loading**: Loading conversations doesn't restore message history to the agent

## Glossary

- **Agent**: The AI assistant that processes user messages, executes tools, and maintains conversation context
- **ChatService**: Service layer that manages chat operations and conversation persistence
- **ChatHandler**: Handler that routes webview messages to the ChatService
- **ConversationManager**: Manages conversation storage, retrieval, and pagination
- **SidebarProvider**: Manages the webview lifecycle and routes messages to feature handlers
- **Message History**: The sequence of messages (user and model) in a conversation
- **Webview**: The VS Code UI component that displays the chat interface

## Requirements

### Requirement 1

**User Story:** As a user, I want to create new chat conversations with an AI agent, so that I can interact with the assistant and get help with my coding tasks.

#### Acceptance Criteria

1. WHEN the extension activates THEN the System SHALL initialize the ChatService with a valid agent factory function instead of a null agent
2. WHEN a user starts a new conversation THEN the System SHALL create a new Agent instance with the correct webview reference
3. WHEN a user sends a message THEN the System SHALL route the message to the active Agent instance
4. WHEN an Agent is created THEN the System SHALL provide it with a callback function to persist message updates
5. WHEN an Agent processes a message THEN the System SHALL ensure the Agent has access to the webview for posting responses

### Requirement 2

**User Story:** As a user, I want my conversations to be automatically saved, so that I can resume them later without losing context.

#### Acceptance Criteria

1. WHEN an Agent updates its message history THEN the System SHALL invoke the onDidUpdateMessages callback with the current messages
2. WHEN the onDidUpdateMessages callback is invoked THEN the System SHALL save the conversation to storage via ConversationManager
3. WHEN a conversation is saved THEN the System SHALL persist all messages with their roles and content
4. WHEN a conversation is saved THEN the System SHALL update the conversation title based on the first user message
5. WHEN saving fails THEN the System SHALL log the error without crashing the extension

### Requirement 3

**User Story:** As a user, I want to load previous conversations, so that I can continue where I left off with full context.

#### Acceptance Criteria

1. WHEN a user requests to load a conversation THEN the System SHALL retrieve the conversation from ConversationManager
2. WHEN a conversation is loaded THEN the System SHALL create a new Agent instance or reuse the existing one
3. WHEN a conversation is loaded THEN the System SHALL restore the message history to the Agent via loadHistory method
4. WHEN message history is restored THEN the System SHALL display all messages in the webview
5. WHEN a loaded conversation receives new messages THEN the System SHALL continue saving updates to the same conversation

### Requirement 4

**User Story:** As a user, I want each conversation to maintain its own context, so that switching between conversations doesn't mix up the chat history.

#### Acceptance Criteria

1. WHEN a user switches conversations THEN the System SHALL associate the correct Agent instance with the active conversation
2. WHEN multiple conversations exist THEN the System SHALL maintain separate message histories for each conversation
3. WHEN a user creates a new conversation THEN the System SHALL create a new Agent instance with empty message history
4. WHEN a user deletes a conversation THEN the System SHALL clean up the associated Agent instance if it exists
5. WHEN the extension deactivates THEN the System SHALL dispose of all Agent instances properly

### Requirement 5

**User Story:** As a developer, I want the agent creation and lifecycle to be properly managed, so that the system is maintainable and doesn't leak resources.

#### Acceptance Criteria

1. WHEN the ChatService is initialized THEN the System SHALL accept an agent factory function instead of a direct Agent instance
2. WHEN the ChatService needs an Agent THEN the System SHALL invoke the factory function with the current conversation ID
3. WHEN an Agent is no longer needed THEN the System SHALL call its dispose method to clean up resources
4. WHEN the webview is recreated THEN the System SHALL update all Agent instances with the new webview reference
5. WHEN an error occurs during agent creation THEN the System SHALL provide a meaningful error message to the user

### Requirement 6

**User Story:** As a user, I want agents to communicate with each other through shared conversations, so that I can orchestrate multi-agent workflows for complex tasks.

#### Acceptance Criteria

1. WHEN a user initiates an agent-to-agent interaction THEN the System SHALL create or retrieve Agent instances for both participants
2. WHEN an Agent sends a message to another Agent THEN the System SHALL route the message through the conversation message history
3. WHEN an Agent receives a message from another Agent THEN the System SHALL process it using the same message handling pipeline as user messages
4. WHEN agent-to-agent communication occurs THEN the System SHALL persist all messages to the shared conversation
5. WHEN displaying agent-to-agent messages THEN the System SHALL clearly indicate which Agent sent each message in the webview

### Requirement 7

**User Story:** As a user, I want the system to handle multiple concurrent conversations efficiently, so that I can work with several agents simultaneously without performance degradation.

#### Acceptance Criteria

1. WHEN multiple conversations are active THEN the System SHALL maintain separate Agent instances for each conversation
2. WHEN switching between conversations THEN the System SHALL complete the switch within 500 milliseconds
3. WHEN an Agent is processing a message THEN the System SHALL allow other conversations to remain responsive
4. WHEN memory usage exceeds a threshold THEN the System SHALL dispose of inactive Agent instances while preserving conversation history
5. WHEN concurrent message sends occur THEN the System SHALL queue and process them without race conditions

### Requirement 8

**User Story:** As a user, I want my existing conversations to continue working after the system is updated, so that I don't lose access to my chat history.

#### Acceptance Criteria

1. WHEN the extension loads existing conversations from storage THEN the System SHALL validate the conversation data structure
2. WHEN a conversation uses an outdated schema THEN the System SHALL migrate it to the current schema automatically
3. WHEN migration fails for a conversation THEN the System SHALL log the error and skip that conversation without crashing
4. WHEN all conversations are loaded THEN the System SHALL report the number of successfully loaded and failed conversations
5. WHEN a migrated conversation is saved THEN the System SHALL use the current schema format

### Requirement 9

**User Story:** As a user, I want to be notified when conversation operations fail, so that I understand what went wrong and can take corrective action.

#### Acceptance Criteria

1. WHEN a conversation fails to save THEN the System SHALL display an error message in the webview with the reason
2. WHEN a conversation fails to load THEN the System SHALL display an error message and offer to create a new conversation
3. WHEN an Agent fails to initialize THEN the System SHALL display an error message with troubleshooting steps
4. WHEN the storage quota is exceeded THEN the System SHALL notify the user and suggest clearing old conversations
5. WHEN network errors occur during AI provider communication THEN the System SHALL display a user-friendly error message

### Requirement 10

**User Story:** As a developer, I want comprehensive logging of agent lifecycle events, so that I can debug issues and monitor system health.

#### Acceptance Criteria

1. WHEN an Agent is created THEN the System SHALL log the conversation ID and timestamp
2. WHEN an Agent processes a message THEN the System SHALL log the message type and processing duration
3. WHEN a conversation is saved THEN the System SHALL log the conversation ID and message count
4. WHEN an Agent is disposed THEN the System SHALL log the conversation ID and cleanup status
5. WHEN errors occur THEN the System SHALL log the full error stack trace with context information

### Requirement 11

**User Story:** As a user, I want the system to recover gracefully from errors, so that a single failure doesn't break my entire workflow.

#### Acceptance Criteria

1. WHEN an Agent encounters an error during message processing THEN the System SHALL display the error without terminating the Agent
2. WHEN a save operation fails THEN the System SHALL retry up to 3 times with exponential backoff
3. WHEN an Agent becomes unresponsive THEN the System SHALL provide a way to abort and restart the Agent
4. WHEN the webview disconnects THEN the System SHALL preserve Agent state and reconnect when the webview is restored
5. WHEN critical errors occur THEN the System SHALL preserve conversation data and allow the user to export it

### Requirement 12

**User Story:** As a security-conscious user, I want agent-to-agent communication to be secure and controlled, so that agents cannot perform unauthorized actions or access sensitive data.

#### Acceptance Criteria

1. WHEN an Agent attempts to communicate with another Agent THEN the System SHALL validate that both agents belong to the same user session
2. WHEN an Agent sends a message to another Agent THEN the System SHALL sanitize the message content to prevent injection attacks
3. WHEN an Agent requests tool execution through another Agent THEN the System SHALL enforce the same permission checks as direct user requests
4. WHEN agent-to-agent communication involves file operations THEN the System SHALL restrict access to the workspace directory only
5. WHEN an Agent attempts unauthorized communication THEN the System SHALL log the attempt and notify the user

### Requirement 13

**User Story:** As a user, I want agents to discover and negotiate their capabilities, so that they can collaborate effectively on complex tasks.

#### Acceptance Criteria

1. WHEN an Agent is created THEN the System SHALL register the Agent's available tools and capabilities
2. WHEN an Agent queries another Agent's capabilities THEN the System SHALL return a list of available tools and their descriptions
3. WHEN an Agent requests a capability from another Agent THEN the System SHALL verify the target Agent supports that capability
4. WHEN an Agent lacks a required capability THEN the System SHALL return an error message indicating the missing capability
5. WHEN Agent capabilities change THEN the System SHALL update the capability registry and notify connected Agents
