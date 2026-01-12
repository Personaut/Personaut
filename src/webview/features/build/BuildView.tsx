/**
 * BuildView - Main Build Mode Component
 *
 * Orchestrates the entire build experience by composing:
 * - StageProgress for navigation
 * - Individual stage components
 * - Build logs panel
 *
 * This component uses useBuildState for state management
 * and renders the appropriate stage based on currentStage.
 *
 * **Validates: Requirements 13.2, 8.1, 31.1**
 */
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { colors, spacing } from '../../shared/theme';
import { useVSCode } from '../../shared/hooks/useVSCode';
import { useBuildState, useBuildActions } from './hooks';
import { StageProgress, BuildLogsPanel } from './components';
import { ParsingErrorModal, ParsingError } from '../../shared/components/ParsingErrorModal';
import {
    IdeaStage,
    UsersStage,
    FeaturesStage,
    StoriesStage,
    DesignStage,
    FinalizeStage,
} from './stages';
import {
    BuildStage,
    BuildLogEntry,
    Demographics,
    DEFAULT_BUILD_DATA,
} from './types';
import { UserPersona } from './stages/UsersStage';

/**
 * BuildView props
 */
export interface BuildViewProps {
    /** Build logs for display */
    logs?: BuildLogEntry[];
    /** Clear logs handler */
    onClearLogs?: () => void;
    /** Handler for when build completes */
    onBuildComplete?: () => void;
    /** Project history for selection */
    projectHistory?: string[];
    /** Handler for project selection from history */
    onSelectProject?: (name: string) => void;
    /** Handler for stopping build */
    onStopBuild?: () => void;
    /** Available user personas from PersonaStorage */
    availablePersonas?: UserPersona[];
    /** Active build state for restoration */
    activeBuildState?: any;
    /** Current page being built */
    currentPage?: string | null;
    /** Current phase of iteration (design, development, review, consolidation, decision) */
    currentPhase?: string | null;
    /** Iteration feedback from personas */
    iterationFeedback?: any[];
    /** Average rating from feedback */
    averageRating?: number | null;
    /** Handler for user decision (iterate/next-page) */
    onDecision?: (decision: 'iterate' | 'next-page') => void;
}

/**
 * BuildView component - main build mode orchestrator.
 *
 * @example
 * ```tsx
 * <BuildView
 *   logs={buildLogs}
 *   onClearLogs={clearLogs}
 * />
 * ```
 */
export function BuildView({
    logs = [],
    onClearLogs,
    onBuildComplete: _onBuildComplete,
    projectHistory = [],
    onSelectProject,
}: BuildViewProps) {
    // Note: Build-related props (currentPage, currentPhase, iterationFeedback, averageRating, onDecision, onStopBuild, activeBuildState)
    // are kept in the interface for backward compatibility but are not used in the Design workflow.
    // They can be removed in a future cleanup once Build mode is fully deprecated.
    const availablePersonas = (arguments[0] as BuildViewProps).availablePersonas ?? [];
    const { postMessage } = useVSCode();
    const buildState = useBuildState();
    const buildActions = useBuildActions();

    const {
        currentStage,
        completedStages,
        projectName,
        projectTitle,
        codeFolderName,
        setProjectName,
        setProjectTitle,
        setCurrentStage,
        goToNextStage,
        goToPreviousStage,
        markStageComplete,
        canNavigateToStage,
        isLoading,
        setIsLoading,
        // Build data
        buildData,
        updateBuildData,
        // Users stage
        usersMode,
        setUsersMode,
        generatedPersonas,
        setGeneratedPersonas,
        // Features stage
        generatedFeatures,
        setGeneratedFeatures,
        // Stories stage
        userStories,
        setUserStories,
        // Design stage
        userFlows,
        generatedScreens,
        selectedFramework,
        setUserFlows,
        setGeneratedScreens,
        setSelectedFramework,
        // Dev flow
        devFlowOrder,
        // Iteration
        iteration,
    } = buildState;

    // Note: Active build state restoration removed - not needed in Design workflow
    // The Design workflow does not have an "in-progress" build state to restore

    // Log expand state
    const [showLogs, setShowLogs] = React.useState(true);

    // Parsing error state for retry modal
    const [parsingError, setParsingError] = useState<ParsingError | null>(null);

    // Listen for parsing error messages from backend
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === 'parsing-error') {
                console.log('[BuildView] Received parsing error:', message);
                setParsingError({
                    stage: message.stage,
                    projectName: message.projectName,
                    error: message.error,
                    retryable: message.retryable,
                    originalMessage: message.originalMessage,
                });
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Handle retry from parsing error modal
    const handleRetryGeneration = useCallback(() => {
        if (parsingError?.originalMessage) {
            postMessage({
                type: 'retry-generation',
                originalMessage: parsingError.originalMessage,
            });
            setParsingError(null);
        }
    }, [parsingError, postMessage]);

    // Dismiss parsing error
    const handleDismissParsingError = useCallback(() => {
        setParsingError(null);
    }, []);

    // Look and Feel state
    const [lookAndFeel, setLookAndFeel] = useState<any>(null);
    const [isLoadingLookAndFeel, setIsLoadingLookAndFeel] = useState(false);

    // Handle generate look and feel
    const handleGenerateLookAndFeel = useCallback(() => {
        setIsLoadingLookAndFeel(true);
        postMessage({
            type: 'generate-look-and-feel',
            projectName,
            projectTitle,
            personas: generatedPersonas,
        });
    }, [postMessage, projectName, projectTitle, generatedPersonas]);

    // Listen for look and feel messages
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === 'look-and-feel-generated') {
                console.log('[BuildView] Look and feel generated:', message.lookAndFeel);
                setLookAndFeel(message.lookAndFeel);
                setIsLoadingLookAndFeel(false);
            } else if (message.type === 'look-and-feel-generation-error') {
                console.error('[BuildView] Look and feel generation error:', message.error);
                setIsLoadingLookAndFeel(false);
            } else if (message.type === 'look-and-feel-generation-started') {
                setIsLoadingLookAndFeel(true);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Handle stage click in progress bar
    const handleStageClick = (stage: BuildStage) => {
        if (canNavigateToStage(stage)) {
            setCurrentStage(stage);
        }
    };

    // Save project data to backend
    const saveProject = useCallback(() => {
        if (projectName) {
            // Initialize project
            postMessage({
                type: 'set-project-name',
                name: projectName,
                projectName: projectName,
                title: projectTitle
            });

            // Save idea stage data
            postMessage({
                type: 'save-stage-data',
                stage: 'idea',
                projectName: projectName,
                data: {
                    projectName: projectName,
                    projectTitle: projectTitle,
                    projectDescription: projectTitle, // Use projectTitle as description
                    codeFolderName: projectName,
                }
            });
        }
    }, [projectName, projectTitle, postMessage]);

    // Demographics from buildData
    const demographics: Demographics = buildData?.users?.demographics || DEFAULT_BUILD_DATA.users.demographics;

    const handleDemographicsChange = (newDemographics: Demographics) => {
        updateBuildData('users', {
            ...buildData.users,
            demographics: newDemographics,
        });
    };

    // Generate personas with demographics data
    const handleGeneratePersonas = useCallback(() => {
        setIsLoading(true, 'users');
        buildActions.generatePersonas(demographics, 3);
    }, [buildActions, demographics, setIsLoading]);

    // Generate features with persona data
    const handleGenerateFeatures = useCallback(() => {
        setIsLoading(true, 'features');
        buildActions.generateFeatures(generatedPersonas, projectName, projectTitle);
    }, [buildActions, generatedPersonas, projectName, projectTitle, setIsLoading]);

    // Generate stories with features and personas
    const handleGenerateStories = useCallback(() => {
        setIsLoading(true, 'stories');
        buildActions.generateStories(generatedFeatures, generatedPersonas, projectName);
    }, [buildActions, generatedFeatures, generatedPersonas, projectName, setIsLoading]);

    // Generate user flows from screens
    const handleGenerateFlows = useCallback(() => {
        setIsLoading(true, 'design');
        buildActions.generateUserFlows(generatedScreens, projectName);
    }, [buildActions, generatedScreens, projectName, setIsLoading]);

    // Generate screens from user stories
    const handleGenerateScreens = useCallback(() => {
        setIsLoading(true, 'design');
        buildActions.generateScreens(userStories, selectedFramework, projectName);
    }, [buildActions, userStories, selectedFramework, projectName, setIsLoading]);

    // Note: handleStartBuild removed - Build workflow replaced by Design workflow
    // handleGenerateArtifacts is available for future use when ArchitectAgent is integrated
    const _handleGenerateArtifacts = useCallback(() => {
        setIsLoading(true, 'finalize');
        // Task list and steering document generation will be handled in FinalizeStage
    }, [setIsLoading]);

    // Render current stage
    const renderStage = useMemo(() => {
        switch (currentStage) {
            case 'idea':
                return (
                    <IdeaStage
                        projectName={projectName}
                        projectTitle={projectTitle}
                        onProjectNameChange={setProjectName}
                        onProjectTitleChange={setProjectTitle}
                        onNext={() => {
                            saveProject(); // Save project before moving to next stage
                            markStageComplete('idea');
                            goToNextStage();
                        }}
                        isLoading={isLoading}
                        projectHistory={projectHistory}
                        onSelectProject={onSelectProject}
                    />
                );



            case 'users':
                return (
                    <UsersStage
                        mode={usersMode}
                        onModeChange={setUsersMode}
                        demographics={demographics}
                        onDemographicsChange={handleDemographicsChange}
                        generatedPersonas={generatedPersonas}
                        onPersonasChange={setGeneratedPersonas}
                        onGeneratePersonas={handleGeneratePersonas}
                        onBack={goToPreviousStage}
                        onNext={() => {
                            // Save users data before moving to next stage
                            buildActions.saveStageData('users', {
                                mode: usersMode,
                                demographics,
                                generatedPersonas,
                            }, projectName);
                            markStageComplete('users');
                            goToNextStage();
                        }}
                        isLoading={isLoading}
                        availablePersonas={availablePersonas}
                    />
                );

            case 'features':
                return (
                    <FeaturesStage
                        personas={generatedPersonas}
                        features={generatedFeatures}
                        onFeaturesChange={setGeneratedFeatures}
                        onGenerateFeatures={handleGenerateFeatures}
                        onEditFeature={(id, updates) => {
                            setGeneratedFeatures(generatedFeatures.map(f =>
                                f.id === id ? { ...f, name: updates.name ?? f.name, description: updates.description ?? f.description } : f
                            ));
                        }}
                        onRegenerateFeature={(id) => {
                            // For now, regenerate by removing and re-generating
                            // In the future, this could call a specific backend endpoint
                            console.log('[BuildView] Regenerate feature:', id);
                        }}
                        onBack={goToPreviousStage}
                        onNext={() => {
                            markStageComplete('features');
                            goToNextStage();
                        }}
                        isLoading={isLoading}
                    />
                );

            case 'stories':
                return (
                    <StoriesStage
                        features={generatedFeatures}
                        stories={userStories}
                        onStoriesChange={setUserStories}
                        onGenerateStories={handleGenerateStories}
                        onEditStory={(id, updates) => {
                            setUserStories(userStories.map(s =>
                                s.id === id ? { ...s, title: updates.title ?? s.title, description: updates.description ?? s.description } : s
                            ));
                        }}
                        onRegenerateStory={(id) => {
                            // For now, just log - could post message to backend
                            console.log('[BuildView] Regenerate story:', id);
                        }}
                        onBack={goToPreviousStage}
                        onNext={() => {
                            markStageComplete('stories');
                            goToNextStage();
                        }}
                        isLoading={isLoading}
                    />
                );

            case 'design':
                return (
                    <DesignStage
                        userFlows={userFlows}
                        onFlowsChange={setUserFlows}
                        screens={generatedScreens}
                        onScreensChange={setGeneratedScreens}
                        selectedFramework={selectedFramework}
                        onFrameworkChange={setSelectedFramework}
                        lookAndFeel={lookAndFeel}
                        onGenerateLookAndFeel={handleGenerateLookAndFeel}
                        onLookAndFeelChange={setLookAndFeel}
                        isLoadingLookAndFeel={isLoadingLookAndFeel}
                        onGenerateFlows={handleGenerateFlows}
                        onGenerateScreens={handleGenerateScreens}
                        onBack={goToPreviousStage}
                        onNext={() => {
                            // Save design stage data before moving forward
                            buildActions.saveStageData('design', {
                                userFlows,
                                pages: generatedScreens,
                                framework: selectedFramework,
                                lookAndFeel,
                            }, projectName);

                            // Create initial building.json file
                            postMessage({
                                type: 'save-stage-data',
                                stage: 'building',
                                projectName,
                                data: {
                                    iteration: 1,
                                    screens: generatedScreens,
                                    framework: selectedFramework,
                                    projectPath: '',
                                    timestamp: Date.now(),
                                    isPaused: false,
                                    status: 'pending',
                                    currentStep: 0,
                                    totalSteps: generatedScreens.length + 2,
                                    currentAgent: 'none',
                                    startTime: null,
                                    currentScreen: null,
                                    completedScreens: [],
                                    isCancelled: false,
                                },
                            });

                            markStageComplete('design');
                            goToNextStage(); // Navigate to Building stage
                        }}
                        isLoading={isLoading}
                    />
                );

            case 'finalize':
                return (
                    <FinalizeStage
                        projectName={projectName}
                        projectTitle={projectTitle}
                        projectDescription={buildData.idea || projectTitle}
                        personas={generatedPersonas}
                        features={generatedFeatures}
                        userStories={userStories}
                        userFlows={userFlows}
                        screens={generatedScreens}
                        framework={selectedFramework}
                        lookAndFeel={lookAndFeel}
                        onBack={goToPreviousStage}
                        isLoading={isLoading}
                    />
                );

            default:
                return (
                    <div style={{
                        padding: spacing.xl,
                        textAlign: 'center',
                        color: colors.text.muted,
                    }}>
                        Unknown stage: {currentStage}
                    </div>
                );
        }
    }, [
        currentStage,
        projectName,
        projectTitle,
        codeFolderName,
        projectHistory,
        usersMode,
        demographics,
        generatedPersonas,
        generatedFeatures,
        userStories,
        userFlows,
        generatedScreens,
        selectedFramework,
        devFlowOrder,
        isLoading,
        buildData,
        iteration,
        onSelectProject,
        handleGeneratePersonas,
        handleGenerateFeatures,
        handleGenerateStories,
        handleGenerateFlows,
        handleGenerateScreens,
    ]);

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.background.primary,
    };

    const mainStyle: React.CSSProperties = {
        flex: 1,
        overflow: 'auto',
        padding: spacing.lg,
    };

    return (
        <div style={containerStyle}>
            {/* Stage Progress Bar */}
            <StageProgress
                currentStage={currentStage}
                completedStages={completedStages}
                onStageClick={handleStageClick}
            />

            {/* Main Content */}
            <div style={mainStyle}>
                {renderStage}
            </div>

            {/* Build Logs Panel - Always show, will display "No logs yet" when empty */}
            <BuildLogsPanel
                logs={logs}
                onClear={onClearLogs}
                isExpanded={showLogs}
                onToggleExpand={() => setShowLogs(!showLogs)}
                maxHeight="200px"
            />

            {/* Parsing Error Modal - shows when JSON parsing fails */}
            <ParsingErrorModal
                error={parsingError}
                onRetry={handleRetryGeneration}
                onDismiss={handleDismissParsingError}
            />
        </div>
    );
}

export default BuildView;
