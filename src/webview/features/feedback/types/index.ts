/**
 * Feedback Feature Types
 *
 * Type definitions for the Feedback feature.
 *
 * **Validates: Requirements 13.3, 16.5, 27.1**
 */

/**
 * Feedback entry from a persona
 */
export interface FeedbackEntry {
    /** Unique ID */
    id: string;
    /** Source persona ID */
    personaId: string;
    /** Persona name */
    personaName: string;
    /** Rating 1-5 */
    rating: number;
    /** Feedback comment */
    comment: string;
    /** Screenshot URL/data */
    screenshotUrl?: string;
    /** Additional context provided */
    context?: string;
    /** Timestamp */
    timestamp: number;
    /** Whether this is consolidated feedback */
    isConsolidated?: boolean;
}

/**
 * Screenshot source type
 */
export type ScreenshotSource = 'url' | 'file' | 'clipboard';

/**
 * Screenshot data
 */
export interface ScreenshotData {
    /** Image data URL or source URL */
    url: string;
    /** Source type */
    source: ScreenshotSource;
    /** File name if from file */
    fileName?: string;
    /** Capture timestamp */
    capturedAt: number;
}

/**
 * Feedback generation state
 */
export interface FeedbackState {
    /** Current screenshot */
    screenshot: ScreenshotData | null;
    /** Selected persona IDs for feedback */
    selectedPersonaIds: string[];
    /** Additional context for feedback */
    context: string;
    /** Generated feedback entries */
    generatedFeedback: FeedbackEntry[];
    /** AI-generated feedback summary */
    feedbackSummary: string | null;
    /** Feedback history */
    feedbackHistory: FeedbackEntry[];
    /** Current view mode */
    viewMode: 'form' | 'results' | 'history';
    /** Loading state */
    isLoading: boolean;
    /** Error message */
    error: string | null;
}

/**
 * Consolidated feedback summary
 */
export interface ConsolidatedFeedback {
    /** Average rating */
    averageRating: number;
    /** Total feedback count */
    totalCount: number;
    /** Key themes */
    themes: string[];
    /** Positive points */
    positives: string[];
    /** Areas for improvement */
    improvements: string[];
    /** Action items */
    actionItems: string[];
}

/**
 * Persona for feedback selection
 */
export interface FeedbackPersona {
    /** Persona ID */
    id: string;
    /** Name */
    name: string;
    /** Age */
    age: string;
    /** Occupation */
    occupation: string;
    /** Short description */
    description?: string;
}

/**
 * Maximum personas for feedback selection
 */
export const MAX_FEEDBACK_PERSONAS = 5;

/**
 * Initial feedback state
 */
export const INITIAL_FEEDBACK_STATE: FeedbackState = {
    screenshot: null,
    selectedPersonaIds: [],
    context: '',
    generatedFeedback: [],
    feedbackSummary: null,
    feedbackHistory: [],
    viewMode: 'form',
    isLoading: false,
    error: null,
};
