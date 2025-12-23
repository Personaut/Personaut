/**
 * Tests for UserBaseView component
 * 
 * Tests the persona management interface including
 * listing, creating, editing, and deleting personas.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserBaseView } from '../../../features/userbase/UserBaseView';

describe('UserBaseView', () => {
    const mockPostMessage = jest.fn();

    beforeEach(() => {
        mockPostMessage.mockClear();
    });

    it('renders without crashing', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);
        expect(screen.getByText('User Base')).toBeInTheDocument();
    });

    it('requests personas on mount', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);
        expect(mockPostMessage).toHaveBeenCalledWith({ type: 'get-personas' });
    });

    it('displays new persona button', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);
        expect(screen.getByText('+ New')).toBeInTheDocument();
    });

    it('displays search input', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);
        expect(screen.getByPlaceholderText('Search personas...')).toBeInTheDocument();
    });

    it('shows empty state when no personas', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);
        expect(screen.getByText('No personas yet')).toBeInTheDocument();
    });

    it('shows empty selection state', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);
        expect(screen.getByText('Select a persona or create a new one')).toBeInTheDocument();
    });

    it('can start creating new persona', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);

        fireEvent.click(screen.getByText('+ New'));

        // Should show form fields
        expect(screen.getByText('Persona Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g., The Power User')).toBeInTheDocument();
    });

    it('shows save and cancel buttons when editing', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);

        fireEvent.click(screen.getByText('+ New'));

        expect(screen.getByText('Save Persona')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows traits section when creating', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);

        fireEvent.click(screen.getByText('+ New'));

        expect(screen.getByText('Traits & Demographics')).toBeInTheDocument();
        expect(screen.getByText('+ Add Trait')).toBeInTheDocument();
    });

    it('can cancel persona creation', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);

        fireEvent.click(screen.getByText('+ New'));
        expect(screen.getByText('Persona Name')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Cancel'));

        // Should show empty state again
        expect(screen.getByText('Select a persona or create a new one')).toBeInTheDocument();
    });
});

describe('UserBaseView Persona List', () => {
    const mockPostMessage = jest.fn();

    it('handles search input', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);

        const searchInput = screen.getByPlaceholderText('Search personas...');
        fireEvent.change(searchInput, { target: { value: 'test' } });

        // With no personas, should show "No personas found"
        expect(screen.getByText('No personas found')).toBeInTheDocument();
    });
});

describe('UserBaseView Form Validation', () => {
    const mockPostMessage = jest.fn();

    it('shows error when saving without name', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);

        fireEvent.click(screen.getByText('+ New'));
        fireEvent.click(screen.getByText('Save Persona'));

        // Should show error indicator
        expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('can add traits', () => {
        render(<UserBaseView postMessage={mockPostMessage} />);

        fireEvent.click(screen.getByText('+ New'));
        fireEvent.click(screen.getByText('+ Add Trait'));

        // Should show trait inputs (may have multiple)
        const attributeInputs = screen.getAllByPlaceholderText('Attribute');
        const valueInputs = screen.getAllByPlaceholderText('Value');
        expect(attributeInputs.length).toBeGreaterThanOrEqual(1);
        expect(valueInputs.length).toBeGreaterThanOrEqual(1);
    });
});
