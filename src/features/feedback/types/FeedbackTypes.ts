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
  personaId: string;
  personaName: string;
  rating: number;
  comment: string;
  screenshotUrl?: string;
  context?: string;
  timestamp: number;
  ratingSystem?: RatingSystem;
}

/**
 * Legacy feedback entry (deprecated)
 * @deprecated Use FeedbackEntry instead
 */
export interface LegacyFeedbackEntry {
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
 * Rating system options
 */
export type RatingSystem = 'stars' | '1-100' | '1-10';

/**
 * Feedback settings
 */
export interface FeedbackSettings {
  ratingSystem: RatingSystem;
}

/**
 * Default feedback settings
 */
export const DEFAULT_FEEDBACK_SETTINGS: FeedbackSettings = {
  ratingSystem: 'stars',
};

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
 * Feedback summary from AI
 */
export interface FeedbackSummary {
  averageRating: number;
  summary: string; // UX designer/developer perspective
  rawFeedback: Array<{
    personaName: string;
    rating: number;
    comment: string;
  }>;
  timestamp: number;
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
  entry?: FeedbackEntry; // For backward compatibility
  entries?: FeedbackEntry[]; // Multiple entries (one per persona)
  summary?: FeedbackSummary; // AI-generated summary
  success: boolean;
  error?: string;
}
