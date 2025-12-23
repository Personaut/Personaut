/**
 * Shared Message Types for VS Code Communication
 *
 * Defines the message types used for communication between
 * the webview and VS Code extension.
 *
 * **Validates: Requirements 16.5, 27.1, 27.4**
 */

// ============================================================================
// Base Message Types
// ============================================================================

/**
 * Base message interface with discriminator
 */
export interface BaseMessage {
    type: string;
    mode?: 'chat' | 'build' | 'feedback';
}

// ============================================================================
// Chat Messages
// ============================================================================

export interface AddMessagePayload {
    type: 'add-message';
    role: 'user' | 'model' | 'error';
    text: string;
    mode?: 'chat' | 'build';
    metadata?: {
        model?: string;
        tokens?: number;
        duration?: number;
    };
}

export interface AddContextPayload {
    type: 'add-context';
    data: {
        path: string;
        content: string;
    };
}

export interface HistoryUpdatedPayload {
    type: 'history-updated';
    history: ConversationSummary[];
}

export interface LoadConversationPayload {
    type: 'load-conversation';
    messages: Message[];
}

// ============================================================================
// Build Messages
// ============================================================================

export interface StageFileLoadedPayload {
    type: 'stage-file-loaded';
    stage: string;
    data: unknown;
    completed: boolean;
}

export interface StageFileSavedPayload {
    type: 'stage-file-saved';
    stage: string;
    success: boolean;
}

export interface BuildStatePayload {
    type: 'build-state';
    state: Record<string, unknown>;
}

export interface StreamUpdatePayload {
    type: 'stream-update';
    stage: string;
    content: string;
    isComplete: boolean;
}

// ============================================================================
// Screenshot Messages
// ============================================================================

export interface ScreenshotCapturedPayload {
    type: 'screenshot-captured';
    screenshot: string; // Base64 data URL
    projectName?: string;
    screenName?: string;
    iterationNumber?: number;
}

export interface ScreenshotErrorPayload {
    type: 'screenshot-error';
    error: string;
}

// ============================================================================
// Session Messages
// ============================================================================

export interface SessionInvalidPayload {
    type: 'session-invalid';
    sessionId: string;
}

export interface SessionValidPayload {
    type: 'session-valid';
}

// ============================================================================
// Status Messages
// ============================================================================

export interface StatusPayload {
    type: 'status';
    text: string;
    mode?: 'chat' | 'build' | 'feedback';
}

// ============================================================================
// Settings Messages
// ============================================================================

export interface SettingsLoadedPayload {
    type: 'settings-loaded';
    settings: Record<string, unknown>;
    appName?: string;
}

export interface SettingsSavedPayload {
    type: 'settings-saved';
}

export interface SettingsErrorPayload {
    type: 'settings-error';
    error: string;
}

export interface DataResetCompletePayload {
    type: 'data-reset-complete';
}

// ============================================================================
// Usage Messages
// ============================================================================

export interface UsageUpdatePayload {
    type: 'usage-update';
    usage: Usage;
}

// ============================================================================
// Generic Message (for extensibility)
// ============================================================================

/**
 * Generic message for untyped or feature-specific messages
 */
export interface GenericMessage {
    type: string;
    [key: string]: unknown;
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * All message types that can be received from VS Code
 */
export type VSCodeMessage =
    | AddMessagePayload
    | AddContextPayload
    | HistoryUpdatedPayload
    | LoadConversationPayload
    | StageFileLoadedPayload
    | StageFileSavedPayload
    | BuildStatePayload
    | StreamUpdatePayload
    | ScreenshotCapturedPayload
    | ScreenshotErrorPayload
    | SessionInvalidPayload
    | SessionValidPayload
    | StatusPayload
    | UsageUpdatePayload
    | SettingsLoadedPayload
    | SettingsSavedPayload
    | SettingsErrorPayload
    | DataResetCompletePayload;

// ============================================================================
// Outbound Message Types (webview -> extension)
// ============================================================================

export interface SendMessageRequest {
    type: 'send-message';
    value: string;
    contextFiles?: ContextFile[];
    mode?: 'chat' | 'build';
    persona?: ChatPersona;
}

export interface SaveStageFileRequest {
    type: 'save-stage-file';
    projectName: string;
    stage: string;
    data: StageFileData;
}

export interface LoadStageFileRequest {
    type: 'load-stage-file';
    projectName: string;
    stage: string;
}

export interface CaptureScreenshotRequest {
    type: 'capture-screenshot';
    url: string;
    projectName?: string;
    screenName?: string;
    iterationNumber?: number;
}

// ============================================================================
// Domain Types
// ============================================================================

/**
 * Chat message
 */
export interface Message {
    role: 'user' | 'model' | 'error';
    text: string;
}

/**
 * Context file attached to chat
 */
export interface ContextFile {
    path: string;
    content: string;
}

/**
 * Chat persona selection
 */
export interface ChatPersona {
    type: 'agent' | 'team' | 'user';
    id: string;
    name: string;
    context?: string;
}

/**
 * Conversation summary for history
 */
export interface ConversationSummary {
    id: string;
    title: string;
    timestamp: number;
    messageCount: number;
}

/**
 * Token usage tracking
 */
export interface Usage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

/**
 * Generic stage file data wrapper
 */
export interface StageFileData<T = unknown> {
    completed: boolean;
    timestamp: number;
    data: T;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for AddMessagePayload
 */
export function isAddMessage(msg: VSCodeMessage): msg is AddMessagePayload {
    return msg.type === 'add-message';
}

/**
 * Type guard for StageFileLoadedPayload
 */
export function isStageFileLoaded(msg: VSCodeMessage): msg is StageFileLoadedPayload {
    return msg.type === 'stage-file-loaded';
}

/**
 * Type guard for StreamUpdatePayload
 */
export function isStreamUpdate(msg: VSCodeMessage): msg is StreamUpdatePayload {
    return msg.type === 'stream-update';
}

/**
 * Type guard for StatusPayload
 */
export function isStatus(msg: VSCodeMessage): msg is StatusPayload {
    return msg.type === 'status';
}
