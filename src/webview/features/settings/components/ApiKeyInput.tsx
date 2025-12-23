import React, { useState, useRef } from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';

/**
 * ApiKeyInput component props
 */
export interface ApiKeyInputProps {
    /** Current value */
    value: string;
    /** Handler for value changes */
    onChange: (value: string) => void;
    /** Placeholder text */
    placeholder?: string;
    /** Custom class name */
    className?: string;
    /** Whether the input is disabled */
    disabled?: boolean;
}

/**
 * ApiKeyInput component for secure API key entry.
 *
 * Features:
 * - Password masking with show/hide toggle
 * - Clear button
 * - Focus handling
 *
 * @example
 * ```tsx
 * <ApiKeyInput
 *   value={apiKey}
 *   onChange={setApiKey}
 *   placeholder="Enter your API key"
 * />
 * ```
 *
 * **Validates: Requirements 13.5, 21.1**
 */
export function ApiKeyInput({
    value,
    onChange,
    placeholder = 'Enter API key',
    className = '',
    disabled = false,
}: ApiKeyInputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const hasValue = value.length > 0;

    const handleClear = () => {
        onChange('');
        inputRef.current?.focus();
    };

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        backgroundColor: colors.input.background,
        border: `1px solid ${isFocused ? colors.accent : colors.input.border}`,
        borderRadius: borderRadius.lg,
        padding: `${spacing.md} ${spacing.lg}`,
        paddingRight: '80px',
        fontSize: typography.fontSize.sm,
        color: colors.input.foreground,
        outline: 'none',
        transition: transitions.normal,
        opacity: disabled ? 0.5 : 1,
    };

    const buttonGroupStyle: React.CSSProperties = {
        position: 'absolute',
        right: spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
    };

    const iconButtonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: spacing.xs,
        color: colors.text.muted,
        display: 'flex',
        transition: transitions.fast,
    };

    return (
        <div style={containerStyle} className={className}>
            <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                style={inputStyle}
            />
            <div style={buttonGroupStyle}>
                {hasValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={iconButtonStyle}
                        title="Clear API key"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={iconButtonStyle}
                    title={showPassword ? 'Hide API key' : 'Show API key'}
                >
                    {showPassword ? (
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                    ) : (
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}

export default ApiKeyInput;
