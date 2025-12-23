import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BuildStage } from '../stages/BuildStage';

describe('BuildStage', () => {
    const defaultProps = {
        screens: [
            { id: '1', name: 'Home', description: 'Home screen', components: ['Header'], flowId: '1' },
        ],
        framework: 'react' as const,
        projectName: 'test-project',
        codeFolderName: 'test-project',
        iteration: {
            currentIteration: 0,
            totalIterations: 0,
            isComplete: false,
        },
        onStartBuild: jest.fn(),
        onStopBuild: jest.fn(),
        onBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the stage title', () => {
        render(<BuildStage {...defaultProps} />);
        // Use heading role to get the specific title
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Build');
    });

    it('displays project name', () => {
        render(<BuildStage {...defaultProps} />);
        // Multiple elements may contain project name, just check at least one exists
        const elements = screen.getAllByText('test-project');
        expect(elements.length).toBeGreaterThan(0);
    });

    it('displays framework', () => {
        render(<BuildStage {...defaultProps} />);
        expect(screen.getByText('react')).toBeInTheDocument();
    });

    it('displays screen count', () => {
        render(<BuildStage {...defaultProps} />);
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders Start Build button', () => {
        render(<BuildStage {...defaultProps} />);
        expect(screen.getByRole('button', { name: /Start Build/i })).toBeInTheDocument();
    });

    it('calls onStartBuild when button is clicked', () => {
        render(<BuildStage {...defaultProps} />);
        const button = screen.getByRole('button', { name: /Start Build/i });
        fireEvent.click(button);
        expect(defaultProps.onStartBuild).toHaveBeenCalled();
    });

    it('shows building state when loading', () => {
        render(<BuildStage {...defaultProps} isLoading={true} />);
        expect(screen.getByText(/Building.../i)).toBeInTheDocument();
    });

    it('shows iteration progress when building', () => {
        render(
            <BuildStage
                {...defaultProps}
                isLoading={true}
                iteration={{
                    currentIteration: 2,
                    totalIterations: 5,
                    isComplete: false,
                }}
            />
        );
        expect(screen.getByText(/Iteration 2 of 5/i)).toBeInTheDocument();
    });

    it('shows stop button when building', () => {
        render(<BuildStage {...defaultProps} isLoading={true} />);
        expect(screen.getByRole('button', { name: /Stop Build/i })).toBeInTheDocument();
    });

    it('calls onStopBuild when stop is clicked', () => {
        render(<BuildStage {...defaultProps} isLoading={true} />);
        const button = screen.getByRole('button', { name: /Stop Build/i });
        fireEvent.click(button);
        expect(defaultProps.onStopBuild).toHaveBeenCalled();
    });

    it('shows completion message when complete', () => {
        render(
            <BuildStage
                {...defaultProps}
                iteration={{
                    currentIteration: 3,
                    totalIterations: 3,
                    isComplete: true,
                }}
            />
        );
        expect(screen.getByText(/Build Complete!/i)).toBeInTheDocument();
    });

    it('shows rebuild button when complete', () => {
        render(
            <BuildStage
                {...defaultProps}
                iteration={{
                    currentIteration: 3,
                    totalIterations: 3,
                    isComplete: true,
                }}
            />
        );
        expect(screen.getByRole('button', { name: /Rebuild/i })).toBeInTheDocument();
    });

    it('shows error message when error exists', () => {
        render(
            <BuildStage
                {...defaultProps}
                iteration={{
                    currentIteration: 1,
                    totalIterations: 3,
                    isComplete: false,
                    lastError: 'Build failed',
                }}
            />
        );
        expect(screen.getByText('Build failed')).toBeInTheDocument();
    });

    it('calls onBack when Back button is clicked', () => {
        render(<BuildStage {...defaultProps} />);
        const button = screen.getByRole('button', { name: /Back/i });
        fireEvent.click(button);
        expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('disables Start Build when no screens', () => {
        render(<BuildStage {...defaultProps} screens={[]} />);
        const button = screen.getByRole('button', { name: /Start Build/i });
        expect(button).toBeDisabled();
    });
});
