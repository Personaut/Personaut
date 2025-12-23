/**
 * Button Component Tests
 *
 * Unit tests for the Button shared component.
 *
 * **Validates: Requirements 9.1, 9.4**
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, IconButton } from '../../shared/components/ui/Button';

describe('Button', () => {
    it('renders with text content', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
        const handleClick = jest.fn();
        render(<Button onClick={handleClick}>Click me</Button>);

        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
        const handleClick = jest.fn();
        render(<Button onClick={handleClick} disabled>Click me</Button>);

        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('shows loading state', () => {
        render(<Button loading>Submit</Button>);

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });

    it('applies different variants', () => {
        const { rerender } = render(<Button variant="primary">Primary</Button>);
        expect(screen.getByRole('button')).toBeInTheDocument();

        rerender(<Button variant="secondary">Secondary</Button>);
        expect(screen.getByRole('button')).toBeInTheDocument();

        rerender(<Button variant="danger">Danger</Button>);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('applies different sizes', () => {
        const { rerender } = render(<Button size="sm">Small</Button>);
        expect(screen.getByRole('button')).toBeInTheDocument();

        rerender(<Button size="md">Medium</Button>);
        expect(screen.getByRole('button')).toBeInTheDocument();

        rerender(<Button size="lg">Large</Button>);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with left and right icons', () => {
        const LeftIcon = () => <span data-testid="left-icon">←</span>;
        const RightIcon = () => <span data-testid="right-icon">→</span>;

        render(
            <Button leftIcon={<LeftIcon />} rightIcon={<RightIcon />}>
                With Icons
            </Button>
        );

        expect(screen.getByTestId('left-icon')).toBeInTheDocument();
        expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('renders full width when specified', () => {
        render(<Button fullWidth>Full Width</Button>);
        const button = screen.getByRole('button');
        expect(button.style.width).toBe('100%');
    });
});

describe('IconButton', () => {
    it('renders with icon', () => {
        const Icon = () => <span data-testid="icon">★</span>;
        render(<IconButton icon={<Icon />} aria-label="Star" />);

        expect(screen.getByRole('button', { name: /star/i })).toBeInTheDocument();
        expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
        const handleClick = jest.fn();
        const Icon = () => <span>★</span>;
        render(<IconButton icon={<Icon />} aria-label="Star" onClick={handleClick} />);

        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });
});
