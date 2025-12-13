/**
 * Storage-related type definitions
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 12.5
 */

import { Message } from './CommonTypes';

/**
 * Conversation stored in conversation history
 */
export interface Conversation {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
  lastUpdated?: number;
}

/**
 * Conversation metadata for cleanup tracking
 */
export interface ConversationMetadata {
  id: string;
  createdAt: number;
  lastAccessed: number;
  messageCount: number;
}

/**
 * Persona stored in persona database
 */
export interface Persona {
  id: string;
  name: string;
  age: number;
  occupation: string;
  background: string;
  goals: string;
  painPoints: string;
  techSavviness: string;
  backstory?: string;
}

/**
 * Feedback entry stored in feedback history
 */
export interface FeedbackEntry {
  id: string;
  title: string;
  timestamp: number;
  feedbackType: 'individual' | 'group';
  personaNames: string[];
  context: string;
  url: string;
  content: string;
  screenshot?: string;
}

/**
 * Build project metadata
 */
export interface BuildProject {
  name: string;
  title: string;
  createdAt: number;
  lastModified: number;
  completedStages: string[];
}

/**
 * Stage file data structure
 */
export interface StageFile {
  stage: string;
  data: any;
  completed: boolean;
  timestamp: number;
  error?: string;
}

/**
 * Build state structure
 */
export interface BuildState {
  projectName: string;
  projectTitle?: string;
  createdAt: number;
  lastModified: number;
  completedStages: string[];
  currentStage?: string;
  version: string;
}

/**
 * Build log entry
 */
export interface BuildLogEntry {
  timestamp: number;
  stage: string;
  action: string;
  status: 'success' | 'error' | 'info';
  message: string;
}

/**
 * Build log structure
 */
export interface BuildLog {
  projectName: string;
  entries: BuildLogEntry[];
  createdAt: number;
}

/**
 * Settings stored in configuration
 */
export interface Settings {
  provider: 'nativeIde' | 'gemini' | 'bedrock';
  theme: 'dark' | 'match-ide' | 'personaut';
  autoRead: boolean;
  autoWrite: boolean;
  autoExecute: boolean;
  geminiApiKey?: string;
  geminiModel?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsRegion?: string;
  awsProfile?: string;
  awsUseProfile?: boolean;
}

/**
 * API keys retrieved from secure storage
 */
export interface ApiKeys {
  geminiApiKey?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
}

/**
 * Migration result from API key migration
 */
export interface MigrationResult {
  migrated: string[];
  removed: string[];
  errors: Array<{
    provider: string;
    configKey: string;
    error: string;
  }>;
}

/**
 * Generic storage interface for feature persistence
 */
export interface IStorage {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): Promise<void>;
}

/**
 * Screenshot capture result
 */
export interface ScreenshotResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Disposable resource tracking
 */
export interface DisposableResource {
  id: string;
  type: 'agent' | 'browser' | 'mcp' | 'terminal';
  createdAt: number;
  lastUsed: number;
}

/**
 * Build session metadata
 */
export interface BuildSession {
  id: string;
  startTime: number;
  projectName: string;
  currentStage?: string;
}

/**
 * Stage transition metadata
 */
export interface StageTransition {
  from: string;
  to: string;
  timestamp: number;
  success: boolean;
}
