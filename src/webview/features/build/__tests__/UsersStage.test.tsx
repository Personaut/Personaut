import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UsersStage } from '../stages/UsersStage';

describe('UsersStage', () => {
    const defaultDemographics = {
        ageRange: '',
        incomeRange: '',
        gender: '',
        location: '',
        education: '',
        occupation: '',
    };

    const defaultProps = {
        mode: 'demographics' as const,
        onModeChange: jest.fn(),
        demographics: defaultDemographics,
        onDemographicsChange: jest.fn(),
        generatedPersonas: [],
        onPersonasChange: jest.fn(),
        onGeneratePersonas: jest.fn(),
        onNext: jest.fn(),
        onBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the stage title', () => {
        render(<UsersStage {...defaultProps} />);
        expect(screen.getByText(/Define Your Target Users/i)).toBeInTheDocument();
    });

    it('renders demographics form fields', () => {
        render(<UsersStage {...defaultProps} />);
        // Check labels are rendered as text
        expect(screen.getByText(/Age Range/i)).toBeInTheDocument();
        expect(screen.getByText(/Income Range/i)).toBeInTheDocument();
        expect(screen.getByText(/Gender/i)).toBeInTheDocument();
        expect(screen.getByText(/Location/i)).toBeInTheDocument();
        expect(screen.getByText('Education')).toBeInTheDocument();
        expect(screen.getByText('Occupation')).toBeInTheDocument();
    });

    it('calls onDemographicsChange when field changes', () => {
        render(<UsersStage {...defaultProps} />);
        const ageInput = screen.getByPlaceholderText(/25-45/i);
        fireEvent.change(ageInput, { target: { value: '30-40' } });
        expect(defaultProps.onDemographicsChange).toHaveBeenCalledWith({
            ...defaultDemographics,
            ageRange: '30-40',
        });
    });

    it('renders generate personas button', () => {
        render(<UsersStage {...defaultProps} />);
        expect(screen.getByRole('button', { name: /Generate Personas/i })).toBeInTheDocument();
    });

    it('calls onGeneratePersonas when button is clicked', () => {
        render(<UsersStage {...defaultProps} />);
        const button = screen.getByRole('button', { name: /Generate Personas/i });
        fireEvent.click(button);
        expect(defaultProps.onGeneratePersonas).toHaveBeenCalled();
    });

    it('displays generated personas', () => {
        const personas = [
            {
                id: '1',
                name: 'John Doe',
                age: "35",
                occupation: 'Engineer',
                backstory: 'A software engineer',
                attributes: {},
            },
        ];
        render(<UsersStage {...defaultProps} generatedPersonas={personas} />);
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText(/35.*Engineer/)).toBeInTheDocument();
    });

    it('calls onPersonasChange when persona is removed', () => {
        const personas = [
            {
                id: '1',
                name: 'John Doe',
                age: "35",
                occupation: 'Engineer',
                backstory: 'A software engineer',
                attributes: {},
            },
        ];
        render(<UsersStage {...defaultProps} generatedPersonas={personas} />);
        const removeButton = screen.getByRole('button', { name: /Remove/i });
        fireEvent.click(removeButton);
        expect(defaultProps.onPersonasChange).toHaveBeenCalledWith([]);
    });

    it('disables Next button when no personas', () => {
        render(<UsersStage {...defaultProps} />);
        const nextButton = screen.getByRole('button', { name: /Continue to Features/i });
        expect(nextButton).toBeDisabled();
    });

    it('enables Next button when personas exist', () => {
        const personas = [
            {
                id: '1',
                name: 'John Doe',
                age: "35",
                occupation: 'Engineer',
                backstory: 'A software engineer',
                attributes: {},
            },
        ];
        render(<UsersStage {...defaultProps} generatedPersonas={personas} />);
        const nextButton = screen.getByRole('button', { name: /Continue to Features/i });
        expect(nextButton).not.toBeDisabled();
    });

    it('calls onBack when Back button is clicked', () => {
        render(<UsersStage {...defaultProps} />);
        const backButton = screen.getByRole('button', { name: /Back/i });
        fireEvent.click(backButton);
        expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('shows loading spinner when generating', () => {
        render(<UsersStage {...defaultProps} isLoading={true} />);
        expect(screen.getByText(/Generating personas/i)).toBeInTheDocument();
    });
});
