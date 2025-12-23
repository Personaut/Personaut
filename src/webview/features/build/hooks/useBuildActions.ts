import { useCallback } from 'react';
import { useVSCode } from '../../../shared/hooks/useVSCode';
import { BuildStage, GeneratedPersona, GeneratedFeature, UserStory, UserFlow, Screen, Framework, BuildData } from '../types';

/**
 * Return type for useBuildActions hook
 */
export interface UseBuildActionsReturn {
    // Stage data operations
    saveStageData: (stage: BuildStage, data: unknown, projectName: string) => void;
    loadStageData: (stage: BuildStage) => void;

    // Generation actions
    generatePersonas: (demographics: BuildData['users']['demographics'], count?: number) => void;
    generateFeatures: (personas: GeneratedPersona[], projectName: string, idea: string) => void;
    generateStories: (features: GeneratedFeature[], personas: GeneratedPersona[], projectName: string) => void;
    generateUserFlows: (screens: Screen[], projectName: string) => void;
    generateScreens: (stories: UserStory[], framework: Framework, projectName: string) => void;
    startBuild: (screens: Screen[], framework: Framework, projectName: string) => void;

    // Project operations
    createProject: (name: string, title: string) => void;
    loadProject: (name: string) => void;
    deleteProject: (name: string) => void;

    // Iteration
    startIteration: () => void;
    stopIteration: () => void;
}

/**
 * Hook for build actions that communicate with the extension.
 *
 * Provides methods to trigger generation, save/load data, and manage projects.
 *
 * @example
 * ```tsx
 * function FeaturesStage() {
 *   const { generateFeatures } = useBuildActions();
 *   const { selectedPersonaIds } = useBuildState();
 *
 *   return (
 *     <Button onClick={() => generateFeatures(selectedPersonaIds)}>
 *       Generate Features
 *     </Button>
 *   );
 * }
 * ```
 *
 * **Validates: Requirements 4.1, 14.1, 36.1, 36.2**
 */
export function useBuildActions(): UseBuildActionsReturn {
    const { postMessage } = useVSCode();

    // Stage data operations
    const saveStageData = useCallback(
        (stage: BuildStage, data: unknown, projectName: string) => {
            postMessage({ type: 'save-stage-data', stage, data, projectName });
        },
        [postMessage]
    );

    const loadStageData = useCallback(
        (stage: BuildStage) => {
            postMessage({ type: 'load-stage-data', stage });
        },
        [postMessage]
    );

    // Generation actions
    const generatePersonas = useCallback(
        (demographics: BuildData['users']['demographics'], count = 3) => {
            postMessage({ type: 'generate-personas', demographics, count });
        },
        [postMessage]
    );

    const generateFeatures = useCallback(
        (personas: GeneratedPersona[], projectName: string, idea: string) => {
            postMessage({
                type: 'generate-features',
                personas,
                projectName,
                idea
            });
        },
        [postMessage]
    );

    const generateStories = useCallback(
        (features: GeneratedFeature[], personas: GeneratedPersona[], projectName: string) => {
            postMessage({ type: 'generate-stories', features, personas, projectName });
        },
        [postMessage]
    );

    const generateUserFlows = useCallback(
        (screens: Screen[], projectName: string) => {
            postMessage({ type: 'generate-user-flows', screens, projectName });
        },
        [postMessage]
    );

    const generateScreens = useCallback(
        (stories: UserStory[], framework: Framework, projectName: string) => {
            postMessage({ type: 'generate-screens', stories, framework, projectName });
        },
        [postMessage]
    );

    const startBuild = useCallback(
        (screens: Screen[], framework: Framework, projectName: string) => {
            postMessage({ type: 'start-build', screens, framework, projectName });
        },
        [postMessage]
    );

    // Project operations
    const createProject = useCallback(
        (name: string, title: string) => {
            postMessage({ type: 'create-project', name, title });
        },
        [postMessage]
    );

    const loadProject = useCallback(
        (name: string) => {
            postMessage({ type: 'load-project', name });
        },
        [postMessage]
    );

    const deleteProject = useCallback(
        (name: string) => {
            postMessage({ type: 'delete-project', name });
        },
        [postMessage]
    );

    // Iteration
    const startIteration = useCallback(() => {
        postMessage({ type: 'start-iteration' });
    }, [postMessage]);

    const stopIteration = useCallback(() => {
        postMessage({ type: 'stop-iteration' });
    }, [postMessage]);

    return {
        saveStageData,
        loadStageData,
        generatePersonas,
        generateFeatures,
        generateStories,
        generateUserFlows,
        generateScreens,
        startBuild,
        createProject,
        loadProject,
        deleteProject,
        startIteration,
        stopIteration,
    };
}

export default useBuildActions;
