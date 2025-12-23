import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FeaturesStage } from '../stages/FeaturesStage';

describe('FeaturesStage', () => {
    const defaultPersonas = [
        {
            id: '1',
            name: 'John Doe',
            age: "35",
            occupation: 'Engineer',
            backstory: 'A software engineer',
            attributes: {},
        },
    ];

    const defaultProps = {
        personas: defaultPersonas,
        features: [],
        onFeaturesChange: jest.fn(),
        onGenerateFeatures: jest.fn(),
        onNext: jest.fn(),
        onBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the stage title', () => {
        render(<FeaturesStage {...defaultProps} />);
        expect(screen.getByText(/Define Key Features/i)).toBeInTheDocument();
    });

    it('shows persona count in subtitle', () => {
        render(<FeaturesStage {...defaultProps} />);
        expect(screen.getByText(/1 persona/i)).toBeInTheDocument();
    });

    it('renders generate button when no features', () => {
        render(<FeaturesStage {...defaultProps} />);
        expect(screen.getByRole('button', { name: /Start Persona Interviews/i })).toBeInTheDocument();
    });

    it('calls onGenerateFeatures when button is clicked', () => {
        render(<FeaturesStage {...defaultProps} />);
        const button = screen.getByRole('button', { name: /Start Persona Interviews/i });
        fireEvent.click(button);
        expect(defaultProps.onGenerateFeatures).toHaveBeenCalled();
    });

    it('displays generated features', () => {
        const features = [
            {
                id: '1',
                name: 'Dashboard',
                description: 'Main dashboard view',
                score: 5,
                frequency: "3",
                priority: 'high' as const,
                personas: ['John Doe'],
                surveyResponses: [],
            },
        ];
        render(<FeaturesStage {...defaultProps} features={features} />);
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Main dashboard view')).toBeInTheDocument();
        expect(screen.getByText('high')).toBeInTheDocument();
    });

    it('shows feature score', () => {
        const features = [
            {
                id: '1',
                name: 'Dashboard',
                description: 'Main dashboard view',
                score: 5,
                frequency: "3",
                priority: 'high' as const,
                personas: ['John Doe'],
                surveyResponses: [],
            },
        ];
        render(<FeaturesStage {...defaultProps} features={features} />);
        expect(screen.getByText(/⭐ 5/)).toBeInTheDocument();
    });

    it('expands feature card when clicked', () => {
        const features = [
            {
                id: '1',
                name: 'Dashboard',
                description: 'Main dashboard view',
                score: 5,
                frequency: "3",
                priority: 'high' as const,
                personas: ['John Doe'],
                surveyResponses: [],
            },
        ];
        render(<FeaturesStage {...defaultProps} features={features} />);
        const card = screen.getByText('Dashboard').closest('div[style]');
        fireEvent.click(card!);
        expect(screen.getByText(/Mentioned by:/i)).toBeInTheDocument();
    });

    it('disables Next button when no features', () => {
        render(<FeaturesStage {...defaultProps} />);
        const nextButton = screen.getByRole('button', { name: /Continue to Stories/i });
        expect(nextButton).toBeDisabled();
    });

    it('enables Next button when features exist', () => {
        const features = [
            {
                id: '1',
                name: 'Dashboard',
                description: 'Main dashboard view',
                score: 5,
                frequency: "3",
                priority: 'high' as const,
                personas: ['John Doe'],
                surveyResponses: [],
            },
        ];
        render(<FeaturesStage {...defaultProps} features={features} />);
        const nextButton = screen.getByRole('button', { name: /Continue to Stories/i });
        expect(nextButton).not.toBeDisabled();
    });

    it('calls onBack when Back button is clicked', () => {
        render(<FeaturesStage {...defaultProps} />);
        const backButton = screen.getByRole('button', { name: /Back/i });
        fireEvent.click(backButton);
        expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('shows loading state during generation', () => {
        render(<FeaturesStage {...defaultProps} isLoading={true} />);
        expect(screen.getByText(/Conducting interviews/i)).toBeInTheDocument();
    });
});
