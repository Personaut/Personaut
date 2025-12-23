import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PersonaMultiSelect } from '../components/PersonaMultiSelect';

describe('PersonaMultiSelect', () => {
    const mockPersonas = [
        { id: '1', name: 'John Doe', age: '35', occupation: 'Engineer' },
        { id: '2', name: 'Jane Smith', age: '28', occupation: 'Designer' },
        { id: '3', name: 'Bob Wilson', age: '42', occupation: 'Manager' },
        { id: '4', name: 'Alice Brown', age: '31', occupation: 'Developer' },
        { id: '5', name: 'Charlie White', age: '25', occupation: 'Analyst' },
        { id: '6', name: 'Diana Green', age: '38', occupation: 'Marketing' },
    ];

    const defaultProps = {
        personas: mockPersonas,
        selectedIds: [],
        onToggle: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all personas', () => {
        render(<PersonaMultiSelect {...defaultProps} />);
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('shows selection count', () => {
        render(<PersonaMultiSelect {...defaultProps} selectedIds={['1', '2']} />);
        expect(screen.getByText('2 / 5 selected')).toBeInTheDocument();
    });

    it('calls onToggle when persona clicked', () => {
        render(<PersonaMultiSelect {...defaultProps} />);
        const persona = screen.getByText('John Doe').closest('div[role="checkbox"]');
        fireEvent.click(persona!);
        expect(defaultProps.onToggle).toHaveBeenCalledWith('1');
    });

    it('highlights selected personas', () => {
        render(<PersonaMultiSelect {...defaultProps} selectedIds={['1']} />);
        const persona = screen.getByText('John Doe').closest('div[role="checkbox"]');
        expect(persona).toHaveAttribute('aria-checked', 'true');
    });

    it('limits selection to maxSelection', () => {
        const props = {
            ...defaultProps,
            selectedIds: ['1', '2', '3', '4', '5'],
            maxSelection: 5,
        };
        render(<PersonaMultiSelect {...props} />);

        // Click on unselected persona
        const unselectedPersona = screen.getByText('Diana Green').closest('div[role="checkbox"]');
        fireEvent.click(unselectedPersona!);

        // Should not call onToggle since at limit
        expect(defaultProps.onToggle).not.toHaveBeenCalled();
    });

    it('allows deselection when at limit', () => {
        const props = {
            ...defaultProps,
            selectedIds: ['1', '2', '3', '4', '5'],
        };
        render(<PersonaMultiSelect {...props} />);

        // Click on selected persona
        const selectedPersona = screen.getByText('John Doe').closest('div[role="checkbox"]');
        fireEvent.click(selectedPersona!);

        // Should call onToggle for deselection
        expect(defaultProps.onToggle).toHaveBeenCalledWith('1');
    });

    it('shows persona details', () => {
        render(<PersonaMultiSelect {...defaultProps} />);
        expect(screen.getByText('35 • Engineer')).toBeInTheDocument();
        expect(screen.getByText('28 • Designer')).toBeInTheDocument();
    });

    it('shows empty message when no personas', () => {
        render(<PersonaMultiSelect {...defaultProps} personas={[]} />);
        expect(screen.getByText(/No personas available/i)).toBeInTheDocument();
    });

    it('disables all interactions when disabled', () => {
        render(<PersonaMultiSelect {...defaultProps} disabled={true} />);
        const persona = screen.getByText('John Doe').closest('div[role="checkbox"]');
        fireEvent.click(persona!);
        expect(defaultProps.onToggle).not.toHaveBeenCalled();
    });

    it('shows warning color when at selection limit', () => {
        render(<PersonaMultiSelect {...defaultProps} selectedIds={['1', '2', '3', '4', '5']} />);
        expect(screen.getByText('5 / 5 selected')).toBeInTheDocument();
    });
});
