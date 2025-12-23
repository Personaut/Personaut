import React, { forwardRef, InputHTMLAttributes } from 'react';
import { colors, spacing, typography, transitions } from '../../theme';

/**
 * Checkbox component props
 */
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
    /**
     * Label text displayed next to the checkbox
     */
    label?: string;

    /**
     * Whether the checkbox is in indeterminate state
     * @default false
     */
    indeterminate?: boolean;

    /**
     * Size of the checkbox
     * @default 'md'
     */
    size?: 'sm' | 'md' | 'lg';

    /**
     * Custom CSS class name for the container
     */
    containerClassName?: string;

    /**
     * Custom CSS class name for the checkbox
     */
    className?: string;
}

/**
 * Get size in pixels
 */
const getSizePixels = (size: 'sm' | 'md' | 'lg'): number => {
    switch (size) {
        case 'sm':
            return 14;
        case 'lg':
            return 20;
        case 'md':
        default:
            return 16;
    }
};

/**
 * Checkbox component with label support.
 *
 * A form component for boolean selection.
 *
 * @example
 * ```tsx
 * // Basic checkbox
 * <Checkbox
 *   label="I agree to the terms"
 *   checked={agreed}
 *   onChange={(e) => setAgreed(e.target.checked)}
 * />
 *
 * // Indeterminate checkbox
 * <Checkbox
 *   label="Select all"
 *   checked={allSelected}
 *   indeterminate={someSelected && !allSelected}
 *   onChange={handleSelectAll}
 * />
 * ```
 *
 * **Validates: Requirements 3.2**
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    (
        {
            label,
            indeterminate = false,
            size = 'md',
            disabled,
            containerClassName = '',
            className = '',
            style,
            ...props
        },
        ref
    ) => {
        const sizePixels = getSizePixels(size);

        // Set indeterminate state via ref
        React.useEffect(() => {
            if (ref && 'current' in ref && ref.current) {
                ref.current.indeterminate = indeterminate;
            }
        }, [ref, indeterminate]);

        // Container styles
        const containerStyle: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.sm,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
        };

        // Checkbox styles
        const checkboxStyle: React.CSSProperties = {
            width: sizePixels,
            height: sizePixels,
            cursor: disabled ? 'not-allowed' : 'pointer',
            accentColor: colors.accent,
            margin: 0,
            ...style,
        };

        // Label styles
        const labelStyle: React.CSSProperties = {
            fontSize: size === 'sm' ? typography.fontSize.sm : typography.fontSize.md,
            color: colors.text.primary,
            userSelect: 'none',
            transition: transitions.normal,
        };

        return (
            <label className={containerClassName} style={containerStyle}>
                <input
                    ref={ref}
                    type="checkbox"
                    disabled={disabled}
                    className={className}
                    style={checkboxStyle}
                    {...props}
                />
                {label && <span style={labelStyle}>{label}</span>}
            </label>
        );
    }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
