import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../theme';

/**
 * Button variant
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

/**
 * Button size
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button component props
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * Visual variant of the button
     * @default 'primary'
     */
    variant?: ButtonVariant;

    /**
     * Size of the button
     * @default 'md'
     */
    size?: ButtonSize;

    /**
     * Whether the button is in loading state
     * @default false
     */
    loading?: boolean;

    /**
     * Icon to display before the text
     */
    leftIcon?: ReactNode;

    /**
     * Icon to display after the text
     */
    rightIcon?: ReactNode;

    /**
     * Whether the button should take full width
     * @default false
     */
    fullWidth?: boolean;

    /**
     * Custom CSS class name
     */
    className?: string;

    /**
     * Button content
     */
    children?: ReactNode;
}

/**
 * Get variant-specific styles
 */
const getVariantStyles = (variant: ButtonVariant): React.CSSProperties => {
    switch (variant) {
        case 'primary':
            return {
                backgroundColor: colors.primary,
                color: colors.primaryForeground,
                border: 'none',
            };
        case 'secondary':
            return {
                backgroundColor: 'transparent',
                color: colors.text.primary,
                border: `1px solid ${colors.border}`,
            };
        case 'ghost':
            return {
                backgroundColor: 'transparent',
                color: colors.text.primary,
                border: '1px solid transparent',
            };
        case 'danger':
            return {
                backgroundColor: colors.error,
                color: '#ffffff',
                border: 'none',
            };
        case 'success':
            return {
                backgroundColor: colors.success,
                color: '#1E1E1E',
                border: 'none',
            };
    }
};

/**
 * Get size-specific styles
 */
const getSizeStyles = (size: ButtonSize): React.CSSProperties => {
    switch (size) {
        case 'sm':
            return {
                padding: `${spacing.xs} ${spacing.md}`,
                fontSize: typography.fontSize.sm,
                minHeight: '28px',
            };
        case 'lg':
            return {
                padding: `${spacing.md} ${spacing.xl}`,
                fontSize: typography.fontSize.lg,
                minHeight: '40px',
            };
        case 'md':
        default:
            return {
                padding: `${spacing.sm} ${spacing.lg}`,
                fontSize: typography.fontSize.md,
                minHeight: '32px',
            };
    }
};

/**
 * Simple loading spinner component
 */
const LoadingSpinner = ({ size = 14 }: { size?: number }) => (
    <>
        <style>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `}</style>
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'spin 1s linear infinite' }}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    </>
);

/**
 * Button component with multiple variants, sizes, and states.
 *
 * A fundamental UI component for triggering actions. Supports loading states,
 * icons, and various visual variants.
 *
 * @example
 * ```tsx
 * // Primary button
 * <Button onClick={handleSubmit}>Submit</Button>
 *
 * // Secondary button with icon
 * <Button variant="secondary" leftIcon={<PlusIcon />}>
 *   Add Item
 * </Button>
 *
 * // Loading button
 * <Button loading disabled>
 *   Saving...
 * </Button>
 *
 * // Danger button
 * <Button variant="danger" onClick={handleDelete}>
 *   Delete
 * </Button>
 * ```
 *
 * **Validates: Requirements 3.2, 3.5, 20.1, 20.2**
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            loading = false,
            leftIcon,
            rightIcon,
            fullWidth = false,
            disabled,
            className = '',
            style,
            children,
            ...props
        },
        ref
    ) => {
        const variantStyles = getVariantStyles(variant);
        const sizeStyles = getSizeStyles(size);

        const buttonStyle: React.CSSProperties = {
            // Base styles
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            fontFamily: typography.fontFamily.sans,
            fontWeight: typography.fontWeight.medium,
            borderRadius: borderRadius.md,
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
            transition: transitions.normal,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            userSelect: 'none',

            // Variant styles
            ...variantStyles,

            // Size styles
            ...sizeStyles,

            // Full width
            ...(fullWidth && { width: '100%' }),

            // Disabled/loading state
            ...((disabled || loading) && {
                opacity: 0.5,
                pointerEvents: 'none',
            }),

            // Custom styles
            ...style,
        };

        // Icon size based on button size
        const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;

        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={className}
                style={buttonStyle}
                {...props}
            >
                {loading ? (
                    <LoadingSpinner size={iconSize} />
                ) : leftIcon ? (
                    <span style={{ display: 'flex', alignItems: 'center' }}>{leftIcon}</span>
                ) : null}
                {children}
                {!loading && rightIcon && (
                    <span style={{ display: 'flex', alignItems: 'center' }}>{rightIcon}</span>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

/**
 * IconButton component for icon-only buttons.
 */
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
    /**
     * The icon to display
     */
    icon: ReactNode;

    /**
     * Accessible label for the button
     */
    'aria-label': string;
}

/**
 * Icon-only button component.
 *
 * @example
 * ```tsx
 * <IconButton
 *   icon={<TrashIcon />}
 *   aria-label="Delete item"
 *   variant="ghost"
 *   onClick={handleDelete}
 * />
 * ```
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ icon, size = 'md', style, ...props }, ref) => {
        // Make padding equal for square appearance
        const padding = size === 'sm' ? spacing.xs : size === 'lg' ? spacing.md : spacing.sm;

        return (
            <Button
                ref={ref}
                size={size}
                style={{
                    padding,
                    minWidth: 'auto',
                    aspectRatio: '1',
                    ...style,
                }}
                {...props}
            >
                {icon}
            </Button>
        );
    }
);

IconButton.displayName = 'IconButton';

export default Button;
