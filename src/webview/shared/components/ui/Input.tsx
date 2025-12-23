import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../theme';

/**
 * Input size
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Input component props
 */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    /**
     * Label text displayed above the input
     */
    label?: string;

    /**
     * Error message displayed below the input
     */
    error?: string;

    /**
     * Helper text displayed below the input
     */
    helperText?: string;

    /**
     * Size of the input
     * @default 'md'
     */
    size?: InputSize;

    /**
     * Icon to display at the start of the input
     */
    leftIcon?: ReactNode;

    /**
     * Icon to display at the end of the input
     */
    rightIcon?: ReactNode;

    /**
     * Whether the input should take full width
     * @default true
     */
    fullWidth?: boolean;

    /**
     * Custom CSS class name for the container
     */
    containerClassName?: string;

    /**
     * Custom CSS class name for the input
     */
    className?: string;
}

/**
 * Get size-specific styles
 */
const getSizeStyles = (size: InputSize): React.CSSProperties => {
    switch (size) {
        case 'sm':
            return {
                padding: `${spacing.xs} ${spacing.sm}`,
                fontSize: typography.fontSize.sm,
                minHeight: '28px',
            };
        case 'lg':
            return {
                padding: `${spacing.md} ${spacing.lg}`,
                fontSize: typography.fontSize.lg,
                minHeight: '40px',
            };
        case 'md':
        default:
            return {
                padding: `${spacing.sm} ${spacing.md}`,
                fontSize: typography.fontSize.md,
                minHeight: '32px',
            };
    }
};

/**
 * Input component with label, error, and helper text support.
 *
 * A fundamental form component for text input. Supports various states
 * and optional icons.
 *
 * @example
 * ```tsx
 * // Basic input with label
 * <Input
 *   label="Email"
 *   placeholder="Enter your email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 * />
 *
 * // Input with error
 * <Input
 *   label="Username"
 *   value={username}
 *   error="Username is required"
 * />
 *
 * // Input with icon
 * <Input
 *   placeholder="Search..."
 *   leftIcon={<SearchIcon />}
 * />
 * ```
 *
 * **Validates: Requirements 3.2, 21.1, 21.4**
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            error,
            helperText,
            size = 'md',
            leftIcon,
            rightIcon,
            fullWidth = true,
            disabled,
            containerClassName = '',
            className = '',
            style,
            ...props
        },
        ref
    ) => {
        const sizeStyles = getSizeStyles(size);
        const hasError = Boolean(error);

        // Container styles
        const containerStyle: React.CSSProperties = {
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.xs,
            width: fullWidth ? '100%' : 'auto',
        };

        // Label styles
        const labelStyle: React.CSSProperties = {
            display: 'block',
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: colors.text.muted,
            marginBottom: spacing.xs,
        };

        // Input wrapper styles (for icons)
        const wrapperStyle: React.CSSProperties = {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
        };

        // Input styles
        const inputStyle: React.CSSProperties = {
            // Base styles
            width: '100%',
            fontFamily: typography.fontFamily.sans,
            backgroundColor: colors.input.background,
            color: colors.input.foreground,
            border: `1px solid ${hasError ? colors.error : colors.input.border}`,
            borderRadius: borderRadius.md,
            outline: 'none',
            transition: transitions.normal,

            // Size styles
            ...sizeStyles,

            // Icon padding adjustments
            ...(leftIcon && { paddingLeft: `calc(${sizeStyles.padding} + 20px)` }),
            ...(rightIcon && { paddingRight: `calc(${sizeStyles.padding} + 20px)` }),

            // Disabled state
            ...(disabled && {
                opacity: 0.5,
                cursor: 'not-allowed',
            }),

            // Custom styles
            ...style,
        };

        // Icon container styles
        const iconStyle = (position: 'left' | 'right'): React.CSSProperties => ({
            position: 'absolute',
            [position]: spacing.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text.muted,
            pointerEvents: 'none',
        });

        // Error/helper text styles
        const messageStyle: React.CSSProperties = {
            fontSize: typography.fontSize.sm,
            color: hasError ? colors.error : colors.text.muted,
            marginTop: spacing.xs,
        };

        return (
            <div className={containerClassName} style={containerStyle}>
                {label && <label style={labelStyle}>{label}</label>}
                <div style={wrapperStyle}>
                    {leftIcon && <span style={iconStyle('left')}>{leftIcon}</span>}
                    <input
                        ref={ref}
                        disabled={disabled}
                        className={className}
                        style={inputStyle}
                        aria-invalid={hasError}
                        aria-describedby={error ? `${props.id}-error` : undefined}
                        {...props}
                    />
                    {rightIcon && <span style={iconStyle('right')}>{rightIcon}</span>}
                </div>
                {(error || helperText) && (
                    <span id={error ? `${props.id}-error` : undefined} style={messageStyle}>
                        {error || helperText}
                    </span>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
