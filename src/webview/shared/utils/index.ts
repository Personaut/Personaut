/**
 * Shared Utils
 *
 * Central export point for all shared utility functions.
 */

export { createMessageRouter, isMessageType, getFeatureForMessageType } from './messageRouter';
export type { FeatureHandler, RouteConfig } from './messageRouter';

export { createStreamingHandler, parseStreamingJSON, INITIAL_STREAM_STATE } from './streamingHandler';
export type { StreamState, StreamEvent, StreamHandlers } from './streamingHandler';

export {
    createStateManager,
    EMPTY_CHAT_STATE,
    EMPTY_BUILD_STATE,
    EMPTY_FEEDBACK_STATE,
    EMPTY_SETTINGS_STATE,
} from './stateManager';
export type {
    StateManager,
    PersistedState,
    PersistedChatState,
    PersistedBuildState,
    PersistedFeedbackState,
    PersistedSettingsState,
} from './stateManager';
