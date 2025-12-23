import React, { forwardRef, SelectHTMLAttributes, ReactNode } from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../theme';

/**
 * Select size
 */
export type SelectSize = 'sm' | 'md' | 'lg';

/**
 * Select option interface
 */
export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

/**
 * Select component props
 */
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    /**
     * Label text displayed above the select
     */
    label?: string;

    /**
     * Error message displayed below the select
     */
    error?: string;

    /**
     * Helper text displayed below the select
     */
    helperText?: string;

    /**
     * Size of the select
     * @default 'md'
     */
    size?: SelectSize;

    /**
     * Options for the select
     */
    options?: SelectOption[];

    /**
     * Placeholder text when no value is selected
     */
    placeholder?: string;

    /**
     * Whether the select should take full width
     * @default true
     */
    fullWidth?: boolean;

    /**
     * Custom CSS class name for the container
     */
    containerClassName?: string;

    /**
     * Custom CSS class name for the select
     */
    className?: string;

    /**
     * Child elements (alternative to options prop)
     */
    children?: ReactNode;
}

/**
 * Get size-specific styles
 */
const getSizeStyles = (size: SelectSize): React.CSSProperties => {
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
 * Select component with label and error support.
 *
 * A form component for selecting from a list of options.
 *
 * @example
 * ```tsx
 * // Using options prop
 * <Select
 *   label="Framework"
 *   options={[
 *     { value: 'react', label: 'React' },
 *     { value: 'vue', label: 'Vue' },
 *   ]}
 *   value={framework}
 *   onChange={(e) => setFramework(e.target.value)}
 * />
 *
 * // Using children
 * <Select label="Country" placeholder="Select a country">
 *   <option value="us">United States</option>
 *   <option value="uk">United Kingdom</option>
 * </Select>
 * ```
 *
 * **Validates: Requirements 3.2, 21.1**
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            label,
            error,
            helperText,
            size = 'md',
            options,
            placeholder,
            fullWidth = true,
            disabled,
            containerClassName = '',
            className = '',
            style,
            children,
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

        // Select styles
        const selectStyle: React.CSSProperties = {
            width: '100%',
            fontFamily: typography.fontFamily.sans,
            backgroundColor: colors.dropdown.background,
            color: colors.dropdown.foreground,
            border: `1px solid ${hasError ? colors.error : colors.dropdown.border}`,
            borderRadius: borderRadius.md,
            outline: 'none',
            transition: transitions.normal,
            cursor: disabled ? 'not-allowed' : 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: `right ${spacing.sm} center`,
            paddingRight: '32px',
            ...sizeStyles,
            ...(disabled && { opacity: 0.5 }),
            ...style,
        };

        // Error/helper text styles
        const messageStyle: React.CSSProperties = {
            fontSize: typography.fontSize.sm,
            color: hasError ? colors.error : colors.text.muted,
            marginTop: spacing.xs,
        };

        return (
            <div className={containerClassName} style={containerStyle}>
                {label && <label style={labelStyle}>{label}</label>}
                <select
                    ref={ref}
                    disabled={disabled}
                    className={className}
                    style={selectStyle}
                    aria-invalid={hasError}
                    aria-describedby={error ? `${props.id}-error` : undefined}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options
                        ? options.map((option) => (
                            <option key={option.value} value={option.value} disabled={option.disabled}>
                                {option.label}
                            </option>
                        ))
                        : children}
                </select>
                {(error || helperText) && (
                    <span id={error ? `${props.id}-error` : undefined} style={messageStyle}>
                        {error || helperText}
                    </span>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

export default Select;
