/**
 * Type definitions for the build-mode feature.
 *
 * Defines interfaces for:
 * - BuildProject: Project metadata
 * - StageFile: Stage file structure
 * - BuildLogEntry: Build log entries
 * - BuildState: Central build state
 * - Stream updates and messages
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

/**
 * Build project metadata.
 */
export interface BuildProject {
  name: string;
  title: string;
  createdAt: number;
  lastModified: number;
  completedStages: string[];
}

/**
 * Stage file structure.
 */
export interface StageFile {
  stage: string;
  completed: boolean;
  timestamp: number;
  data: any;
  version: string;
  error?: string;
}

/**
 * Build log entry representing an LLM interaction.
 */
export interface BuildLogEntry {
  timestamp: number;
  type: 'user' | 'assistant' | 'system' | 'error';
  stage: string;
  content: string;
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
  };
}

/**
 * Complete build log for a project.
 */
export interface BuildLog {
  projectName: string;
  entries: BuildLogEntry[];
  createdAt: number;
  lastUpdated: number;
}

/**
 * Central build state file.
 */
export interface BuildState {
  projectName: string;
  projectTitle?: string;
  createdAt: number;
  lastUpdated: number;
  stages: {
    [key: string]: {
      completed: boolean;
      path: string;
      updatedAt: number;
      error?: string;
    };
  };
}

/**
 * Stage transition validation result.
 */
export interface StageTransition {
  from: string;
  to: string;
  valid: boolean;
  reason?: string;
}

/**
 * Result of a write operation.
 */
export interface WriteResult {
  success: boolean;
  filePath: string;
  isAlternateLocation: boolean;
  errorMessage?: string;
}

/**
 * Streaming update to be sent to the UI.
 */
export interface StreamUpdate {
  stage: string;
  type: 'persona' | 'feature' | 'story' | 'text';
  data: any;
  index: number;
  complete: boolean;
  error?: string;
}

/**
 * Build mode message types.
 */
export type BuildModeMessageType =
  | 'initialize-project'
  | 'save-stage-file'
  | 'load-stage-file'
  | 'generate-content-streaming'
  | 'get-build-state'
  | 'get-build-log'
  | 'append-log-entry'
  | 'complete-stage'
  | 'validate-transition'
  | 'get-completed-stages';

/**
 * Build mode message structure.
 */
export interface BuildModeMessage {
  type: BuildModeMessageType;
  projectName?: string;
  projectTitle?: string;
  stage?: string;
  data?: any;
  completed?: boolean;
  from?: string;
  to?: string;
  entry?: BuildLogEntry;
  prompt?: string;
}

/**
 * Stage order constant.
 */
export const STAGE_ORDER = ['idea', 'users', 'features', 'team', 'stories', 'design', 'building'] as const;
export type StageName = (typeof STAGE_ORDER)[number];

/**
 * Stage file version.
 */
export const STAGE_FILE_VERSION = '1.0';
