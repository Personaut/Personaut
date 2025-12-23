import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeamStage } from '../stages/TeamStage';

describe('TeamStage', () => {
    const defaultProps = {
        devFlowOrder: ['UX', 'Developer'],
        onNext: jest.fn(),
        onBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the stage title', () => {
        render(<TeamStage {...defaultProps} />);
        expect(screen.getByText(/Development Iteration Flow/i)).toBeInTheDocument();
    });

    it('renders UX agent', () => {
        render(<TeamStage {...defaultProps} />);
        expect(screen.getByText(/UX Agent/i)).toBeInTheDocument();
        expect(screen.getByText(/user flows, wireframes, and screen designs/i)).toBeInTheDocument();
    });

    it('renders Developer agent', () => {
        render(<TeamStage {...defaultProps} />);
        expect(screen.getByText(/Developer Agent/i)).toBeInTheDocument();
        expect(screen.getByText(/Implements the code/i)).toBeInTheDocument();
    });

    it('renders User Feedback step', () => {
        render(<TeamStage {...defaultProps} />);
        expect(screen.getByText(/User Feedback/i)).toBeInTheDocument();
    });

    it('calls onNext when Continue button is clicked', () => {
        render(<TeamStage {...defaultProps} />);
        const button = screen.getByRole('button', { name: /Continue to Users/i });
        fireEvent.click(button);
        expect(defaultProps.onNext).toHaveBeenCalled();
    });

    it('calls onBack when Back button is clicked', () => {
        render(<TeamStage {...defaultProps} />);
        const button = screen.getByRole('button', { name: /Back/i });
        fireEvent.click(button);
        expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('disables buttons when loading', () => {
        render(<TeamStage {...defaultProps} isLoading={true} />);
        const backButton = screen.getByRole('button', { name: /Back/i });
        expect(backButton).toBeDisabled();
    });
});
