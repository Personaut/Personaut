/**
 * State Manager
 *
 * Handles VS Code state persistence with feature isolation.
 * Provides type-safe access to persisted state.
 *
 * **Validates: Requirements 16.4, 26.4**
 */

/**
 * Chat state structure
 */
export interface PersistedChatState {
    messages: unknown[];
    sessionId?: string;
    model?: string;
}

/**
 * Build state structure
 */
export interface PersistedBuildState {
    currentStage: string;
    completedStages: string[];
    projectName: string;
    projectTitle: string;
    codeFolderName: string;
    personas: unknown[];
    features: unknown[];
    stories: unknown[];
    flows: unknown[];
    screens: unknown[];
    framework: string;
    iteration: unknown;
}

/**
 * Feedback state structure
 */
export interface PersistedFeedbackState {
    screenshot: unknown;
    selectedPersonaIds: string[];
    context: string;
    feedbackHistory: unknown[];
}

/**
 * Settings state structure
 */
export interface PersistedSettingsState {
    anthropicKey?: string;
    geminiKey?: string;
    openaiKey?: string;
    defaultModel?: string;
    autoSave?: boolean;
}

/**
 * Complete persisted state
 */
export interface PersistedState {
    chatState?: PersistedChatState;
    buildState?: PersistedBuildState;
    feedbackState?: PersistedFeedbackState;
    settingsState?: PersistedSettingsState;
    /** Generic data storage */
    data?: Record<string, unknown>;
}

/**
 * State manager interface
 */
export interface StateManager {
    /** Get the complete state */
    getState: () => PersistedState;
    /** Set the complete state */
    setState: (state: PersistedState) => void;
    /** Get a specific feature state */
    getFeatureState: <K extends keyof PersistedState>(key: K) => PersistedState[K];
    /** Set a specific feature state */
    setFeatureState: <K extends keyof PersistedState>(key: K, value: PersistedState[K]) => void;
    /** Clear a specific feature state */
    clearFeatureState: (key: keyof PersistedState) => void;
    /** Clear all state */
    clearAllState: () => void;
}

/**
 * Create a state manager
 *
 * @example
 * ```tsx
 * const stateManager = createStateManager(vscodeApi);
 *
 * // Get build state
 * const buildState = stateManager.getFeatureState('buildState');
 *
 * // Update build state
 * stateManager.setFeatureState('buildState', {
 *   ...buildState,
 *   currentStage: 'features',
 * });
 * ```
 */
export function createStateManager(
    getState: () => PersistedState | undefined,
    setState: (state: PersistedState) => void
): StateManager {
    const getStateInternal = (): PersistedState => {
        return getState() ?? {};
    };

    return {
        getState: getStateInternal,

        setState: (state: PersistedState) => {
            setState(state);
        },

        getFeatureState: <K extends keyof PersistedState>(key: K): PersistedState[K] => {
            const state = getStateInternal();
            return state[key];
        },

        setFeatureState: <K extends keyof PersistedState>(key: K, value: PersistedState[K]) => {
            const currentState = getStateInternal();
            setState({
                ...currentState,
                [key]: value,
            });
        },

        clearFeatureState: (key: keyof PersistedState) => {
            const currentState = getStateInternal();
            const newState = { ...currentState };
            delete newState[key];
            setState(newState);
        },

        clearAllState: () => {
            setState({});
        },
    };
}

/**
 * Default empty states
 */
export const EMPTY_CHAT_STATE: PersistedChatState = {
    messages: [],
};

export const EMPTY_BUILD_STATE: PersistedBuildState = {
    currentStage: 'idea',
    completedStages: [],
    projectName: '',
    projectTitle: '',
    codeFolderName: '',
    personas: [],
    features: [],
    stories: [],
    flows: [],
    screens: [],
    framework: 'react',
    iteration: { currentIteration: 0, totalIterations: 0, isComplete: false },
};

export const EMPTY_FEEDBACK_STATE: PersistedFeedbackState = {
    screenshot: null,
    selectedPersonaIds: [],
    context: '',
    feedbackHistory: [],
};

export const EMPTY_SETTINGS_STATE: PersistedSettingsState = {
    defaultModel: 'claude-sonnet-4-20250514',
    autoSave: true,
};

export default createStateManager;
