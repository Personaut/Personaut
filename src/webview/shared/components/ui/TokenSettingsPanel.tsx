import React, { useState, useCallback } from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../theme';
import { Input } from './Input';
import { Button } from './Button';

/**
 * TokenSettingsPanel props
 */
export interface TokenSettingsPanelProps {
    /** Current token limit */
    tokenLimit: number;
    /** Current warning threshold percentage */
    warningThreshold: number;
    /** Callback when settings change */
    onSettingsChange: (settings: { tokenLimit: number; warningThreshold: number }) => void;
    /** Callback when reset is clicked */
    onReset?: () => void;
    /** Whether settings are being saved */
    isSaving?: boolean;
}

/**
 * Default recommended token limit
 */
const DEFAULT_TOKEN_LIMIT = 100000;
const MIN_TOKEN_LIMIT = 0;
const MAX_TOKEN_LIMIT = 1000000;
const MIN_WARNING_THRESHOLD = 0;
const MAX_WARNING_THRESHOLD = 100;

/**
 * Threshold markers for visual reference
 */
const THRESHOLD_MARKERS = [25, 50, 75, 100];

/**
 * TokenSettingsPanel Component
 * 
 * Provides controls for configuring token limits and warning thresholds.
 * Includes:
 * - Slider for warning threshold (0-100%)
 * - Input field for hard limit (0-1,000,000)
 * - Visual markers at key percentages
 * - Default recommendation display
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.1.1 - 3.1.5
 */
export function TokenSettingsPanel({
    tokenLimit,
    warningThreshold,
    onSettingsChange,
    onReset,
    isSaving = false,
}: TokenSettingsPanelProps) {
    const [localLimit, setLocalLimit] = useState(tokenLimit);
    const [localThreshold, setLocalThreshold] = useState(warningThreshold);

    const handleLimitChange = useCallback((value: string) => {
        const numValue = parseInt(value, 10) || 0;
        const clampedValue = Math.max(MIN_TOKEN_LIMIT, Math.min(MAX_TOKEN_LIMIT, numValue));
        setLocalLimit(clampedValue);
    }, []);

    const handleThresholdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const numValue = parseInt(e.target.value, 10) || 0;
        const clampedValue = Math.max(MIN_WARNING_THRESHOLD, Math.min(MAX_WARNING_THRESHOLD, numValue));
        setLocalThreshold(clampedValue);
    }, []);

    const handleSave = useCallback(() => {
        onSettingsChange({ tokenLimit: localLimit, warningThreshold: localThreshold });
    }, [localLimit, localThreshold, onSettingsChange]);

    const hasChanges = localLimit !== tokenLimit || localThreshold !== warningThreshold;

    const containerStyles: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.lg,
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border}`,
    };

    const sectionStyles: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
    };

    const labelStyles: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.primary,
    };

    const descriptionStyles: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    };

    const sliderContainerStyles: React.CSSProperties = {
        position: 'relative',
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    };

    const sliderStyles: React.CSSProperties = {
        width: '100%',
        height: '8px',
        borderRadius: borderRadius.full,
        appearance: 'none',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        cursor: 'pointer',
        outline: 'none',
    };

    const markerContainerStyles: React.CSSProperties = {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    };

    const valueDisplayStyles: React.CSSProperties = {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.primary,
        textAlign: 'right',
    };

    const recommendationStyles: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        backgroundColor: 'rgba(108, 182, 255, 0.1)',
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
        color: colors.info,
    };

    return (
        <div style={containerStyles}>
            <h3 style={{ ...labelStyles, fontSize: typography.fontSize.lg, marginBottom: spacing.xs }}>
                Token Monitoring Settings
            </h3>

            {/* Warning Threshold Section */}
            <div style={sectionStyles}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="warning-threshold" style={labelStyles}>
                        Warning Threshold
                    </label>
                    <span style={valueDisplayStyles}>{localThreshold}%</span>
                </div>
                <p style={descriptionStyles}>
                    Show warning when token usage reaches this percentage of the limit.
                </p>
                <div style={sliderContainerStyles}>
                    <input
                        id="warning-threshold"
                        type="range"
                        min={MIN_WARNING_THRESHOLD}
                        max={MAX_WARNING_THRESHOLD}
                        value={localThreshold}
                        onChange={handleThresholdChange}
                        style={sliderStyles}
                        aria-valuemin={MIN_WARNING_THRESHOLD}
                        aria-valuemax={MAX_WARNING_THRESHOLD}
                        aria-valuenow={localThreshold}
                        aria-label="Warning threshold percentage"
                    />
                    <div style={markerContainerStyles}>
                        {THRESHOLD_MARKERS.map((marker) => (
                            <span
                                key={marker}
                                style={{
                                    color: localThreshold >= marker ? colors.primary : colors.text.muted,
                                    transition: transitions.fast,
                                }}
                            >
                                {marker}%
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Token Limit Section */}
            <div style={sectionStyles}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="token-limit" style={labelStyles}>
                        Token Limit
                    </label>
                    <span style={valueDisplayStyles}>{localLimit.toLocaleString()}</span>
                </div>
                <p style={descriptionStyles}>
                    Maximum tokens allowed before blocking new requests (0 - 1,000,000).
                </p>
                <Input
                    id="token-limit"
                    type="number"
                    value={localLimit.toString()}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    min={MIN_TOKEN_LIMIT}
                    max={MAX_TOKEN_LIMIT}
                    aria-label="Token limit"
                />
            </div>

            {/* Recommendation */}
            <div style={recommendationStyles}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Recommended default: {DEFAULT_TOKEN_LIMIT.toLocaleString()} tokens</span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
                {onReset && (
                    <Button variant="secondary" onClick={onReset}>
                        Reset Usage
                    </Button>
                )}
                <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </div>
    );
}

export default TokenSettingsPanel;
