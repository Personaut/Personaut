/**
 * Centralized message type definitions for frontend-backend communication
 * This ensures compile-time safety and makes refactoring safer
 * 
 * Feature: message-type-safety
 */

// ============================================================================
// Chat Message Types
// ============================================================================
export enum ChatMessageType {
    // Requests (Frontend -> Backend)
    SEND_MESSAGE = 'send-message',
    NEW_CONVERSATION = 'new-conversation',
    LOAD_CONVERSATION = 'load-conversation',
    DELETE_CONVERSATION = 'delete-conversation',
    GET_HISTORY = 'get-history',
    ABORT = 'abort',
    SWITCH_CONVERSATION = 'switch-conversation',

    // Responses (Backend -> Frontend)
    MESSAGE_RESPONSE = 'message-response',
    MESSAGE_STREAM = 'message-stream',
    MESSAGE_COMPLETE = 'message-complete',
    MESSAGE_ERROR = 'message-error',
    HISTORY_UPDATED = 'history-updated',
    CONVERSATION_LOADED = 'conversation-loaded',
    CONVERSATION_DELETED = 'conversation-deleted',
}

// ============================================================================
// Persona Message Types
// ============================================================================
export enum PersonaMessageType {
    // Requests (Frontend -> Backend)
    GET_PERSONAS = 'get-personas',
    GET_PERSONA = 'get-persona',
    SEARCH_PERSONAS = 'search-personas',
    CREATE_PERSONA = 'create-persona',
    UPDATE_PERSONA = 'update-persona',
    SAVE_PERSONA = 'save-persona',
    DELETE_PERSONA = 'delete-persona',
    GENERATE_PROMPT = 'generate-persona-prompt',
    GENERATE_BACKSTORY = 'generate-backstory',
    GENERATE_PERSONA_BACKSTORY = 'generate-persona-backstory',

    // Responses (Backend -> Frontend)
    PERSONAS_LOADED = 'personas-loaded',
    PERSONA_DETAILS = 'persona-details',
    PERSONA_SEARCH_RESULTS = 'personas-search-results',
    PERSONA_CREATED = 'persona-created',
    PERSONA_UPDATED = 'persona-updated',
    PERSONA_SAVED = 'persona-saved',
    PERSONA_DELETED = 'persona-deleted',
    PERSONA_PROMPT_GENERATED = 'persona-prompt-generated',
    BACKSTORY_GENERATED = 'backstory-generated',
    PERSONA_ERROR = 'persona-error',
}

// ============================================================================
// Settings Message Types
// ============================================================================
export enum SettingsMessageType {
    // Requests (Frontend -> Backend)
    GET_SETTINGS = 'get-settings',
    SAVE_SETTINGS = 'save-settings',
    RESET_SETTINGS = 'reset-settings',
    RESET_ALL_DATA = 'reset-all-data',

    // Responses (Backend -> Frontend)
    SETTINGS_LOADED = 'settings-loaded',
    SETTINGS_SAVED = 'settings-saved',
    SETTINGS_RESET = 'settings-reset',
    SETTINGS_ERROR = 'settings-error',
    DATA_RESET_COMPLETE = 'data-reset-complete',
    THEME_CHANGED = 'theme-changed',
}

// ============================================================================
// Feedback Message Types
// ============================================================================
export enum FeedbackMessageType {
    // Requests (Frontend -> Backend)
    GET_FEEDBACK_HISTORY = 'get-feedback-history',
    GENERATE_FEEDBACK = 'generate-feedback',
    DELETE_FEEDBACK = 'delete-feedback',

    // Responses (Backend -> Frontend)
    FEEDBACK_HISTORY = 'feedback-history',
    FEEDBACK_GENERATED = 'feedback-generated',
    FEEDBACK_DELETED = 'feedback-deleted',
    FEEDBACK_ERROR = 'feedback-error',
}

// ============================================================================
// Build Mode Message Types
// ============================================================================
export enum BuildModeMessageType {
    // Requests (Frontend -> Backend)
    START_BUILD = 'start-build',
    CONTINUE_BUILD = 'continue-build',
    CANCEL_BUILD = 'cancel-build',
    GET_BUILD_STATUS = 'get-build-status',
    SAVE_STAGE = 'save-stage',
    LOAD_STAGE = 'load-stage',
    CLEAR_BUILD_CONTEXT = 'clear-build-context',
    GENERATE_CONTENT = 'generate-content',
    CAPTURE_SCREENSHOT = 'capture-screenshot',

    // Responses (Backend -> Frontend)
    BUILD_STARTED = 'build-started',
    BUILD_PROGRESS = 'build-progress',
    BUILD_COMPLETE = 'build-complete',
    BUILD_ERROR = 'build-error',
    BUILD_STATUS = 'build-status',
    STAGE_SAVED = 'stage-saved',
    STAGE_LOADED = 'stage-loaded',
    BUILD_CONTEXT_CLEARED = 'build-context-cleared',
    CONTENT_GENERATED = 'content-generated',
    SCREENSHOT_CAPTURED = 'screenshot-captured',
    SCREENSHOT_STATUS = 'screenshot-status',
}

// ============================================================================
// Generic Message Types
// ============================================================================
export enum GenericMessageType {
    ERROR = 'error',
    SUCCESS = 'success',
    INFO = 'info',
    WARNING = 'warning',
}

// ============================================================================
// Provider Types
// ============================================================================
export enum ProviderType {
    GEMINI = 'gemini',
    BEDROCK = 'bedrock',
    // Future: OPENAI = 'openai',
    // Future: NATIVE_IDE = 'nativeIde',
}

// ============================================================================
// Union type of all message types for type guards
// ============================================================================
export type MessageType =
    | ChatMessageType
    | PersonaMessageType
    | SettingsMessageType
    | FeedbackMessageType
    | BuildModeMessageType
    | GenericMessageType;

// ============================================================================
// Helper function to check if a string is a valid message type
// ============================================================================
export function isValidMessageType(type: string): type is MessageType {
    const allTypes = [
        ...Object.values(ChatMessageType),
        ...Object.values(PersonaMessageType),
        ...Object.values(SettingsMessageType),
        ...Object.values(FeedbackMessageType),
        ...Object.values(BuildModeMessageType),
        ...Object.values(GenericMessageType),
    ];
    return allTypes.includes(type as MessageType);
}
