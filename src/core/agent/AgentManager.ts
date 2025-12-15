/**
 * AgentManager handles the lifecycle of Agent instances across conversations.
 * 
 * Responsibilities:
 * - Factory pattern for agent creation with proper configuration
 * - Registry management for conversation-to-agent mapping
 * - Resource cleanup and disposal
 * - Webview reference updates
 * - Capability tracking and discovery
 * 
 * Feature: agent-interaction-fixes
 * Validates: Requirements 1.1, 1.2, 5.1, 5.2, 10.1, 10.4
 */

import * as vscode from 'vscode';
import { Agent } from './Agent';
import { AgentMode, AgentConfig } from './AgentTypes';
import { Message } from '../providers/IProvider';
import { TokenStorageService } from '../../shared/services/TokenStorageService';
import { TokenMonitor } from '../../shared/services/TokenMonitor';
import { ConversationManager } from '../../features/chat/services/ConversationManager';
import { Settings } from '../../features/settings/types/SettingsTypes';
import {
  AgentError,
  AgentErrorType,
  wrapAsAgentError,
} from '../../shared/types/AgentErrorTypes';

/**
 * Configuration for AgentManager initialization
 */
export interface AgentManagerConfig {
  webview: vscode.Webview;
  tokenStorageService: TokenStorageService;
  conversationManager: ConversationManager;
  tokenMonitor?: TokenMonitor; // For token usage tracking
  maxActiveAgents?: number;
  inactivityTimeout?: number;
}

/**
 * Capability definition for agent discovery
 */
export interface AgentCapability {
  name: string;
  description: string;
  tools: string[];
}

/**
 * Metadata tracked for each agent instance
 */
interface AgentRegistryEntry {
  agent: Agent;
  createdAt: number;
  lastAccess: number;
  mode: AgentMode;
  messageQueue: MessageQueueEntry[];
  isProcessing: boolean;
}

/**
 * Message queue entry for sequential processing
 */
interface MessageQueueEntry {
  input: string;
  contextFiles: any[];
  settings: any;
  systemInstruction?: string;
  isPersonaChat: boolean;
  resolve: (value: void) => void;
  reject: (error: Error) => void;
}

/**
 * AgentManager centralizes agent lifecycle management
 */
export class AgentManager {
  private agents: Map<string, AgentRegistryEntry> = new Map();
  private capabilities: Map<string, AgentCapability[]> = new Map();
  private config: AgentManagerConfig;
  private currentSettings: Settings | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly maxActiveAgents: number;
  private readonly inactivityTimeout: number;

  constructor(config: AgentManagerConfig) {
    this.config = config;
    this.maxActiveAgents = config.maxActiveAgents || 10;
    this.inactivityTimeout = config.inactivityTimeout || 300000; // 5 minutes default

    console.log('[AgentManager] Initialized with config:', {
      maxActiveAgents: this.maxActiveAgents,
      inactivityTimeout: this.inactivityTimeout,
    });

    // Start periodic cleanup (every 5 minutes)
    this.startPeriodicCleanup();
  }

  /**
   * Message persistence callback
   * Saves conversation messages to storage via ConversationManager
   * Implements error handling for save failures (log but don't crash)
   * Validates: Requirements 1.4, 2.1, 2.2, 2.5
   */
  private async onDidUpdateMessages(conversationId: string, messages: Message[]): Promise<void> {
    try {
      console.log('[AgentManager] Saving conversation:', {
        conversationId,
        messageCount: messages.length,
        timestamp: Date.now(),
      });

      await this.config.conversationManager.saveConversation(conversationId, messages);

      console.log('[AgentManager] Conversation saved successfully:', {
        conversationId,
        messageCount: messages.length,
      });
    } catch (error: any) {
      // Wrap as AgentError for consistent error handling
      const agentError = wrapAsAgentError(
        error,
        AgentErrorType.PERSISTENCE_FAILED,
        conversationId
      );

      // Log error but don't crash - requirement 2.5
      console.error('[AgentManager] Failed to save conversation:', agentError.toJSON());

      // Don't throw - we want to continue operating even if save fails
      // The error is logged with full context for debugging
    }
  }

  /**
   * Get or create an agent for a conversation
   * Implements factory pattern for agent creation
   * 
   * @param conversationId - Unique identifier for the conversation
   * @param mode - Agent mode (chat, build, feedback)
   * @returns Agent instance for the conversation
   * @throws AgentError if agent creation fails
   */
  async getOrCreateAgent(conversationId: string, mode: AgentMode = 'chat'): Promise<Agent> {
    try {
      const now = Date.now();

      // Check if agent already exists
      const existing = this.agents.get(conversationId);
      if (existing) {
        console.log('[AgentManager] Reusing existing agent:', {
          conversationId,
          mode: existing.mode,
          age: now - existing.createdAt,
        });
        // Update last access time on every interaction
        existing.lastAccess = now;
        return existing.agent;
      }

      // Enforce agent limit before creating new agent
      await this.enforceAgentLimit();

      // Create new agent
      console.log('[AgentManager] Creating new agent:', {
        conversationId,
        mode,
        timestamp: now,
      });

      const agentConfig: AgentConfig = {
        conversationId,
        mode,
        onDidUpdateMessages: async (messages: Message[]) => {
          await this.onDidUpdateMessages(conversationId, messages);
        },
      };

      const agent = new Agent(
        this.config.webview,
        agentConfig,
        this.config.tokenStorageService,
        this.config.tokenMonitor // Pass token monitor for usage tracking
      );

      // Register agent with message queue
      this.agents.set(conversationId, {
        agent,
        createdAt: now,
        lastAccess: now,
        mode,
        messageQueue: [],
        isProcessing: false,
      });

      console.log('[AgentManager] Agent created successfully:', {
        conversationId,
        totalAgents: this.agents.size,
      });

      return agent;
    } catch (error: any) {
      // Wrap as AgentError with proper context
      const agentError = wrapAsAgentError(
        error,
        AgentErrorType.CREATION_FAILED,
        conversationId
      );

      console.error('[AgentManager] Failed to create agent:', agentError.toJSON());

      // Re-throw as AgentError for caller to handle
      throw agentError;
    }
  }

  /**
   * Dispose of a specific agent and clean up resources
   * 
   * @param conversationId - Conversation ID of the agent to dispose
   */
  async disposeAgent(conversationId: string): Promise<void> {
    const entry = this.agents.get(conversationId);
    if (!entry) {
      console.log('[AgentManager] Agent not found for disposal:', conversationId);
      return;
    }

    console.log('[AgentManager] Disposing agent:', {
      conversationId,
      mode: entry.mode,
      lifetime: Date.now() - entry.createdAt,
    });

    try {
      entry.agent.dispose();
      this.agents.delete(conversationId);
      this.capabilities.delete(conversationId);

      console.log('[AgentManager] Agent disposed successfully:', {
        conversationId,
        remainingAgents: this.agents.size,
      });
    } catch (error: any) {
      // Wrap as AgentError for consistent error handling
      const agentError = wrapAsAgentError(
        error,
        AgentErrorType.CREATION_FAILED, // Using CREATION_FAILED as it's a lifecycle error
        conversationId
      );

      console.error('[AgentManager] Error disposing agent:', agentError.toJSON());

      // Re-throw for caller to handle
      throw agentError;
    }
  }

  /**
   * Dispose of all active agents
   * Called during extension deactivation
   */
  async disposeAllAgents(): Promise<void> {
    console.log('[AgentManager] Disposing all agents:', {
      totalAgents: this.agents.size,
    });

    const disposalPromises: Promise<void>[] = [];

    for (const [conversationId, entry] of this.agents.entries()) {
      disposalPromises.push(
        (async () => {
          try {
            entry.agent.dispose();
            console.log('[AgentManager] Agent disposed:', conversationId);
          } catch (error: any) {
            // Wrap as AgentError for consistent error handling
            const agentError = wrapAsAgentError(
              error,
              AgentErrorType.CREATION_FAILED,
              conversationId
            );

            console.error('[AgentManager] Error disposing agent:', agentError.toJSON());
            // Don't throw - we want to continue disposing other agents
          }
        })()
      );
    }

    await Promise.all(disposalPromises);

    this.agents.clear();
    this.capabilities.clear();

    console.log('[AgentManager] All agents disposed');
  }

  /**
   * Update webview reference for all active agents
   * Called when webview is recreated
   * 
   * @param webview - New webview instance
   */
  updateWebview(webview: vscode.Webview): void {
    console.log('[AgentManager] Updating webview reference for all agents:', {
      totalAgents: this.agents.size,
    });

    this.config.webview = webview;

    // Note: Current Agent implementation doesn't support updating webview after construction
    // This would require refactoring Agent to accept webview updates
    // For now, we log the update and store the new reference for future agents
    console.log('[AgentManager] Webview reference updated in config');
  }

  /**
   * Update settings and reinitialize agents if critical settings changed
   * Critical settings include: provider, API keys, model selection, region
   * 
   * @param settings - New settings to apply
   * Validates: Requirements 5.4, 13.5
   */
  async updateSettings(settings: Partial<Settings>): Promise<void> {
    console.log('[AgentManager] Updating settings:', {
      changedSettings: Object.keys(settings),
      timestamp: Date.now(),
    });

    // Determine if settings change requires reinitialization
    const criticalSettings = [
      'provider',
      'geminiApiKey',
      'awsAccessKey',
      'awsSecretKey',
      'geminiModel',
      'bedrockModel',
      'awsRegion',
      'awsProfile',
      'awsUseProfile',
    ];

    const hasCriticalChanges = Object.keys(settings).some((key) =>
      criticalSettings.includes(key)
    );

    if (hasCriticalChanges) {
      console.log('[AgentManager] Critical settings changed, reinitializing agents:', {
        changedSettings: Object.keys(settings),
        activeAgents: this.agents.size,
      });

      // Store the new settings
      this.currentSettings = {
        ...this.currentSettings,
        ...settings,
      } as Settings;

      // Reinitialize all agents
      await this.reinitializeAgents();
    } else {
      console.log('[AgentManager] Non-critical settings changed, no reinitialization needed:', {
        changedSettings: Object.keys(settings),
      });

      // Update stored settings even for non-critical changes
      this.currentSettings = {
        ...this.currentSettings,
        ...settings,
      } as Settings;
    }
  }

  /**
   * Reinitialize all agents by disposing them and clearing the registry
   * New agents will be created with updated settings on next request
   * 
   * Validates: Requirements 5.4, 13.5
   */
  async reinitializeAgents(): Promise<void> {
    const agentCount = this.agents.size;

    console.log('[AgentManager] Reinitializing agents:', {
      totalAgents: agentCount,
      timestamp: Date.now(),
    });

    // Dispose all agents
    await this.disposeAllAgents();

    console.log('[AgentManager] All agents reinitialized:', {
      previousAgentCount: agentCount,
      currentAgentCount: this.agents.size,
    });
  }

  /**
   * Register capabilities for an agent
   * 
   * @param conversationId - Agent's conversation ID
   * @param capability - Capability to register
   */
  registerCapability(conversationId: string, capability: AgentCapability): void {
    const existing = this.capabilities.get(conversationId) || [];
    existing.push(capability);
    this.capabilities.set(conversationId, existing);

    console.log('[AgentManager] Capability registered:', {
      conversationId,
      capability: capability.name,
      totalCapabilities: existing.length,
    });
  }

  /**
   * Get all capabilities for an agent
   * 
   * @param conversationId - Agent's conversation ID
   * @returns Array of capabilities
   */
  getCapabilities(conversationId: string): AgentCapability[] {
    return this.capabilities.get(conversationId) || [];
  }

  /**
   * Query if an agent has a specific capability
   * 
   * @param conversationId - Agent's conversation ID
   * @param capabilityName - Name of the capability to check
   * @returns true if the agent has the capability
   */
  queryCapability(conversationId: string, capabilityName: string): boolean {
    const capabilities = this.capabilities.get(conversationId) || [];
    return capabilities.some((cap) => cap.name === capabilityName);
  }

  /**
   * Get the number of active agents
   */
  getActiveAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Check if an agent exists for a conversation
   * 
   * @param conversationId - Conversation ID to check
   * @returns true if an agent exists
   */
  hasAgent(conversationId: string): boolean {
    return this.agents.has(conversationId);
  }

  /**
   * Validate agent-to-agent communication permissions
   * Ensures both agents belong to the same session and are authorized to communicate
   * 
   * @param fromConversationId - Source agent conversation ID
   * @param toConversationId - Target agent conversation ID
   * @returns true if communication is allowed
   * 
   * Validates: Requirements 12.1, 12.3, 12.4
   */
  validateAgentCommunication(fromConversationId: string, toConversationId: string): boolean {
    // Check if both agents exist
    if (!this.hasAgent(fromConversationId) || !this.hasAgent(toConversationId)) {
      console.warn('[AgentManager] Agent-to-agent communication denied: agent not found', {
        from: fromConversationId,
        to: toConversationId,
      });
      return false;
    }

    // In a single-user VS Code extension, all agents belong to the same session
    // This is a placeholder for future multi-session support
    // For now, all active agents can communicate with each other

    console.log('[AgentManager] Agent-to-agent communication validated:', {
      from: fromConversationId,
      to: toConversationId,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Start periodic cleanup of inactive agents
   * Runs every 5 minutes to clean up inactive agents
   * 
   * Validates: Requirements 7.1, 7.4
   */
  private startPeriodicCleanup(): void {
    // Prevent multiple cleanup intervals
    if (this.cleanupInterval) {
      return;
    }

    // Run cleanup every 5 minutes
    const cleanupIntervalMs = 5 * 60 * 1000;

    this.cleanupInterval = setInterval(async () => {
      await this.cleanupInactiveAgents();
    }, cleanupIntervalMs);
  }

  /**
   * Stop periodic cleanup
   * Called during disposal
   */
  private stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[AgentManager] Periodic cleanup stopped');
    }
  }

  /**
   * Clean up inactive agents that have exceeded the inactivity timeout
   * Preserves conversation history in storage while disposing agent instances
   * 
   * Validates: Requirements 7.4
   */
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

    if (inactiveAgents.length === 0) {
      // No inactive agents to clean up - skip silently
      return;
    }

    console.log('[AgentManager] Cleaning up inactive agents:', {
      count: inactiveAgents.length,
      conversationIds: inactiveAgents,
      inactivityTimeout: this.inactivityTimeout,
    });

    // Dispose inactive agents
    for (const conversationId of inactiveAgents) {
      try {
        await this.disposeAgent(conversationId);
        console.log('[AgentManager] Inactive agent disposed:', {
          conversationId,
          inactiveDuration: now - (this.agents.get(conversationId)?.lastAccess || now),
        });
      } catch (error: any) {
        // Wrap as AgentError for consistent error handling
        const agentError = wrapAsAgentError(
          error,
          AgentErrorType.CREATION_FAILED,
          conversationId
        );

        console.error('[AgentManager] Error disposing inactive agent:', agentError.toJSON());
        // Continue disposing other agents even if one fails
      }
    }

    console.log('[AgentManager] Inactive agent cleanup complete:', {
      disposedCount: inactiveAgents.length,
      remainingAgents: this.agents.size,
    });
  }

  /**
   * Enforce the maximum agent limit by disposing least recently used agents
   * Ensures system doesn't exceed maxActiveAgents
   * 
   * This implements an LRU (Least Recently Used) cache eviction strategy:
   * 1. Check if we're at capacity
   * 2. Sort agents by last access time (oldest first)
   * 3. Dispose the least recently used agents to make room
   * 4. Continue even if individual disposals fail
   * 
   * Validates: Requirements 7.1, 7.4
   */
  private async enforceAgentLimit(): Promise<void> {
    // Check if we're at or over the limit
    if (this.agents.size < this.maxActiveAgents) {
      return;
    }

    console.log('[AgentManager] Agent limit reached, enforcing limit:', {
      currentAgents: this.agents.size,
      maxActiveAgents: this.maxActiveAgents,
    });

    // Sort agents by last access time (oldest first)
    // This creates an LRU ordering where index 0 is the least recently used
    const sortedAgents = Array.from(this.agents.entries()).sort(
      (a, b) => a[1].lastAccess - b[1].lastAccess
    );

    // Calculate how many agents to dispose
    // We need to dispose enough to get below the limit, plus one for the new agent
    const agentsToDispose = this.agents.size - this.maxActiveAgents + 1;

    console.log('[AgentManager] Disposing least recently used agents:', {
      count: agentsToDispose,
    });

    // Dispose the least recently used agents
    // Start from index 0 (oldest) and work forward
    for (let i = 0; i < agentsToDispose && i < sortedAgents.length; i++) {
      const [conversationId, entry] = sortedAgents[i];
      try {
        await this.disposeAgent(conversationId);
        console.log('[AgentManager] LRU agent disposed:', {
          conversationId,
          lastAccess: entry.lastAccess,
          age: Date.now() - entry.createdAt,
        });
      } catch (error: any) {
        // Wrap as AgentError for consistent error handling
        const agentError = wrapAsAgentError(
          error,
          AgentErrorType.CREATION_FAILED,
          conversationId
        );

        console.error('[AgentManager] Error disposing LRU agent:', agentError.toJSON());
        // Continue disposing other agents even if one fails
        // This ensures we make room even if some disposals fail
      }
    }

    console.log('[AgentManager] Agent limit enforcement complete:', {
      remainingAgents: this.agents.size,
    });
  }

  /**
   * Send a message to an agent with queuing to prevent race conditions
   * Messages are processed sequentially per agent to maintain order
   * 
   * @param conversationId - Conversation ID of the target agent
   * @param input - User input message
   * @param contextFiles - Optional context files
   * @param settings - Optional agent settings
   * @param systemInstruction - Optional system instruction
   * @param isPersonaChat - Whether this is a persona chat
   * 
   * Validates: Requirements 7.3, 7.5
   */
  async sendMessage(
    conversationId: string,
    input: string,
    contextFiles: any[] = [],
    settings: any = {},
    systemInstruction?: string,
    isPersonaChat: boolean = false
  ): Promise<void> {
    const entry = this.agents.get(conversationId);
    if (!entry) {
      throw new AgentError(
        AgentErrorType.COMMUNICATION_FAILED,
        `Agent not found for conversation: ${conversationId}`,
        conversationId
      );
    }

    // Update last access time
    entry.lastAccess = Date.now();

    // Create a promise that will be resolved when the message is processed
    return new Promise<void>((resolve, reject) => {
      // Add message to queue
      entry.messageQueue.push({
        input,
        contextFiles,
        settings,
        systemInstruction,
        isPersonaChat,
        resolve,
        reject,
      });

      console.log('[AgentManager] Message queued:', {
        conversationId,
        queueLength: entry.messageQueue.length,
        isProcessing: entry.isProcessing,
      });

      // Start processing if not already processing
      if (!entry.isProcessing) {
        this.processMessageQueue(conversationId).catch((error) => {
          console.error('[AgentManager] Error processing message queue:', {
            conversationId,
            error: error.message,
          });
        });
      }
    });
  }

  /**
   * Process the message queue for an agent sequentially
   * Ensures messages are processed in order without race conditions
   * 
   * This implements a sequential message processing pattern:
   * 1. Mark agent as processing to prevent concurrent queue processing
   * 2. Process messages one at a time from the queue (FIFO)
   * 3. Resolve/reject the promise for each message
   * 4. Continue processing until queue is empty
   * 5. Mark agent as not processing when done
   * 
   * This ensures:
   * - Messages within a conversation are processed in order
   * - No race conditions within a single agent
   * - Concurrent processing across different agents is still possible
   * 
   * @param conversationId - Conversation ID of the agent
   * 
   * Validates: Requirements 7.3, 7.5
   */
  private async processMessageQueue(conversationId: string): Promise<void> {
    const entry = this.agents.get(conversationId);
    if (!entry) {
      return;
    }

    // Mark as processing to prevent concurrent queue processing
    // This flag ensures only one queue processor runs at a time per agent
    entry.isProcessing = true;

    try {
      // Process messages sequentially until queue is empty
      while (entry.messageQueue.length > 0) {
        // Get the next message from the front of the queue (FIFO)
        const message = entry.messageQueue.shift();
        if (!message) {
          break;
        }

        console.log('[AgentManager] Processing message from queue:', {
          conversationId,
          remainingInQueue: entry.messageQueue.length,
        });

        try {
          // Process the message through the agent
          // This is an async operation that may take time
          await entry.agent.chat(
            message.input,
            message.contextFiles,
            message.settings,
            message.systemInstruction,
            message.isPersonaChat
          );

          // Resolve the promise to notify the caller that processing succeeded
          message.resolve();
        } catch (error: any) {
          // Wrap as AgentError for consistent error handling
          const agentError = wrapAsAgentError(
            error,
            AgentErrorType.MESSAGE_PROCESSING_FAILED,
            conversationId
          );

          console.error('[AgentManager] Error processing message:', agentError.toJSON());

          // Reject the promise to notify the caller that processing failed
          // The caller can handle the error appropriately
          message.reject(agentError);
        }
      }
    } finally {
      // Always mark as not processing, even if an error occurred
      // This ensures the queue can be processed again if new messages arrive
      entry.isProcessing = false;

      console.log('[AgentManager] Message queue processing complete:', {
        conversationId,
        remainingInQueue: entry.messageQueue.length,
      });
    }
  }

  /**
   * Switch between conversations
   * Ensures the switch completes quickly (< 500ms target)
   * 
   * @param fromConversationId - Current conversation ID
   * @param toConversationId - Target conversation ID
   * @param mode - Agent mode for the target conversation
   * 
   * Validates: Requirements 7.2
   */
  async switchConversation(
    fromConversationId: string,
    toConversationId: string,
    mode: AgentMode = 'chat'
  ): Promise<void> {
    const startTime = Date.now();

    console.log('[AgentManager] Switching conversation:', {
      from: fromConversationId,
      to: toConversationId,
      mode,
    });

    // Get or create the target agent (this is fast - just registry lookup or creation)
    await this.getOrCreateAgent(toConversationId, mode);

    const duration = Date.now() - startTime;

    console.log('[AgentManager] Conversation switch complete:', {
      from: fromConversationId,
      to: toConversationId,
      durationMs: duration,
    });

    // Log warning if switch took longer than target
    if (duration > 500) {
      console.warn('[AgentManager] Conversation switch exceeded 500ms target:', {
        durationMs: duration,
      });
    }
  }

  /**
   * Abort and restart an unresponsive agent
   * Terminates the current agent and creates a new one with preserved conversation history
   * 
   * @param conversationId - Conversation ID of the unresponsive agent
   * @returns New agent instance
   * 
   * Validates: Requirements 11.3
   */
  async abortAndRestartAgent(conversationId: string): Promise<Agent> {
    console.log('[AgentManager] Aborting and restarting agent:', {
      conversationId,
      timestamp: Date.now(),
    });

    const entry = this.agents.get(conversationId);

    // If agent exists, abort it first
    if (entry) {
      try {
        // Abort current operation
        entry.agent.abort();
        console.log('[AgentManager] Agent operation aborted:', conversationId);
      } catch (error: any) {
        console.error('[AgentManager] Error aborting agent:', {
          conversationId,
          error: error.message,
        });
      }

      // Dispose the agent
      await this.disposeAgent(conversationId);
    }

    // Create a new agent
    const newAgent = await this.getOrCreateAgent(conversationId, entry?.mode || 'chat');

    // Restore conversation history if it exists
    try {
      const conversation = await this.config.conversationManager
        .restoreConversation(conversationId);
      if (conversation && conversation.messages.length > 0) {
        await newAgent.loadHistory(conversation.messages);
        console.log('[AgentManager] History restored after restart:', {
          conversationId,
          messageCount: conversation.messages.length,
        });
      }
    } catch (error: any) {
      console.error('[AgentManager] Error restoring history:', {
        conversationId,
        error: error.message,
      });
      // Don't throw - agent is still usable even without history
    }

    console.log('[AgentManager] Agent restarted successfully:', {
      conversationId,
      timestamp: Date.now(),
    });

    return newAgent;
  }

  /**
   * Preserve agent state for webview reconnection
   * Stores agent state that can be restored when webview reconnects
   * 
   * @param conversationId - Conversation ID of the agent
   * @returns Preserved state object
   * 
   * Validates: Requirements 11.4
   */
  async preserveAgentState(conversationId: string): Promise<{
    conversationId: string;
    mode: AgentMode;
    messageCount: number;
    lastAccess: number;
    capabilities: AgentCapability[];
  } | null> {
    const entry = this.agents.get(conversationId);

    if (!entry) {
      console.warn('[AgentManager] Cannot preserve state: agent not found:', conversationId);
      return null;
    }

    const state = {
      conversationId,
      mode: entry.mode,
      messageCount: 0,
      lastAccess: entry.lastAccess,
      capabilities: this.getCapabilities(conversationId),
    };

    // Get message count from conversation manager
    try {
      const conversation = await this.config.conversationManager
        .restoreConversation(conversationId);
      if (conversation) {
        state.messageCount = conversation.messages.length;
      }
    } catch (error: any) {
      console.error('[AgentManager] Error getting message count:', {
        conversationId,
        error: error.message,
      });
    }

    console.log('[AgentManager] Agent state preserved:', {
      conversationId,
      state,
    });

    return state;
  }

  /**
   * Restore agent state after webview reconnection
   * Recreates agent with preserved state and conversation history
   * 
   * @param state - Preserved state object
   * @returns Restored agent instance
   * 
   * Validates: Requirements 11.4
   */
  async restoreAgentState(state: {
    conversationId: string;
    mode: AgentMode;
    messageCount: number;
    lastAccess: number;
    capabilities: AgentCapability[];
  }): Promise<Agent> {
    console.log('[AgentManager] Restoring agent state:', {
      conversationId: state.conversationId,
      mode: state.mode,
      messageCount: state.messageCount,
    });

    // Get or create agent
    const agent = await this.getOrCreateAgent(state.conversationId, state.mode);

    // Restore conversation history
    try {
      const conversation = await this.config.conversationManager
        .restoreConversation(state.conversationId);
      if (conversation && conversation.messages.length > 0) {
        await agent.loadHistory(conversation.messages);
        console.log('[AgentManager] Conversation history restored:', {
          conversationId: state.conversationId,
          messageCount: conversation.messages.length,
        });
      }
    } catch (error: any) {
      console.error('[AgentManager] Error restoring conversation history:', {
        conversationId: state.conversationId,
        error: error.message,
      });
      // Don't throw - agent is still usable even without history
    }

    // Restore capabilities
    for (const capability of state.capabilities) {
      this.registerCapability(state.conversationId, capability);
    }

    // Update last access time
    const entry = this.agents.get(state.conversationId);
    if (entry) {
      entry.lastAccess = state.lastAccess;
    }

    console.log('[AgentManager] Agent state restored successfully:', {
      conversationId: state.conversationId,
      timestamp: Date.now(),
    });

    return agent;
  }

  /**
   * Export conversation data for critical errors
   * Provides a way to save conversation data externally when critical errors occur
   * 
   * @param conversationId - Conversation ID to export
   * @returns Conversation data as JSON string
   * 
   * Validates: Requirements 11.5
   */
  async exportConversationData(conversationId: string): Promise<string> {
    console.log('[AgentManager] Exporting conversation data:', {
      conversationId,
      timestamp: Date.now(),
    });

    try {
      const conversation = await this.config.conversationManager
        .restoreConversation(conversationId);

      if (!conversation) {
        throw new AgentError(
          AgentErrorType.LOAD_FAILED,
          `Conversation not found: ${conversationId}`,
          conversationId
        );
      }

      // Create export data with metadata
      const exportData = {
        exportedAt: new Date().toISOString(),
        conversationId: conversation.id,
        title: conversation.title,
        timestamp: conversation.timestamp,
        lastUpdated: conversation.lastUpdated,
        messageCount: conversation.messages.length,
        messages: conversation.messages,
        metadata: {
          exportReason: 'critical_error',
          agentMode: this.agents.get(conversationId)?.mode || 'unknown',
        },
      };

      const jsonData = JSON.stringify(exportData, null, 2);

      console.log('[AgentManager] Conversation data exported successfully:', {
        conversationId,
        messageCount: exportData.messageCount,
        dataSize: jsonData.length,
      });

      return jsonData;
    } catch (error: any) {
      const agentError = wrapAsAgentError(
        error,
        AgentErrorType.LOAD_FAILED,
        conversationId
      );

      console.error('[AgentManager] Error exporting conversation data:', agentError.toJSON());
      throw agentError;
    }
  }

  /**
   * Retry an operation with exponential backoff
   * Generic retry mechanism for network errors and transient failures
   * 
   * This implements an exponential backoff retry strategy:
   * 1. Try the operation
   * 2. If it fails, wait for delay = baseDelay * 2^(attempt-1)
   * 3. Retry up to maxAttempts times
   * 4. Throw if all attempts fail
   * 
   * Example delays with baseDelay=1000ms:
   * - Attempt 1: immediate
   * - Attempt 2: 1000ms delay (1s)
   * - Attempt 3: 2000ms delay (2s)
   * - Attempt 4: 4000ms delay (4s)
   * 
   * @param operation - Async operation to retry
   * @param maxAttempts - Maximum number of retry attempts (default: 3)
   * @param baseDelay - Base delay in milliseconds (default: 1000)
   * @param operationName - Name of the operation for logging
   * @returns Result of the operation
   * 
   * Validates: Requirements 11.2
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log('[AgentManager] Attempting operation:', {
          operationName,
          attempt,
          maxAttempts,
        });

        // Try the operation
        const result = await operation();

        // If we get here, the operation succeeded
        if (attempt > 1) {
          // Log success after retry for visibility
          console.log('[AgentManager] Operation succeeded after retry:', {
            operationName,
            attempt,
            totalAttempts: attempt,
          });
        }

        return result;
      } catch (error: any) {
        // Store the error in case this is the last attempt
        lastError = error;

        console.warn('[AgentManager] Operation failed:', {
          operationName,
          attempt,
          maxAttempts,
          error: error.message,
        });

        // If this was the last attempt, don't retry
        if (attempt === maxAttempts) {
          console.error('[AgentManager] Operation failed after all retries:', {
            operationName,
            totalAttempts: maxAttempts,
            error: error.message,
          });
          break;
        }

        // Calculate delay with exponential backoff
        // Formula: delay = baseDelay * 2^(attempt-1)
        // This creates increasing delays: 1s, 2s, 4s, 8s, etc.
        const delay = baseDelay * Math.pow(2, attempt - 1);

        console.log('[AgentManager] Retrying operation after delay:', {
          operationName,
          attempt,
          delayMs: delay,
        });

        // Wait before retrying
        // This gives transient issues time to resolve
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If we get here, all retries failed
    // Wrap the last error as an AgentError for consistent error handling
    throw wrapAsAgentError(
      lastError || new Error('Operation failed'),
      AgentErrorType.NETWORK_ERROR,
      undefined
    );
  }

  /**
   * Handle webview disconnection
   * Preserves agent state and prepares for reconnection
   * 
   * @returns Array of preserved states for all active agents
   * 
   * Validates: Requirements 11.4
   */
  async handleWebviewDisconnection(): Promise<Array<{
    conversationId: string;
    mode: AgentMode;
    messageCount: number;
    lastAccess: number;
    capabilities: AgentCapability[];
  }>> {
    console.log('[AgentManager] Handling webview disconnection:', {
      activeAgents: this.agents.size,
      timestamp: Date.now(),
    });

    const preservedStates: Array<{
      conversationId: string;
      mode: AgentMode;
      messageCount: number;
      lastAccess: number;
      capabilities: AgentCapability[];
    }> = [];

    // Preserve state for all active agents
    for (const [conversationId] of this.agents.entries()) {
      try {
        const state = await this.preserveAgentState(conversationId);
        if (state) {
          preservedStates.push(state);
        }
      } catch (error: any) {
        console.error('[AgentManager] Error preserving agent state:', {
          conversationId,
          error: error.message,
        });
        // Continue preserving other agents
      }
    }

    console.log('[AgentManager] Webview disconnection handled:', {
      preservedAgents: preservedStates.length,
      timestamp: Date.now(),
    });

    return preservedStates;
  }

  /**
   * Handle webview reconnection
   * Restores agent states after webview reconnects
   * 
   * @param webview - New webview instance
   * @param preservedStates - Array of preserved states to restore
   * 
   * Validates: Requirements 11.4
   */
  async handleWebviewReconnection(
    webview: vscode.Webview,
    preservedStates: Array<{
      conversationId: string;
      mode: AgentMode;
      messageCount: number;
      lastAccess: number;
      capabilities: AgentCapability[];
    }>
  ): Promise<void> {
    console.log('[AgentManager] Handling webview reconnection:', {
      preservedStates: preservedStates.length,
      timestamp: Date.now(),
    });

    // Update webview reference
    this.updateWebview(webview);

    // Restore agent states
    for (const state of preservedStates) {
      try {
        await this.restoreAgentState(state);
        console.log('[AgentManager] Agent state restored after reconnection:', {
          conversationId: state.conversationId,
        });
      } catch (error: any) {
        console.error('[AgentManager] Error restoring agent state after reconnection:', {
          conversationId: state.conversationId,
          error: error.message,
        });
        // Continue restoring other agents
      }
    }

    console.log('[AgentManager] Webview reconnection handled:', {
      restoredAgents: preservedStates.length,
      timestamp: Date.now(),
    });
  }

  /**
   * Dispose of the AgentManager and clean up all resources
   * Should be called during extension deactivation
   */
  async dispose(): Promise<void> {
    console.log('[AgentManager] Disposing AgentManager');

    // Stop periodic cleanup
    this.stopPeriodicCleanup();

    // Dispose all agents
    await this.disposeAllAgents();

    console.log('[AgentManager] AgentManager disposed');
  }
}
