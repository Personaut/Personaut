import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../theme';

/**
 * Feature usage data for history display
 */
export interface FeatureUsage {
    /** Feature name */
    feature: string;
    /** Display name for the feature */
    displayName: string;
    /** Input tokens used by this feature */
    inputTokens: number;
    /** Output tokens used by this feature */
    outputTokens: number;
    /** Total tokens used by this feature */
    totalTokens: number;
    /** Percentage of total usage */
    percentage?: number;
}

/**
 * TokenUsageHistory props
 */
export interface TokenUsageHistoryProps {
    /** Usage data for each feature */
    features: FeatureUsage[];
    /** Total tokens across all features */
    totalTokens?: number;
    /** Whether to show the percentage column */
    showPercentage?: boolean;
    /** Custom class name */
    className?: string;
}

/**
 * Format number with commas for readability
 */
function formatNumber(num: number): string {
    return num.toLocaleString();
}

/**
 * Get feature icon based on feature name
 */
function getFeatureIcon(feature: string): React.ReactNode {
    const iconProps = { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2 };

    switch (feature.toLowerCase()) {
        case 'chat':
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            );
        case 'build':
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            );
        case 'feedback':
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
            );
        case 'personas':
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            );
        default:
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
            );
    }
}

/**
 * TokenUsageHistory Component
 * 
 * Displays a table of token usage broken down by feature.
 * Shows input, output, and total tokens for each feature,
 * sorted by total consumption (highest first).
 * 
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
export function TokenUsageHistory({
    features,
    totalTokens,
    showPercentage = true,
    className,
}: TokenUsageHistoryProps) {
    // Sort features by total tokens (highest first)
    const sortedFeatures = [...features].sort((a, b) => b.totalTokens - a.totalTokens);

    // Calculate total if not provided
    const calculatedTotal = totalTokens ?? features.reduce((sum, f) => sum + f.totalTokens, 0);

    // Calculate percentages
    const featuresWithPercentage = sortedFeatures.map((f) => ({
        ...f,
        percentage: calculatedTotal > 0 ? Math.round((f.totalTokens / calculatedTotal) * 100) : 0,
    }));

    const containerStyles: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border}`,
    };

    const headerStyles: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: spacing.sm,
        borderBottom: `1px solid ${colors.border}`,
    };

    const titleStyles: React.CSSProperties = {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
    };

    const totalStyles: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    };

    const tableStyles: React.CSSProperties = {
        width: '100%',
        borderCollapse: 'collapse',
    };

    const thStyles: React.CSSProperties = {
        textAlign: 'left',
        padding: `${spacing.sm} ${spacing.xs}`,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    };

    const tdStyles: React.CSSProperties = {
        padding: `${spacing.sm} ${spacing.xs}`,
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        borderTop: `1px solid ${colors.border}`,
    };

    const featureStyles: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
    };

    const numberStyles: React.CSSProperties = {
        fontFamily: typography.fontFamily.mono,
        textAlign: 'right',
    };

    const percentageBarStyles: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
    };

    const barContainerStyles: React.CSSProperties = {
        width: '40px',
        height: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    };

    if (features.length === 0) {
        return (
            <div className={className} style={containerStyles}>
                <div style={headerStyles}>
                    <span style={titleStyles}>Token Usage by Feature</span>
                </div>
                <div
                    style={{
                        padding: spacing.xl,
                        textAlign: 'center',
                        color: colors.text.muted,
                        fontSize: typography.fontSize.sm,
                    }}
                >
                    No token usage recorded yet.
                </div>
            </div>
        );
    }

    return (
        <div className={className} style={containerStyles}>
            <div style={headerStyles}>
                <span style={titleStyles}>Token Usage by Feature</span>
                <span style={totalStyles}>
                    Total: <strong>{formatNumber(calculatedTotal)}</strong>
                </span>
            </div>

            <table style={tableStyles}>
                <thead>
                    <tr>
                        <th style={thStyles}>Feature</th>
                        <th style={{ ...thStyles, textAlign: 'right' }}>Input</th>
                        <th style={{ ...thStyles, textAlign: 'right' }}>Output</th>
                        <th style={{ ...thStyles, textAlign: 'right' }}>Total</th>
                        {showPercentage && <th style={{ ...thStyles, textAlign: 'right' }}>Usage</th>}
                    </tr>
                </thead>
                <tbody>
                    {featuresWithPercentage.map((feature) => (
                        <tr key={feature.feature}>
                            <td style={tdStyles}>
                                <div style={featureStyles}>
                                    <span style={{ color: colors.text.secondary }}>
                                        {getFeatureIcon(feature.feature)}
                                    </span>
                                    <span>{feature.displayName}</span>
                                </div>
                            </td>
                            <td style={{ ...tdStyles, ...numberStyles }}>
                                {formatNumber(feature.inputTokens)}
                            </td>
                            <td style={{ ...tdStyles, ...numberStyles }}>
                                {formatNumber(feature.outputTokens)}
                            </td>
                            <td style={{ ...tdStyles, ...numberStyles, fontWeight: typography.fontWeight.medium }}>
                                {formatNumber(feature.totalTokens)}
                            </td>
                            {showPercentage && (
                                <td style={{ ...tdStyles, ...numberStyles }}>
                                    <div style={percentageBarStyles}>
                                        <div style={barContainerStyles}>
                                            <div
                                                style={{
                                                    width: `${feature.percentage}%`,
                                                    height: '100%',
                                                    backgroundColor: colors.primary,
                                                    borderRadius: borderRadius.full,
                                                }}
                                            />
                                        </div>
                                        <span style={{ minWidth: '36px' }}>{feature.percentage}%</span>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default TokenUsageHistory;
