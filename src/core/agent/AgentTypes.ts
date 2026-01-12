/**
 * Type definitions for the Agent module
 */

import { Message } from '../providers/IProvider';

/**
 * Agent mode determines the context and behavior (legacy)
 * @deprecated Use AgentType instead
 */
export type AgentMode = 'chat' | 'build' | 'feedback';

/**
 * Specialized agent types
 */
export type AgentType =
  // Chat agents
  | 'chat'              // General conversation
  | 'persona'           // Persona-based chat
  | 'assistant'         // AI assistant with tools
  // Build agents
  | 'developer'         // Framework-specific code generation
  | 'designer'          // UX/UI design
  | 'researcher'        // Market/user research
  | 'summarizer'        // Context compression and summarization
  | 'architect'         // Technical architecture and planning
  // Feedback agents
  | 'feedback'          // General feedback
  | 'reviewer';         // Persona-based review

/**
 * Framework types for code generation
 */
export type Framework = 'react' | 'nextjs' | 'vue' | 'flutter' | 'html';

/**
 * Research types for research agents
 */
export type ResearchType = 'competitive' | 'market' | 'user' | 'synthesis';

/**
 * Persona mode for persona agents
 */
export type PersonaMode = 'agent' | 'text-messenger' | 'feedback' | 'build';

/**
 * Rating system for feedback
 */
export type RatingSystem = 'stars' | '1-10' | '1-100';

/**
 * Context files that can be attached to a chat message
 */
export interface ContextFile {
  path: string;
  content: string;
}

/**
 * Build autonomy settings - control what the agent can do automatically
 */
export interface BuildAutonomySettings {
  /** Allow automatic file writing without confirmation */
  autoWriteFiles?: boolean;
  /** Allow automatic file reading without confirmation */
  autoReadFiles?: boolean;
  /** Allow automatic command execution without confirmation */
  autoExecuteCommands?: boolean;
  /** Allow automatic multi-step planning without confirmation */
  autoPlanning?: boolean;
  /** Allow automatic code verification without confirmation */
  autoVerification?: boolean;
}

/**
 * Settings that control agent behavior and permissions
 */
export interface AgentSettings {
  autoRead?: boolean;
  autoWrite?: boolean;
  autoExecute?: boolean;
  /** Build-specific autonomy settings */
  buildAutonomy?: BuildAutonomySettings;
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

/**
 * Options for specialized agent creation
 */
export interface DeveloperAgentOptions {
  framework: Framework;
  projectPath?: string;
}

export interface PersonaAgentOptions {
  personaName: string;
  backstory?: string;
  attributes?: Record<string, any>;
  mode?: PersonaMode;
}

export interface ResearchAgentOptions {
  researchType: ResearchType;
  idea?: string;
}

export interface ReviewerAgentOptions {
  personaName: string;
  ratingSystem?: RatingSystem;
}

export interface ArchitectAgentOptions {
  /** Temperature for LLM (default: 0.3 for consistent output) */
  temperature?: number;
  /** Project context for better recommendations */
  projectContext?: string;
}

/**
 * Unified options for agent creation
 */
export type AgentCreationOptions =
  | DeveloperAgentOptions
  | PersonaAgentOptions
  | ResearchAgentOptions
  | ReviewerAgentOptions
  | ArchitectAgentOptions
  | Record<string, any>;
