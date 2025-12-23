import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../../shared/theme';

/**
 * RateLimitSlider component props
 */
export interface RateLimitSliderProps {
    /** Current value (percentage 1-99) */
    value: number;
    /** Handler for value changes */
    onChange: (value: number) => void;
    /** Minimum value */
    min?: number;
    /** Maximum value */
    max?: number;
    /** Label text */
    label?: string;
    /** Helper text */
    helperText?: string;
    /** Whether the slider is disabled */
    disabled?: boolean;
}

/**
 * RateLimitSlider component for rate limit threshold selection.
 *
 * Shows a range input with percentage display.
 *
 * @example
 * ```tsx
 * <RateLimitSlider
 *   value={settings.rateLimitWarningThreshold}
 *   onChange={(value) => updateSetting('rateLimitWarningThreshold', value)}
 *   label="Usage Warning Threshold"
 *   helperText="Warn when token usage reaches this percentage"
 * />
 * ```
 *
 * **Validates: Requirements 13.5, 21.1**
 */
export function RateLimitSlider({
    value,
    onChange,
    min = 1,
    max = 99,
    label,
    helperText,
    disabled = false,
}: RateLimitSliderProps) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    };

    const valueStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        fontFamily: typography.fontFamily.mono,
        color: colors.accent,
        fontWeight: typography.fontWeight.medium,
    };

    const helperStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    };

    const sliderContainerStyle: React.CSSProperties = {
        position: 'relative',
        width: '100%',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
    };

    const sliderStyle: React.CSSProperties = {
        width: '100%',
        height: '4px',
        appearance: 'none',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.full,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
    };

    // Calculate percentage for the filled portion
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div style={containerStyle}>
            {(label || true) && (
                <div style={headerStyle}>
                    {label && <span style={labelStyle}>{label}</span>}
                    <span style={valueStyle}>{value}%</span>
                </div>
            )}

            {helperText && <div style={helperStyle}>{helperText}</div>}

            <div style={sliderContainerStyle}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value, 10))}
                    disabled={disabled}
                    style={{
                        ...sliderStyle,
                        background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${percentage}%, ${colors.background.tertiary} ${percentage}%, ${colors.background.tertiary} 100%)`,
                    }}
                />
            </div>

            {/* Min/Max labels */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: typography.fontSize.xs,
                    color: colors.text.muted,
                }}
            >
                <span>{min}%</span>
                <span>{max}%</span>
            </div>
        </div>
    );
}

export default RateLimitSlider;
