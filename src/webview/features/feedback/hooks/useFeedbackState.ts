import { useState, useCallback, useEffect } from 'react';
import { useVSCode } from '../../../shared/hooks/useVSCode';
import {
    FeedbackState,
    FeedbackEntry,
    ScreenshotData,
    INITIAL_FEEDBACK_STATE,
    MAX_FEEDBACK_PERSONAS,
} from '../types';

/**
 * Return type for useFeedbackState hook
 */
export interface UseFeedbackStateReturn {
    /** Current state */
    state: FeedbackState;
    /** Set screenshot */
    setScreenshot: (screenshot: ScreenshotData | null) => void;
    /** Toggle persona selection */
    togglePersonaSelection: (personaId: string) => void;
    /** Set selected personas */
    setSelectedPersonaIds: (ids: string[]) => void;
    /** Set context */
    setContext: (context: string) => void;
    /** Set view mode */
    setViewMode: (mode: 'form' | 'results' | 'history') => void;
    /** Add feedback entry */
    addFeedbackEntry: (entry: FeedbackEntry) => void;
    /** Clear generated feedback */
    clearGeneratedFeedback: () => void;
    /** Delete feedback from history */
    deleteFeedbackEntry: (id: string) => void;
    /** Set loading state */
    setLoading: (loading: boolean) => void;
    /** Set error */
    setError: (error: string | null) => void;
    /** Reset form */
    resetForm: () => void;
    /** Can generate feedback */
    canGenerateFeedback: boolean;
}

/**
 * Hook for managing feedback feature state.
 *
 * @example
 * ```tsx
 * function FeedbackView() {
 *   const {
 *     state,
 *     setScreenshot,
 *     togglePersonaSelection,
 *     setContext,
 *   } = useFeedbackState();
 *   
 *   return (
 *     <div>
 *       <ScreenshotCapture onCapture={setScreenshot} />
 *       <PersonaMultiSelect
 *         selectedIds={state.selectedPersonaIds}
 *         onToggle={togglePersonaSelection}
 *       />
 *     </div>
 *   );
 * }
 * ```
 *
 * **Validates: Requirements 4.1, 14.5, 25.3**
 */
export function useFeedbackState(): UseFeedbackStateReturn {
    console.log('[useFeedbackState] Hook called - initializing');
    const { getState, setState: saveVSCodeState, onMessage, postMessage } = useVSCode();
    const [state, setStateInternal] = useState<FeedbackState>(INITIAL_FEEDBACK_STATE);

    // Load persisted state on mount
    useEffect(() => {
        console.log('[useFeedbackState] useEffect running');

        const persisted = getState();
        if (persisted?.feedbackState && typeof persisted.feedbackState === 'object') {
            const feedbackState = persisted.feedbackState as Partial<FeedbackState>;
            setStateInternal((prev) => ({
                ...prev,
                ...feedbackState,
                // Reset to form view if no generated feedback (after reload)
                viewMode: feedbackState.generatedFeedback?.length ? feedbackState.viewMode || 'form' : 'form',
                // Don't persist generated feedback - it's temporary
                generatedFeedback: [],
                isLoading: false,
                error: null,
            }));
        }

        // Request feedback history from backend
        console.log('[useFeedbackState] Requesting feedback history');
        postMessage({ type: 'get-feedback-history' });
        console.log('[useFeedbackState] Sent get-feedback-history message');

    }, [postMessage]); // Run once on mount

    // Listen for messages from extension
    useEffect(() => {
        const unsubscribe = onMessage((message: any) => {
            switch (message.type) {
                case 'screenshot-captured':
                    // Update screenshot with captured image
                    if (message.screenshot) {
                        const screenshotData: ScreenshotData = {
                            url: message.screenshot,
                            source: 'url',
                            capturedAt: Date.now(),
                        };
                        setStateInternal((prev) => ({ ...prev, screenshot: screenshotData, isLoading: false }));
                    }
                    break;
                case 'screenshot-status':
                    // Update loading state during capture
                    if (message.status === 'capturing') {
                        setStateInternal((prev) => ({ ...prev, isLoading: true }));
                    }
                    break;
                case 'screenshot-error':
                    // Handle screenshot capture error
                    setStateInternal((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: message.error || 'Failed to capture screenshot',
                    }));
                    break;
                case 'feedback-generated':
                    // Handle generated feedback
                    if (message.entry) {
                        setStateInternal((prev) => ({
                            ...prev,
                            generatedFeedback: [...prev.generatedFeedback, message.entry],
                            feedbackHistory: [message.entry, ...prev.feedbackHistory],
                            isLoading: false,
                            error: null,
                            viewMode: 'results', // Auto-switch to results view
                            // Clear form inputs after successful generation
                            screenshot: null,
                            selectedPersonaIds: [],
                            context: '',
                        }));
                        // Persist the cleared form state
                        persistState({
                            screenshot: null,
                            selectedPersonaIds: [],
                            context: '',
                        });
                    }
                    break;
                case 'feedback-summary':
                    // Handle AI-generated summary
                    if (message.summary) {
                        console.log('[useFeedbackState] Received feedback summary:', message.summary);
                        setStateInternal((prev) => ({
                            ...prev,
                            feedbackSummary: message.summary,
                        }));
                    }
                    break;
                case 'feedback-status':
                    // Handle feedback generation status updates
                    if (message.status === 'generating') {
                        setStateInternal((prev) => ({ ...prev, isLoading: true, error: null }));
                    }
                    break;
                case 'error':
                    // Handle general errors from the extension
                    setStateInternal((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: message.message || message.error || 'An error occurred',
                    }));
                    break;
                case 'feedback-history':
                    // Handle feedback history loaded from backend
                    if (message.history && Array.isArray(message.history)) {
                        console.log('[useFeedbackState] Loaded feedback history:', message.history.length);
                        setStateInternal((prev) => ({
                            ...prev,
                            feedbackHistory: message.history,
                        }));
                    }
                    break;
                case 'feedback-deleted':
                    // Handle feedback deletion confirmation from backend
                    if (message.id) {
                        console.log('[useFeedbackState] Feedback deleted:', message.id);
                        // State already updated optimistically, this confirms it
                        // Optionally refresh history to ensure sync
                        postMessage({ type: 'get-feedback-history' });
                    }
                    break;
            }
        });

        return unsubscribe;
    }, [onMessage]);

    // Save state to VS Code on changes
    const persistState = useCallback(
        (newState: Partial<FeedbackState>) => {
            const updated = { ...state, ...newState };
            saveVSCodeState({ feedbackState: updated });
        },
        [state, saveVSCodeState]
    );

    const setScreenshot = useCallback(
        (screenshot: ScreenshotData | null) => {
            setStateInternal((prev) => ({ ...prev, screenshot }));
            persistState({ screenshot });
        },
        [persistState]
    );

    const togglePersonaSelection = useCallback(
        (personaId: string) => {
            setStateInternal((prev) => {
                const isSelected = prev.selectedPersonaIds.includes(personaId);
                let newIds: string[];

                if (isSelected) {
                    newIds = prev.selectedPersonaIds.filter((id) => id !== personaId);
                } else {
                    if (prev.selectedPersonaIds.length >= MAX_FEEDBACK_PERSONAS) {
                        return prev; // Don't add if at limit
                    }
                    newIds = [...prev.selectedPersonaIds, personaId];
                }

                persistState({ selectedPersonaIds: newIds });
                return { ...prev, selectedPersonaIds: newIds };
            });
        },
        [persistState]
    );

    const setSelectedPersonaIds = useCallback(
        (ids: string[]) => {
            const limitedIds = ids.slice(0, MAX_FEEDBACK_PERSONAS);
            setStateInternal((prev) => ({ ...prev, selectedPersonaIds: limitedIds }));
            persistState({ selectedPersonaIds: limitedIds });
        },
        [persistState]
    );

    const setContext = useCallback(
        (context: string) => {
            setStateInternal((prev) => ({ ...prev, context }));
            persistState({ context });
        },
        [persistState]
    );

    const setViewMode = useCallback(
        (viewMode: 'form' | 'results' | 'history') => {
            setStateInternal((prev) => ({ ...prev, viewMode }));
        },
        []
    );

    const addFeedbackEntry = useCallback(
        (entry: FeedbackEntry) => {
            setStateInternal((prev) => {
                const newGenerated = [...prev.generatedFeedback, entry];
                const newHistory = [entry, ...prev.feedbackHistory];
                persistState({ generatedFeedback: newGenerated, feedbackHistory: newHistory });
                return {
                    ...prev,
                    generatedFeedback: newGenerated,
                    feedbackHistory: newHistory,
                };
            });
        },
        [persistState]
    );

    const clearGeneratedFeedback = useCallback(() => {
        setStateInternal((prev) => ({ ...prev, generatedFeedback: [] }));
        persistState({ generatedFeedback: [] });
    }, [persistState]);

    const deleteFeedbackEntry = useCallback(
        (id: string) => {
            // Send delete message to backend
            postMessage({ type: 'delete-feedback', id });

            // Update local state immediately (optimistic update)
            setStateInternal((prev) => {
                const newHistory = prev.feedbackHistory.filter((entry) => entry.id !== id);
                persistState({ feedbackHistory: newHistory });
                return { ...prev, feedbackHistory: newHistory };
            });
        },
        [persistState, postMessage]
    );


    const setLoading = useCallback((isLoading: boolean) => {
        setStateInternal((prev) => ({ ...prev, isLoading }));
    }, []);

    const setError = useCallback((error: string | null) => {
        setStateInternal((prev) => ({ ...prev, error }));
    }, []);

    const resetForm = useCallback(() => {
        setStateInternal((prev) => ({
            ...prev,
            screenshot: null,
            selectedPersonaIds: [],
            context: '',
            generatedFeedback: [],
            error: null,
        }));
        persistState({
            screenshot: null,
            selectedPersonaIds: [],
            context: '',
            generatedFeedback: [],
        });
    }, [persistState]);

    const canGenerateFeedback =
        state.screenshot !== null && state.selectedPersonaIds.length > 0 && !state.isLoading;

    return {
        state,
        setScreenshot,
        togglePersonaSelection,
        setSelectedPersonaIds,
        setContext,
        setViewMode,
        addFeedbackEntry,
        clearGeneratedFeedback,
        deleteFeedbackEntry,
        setLoading,
        setError,
        resetForm,
        canGenerateFeedback,
    };
}

export default useFeedbackState;
