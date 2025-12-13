# Implementation Plan

## Overview

This implementation plan breaks down the agent interaction fixes into discrete, manageable tasks. Each task builds incrementally on previous work, with checkpoints to ensure tests pass before proceeding.

## Task List

- [x] 1. Create AgentManager Core Infrastructure
  - Create `src/core/agent/AgentManager.ts` with basic structure
  - Implement agent registry (Map<conversationId, Agent>)
  - Implement agent factory function that creates agents with proper configuration
  - Implement `getOrCreateAgent(conversationId, mode)` method
  - Implement `disposeAgent(conversationId)` and `disposeAllAgents()` methods
  - Implement `updateWebview(webview)` method to update all active agents
  - Add logging for all agent lifecycle events
  - _Requirements: 1.1, 1.2, 5.1, 5.2, 10.1, 10.4_

- [x] 1.1 Write property test for agent creation completeness
  - **Property 1: Agent Creation Completeness**
  - **Validates: Requirements 1.2, 1.4, 1.5, 13.1**

- [x] 1.2 Write property test for agent cleanup
  - **Property 12: Resource Cleanup**
  - **Validates: Requirements 5.3**

- [x] 2. Wire Up Message Persistence Callbacks
  - Modify `AgentManager` to accept `ConversationManager` in constructor
  - Implement `onDidUpdateMessages` callback that saves to `ConversationManager`
  - Ensure callback is passed to all agents during creation
  - Add error handling for save failures (log but don't crash)
  - Test that message updates trigger saves
  - _Requirements: 1.4, 2.1, 2.2, 2.5_

- [x] 2.1 Write property test for conversation persistence round-trip
  - **Property 3: Conversation Persistence Round-Trip**
  - **Validates: Requirements 2.1, 2.2, 2.3, 3.3**

- [x] 2.2 Write property test for error resilience
  - **Property 5: Error Resilience**
  - **Validates: Requirements 2.5, 9.1, 9.2, 9.3, 9.5, 11.1**

- [x] 3. Update ChatService to Use AgentManager
  - Modify `ChatService` constructor to accept `AgentManager` instead of `Agent`
  - Update `sendMessage` to get agent from `AgentManager` using conversation ID
  - Update `loadConversation` to restore message history via `agent.loadHistory()`
  - Implement `switchConversation` method
  - Update `abort` to call abort on the correct agent
  - _Requirements: 1.3, 3.1, 3.2, 3.3, 4.1_

- [x] 3.1 Write property test for message routing correctness
  - **Property 2: Message Routing Correctness**
  - **Validates: Requirements 1.3**

- [x] 3.2 Write property test for conversation loading completeness
  - **Property 6: Conversation Loading Completeness**
  - **Validates: Requirements 3.1, 3.2, 3.4**

- [x] 3.3 Write property test for conversation isolation
  - **Property 8: Conversation Isolation**
  - **Validates: Requirements 4.1, 4.2**

- [x] 4. Update Extension.ts Dependency Injection
  - Register `AgentManager` in the DI container
  - Update `ChatService` registration to use `AgentManager`
  - Remove the `null` agent placeholder
  - Ensure `AgentManager` receives webview reference from `SidebarProvider`
  - Test that extension activates without errors
  - _Requirements: 1.1, 5.1_

- [x] 5. Implement ConversationManager Schema Migration
  - Add `CURRENT_SCHEMA_VERSION = 2` constant
  - Implement `migrateConversation(data)` method for V1 to V2 migration
  - Implement `validateSchema(data)` method
  - Update `loadAllConversations()` to migrate and validate on load
  - Add error handling for migration failures (log and skip)
  - Return summary of successful and failed loads
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5.1 Write property test for schema migration success
  - **Property 22: Schema Migration Success**
  - **Validates: Requirements 8.2**

- [x] 5.2 Write property test for migration failure isolation
  - **Property 23: Migration Failure Isolation**
  - **Validates: Requirements 8.3**

- [x] 6. Implement Retry Logic for Save Operations
  - Create `retryWithBackoff` utility function
  - Update `ConversationManager.saveConversation` to use retry logic
  - Configure 3 retry attempts with exponential backoff (1s, 2s, 4s)
  - Add logging for retry attempts
  - Test with simulated save failures
  - _Requirements: 11.2_

- [x] 6.1 Write property test for save retry with backoff
  - **Property 28: Save Retry with Backoff**
  - **Validates: Requirements 11.2**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Settings Integration with AgentManager
  - Update `SettingsService` constructor to accept optional `AgentManager`
  - Implement `validateProviderSettings(provider)` method
  - Implement `notifySettingsChanged(settings)` private method
  - Call `notifySettingsChanged` after successful `saveSettings`
  - Identify critical vs non-critical settings
  - _Requirements: 5.4_

- [x] 9. Implement AgentManager Settings Management
  - Add `currentSettings` property to `AgentManager`
  - Implement `updateSettings(settings)` method
  - Implement `reinitializeAgents()` method
  - Determine if settings change requires reinitialization
  - If critical settings changed, dispose all agents and clear registry
  - Add logging for settings updates and reinitializations
  - _Requirements: 5.4, 13.5_

- [x] 9.1 Write property test for webview reference update
  - **Property 13: Webview Reference Update**
  - **Validates: Requirements 5.4**

- [x] 10. Update BuildModeService to Use AgentManager
  - Update `BuildModeService` constructor to accept `AgentManager`
  - Implement `generateStageContent(projectName, stage, prompt, onProgress)` method
  - Create build-mode agent with project context
  - Wire up progress callback for streaming
  - Dispose agent after content generation completes
  - _Requirements: Build Mode Integration_

- [x] 11. Update FeedbackService to Use AgentManager
  - Update `FeedbackService` constructor to accept `AgentManager`
  - Implement `generateFeedbackWithAI(params, onProgress)` method
  - Create feedback-mode agent with persona context
  - Wire up progress callback for streaming
  - Dispose agent after feedback generation completes
  - _Requirements: Feedback Integration_

- [-] 12. Update PersonasService to Use AgentManager
  - Update `PersonasService` constructor to accept `AgentManager` instead of `IProvider`
  - Update `generateBackstory(id, onProgress)` method to use `AgentManager`
  - Create chat-mode agent with persona system prompt
  - Wire up progress callback for streaming
  - Dispose agent after backstory generation completes
  - _Requirements: Personas Integration_

- [ ] 13. Update Extension.ts for All Services
  - Update `BuildModeService` registration to pass `AgentManager`
  - Update `FeedbackService` registration to pass `AgentManager`
  - Update `PersonasService` registration to pass `AgentManager`
  - Update `SettingsService` registration to pass `AgentManager`
  - Test that all features work with new agent management
  - _Requirements: Integration_

- [ ] 14. Checkpoint - Ensure all features work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement Capability Registry
  - Add `capabilities` Map to `AgentManager`
  - Implement `registerCapability(agentId, capability)` method
  - Implement `getCapabilities(agentId)` method
  - Implement `queryCapability(agentId, capabilityName)` method
  - Register capabilities during agent creation
  - _Requirements: 13.1, 13.2, 13.3_

- [ ] 15.1 Write property test for capability discovery completeness
  - **Property 33: Capability Discovery Completeness**
  - **Validates: Requirements 13.2**

- [ ] 15.2 Write property test for capability verification
  - **Property 34: Capability Verification**
  - **Validates: Requirements 13.3, 13.4**

- [ ] 16. Implement Agent-to-Agent Communication
  - Implement `sendAgentMessage(fromConversationId, toConversationId, message)` in `ChatService`
  - Validate both agents exist
  - Validate session ownership (security check)
  - Sanitize message content
  - Route message through conversation history
  - Persist message to storage
  - Add sender metadata to message
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 12.1, 12.2_

- [ ] 16.1 Write property test for agent-to-agent message persistence
  - **Property 14: Agent-to-Agent Message Persistence**
  - **Validates: Requirements 6.2, 6.4**

- [ ] 16.2 Write property test for agent-to-agent security validation
  - **Property 32: Agent-to-Agent Security Validation**
  - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

- [ ] 17. Implement Resource Management
  - Add `lastAccess` Map to `AgentManager`
  - Add `maxActiveAgents` and `inactivityTimeout` config options
  - Implement `cleanupInactiveAgents()` private method
  - Implement `enforceAgentLimit()` private method
  - Call cleanup methods periodically (every 5 minutes)
  - Update `lastAccess` on every agent interaction
  - _Requirements: 7.1, 7.4_

- [ ] 17.1 Write property test for agent instance uniqueness
  - **Property 17: Agent Instance Uniqueness**
  - **Validates: Requirements 7.1**

- [ ] 17.2 Write property test for resource-aware cleanup
  - **Property 20: Resource-Aware Cleanup**
  - **Validates: Requirements 7.4**

- [ ] 18. Implement Concurrent Processing Support
  - Ensure `AgentManager` methods are async and don't block
  - Add message queue per agent to prevent race conditions
  - Test concurrent message sends to different conversations
  - Verify conversation switch performance (< 500ms)
  - _Requirements: 7.2, 7.3, 7.5_

- [ ] 18.1 Write property test for conversation switch performance
  - **Property 18: Conversation Switch Performance**
  - **Validates: Requirements 7.2**

- [ ] 18.2 Write property test for concurrent message safety
  - **Property 21: Concurrent Message Safety**
  - **Validates: Requirements 7.5**

- [ ] 19. Implement Comprehensive Error Types
  - Create `AgentError` class with error types enum
  - Update all error handling to use `AgentError`
  - Ensure errors include conversation ID and context
  - Add user-friendly error messages for each error type
  - _Requirements: 5.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 20. Implement Error Recovery Mechanisms
  - Implement abort and restart for unresponsive agents
  - Implement webview reconnection with state preservation
  - Implement conversation export for critical errors
  - Add retry logic for network errors
  - Test all error recovery paths
  - _Requirements: 11.1, 11.3, 11.4, 11.5_

- [ ] 20.1 Write property test for agent recovery
  - **Property 29: Agent Recovery**
  - **Validates: Requirements 11.3**

- [ ] 20.2 Write property test for webview reconnection state preservation
  - **Property 30: Webview Reconnection State Preservation**
  - **Validates: Requirements 11.4**

- [ ] 21. Implement Comprehensive Logging
  - Add structured logging for all agent lifecycle events
  - Log conversation ID, timestamp, and operation type
  - Log message processing duration
  - Log error stack traces with context
  - Ensure logs don't contain sensitive information (API keys)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 21.1 Write property test for comprehensive operation logging
  - **Property 26: Comprehensive Operation Logging**
  - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

- [ ] 21.2 Write property test for error logging completeness
  - **Property 27: Error Logging Completeness**
  - **Validates: Requirements 10.5**

- [ ] 22. Final Checkpoint - Comprehensive Testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Integration Testing
  - Test creating new conversations
  - Test loading existing conversations
  - Test switching between conversations
  - Test agent-to-agent communication
  - Test settings changes trigger agent reinitialization
  - Test build mode content generation
  - Test feedback generation
  - Test persona backstory generation
  - Test error scenarios and recovery
  - Test concurrent operations

- [ ] 24. Documentation and Cleanup
  - Update README with new architecture
  - Document AgentManager API
  - Document settings that require agent restart
  - Add inline code comments for complex logic
  - Remove any deprecated code
  - Verify all console.log statements are appropriate
