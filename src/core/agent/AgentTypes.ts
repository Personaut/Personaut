/**
 * Type definitions for the Agent module
 */

import { Message } from '../providers/IProvider';

/**
 * Agent mode determines the context and behavior
 */
export type AgentMode = 'chat' | 'build' | 'feedback';

/**
 * Context files that can be attached to a chat message
 */
export interface ContextFile {
  path: string;
  content: string;
}

/**
 * Settings that control agent behavior and permissions
 */
export interface AgentSettings {
  autoRead?: boolean;
  autoWrite?: boolean;
  autoExecute?: boolean;
  [key: string]: any;
}

/**
 * Configuration for initializing an Agent instance
 */
export interface AgentConfig {
  conversationId: string;
  mode?: AgentMode;
  onDidUpdateMessages: (messages: Message[]) => void;
}
