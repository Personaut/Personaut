/**
 * Tests for FeedbackView component
 * 
 * Tests the feedback generation interface including
 * screenshot capture, persona selection, and feedback display.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FeedbackView } from '../../../features/feedback/FeedbackView';

// Mock the useFeedbackState hook
jest.mock('../../../features/feedback/hooks', () => ({
    useFeedbackState: () => ({
        state: {
            screenshot: null,
            selectedPersonaIds: [],
            context: '',
            generatedFeedback: [],
            feedbackHistory: [],
            viewMode: 'form',
            isLoading: false,
            error: null,
        },
        setScreenshot: jest.fn(),
        togglePersonaSelection: jest.fn(),
        setContext: jest.fn(),
        setViewMode: jest.fn(),
        clearGeneratedFeedback: jest.fn(),
        deleteFeedbackEntry: jest.fn(),
        resetForm: jest.fn(),
        canGenerateFeedback: false,
    }),
}));

// Mock the components
jest.mock('../../../features/feedback/components', () => ({
    ScreenshotCapture: () => <div data-testid="screenshot-capture">Screenshot Capture</div>,
    PersonaMultiSelect: () => <div data-testid="persona-select">Persona Select</div>,
    FeedbackDisplay: () => <div data-testid="feedback-display">Feedback Display</div>,
    FeedbackHistory: () => <div data-testid="feedback-history">Feedback History</div>,
}));

describe('FeedbackView', () => {
    const mockPersonas = [
        { id: '1', name: 'Persona 1', age: '25', occupation: 'Developer' },
        { id: '2', name: 'Persona 2', age: '30', occupation: 'Designer' },
    ];

    it('renders without crashing', () => {
        render(<FeedbackView personas={mockPersonas} />);
        expect(screen.getByTestId('screenshot-capture')).toBeInTheDocument();
    });

    it('displays screenshot capture component', () => {
        render(<FeedbackView personas={mockPersonas} />);
        expect(screen.getByText('Screenshot Capture')).toBeInTheDocument();
    });

    it('displays persona select component', () => {
        render(<FeedbackView personas={mockPersonas} />);
        expect(screen.getByText('Persona Select')).toBeInTheDocument();
    });

    it('renders container with proper structure', () => {
        render(<FeedbackView personas={mockPersonas} />);
        // Check that the basic structure exists
        expect(screen.getByTestId('screenshot-capture')).toBeInTheDocument();
        expect(screen.getByTestId('persona-select')).toBeInTheDocument();
    });

    it('accepts callback props', () => {
        const onGenerateFeedback = jest.fn();
        const onCaptureUrl = jest.fn();

        render(
            <FeedbackView
                personas={mockPersonas}
                onGenerateFeedback={onGenerateFeedback}
                onCaptureUrl={onCaptureUrl}
            />
        );

        expect(screen.getByTestId('screenshot-capture')).toBeInTheDocument();
    });
});
