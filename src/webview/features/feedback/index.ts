/**
 * Feedback Feature
 *
 * Provides persona-based feedback generation for UI screenshots.
 *
 * **Validates: Requirements 4.4, 13.3**
 */

// Main view
export { FeedbackView } from './FeedbackView';
export type { FeedbackViewProps } from './FeedbackView';

// Components
export {
    ScreenshotCapture,
    PersonaMultiSelect,
    FeedbackDisplay,
    FeedbackHistory,
} from './components';
export type {
    ScreenshotCaptureProps,
    PersonaMultiSelectProps,
    FeedbackDisplayProps,
    FeedbackHistoryProps,
} from './components';

// Hooks
export { useFeedbackState } from './hooks';
export type { UseFeedbackStateReturn } from './hooks';

// Types
export type {
    FeedbackEntry,
    FeedbackState,
    ScreenshotData,
    ScreenshotSource,
    ConsolidatedFeedback,
    FeedbackPersona,
} from './types';
export {
    MAX_FEEDBACK_PERSONAS,
    INITIAL_FEEDBACK_STATE,
} from './types';
