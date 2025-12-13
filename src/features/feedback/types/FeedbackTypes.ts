/**
 * Type definitions for the feedback feature
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 4.5
 */

/**
 * Feedback entry metadata
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
  provider?: string;
  error?: string;
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
 * Provider image support configuration
 */
export interface ProviderImageSupport {
  provider: string;
  supportsImages: boolean;
  maxImageSize?: number;
  supportedFormats?: string[];
}

/**
 * Storage interface for feedback persistence
 */
export interface FeedbackStorage {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): Promise<void>;
}

/**
 * Parameters for generating feedback
 */
export interface GenerateFeedbackParams {
  personaNames: string[];
  context: string;
  url: string;
  screenshot?: string;
  feedbackType: 'individual' | 'group';
}

/**
 * Result of feedback generation
 */
export interface GenerateFeedbackResult {
  entry: FeedbackEntry;
  success: boolean;
  error?: string;
}
