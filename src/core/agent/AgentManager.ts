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
import { ConversationManager } from '../../features/chat/services/ConversationManager';
import { Settings } from '../../features/settings/types/SettingsTypes';

/**
 * Configuration for AgentManager initialization
 */
export interface AgentManagerConfig {
  webview: vscode.Webview;
  tokenStorageService: TokenStorageService;
  conversationManager: ConversationManager;
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
}

/**
 * AgentManager centralizes agent lifecycle management
 */
export class AgentManager {
  private agents: Map<string, AgentRegistryEntry> = new Map();
  private capabilities: Map<string, AgentCapability[]> = new Map();
  private config: AgentManagerConfig;
  private currentSettings: Settings | null = null;

  constructor(config: AgentManagerConfig) {
    this.config = config;
    console.log('[AgentManager] Initialized with config:', {
      maxActiveAgents: config.maxActiveAgents || 10,
      inactivityTimeout: config.inactivityTimeout || 300000,
    });
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
      // Log error but don't crash - requirement 2.5
      console.error('[AgentManager] Failed to save conversation:', {
        conversationId,
        error: error.message,
        stack: error.stack,
      });
      
      // Don't throw - we want to continue operating even if save fails
    }
  }

  /**
   * Get or create an agent for a conversation
   * Implements factory pattern for agent creation
   * 
   * @param conversationId - Unique identifier for the conversation
   * @param mode - Agent mode (chat, build, feedback)
   * @returns Agent instance for the conversation
   */
  async getOrCreateAgent(conversationId: string, mode: AgentMode = 'chat'): Promise<Agent> {
    const now = Date.now();

    // Check if agent already exists
    const existing = this.agents.get(conversationId);
    if (existing) {
      console.log('[AgentManager] Reusing existing agent:', {
        conversationId,
        mode: existing.mode,
        age: now - existing.createdAt,
      });
      existing.lastAccess = now;
      return existing.agent;
    }

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
      this.config.tokenStorageService
    );

    // Register agent
    this.agents.set(conversationId, {
      agent,
      createdAt: now,
      lastAccess: now,
      mode,
    });

    console.log('[AgentManager] Agent created successfully:', {
      conversationId,
      totalAgents: this.agents.size,
    });

    return agent;
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
      console.error('[AgentManager] Error disposing agent:', {
        conversationId,
        error: error.message,
      });
      throw error;
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
            console.error('[AgentManager] Error disposing agent:', {
              conversationId,
              error: error.message,
            });
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
}
