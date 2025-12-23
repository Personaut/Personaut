import { useState, useCallback, useEffect, useMemo } from 'react';
import { useVSCode } from '../../../shared/hooks/useVSCode';
import {
    BuildState,
    BuildStage,
    BuildData,
    GeneratedPersona,
    GeneratedFeature,
    UserStory,
    UserFlow,
    Screen,
    Framework,
    SurveyResponse,
    INITIAL_BUILD_STATE,
    BUILD_STAGES,
} from '../types';

/**
 * Return type for useBuildState hook
 */
export interface UseBuildStateReturn extends BuildState {
    // Stage navigation
    setCurrentStage: (stage: BuildStage) => void;
    goToNextStage: () => void;
    goToPreviousStage: () => void;
    markStageComplete: (stage: BuildStage) => void;
    isStageComplete: (stage: BuildStage) => boolean;
    canNavigateToStage: (stage: BuildStage) => boolean;

    // Project info
    setProjectName: (name: string) => void;
    setProjectTitle: (title: string) => void;
    setCodeFolderName: (name: string) => void;

    // Build data
    updateBuildData: <K extends keyof BuildData>(key: K, value: BuildData[K]) => void;
    setBuildData: (data: BuildData) => void;

    // Users stage
    setUsersMode: (mode: 'personas' | 'demographics') => void;
    setBuildPersonas: (personas: GeneratedPersona[]) => void;
    setSelectedPersonaIds: (ids: string[]) => void;
    setGeneratedPersonas: (personas: GeneratedPersona[]) => void;
    addGeneratedPersona: (persona: GeneratedPersona) => void;
    removeGeneratedPersona: (id: string) => void;

    // Features stage
    setFeaturesMode: (mode: 'define' | 'generate') => void;
    setSurveyResponses: (responses: SurveyResponse[]) => void;
    setGeneratedFeatures: (features: GeneratedFeature[]) => void;
    addGeneratedFeature: (feature: GeneratedFeature) => void;
    removeGeneratedFeature: (id: string) => void;
    updateFeaturePriority: (id: string, priority: string) => void;

    // Stories stage
    setUserStories: (stories: UserStory[]) => void;
    addUserStory: (story: UserStory) => void;
    updateUserStory: (id: string, updates: Partial<UserStory>) => void;
    removeUserStory: (id: string) => void;
    toggleStoryExpanded: (id: string) => void;

    // Design stage
    setUserFlows: (flows: UserFlow[]) => void;
    setGeneratedScreens: (screens: Screen[]) => void;
    setSelectedFramework: (framework: Framework) => void;
    addScreen: (screen: Screen) => void;
    updateScreen: (id: string, updates: Partial<Screen>) => void;

    // Dev flow
    setDevFlowOrder: (order: string[]) => void;

    // Loading states
    setIsLoading: (loading: boolean, stage?: BuildStage) => void;

    // Reset
    resetBuildState: () => void;
}

/**
 * Hook for managing build state.
 *
 * Provides complete state management for the build feature including
 * stage navigation, data management, and persistence.
 *
 * @example
 * ```tsx
 * function BuildView() {
 *   const {
 *     currentStage,
 *     goToNextStage,
 *     projectName,
 *     setProjectName,
 *   } = useBuildState();
 *
 *   return (
 *     <StageProgress currentStage={currentStage} />
 *   );
 * }
 * ```
 *
 * **Validates: Requirements 4.1, 14.1, 25.3, 35.1, 35.2**
 */
export function useBuildState(): UseBuildStateReturn {
    const { getState, setState, postMessage, onMessage } = useVSCode();
    const savedState = getState();

    // Core state
    const [currentStage, setCurrentStageInternal] = useState<BuildStage>(
        (savedState as any)?.currentStage || INITIAL_BUILD_STATE.currentStage
    );
    const [completedStages, setCompletedStages] = useState<BuildStage[]>(
        (savedState as any)?.completedStages || []
    );
    const [projectName, setProjectNameInternal] = useState<string>(
        (savedState as any)?.projectName || ''
    );
    const [projectTitle, setProjectTitleInternal] = useState<string>(
        (savedState as any)?.projectTitle || ''
    );
    const [codeFolderName, setCodeFolderNameInternal] = useState<string>(
        (savedState as any)?.codeFolderName || ''
    );
    const [buildData, setBuildDataInternal] = useState<BuildData>(
        (savedState as any)?.buildData || INITIAL_BUILD_STATE.buildData
    );

    // Users stage
    const [usersMode, setUsersModeInternal] = useState<'personas' | 'demographics'>(
        (savedState as any)?.usersMode || 'personas'
    );
    const [buildPersonas, setBuildPersonasInternal] = useState<GeneratedPersona[]>([]);
    const [selectedPersonaIds, setSelectedPersonaIdsInternal] = useState<string[]>([]);
    const [generatedPersonas, setGeneratedPersonasInternal] = useState<GeneratedPersona[]>([]);

    // Features stage
    const [featuresMode, setFeaturesModeInternal] = useState<'define' | 'generate'>(
        (savedState as any)?.featuresMode || 'define'
    );
    const [surveyResponses, setSurveyResponsesInternal] = useState<SurveyResponse[]>([]);
    const [generatedFeatures, setGeneratedFeaturesInternal] = useState<GeneratedFeature[]>([]);

    // Stories stage
    const [userStories, setUserStoriesInternal] = useState<UserStory[]>([]);

    // Design stage
    const [userFlows, setUserFlowsInternal] = useState<UserFlow[]>([]);
    const [generatedScreens, setGeneratedScreensInternal] = useState<Screen[]>([]);
    const [selectedFramework, setSelectedFrameworkInternal] = useState<Framework>(
        (savedState as any)?.selectedFramework || 'react'
    );

    // Dev flow
    const [devFlowOrder, setDevFlowOrderInternal] = useState<string[]>(
        (savedState as any)?.devFlowOrder || ['UX', 'Developer']
    );

    // Loading states
    const [isLoading, setIsLoadingInternal] = useState(false);
    const [loadingStage, setLoadingStage] = useState<BuildStage | null>(null);
    const [isStopping, setIsStopping] = useState(false);
    const [isPaused, setIsPaused] = useState(false); // Always start false, will be loaded from building.json

    // Persist state changes (isPaused is NOT persisted - building.json is source of truth)
    useEffect(() => {
        const current = getState() || {};
        setState({
            ...current,
            currentStage,
            completedStages,
            projectName,
            projectTitle,
            codeFolderName,
            buildData,
            usersMode,
            featuresMode,
            selectedFramework,
            devFlowOrder,
        });
    }, [
        currentStage,
        completedStages,
        projectName,
        projectTitle,
        codeFolderName,
        buildData,
        usersMode,
        featuresMode,
        selectedFramework,
        devFlowOrder,
    ]);

    // Handle messages from extension
    useEffect(() => {
        const unsubscribe = onMessage((message: any) => {
            switch (message.type) {
                case 'stage-data-loaded':
                case 'stage-file-loaded': // Alias from BuildModeHandler
                    handleStageDataLoaded(message.stage, message.data || message.stageFile?.data);
                    break;
                case 'personas-generated':
                    setGeneratedPersonasInternal(message.personas || []);
                    setIsLoadingInternal(false);
                    break;
                case 'features-generated':
                    setGeneratedFeaturesInternal(message.features || []);
                    setIsLoadingInternal(false);
                    break;
                case 'stories-generated':
                case 'user-stories-generated': // Alias from BuildModeHandler
                    setUserStoriesInternal(message.stories || []);
                    setIsLoadingInternal(false);
                    break;
                case 'flows-generated':
                case 'user-flows-generated': // From handleGenerateUserFlows
                case 'flows-updated': // Alias from BuildModeHandler
                    setUserFlowsInternal(message.flows || message.userFlows || []);
                    setIsLoadingInternal(false);
                    break;
                case 'screens-generated':
                case 'screens-updated': // Alias from BuildModeHandler
                    setGeneratedScreensInternal(message.screens || []);
                    setIsLoadingInternal(false);
                    break;
                case 'build-stopping':
                    setIsStopping(true);
                    break;
                case 'building-workflow-paused':
                case 'building-workflow-cancelled':
                    setIsStopping(false);
                    setIsLoadingInternal(false);
                    setIsPaused(true);
                    break;
                case 'building-workflow-complete':
                    setIsStopping(false);
                    setIsLoadingInternal(false);
                    setIsPaused(false);
                    break;
            }
        });

        return unsubscribe;
    }, [onMessage]);

    // Handle loaded stage data
    const handleStageDataLoaded = useCallback((stage: BuildStage, data: unknown) => {
        switch (stage) {
            case 'users':
                if (data && typeof data === 'object') {
                    const d = data as any;
                    // Extract nested data property if it exists
                    const actualData = d.data || d;
                    // Check for both 'personas' and 'generatedPersonas'
                    if (actualData.personas) setGeneratedPersonasInternal(actualData.personas);
                    else if (actualData.generatedPersonas) setGeneratedPersonasInternal(actualData.generatedPersonas);
                    if (actualData.buildPersonas) setBuildPersonasInternal(actualData.buildPersonas);
                }
                break;
            case 'features':
                if (data && typeof data === 'object') {
                    const d = data as any;
                    // Extract nested data property if it exists
                    const actualData = d.data || d;
                    // Check for both 'features' and 'generatedFeatures'
                    if (actualData.features) setGeneratedFeaturesInternal(actualData.features);
                    else if (actualData.generatedFeatures) setGeneratedFeaturesInternal(actualData.generatedFeatures);
                    if (actualData.surveyResponses) setSurveyResponsesInternal(actualData.surveyResponses);
                }
                break;
            case 'stories':
                if (Array.isArray(data)) {
                    setUserStoriesInternal(data as UserStory[]);
                } else if (data && typeof data === 'object') {
                    const d = data as any;
                    // Extract nested data property if it exists
                    const actualData = d.data || d;
                    // Check if stories are nested in an object
                    if (Array.isArray(actualData)) setUserStoriesInternal(actualData);
                    else if (Array.isArray(actualData.stories)) setUserStoriesInternal(actualData.stories);
                    else if (Array.isArray(actualData.userStories)) setUserStoriesInternal(actualData.userStories);
                }
                break;
            case 'design':
                console.log('[useBuildState] Loading design data:', data);
                if (data && typeof data === 'object') {
                    const d = data as any;
                    // Stage files have structure: { stage, data: {...}, timestamp, version }
                    // Extract the actual data from the nested 'data' property
                    const actualData = d.data || d;
                    console.log('[useBuildState] Design data properties:', {
                        hasUserFlows: !!actualData.userFlows,
                        hasPages: !!actualData.pages,
                        hasGeneratedScreens: !!actualData.generatedScreens,
                        hasFramework: !!actualData.framework,
                        hasSelectedFramework: !!actualData.selectedFramework,
                    });
                    if (actualData.userFlows) setUserFlowsInternal(actualData.userFlows);
                    // Check for both 'pages' (new) and 'generatedScreens' (legacy)
                    if (actualData.pages) setGeneratedScreensInternal(actualData.pages);
                    else if (actualData.generatedScreens) setGeneratedScreensInternal(actualData.generatedScreens);
                    if (actualData.framework) setSelectedFrameworkInternal(actualData.framework);
                    else if (actualData.selectedFramework) setSelectedFrameworkInternal(actualData.selectedFramework);
                }
                break;
            case 'building':
                console.log('[useBuildState] Loading building data:', data);
                if (data && typeof data === 'object') {
                    const d = data as any;
                    const actualData = d.data || d;
                    console.log('[useBuildState] Building data properties:', {
                        hasIsPaused: actualData.isPaused !== undefined,
                        isPaused: actualData.isPaused,
                        hasScreens: !!actualData.screens,
                        screenCount: actualData.screens?.length,
                        hasFramework: !!actualData.framework,
                    });
                    // Load isPaused state from file
                    if (actualData.isPaused !== undefined) {
                        setIsPaused(actualData.isPaused);
                    }
                    // Load screens from file
                    if (actualData.screens) {
                        setGeneratedScreensInternal(actualData.screens);
                    }
                    // Load framework from file
                    if (actualData.framework) {
                        setSelectedFrameworkInternal(actualData.framework);
                    }
                }
                break;
        }
    }, []);

    // Load current stage data from files when projectName is available (file system is source of truth)
    useEffect(() => {
        if (projectName && currentStage) {
            console.log('[useBuildState] Loading stage data:', { projectName, currentStage });
            // Load the current stage data from files, not cached state
            postMessage({ type: 'load-stage-data', stage: currentStage, projectName });
        }
    }, [projectName]); // Load when projectName becomes available

    // Stage navigation
    const setCurrentStage = useCallback((stage: BuildStage) => {
        setCurrentStageInternal(stage);
        // Load stage data from file system (not cached state)
        if (projectName) {
            postMessage({ type: 'load-stage-data', stage, projectName });
        }
    }, [postMessage, projectName]);

    const goToNextStage = useCallback(() => {
        const currentIndex = BUILD_STAGES.indexOf(currentStage);
        if (currentIndex < BUILD_STAGES.length - 1) {
            setCurrentStage(BUILD_STAGES[currentIndex + 1]);
        }
    }, [currentStage, setCurrentStage]);

    const goToPreviousStage = useCallback(() => {
        const currentIndex = BUILD_STAGES.indexOf(currentStage);
        if (currentIndex > 0) {
            setCurrentStage(BUILD_STAGES[currentIndex - 1]);
        }
    }, [currentStage, setCurrentStage]);

    const markStageComplete = useCallback((stage: BuildStage) => {
        setCompletedStages((prev) => {
            if (prev.includes(stage)) return prev;
            return [...prev, stage];
        });
    }, []);

    const isStageComplete = useCallback(
        (stage: BuildStage) => completedStages.includes(stage),
        [completedStages]
    );

    const canNavigateToStage = useCallback(
        (stage: BuildStage) => {
            const targetIndex = BUILD_STAGES.indexOf(stage);
            const currentIndex = BUILD_STAGES.indexOf(currentStage);

            // Can always go backwards
            if (targetIndex <= currentIndex) return true;

            // Can only go forward if all previous stages are complete
            for (let i = 0; i < targetIndex; i++) {
                if (!completedStages.includes(BUILD_STAGES[i])) return false;
            }
            return true;
        },
        [currentStage, completedStages]
    );

    // Project info setters
    const setProjectName = useCallback((name: string) => {
        setProjectNameInternal(name);
        // Don't save to backend on every keystroke - only save when user clicks Continue
    }, []);

    const setProjectTitle = useCallback((title: string) => {
        setProjectTitleInternal(title);
    }, []);

    const setCodeFolderName = useCallback((name: string) => {
        setCodeFolderNameInternal(name);
    }, []);

    // Build data
    const updateBuildData = useCallback(<K extends keyof BuildData>(key: K, value: BuildData[K]) => {
        setBuildDataInternal((prev) => ({ ...prev, [key]: value }));
    }, []);

    const setBuildData = useCallback((data: BuildData) => {
        setBuildDataInternal(data);
    }, []);

    // Users stage
    const setUsersMode = useCallback((mode: 'personas' | 'demographics') => {
        setUsersModeInternal(mode);
    }, []);

    const setBuildPersonas = useCallback((personas: GeneratedPersona[]) => {
        setBuildPersonasInternal(personas);
    }, []);

    const setSelectedPersonaIds = useCallback((ids: string[]) => {
        setSelectedPersonaIdsInternal(ids);
    }, []);

    const setGeneratedPersonas = useCallback((personas: GeneratedPersona[]) => {
        setGeneratedPersonasInternal(personas);
    }, []);

    const addGeneratedPersona = useCallback((persona: GeneratedPersona) => {
        setGeneratedPersonasInternal((prev) => [...prev, persona]);
    }, []);

    const removeGeneratedPersona = useCallback((id: string) => {
        setGeneratedPersonasInternal((prev) => prev.filter((p) => p.id !== id));
    }, []);

    // Features stage
    const setFeaturesMode = useCallback((mode: 'define' | 'generate') => {
        setFeaturesModeInternal(mode);
    }, []);

    const setSurveyResponses = useCallback((responses: SurveyResponse[]) => {
        setSurveyResponsesInternal(responses);
    }, []);

    const setGeneratedFeatures = useCallback((features: GeneratedFeature[]) => {
        setGeneratedFeaturesInternal(features);
    }, []);

    const addGeneratedFeature = useCallback((feature: GeneratedFeature) => {
        setGeneratedFeaturesInternal((prev) => [...prev, feature]);
    }, []);

    const removeGeneratedFeature = useCallback((id: string) => {
        setGeneratedFeaturesInternal((prev) => prev.filter((f) => f.id !== id));
    }, []);

    const updateFeaturePriority = useCallback((id: string, priority: string) => {
        setGeneratedFeaturesInternal((prev) =>
            prev.map((f) => (f.id === id ? { ...f, priority } : f))
        );
    }, []);

    // Stories stage
    const setUserStories = useCallback((stories: UserStory[]) => {
        setUserStoriesInternal(stories);
    }, []);

    const addUserStory = useCallback((story: UserStory) => {
        setUserStoriesInternal((prev) => [...prev, story]);
    }, []);

    const updateUserStory = useCallback((id: string, updates: Partial<UserStory>) => {
        setUserStoriesInternal((prev) =>
            prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
        );
    }, []);

    const removeUserStory = useCallback((id: string) => {
        setUserStoriesInternal((prev) => prev.filter((s) => s.id !== id));
    }, []);

    const toggleStoryExpanded = useCallback((id: string) => {
        setUserStoriesInternal((prev) =>
            prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s))
        );
    }, []);

    // Design stage
    const setUserFlows = useCallback((flows: UserFlow[]) => {
        setUserFlowsInternal(flows);
    }, []);

    const setGeneratedScreens = useCallback((screens: Screen[]) => {
        setGeneratedScreensInternal(screens);
    }, []);

    const setSelectedFramework = useCallback((framework: Framework) => {
        setSelectedFrameworkInternal(framework);
    }, []);

    const addScreen = useCallback((screen: Screen) => {
        setGeneratedScreensInternal((prev) => [...prev, screen]);
    }, []);

    const updateScreen = useCallback((id: string, updates: Partial<Screen>) => {
        setGeneratedScreensInternal((prev) =>
            prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
        );
    }, []);

    // Dev flow
    const setDevFlowOrder = useCallback((order: string[]) => {
        setDevFlowOrderInternal(order);
    }, []);

    // Loading
    const setIsLoading = useCallback((loading: boolean, stage?: BuildStage) => {
        setIsLoadingInternal(loading);
        setLoadingStage(loading ? stage || null : null);
        if (loading) {
            setIsPaused(false);
        }
    }, []);

    // Reset
    const resetBuildState = useCallback(() => {
        setCurrentStageInternal('idea');
        setCompletedStages([]);
        setProjectNameInternal('');
        setProjectTitleInternal('');
        setCodeFolderNameInternal('');
        setBuildDataInternal(INITIAL_BUILD_STATE.buildData);
        setUsersModeInternal('personas');
        setBuildPersonasInternal([]);
        setSelectedPersonaIdsInternal([]);
        setGeneratedPersonasInternal([]);
        setFeaturesModeInternal('define');
        setSurveyResponsesInternal([]);
        setGeneratedFeaturesInternal([]);
        setUserStoriesInternal([]);
        setUserFlowsInternal([]);
        setGeneratedScreensInternal([]);
        setSelectedFrameworkInternal('react');
        setDevFlowOrderInternal(['UX', 'Developer']);
        setIsLoadingInternal(false);
        setLoadingStage(null);
        setIsStopping(false);
        setIsPaused(false);
    }, []);

    // Iteration state (computed)
    const iteration = useMemo(
        () => ({
            currentIteration: 0,
            totalIterations: 0,
            isComplete: completedStages.length === BUILD_STAGES.length,
            isStopping,
            isPaused,
        }),
        [completedStages, isStopping, isPaused]
    );

    return {
        // State
        currentStage,
        completedStages,
        projectName,
        projectTitle,
        codeFolderName,
        buildData,
        usersMode,
        buildPersonas,
        selectedPersonaIds,
        generatedPersonas,
        featuresMode,
        surveyResponses,
        generatedFeatures,
        userStories,
        userFlows,
        generatedScreens,
        selectedFramework,
        devFlowOrder,
        isLoading,
        loadingStage,
        iteration,

        // Stage navigation
        setCurrentStage,
        goToNextStage,
        goToPreviousStage,
        markStageComplete,
        isStageComplete,
        canNavigateToStage,

        // Project info
        setProjectName,
        setProjectTitle,
        setCodeFolderName,

        // Build data
        updateBuildData,
        setBuildData,

        // Users stage
        setUsersMode,
        setBuildPersonas,
        setSelectedPersonaIds,
        setGeneratedPersonas,
        addGeneratedPersona,
        removeGeneratedPersona,

        // Features stage
        setFeaturesMode,
        setSurveyResponses,
        setGeneratedFeatures,
        addGeneratedFeature,
        removeGeneratedFeature,
        updateFeaturePriority,

        // Stories stage
        setUserStories,
        addUserStory,
        updateUserStory,
        removeUserStory,
        toggleStoryExpanded,

        // Design stage
        setUserFlows,
        setGeneratedScreens,
        setSelectedFramework,
        addScreen,
        updateScreen,

        // Dev flow
        setDevFlowOrder,

        // Loading
        setIsLoading,

        // Reset
        resetBuildState,
    };
}

export default useBuildState;
