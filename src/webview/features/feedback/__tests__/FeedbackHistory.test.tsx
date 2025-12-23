import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FeedbackHistory } from '../components/FeedbackHistoryComponent';
import { FeedbackEntry } from '../types';

describe('FeedbackHistory', () => {
    const mockEntries: FeedbackEntry[] = [
        {
            id: '1',
            personaId: 'p1',
            personaName: 'John Doe',
            rating: 4,
            comment: 'Great design, easy to navigate',
            timestamp: Date.now() - 86400000, // 1 day ago
        },
        {
            id: '2',
            personaId: 'p2',
            personaName: 'Jane Smith',
            rating: 3,
            comment: 'Could use better contrast',
            timestamp: Date.now() - 3600000, // 1 hour ago
        },
        {
            id: '3',
            personaId: 'p3',
            personaName: 'Bob Wilson',
            rating: 5,
            comment: 'Perfect implementation',
            timestamp: Date.now(),
        },
    ];

    const defaultProps = {
        entries: mockEntries,
        onDelete: jest.fn(),
        onView: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all feedback entries', () => {
        render(<FeedbackHistory {...defaultProps} />);
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('shows search input', () => {
        render(<FeedbackHistory {...defaultProps} />);
        expect(screen.getByPlaceholderText(/Search feedback/i)).toBeInTheDocument();
    });

    it('filters entries by search query', () => {
        render(<FeedbackHistory {...defaultProps} />);
        const searchInput = screen.getByPlaceholderText(/Search feedback/i);
        fireEvent.change(searchInput, { target: { value: 'John' } });

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });

    it('shows result count when searching', () => {
        render(<FeedbackHistory {...defaultProps} />);
        const searchInput = screen.getByPlaceholderText(/Search feedback/i);
        fireEvent.change(searchInput, { target: { value: 'design' } });

        expect(screen.getByText('1 result found')).toBeInTheDocument();
    });

    it('shows sort dropdown', () => {
        render(<FeedbackHistory {...defaultProps} />);
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('sorts by newest first by default', () => {
        render(<FeedbackHistory {...defaultProps} />);
        // Get all persona name entries and check order
        const entries = screen.getAllByText(/Doe|Smith|Wilson/);
        // Bob Wilson (newest) should appear before others
        expect(entries[0].textContent).toContain('Bob');
    });

    it('sorts by oldest first when selected', () => {
        render(<FeedbackHistory {...defaultProps} />);
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'oldest' } });

        const entries = screen.getAllByText(/Doe|Smith|Wilson/);
        // John Doe (oldest) should be first
        expect(entries[0].textContent).toContain('John');
    });

    it('sorts by highest rating when selected', () => {
        render(<FeedbackHistory {...defaultProps} />);
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'rating' } });

        const entries = screen.getAllByText(/Doe|Smith|Wilson/);
        // Bob Wilson (rating 5) should be first
        expect(entries[0].textContent).toContain('Bob');
    });

    it('calls onDelete when delete button clicked', () => {
        render(<FeedbackHistory {...defaultProps} />);
        const deleteButtons = screen.getAllByRole('button', { name: /🗑️/ });
        fireEvent.click(deleteButtons[0]);
        expect(defaultProps.onDelete).toHaveBeenCalled();
    });

    it('calls onView when entry clicked', () => {
        render(<FeedbackHistory {...defaultProps} />);
        const entry = screen.getByText('Great design, easy to navigate').closest('div');
        fireEvent.click(entry!);
        expect(defaultProps.onView).toHaveBeenCalled();
    });

    it('shows empty message when no entries', () => {
        render(<FeedbackHistory {...defaultProps} entries={[]} />);
        expect(screen.getByText('No feedback history yet')).toBeInTheDocument();
    });

    it('shows no matches message when search has no results', () => {
        render(<FeedbackHistory {...defaultProps} />);
        const searchInput = screen.getByPlaceholderText(/Search feedback/i);
        fireEvent.change(searchInput, { target: { value: 'xyz123' } });

        expect(screen.getByText('No matching feedback found')).toBeInTheDocument();
    });

    it('uses custom empty message', () => {
        render(
            <FeedbackHistory
                {...defaultProps}
                entries={[]}
                emptyMessage="Start generating feedback!"
            />
        );
        expect(screen.getByText('Start generating feedback!')).toBeInTheDocument();
    });
});
