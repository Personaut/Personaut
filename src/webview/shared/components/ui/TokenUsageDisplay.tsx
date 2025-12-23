import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../theme';

/**
 * Token usage status levels for color coding
 */
export type TokenUsageStatus = 'safe' | 'warning' | 'danger' | 'exceeded';

/**
 * TokenUsageDisplay props
 */
export interface TokenUsageDisplayProps {
    /** Total tokens used */
    totalTokens: number;
    /** Input tokens used */
    inputTokens: number;
    /** Output tokens used */
    outputTokens: number;
    /** Token limit */
    limit?: number;
    /** Whether to show detailed breakdown */
    showDetails?: boolean;
    /** Compact mode for header display */
    compact?: boolean;
    /** Custom class name */
    className?: string;
    /** Warning threshold percentage (default 80) */
    warningThreshold?: number;
}

/**
 * Get the status based on percentage used
 */
function getUsageStatus(percentUsed: number, warningThreshold: number = 80): TokenUsageStatus {
    if (percentUsed >= 100) return 'exceeded';
    if (percentUsed >= warningThreshold) return 'danger';
    if (percentUsed >= 50) return 'warning';
    return 'safe';
}

/**
 * Get color based on status
 * Validates: Requirements 6.4 - Color coding by percentage
 */
function getStatusColor(status: TokenUsageStatus): string {
    switch (status) {
        case 'safe':
            return colors.success;
        case 'warning':
            return colors.warning;
        case 'danger':
            return '#FF8C00'; // Orange
        case 'exceeded':
            return colors.error;
        default:
            return colors.success;
    }
}

/**
 * Format number with commas for readability
 */
function formatNumber(num: number): string {
    return num.toLocaleString();
}

/**
 * TokenUsageDisplay Component
 * 
 * Displays token usage with color-coded status indicator.
 * Shows total tokens, percentage, and optional input/output breakdown.
 * 
 * Color coding:
 * - Green (0-50%): Safe usage
 * - Yellow (50-80%): Moderate usage
 * - Orange (80-100%): Warning threshold
 * - Red (≥100%): Limit exceeded
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function TokenUsageDisplay({
    totalTokens,
    inputTokens,
    outputTokens,
    limit = 100000,
    showDetails = false,
    compact = false,
    className,
    warningThreshold = 80,
}: TokenUsageDisplayProps) {
    const percentUsed = limit > 0 ? Math.round((totalTokens / limit) * 100) : 0;
    const remaining = Math.max(0, limit - totalTokens);
    const status = getUsageStatus(percentUsed, warningThreshold);
    const statusColor = getStatusColor(status);

    const containerStyles: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        padding: compact ? `${spacing.xs} ${spacing.sm}` : spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        transition: transitions.normal,
    };

    const progressBarContainerStyles: React.CSSProperties = {
        flex: compact ? 'none' : 1,
        width: compact ? '60px' : 'auto',
        height: '6px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    };

    const progressBarStyles: React.CSSProperties = {
        height: '100%',
        width: `${Math.min(100, percentUsed)}%`,
        backgroundColor: statusColor,
        borderRadius: borderRadius.full,
        transition: transitions.normal,
    };

    const textStyles: React.CSSProperties = {
        fontSize: compact ? typography.fontSize.xs : typography.fontSize.sm,
        color: colors.text.secondary,
        fontWeight: typography.fontWeight.medium,
        whiteSpace: 'nowrap',
    };

    const percentStyles: React.CSSProperties = {
        ...textStyles,
        color: statusColor,
        fontWeight: typography.fontWeight.semibold,
    };

    const tooltipContent = `Input: ${formatNumber(inputTokens)}\nOutput: ${formatNumber(outputTokens)}\nRemaining: ${formatNumber(remaining)}`;

    if (compact) {
        return (
            <div
                className={className}
                style={containerStyles}
                title={tooltipContent}
                role="status"
                aria-label={`Token usage: ${formatNumber(totalTokens)} of ${formatNumber(limit)} (${percentUsed}%)`}
            >
                <div style={progressBarContainerStyles}>
                    <div style={progressBarStyles} />
                </div>
                <span style={percentStyles}>{percentUsed}%</span>
            </div>
        );
    }

    return (
        <div
            className={className}
            style={{
                ...containerStyles,
                flexDirection: 'column',
                alignItems: 'stretch',
            }}
            role="status"
            aria-label={`Token usage: ${formatNumber(totalTokens)} of ${formatNumber(limit)} (${percentUsed}%)`}
        >
            {/* Header with total and percentage */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={textStyles}>
                    <strong>{formatNumber(totalTokens)}</strong> / {formatNumber(limit)} tokens
                </span>
                <span style={percentStyles}>{percentUsed}%</span>
            </div>

            {/* Progress bar */}
            <div style={progressBarContainerStyles}>
                <div style={progressBarStyles} />
            </div>

            {/* Detailed breakdown */}
            {showDetails && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: typography.fontSize.xs,
                        color: colors.text.muted,
                        marginTop: spacing.xs,
                    }}
                >
                    <span>↑ In: {formatNumber(inputTokens)}</span>
                    <span>↓ Out: {formatNumber(outputTokens)}</span>
                    <span>◐ Left: {formatNumber(remaining)}</span>
                </div>
            )}
        </div>
    );
}

export default TokenUsageDisplay;
