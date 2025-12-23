import React, { forwardRef, TextareaHTMLAttributes, useEffect, useRef } from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../theme';

/**
 * TextArea component props
 */
export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    /**
     * Label text displayed above the textarea
     */
    label?: string;

    /**
     * Error message displayed below the textarea
     */
    error?: string;

    /**
     * Helper text displayed below the textarea
     */
    helperText?: string;

    /**
     * Whether the textarea should auto-resize based on content
     * @default false
     */
    autoResize?: boolean;

    /**
     * Minimum number of rows
     * @default 3
     */
    minRows?: number;

    /**
     * Maximum number of rows (for auto-resize)
     */
    maxRows?: number;

    /**
     * Whether the textarea should take full width
     * @default true
     */
    fullWidth?: boolean;

    /**
     * Custom CSS class name for the container
     */
    containerClassName?: string;

    /**
     * Custom CSS class name for the textarea
     */
    className?: string;
}

/**
 * TextArea component with label, error, and auto-resize support.
 *
 * A multi-line text input component for longer content.
 *
 * @example
 * ```tsx
 * // Basic textarea
 * <TextArea
 *   label="Description"
 *   placeholder="Enter a description..."
 *   value={description}
 *   onChange={(e) => setDescription(e.target.value)}
 * />
 *
 * // Auto-resizing textarea
 * <TextArea
 *   label="Notes"
 *   autoResize
 *   minRows={2}
 *   maxRows={10}
 *   value={notes}
 *   onChange={(e) => setNotes(e.target.value)}
 * />
 * ```
 *
 * **Validates: Requirements 3.2, 21.1**
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    (
        {
            label,
            error,
            helperText,
            autoResize = false,
            minRows = 3,
            maxRows,
            fullWidth = true,
            disabled,
            containerClassName = '',
            className = '',
            style,
            value,
            onChange,
            ...props
        },
        ref
    ) => {
        const internalRef = useRef<HTMLTextAreaElement>(null);
        const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;
        const hasError = Boolean(error);

        // Auto-resize effect
        useEffect(() => {
            if (autoResize && textareaRef.current) {
                const textarea = textareaRef.current;
                textarea.style.height = 'auto';
                const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
                const minHeight = minRows * lineHeight;
                const maxHeight = maxRows ? maxRows * lineHeight : Infinity;
                const scrollHeight = textarea.scrollHeight;
                textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
            }
        }, [value, autoResize, minRows, maxRows]);

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

        // Textarea styles
        const textareaStyle: React.CSSProperties = {
            width: '100%',
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.fontSize.md,
            lineHeight: typography.lineHeight.normal,
            backgroundColor: colors.input.background,
            color: colors.input.foreground,
            border: `1px solid ${hasError ? colors.error : colors.input.border}`,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            outline: 'none',
            transition: transitions.normal,
            resize: autoResize ? 'none' : 'vertical',
            minHeight: `${minRows * 20}px`,
            ...(disabled && {
                opacity: 0.5,
                cursor: 'not-allowed',
            }),
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
                <textarea
                    ref={textareaRef}
                    disabled={disabled}
                    className={className}
                    style={textareaStyle}
                    rows={minRows}
                    value={value}
                    onChange={onChange}
                    aria-invalid={hasError}
                    aria-describedby={error ? `${props.id}-error` : undefined}
                    {...props}
                />
                {(error || helperText) && (
                    <span id={error ? `${props.id}-error` : undefined} style={messageStyle}>
                        {error || helperText}
                    </span>
                )}
            </div>
        );
    }
);

TextArea.displayName = 'TextArea';

export default TextArea;
