/**
 * Input Component Tests
 *
 * Unit tests for the Input shared component.
 *
 * **Validates: Requirements 9.1, 9.4**
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../../shared/components/ui/Input';

describe('Input', () => {
    it('renders with placeholder', () => {
        render(<Input placeholder="Enter text" />);
        expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with label', () => {
        render(<Input label="Username" placeholder="Enter username" />);
        // Label is rendered as plain text, not associated via htmlFor
        expect(screen.getByText('Username')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    });

    it('calls onChange when typing', () => {
        const handleChange = jest.fn();
        render(<Input onChange={handleChange} placeholder="Type here" />);

        const input = screen.getByPlaceholderText('Type here');
        fireEvent.change(input, { target: { value: 'hello' } });

        expect(handleChange).toHaveBeenCalled();
    });

    it('displays error message', () => {
        render(<Input error="This field is required" />);
        expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('displays helper text', () => {
        render(<Input helperText="Enter your email address" />);
        expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('applies disabled state', () => {
        render(<Input disabled placeholder="Disabled input" />);
        expect(screen.getByPlaceholderText('Disabled input')).toBeDisabled();
    });

    it('applies different sizes', () => {
        const { rerender } = render(<Input size="sm" placeholder="Small" />);
        expect(screen.getByPlaceholderText('Small')).toBeInTheDocument();

        rerender(<Input size="md" placeholder="Medium" />);
        expect(screen.getByPlaceholderText('Medium')).toBeInTheDocument();

        rerender(<Input size="lg" placeholder="Large" />);
        expect(screen.getByPlaceholderText('Large')).toBeInTheDocument();
    });

    it('renders with left icon', () => {
        const LeftIcon = () => <span data-testid="left-icon">🔍</span>;
        render(<Input leftIcon={<LeftIcon />} placeholder="Search" />);

        expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
        const RightIcon = () => <span data-testid="right-icon">✓</span>;
        render(<Input rightIcon={<RightIcon />} placeholder="Valid" />);

        expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('renders full width when specified', () => {
        render(<Input fullWidth placeholder="Full width" />);
        // Check container has 100% width set
        const input = screen.getByPlaceholderText('Full width');
        const container = input.closest('div')?.parentElement;
        expect(container).toHaveStyle({ width: '100%' });
    });
});

