import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IdeaStage } from '../stages/IdeaStage';

describe('IdeaStage', () => {
    const defaultProps = {
        projectName: '',
        onProjectNameChange: jest.fn(),
        projectTitle: '',
        onProjectTitleChange: jest.fn(),
        onNext: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the stage title', () => {
        render(<IdeaStage {...defaultProps} />);
        expect(screen.getByText(/What's your idea/i)).toBeInTheDocument();
    });

    it('renders project name input', () => {
        render(<IdeaStage {...defaultProps} />);
        expect(screen.getByPlaceholderText(/my-awesome-project/i)).toBeInTheDocument();
    });

    it('renders project description textarea', () => {
        render(<IdeaStage {...defaultProps} />);
        expect(screen.getByPlaceholderText(/Describe your project/i)).toBeInTheDocument();
    });

    it('calls onProjectNameChange when input changes', () => {
        render(<IdeaStage {...defaultProps} />);
        const input = screen.getByPlaceholderText(/my-awesome-project/i);
        fireEvent.change(input, { target: { value: 'test-project' } });
        expect(defaultProps.onProjectNameChange).toHaveBeenCalledWith('test-project');
    });

    it('calls onProjectTitleChange when textarea changes', () => {
        render(<IdeaStage {...defaultProps} />);
        const textarea = screen.getByPlaceholderText(/Describe your project/i);
        fireEvent.change(textarea, { target: { value: 'A cool project' } });
        expect(defaultProps.onProjectTitleChange).toHaveBeenCalledWith('A cool project');
    });

    it('disables submit button when form is invalid', () => {
        render(<IdeaStage {...defaultProps} />);
        const button = screen.getByRole('button', { name: /Continue/i });
        expect(button).toBeDisabled();
    });

    it('enables submit button when form is valid', () => {
        render(
            <IdeaStage
                {...defaultProps}
                projectName="valid-project"
                projectTitle="A valid project description"
            />
        );
        const button = screen.getByRole('button', { name: /Continue/i });
        expect(button).not.toBeDisabled();
    });

    it('shows validation error for invalid project name', () => {
        render(<IdeaStage {...defaultProps} projectName="ab" />);
        const input = screen.getByPlaceholderText(/my-awesome-project/i);
        fireEvent.blur(input);
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    });

    it('shows validation error for special characters', () => {
        render(<IdeaStage {...defaultProps} projectName="test@project" />);
        const input = screen.getByPlaceholderText(/my-awesome-project/i);
        fireEvent.blur(input);
        expect(screen.getByText(/letters, numbers, hyphens/i)).toBeInTheDocument();
    });

    it('calls onNext when form is submitted with valid data', () => {
        render(
            <IdeaStage
                {...defaultProps}
                projectName="valid-project"
                projectTitle="A valid description"
            />
        );
        const form = screen.getByRole('button', { name: /Continue/i }).closest('form');
        fireEvent.submit(form!);
        expect(defaultProps.onNext).toHaveBeenCalled();
    });

    it('shows loading state', () => {
        render(
            <IdeaStage
                {...defaultProps}
                projectName="test"
                projectTitle="desc"
                isLoading={true}
            />
        );
        const button = screen.getByRole('button', { name: /Continue/i });
        // Button is disabled when loading
        expect(button).toBeDisabled();
    });

    it('shows project history dropdown when provided', () => {
        render(
            <IdeaStage
                {...defaultProps}
                projectHistory={['project-1', 'project-2']}
            />
        );
        const input = screen.getByPlaceholderText(/my-awesome-project/i);
        fireEvent.focus(input);
        expect(screen.getByText('project-1')).toBeInTheDocument();
        expect(screen.getByText('project-2')).toBeInTheDocument();
    });
});
