import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StoriesStage } from '../stages/StoriesStage';

describe('StoriesStage', () => {
    const defaultFeatures = [
        {
            id: '1',
            name: 'Dashboard',
            description: 'Main dashboard',
            score: 5,
            frequency: '3',
            priority: 'high' as const,
            personas: ['John'],
        },
    ];

    const defaultProps = {
        features: defaultFeatures,
        stories: [],
        onStoriesChange: jest.fn(),
        onGenerateStories: jest.fn(),
        onNext: jest.fn(),
        onBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the stage title', () => {
        render(<StoriesStage {...defaultProps} />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('User Stories');
    });

    it('shows feature count in subtitle', () => {
        render(<StoriesStage {...defaultProps} />);
        expect(screen.getByText(/1 feature/i)).toBeInTheDocument();
    });

    it('renders generate button when no stories', () => {
        render(<StoriesStage {...defaultProps} />);
        expect(screen.getByRole('button', { name: /Generate User Stories/i })).toBeInTheDocument();
    });

    it('calls onGenerateStories when button is clicked', () => {
        render(<StoriesStage {...defaultProps} />);
        const button = screen.getByRole('button', { name: /Generate User Stories/i });
        fireEvent.click(button);
        expect(defaultProps.onGenerateStories).toHaveBeenCalled();
    });

    it('displays generated stories', () => {
        const stories = [
            {
                id: '1',
                title: 'As a user, I want to login',
                description: 'User login functionality',
                requirements: ['Email input', 'Password input'],
                acceptanceCriteria: ['User can login with valid credentials'],
                featureId: '1',
                expanded: false,
                clarifyingQuestions: [],
            },
        ];
        render(<StoriesStage {...defaultProps} stories={stories} />);
        expect(screen.getByText('As a user, I want to login')).toBeInTheDocument();
        expect(screen.getByText('User login functionality')).toBeInTheDocument();
    });

    it('expands story when clicked', () => {
        const stories = [
            {
                id: '1',
                title: 'As a user, I want to login',
                description: 'User login functionality',
                requirements: ['Email input', 'Password input'],
                acceptanceCriteria: ['User can login with valid credentials'],
                featureId: '1',
                expanded: true,
                clarifyingQuestions: [],
            },
        ];
        render(<StoriesStage {...defaultProps} stories={stories} />);
        expect(screen.getByText('Requirements')).toBeInTheDocument();
        expect(screen.getByText('Email input')).toBeInTheDocument();
        expect(screen.getByText('Acceptance Criteria')).toBeInTheDocument();
    });

    it('disables Next button when no stories', () => {
        render(<StoriesStage {...defaultProps} />);
        const nextButton = screen.getByRole('button', { name: /Continue to Design/i });
        expect(nextButton).toBeDisabled();
    });

    it('enables Next button when stories exist', () => {
        const stories = [
            {
                id: '1',
                title: 'Story 1',
                description: 'A story',
                requirements: ['Req 1'],
                acceptanceCriteria: [],
                featureId: '1',
                expanded: false,
                clarifyingQuestions: [],
            },
        ];
        render(<StoriesStage {...defaultProps} stories={stories} />);
        const nextButton = screen.getByRole('button', { name: /Continue to Design/i });
        expect(nextButton).not.toBeDisabled();
    });

    it('calls onBack when Back button is clicked', () => {
        render(<StoriesStage {...defaultProps} />);
        const backButton = screen.getByRole('button', { name: /Back/i });
        fireEvent.click(backButton);
        expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('shows loading state during generation', () => {
        render(<StoriesStage {...defaultProps} isLoading={true} />);
        expect(screen.getByText(/Generating user stories/i)).toBeInTheDocument();
    });
});
