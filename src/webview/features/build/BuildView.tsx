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
import React, { useMemo, useCallback, useEffect } from 'react';
import { colors, spacing } from '../../shared/theme';
import { useVSCode } from '../../shared/hooks/useVSCode';
import { useBuildState, useBuildActions } from './hooks';
import { StageProgress, BuildLogsPanel } from './components';
import {
    IdeaStage,
    TeamStage,
    UsersStage,
    FeaturesStage,
    StoriesStage,
    DesignStage,
    BuildStage as BuildingStage,
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
    onStopBuild,
    availablePersonas = [],
    activeBuildState,
}: BuildViewProps) {
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

    // Restore build state from active build
    useEffect(() => {
        if (activeBuildState && activeBuildState.status === 'in-progress') {
            console.log('[BuildView] Restoring active build state:', activeBuildState);

            // Set project name if available
            if (activeBuildState.projectName && !projectName) {
                setProjectName(activeBuildState.projectName);

                // Load building stage data to get screens and framework
                postMessage({
                    type: 'load-stage-data',
                    stage: 'building',
                    projectName: activeBuildState.projectName
                });
            }

            // Set loading state
            setIsLoading(true);

            // Navigate to design stage (where Build button is)
            if (currentStage !== 'design') {
                setCurrentStage('design');
            }
        }
    }, [activeBuildState, projectName, currentStage, setProjectName, setIsLoading, setCurrentStage, postMessage]);

    // Log expand state
    const [showLogs, setShowLogs] = React.useState(true);

    // Handle stage click in progress bar
    const handleStageClick = (stage: BuildStage) => {
        if (canNavigateToStage(stage)) {
            setCurrentStage(stage);
        }
    };

    // Save project data to backend
    const saveProject = useCallback(() => {
        if (projectName) {
            postMessage({
                type: 'set-project-name',
                name: projectName,
                projectName: projectName,
                title: projectTitle
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

    // Start build
    const handleStartBuild = useCallback(() => {
        setIsLoading(true, 'building');
        buildActions.startBuild(generatedScreens, selectedFramework, projectName);
    }, [buildActions, generatedScreens, selectedFramework, projectName, setIsLoading]);

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

            case 'team':
                return (
                    <TeamStage
                        devFlowOrder={devFlowOrder}
                        onBack={goToPreviousStage}
                        onNext={() => {
                            // Save team data before moving to next stage
                            buildActions.saveStageData('team', {
                                devFlowOrder,
                            }, projectName);
                            markStageComplete('team');
                            goToNextStage();
                        }}
                        isLoading={isLoading}
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
                        onGenerateFlows={handleGenerateFlows}
                        onGenerateScreens={handleGenerateScreens}
                        onBack={goToPreviousStage}
                        onNext={() => {
                            // Save design stage data before moving forward
                            buildActions.saveStageData('design', {
                                userFlows,
                                pages: generatedScreens,
                                framework: selectedFramework,
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
                            // Don't auto-navigate - let user click on Building stage
                            // This ensures building.json is created before navigating
                        }}
                        isLoading={isLoading}
                    />
                );

            case 'building':
                return (
                    <BuildingStage
                        screens={generatedScreens}
                        framework={selectedFramework}
                        projectName={projectName}
                        codeFolderName={codeFolderName}
                        iteration={iteration}
                        onStartBuild={handleStartBuild}
                        onStopBuild={() => {
                            postMessage({ type: 'stop-build', projectName });
                            onStopBuild?.();
                        }}
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
        handleStartBuild,
        onStopBuild,
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

            {/* Build Logs Panel */}
            <BuildLogsPanel
                logs={logs}
                onClear={onClearLogs}
                isExpanded={showLogs}
                onToggleExpand={() => setShowLogs(!showLogs)}
                maxHeight="200px"
            />
        </div>
    );
}

export default BuildView;
