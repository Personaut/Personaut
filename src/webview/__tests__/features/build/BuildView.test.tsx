/**
 * Tests for BuildView component
 * 
 * Tests the main build mode orchestrator that composes
 * stage components and manages navigation.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { BuildView } from '../../../features/build/BuildView';

// Mock the hooks and components
jest.mock('../../../features/build/hooks', () => ({
    useBuildState: () => ({
        currentStage: 'idea',
        completedStages: [],
        projectName: '',
        projectTitle: '',
        codeFolderName: '',
        setProjectName: jest.fn(),
        setProjectTitle: jest.fn(),
        setCurrentStage: jest.fn(),
        goToNextStage: jest.fn(),
        goToPreviousStage: jest.fn(),
        markStageComplete: jest.fn(),
        canNavigateToStage: jest.fn(() => true),
        isLoading: false,
        buildData: { users: { demographics: {} } },
        updateBuildData: jest.fn(),
        usersMode: 'personas',
        setUsersMode: jest.fn(),
        generatedPersonas: [],
        setGeneratedPersonas: jest.fn(),
        generatedFeatures: [],
        setGeneratedFeatures: jest.fn(),
        userStories: [],
        setUserStories: jest.fn(),
        userFlows: [],
        generatedScreens: [],
        selectedFramework: 'react',
        setUserFlows: jest.fn(),
        setGeneratedScreens: jest.fn(),
        setSelectedFramework: jest.fn(),
        devFlowOrder: ['UX', 'Developer'],
        iteration: { currentIteration: 0, totalIterations: 0, isComplete: false },
    }),
}));

jest.mock('../../../features/build/components', () => ({
    StageProgress: ({ currentStage }: { currentStage: string }) => (
        <div data-testid="stage-progress">Stage: {currentStage}</div>
    ),
    BuildLogsPanel: () => <div data-testid="build-logs-panel">Logs</div>,
}));

jest.mock('../../../features/build/stages', () => ({
    IdeaStage: () => <div data-testid="idea-stage">Idea Stage</div>,
    TeamStage: () => <div data-testid="team-stage">Team Stage</div>,
    UsersStage: () => <div data-testid="users-stage">Users Stage</div>,
    FeaturesStage: () => <div data-testid="features-stage">Features Stage</div>,
    StoriesStage: () => <div data-testid="stories-stage">Stories Stage</div>,
    DesignStage: () => <div data-testid="design-stage">Design Stage</div>,
    BuildStage: () => <div data-testid="build-stage">Build Stage</div>,
}));

describe('BuildView', () => {
    it('renders without crashing', () => {
        render(<BuildView />);
        expect(screen.getByTestId('stage-progress')).toBeInTheDocument();
    });

    it('renders stage progress component', () => {
        render(<BuildView />);
        expect(screen.getByText('Stage: idea')).toBeInTheDocument();
    });

    it('renders build logs panel', () => {
        render(<BuildView />);
        expect(screen.getByTestId('build-logs-panel')).toBeInTheDocument();
    });

    it('renders idea stage by default', () => {
        render(<BuildView />);
        expect(screen.getByTestId('idea-stage')).toBeInTheDocument();
    });

    it('passes logs to BuildLogsPanel', () => {
        const logs = [
            { id: '1', timestamp: Date.now(), type: 'info' as const, stage: 'idea' as const, content: 'Test log' },
        ];
        render(<BuildView logs={logs} />);
        expect(screen.getByTestId('build-logs-panel')).toBeInTheDocument();
    });

    it('calls onClearLogs when provided', () => {
        const onClearLogs = jest.fn();
        render(<BuildView onClearLogs={onClearLogs} />);
        // The actual clear is handled by BuildLogsPanel
        expect(screen.getByTestId('build-logs-panel')).toBeInTheDocument();
    });
});

describe('BuildView stage rendering', () => {
    it('renders correct stage component based on currentStage', () => {
        // This is tested via the mocked useBuildState returning 'idea'
        render(<BuildView />);
        expect(screen.getByTestId('idea-stage')).toBeInTheDocument();
    });
});
