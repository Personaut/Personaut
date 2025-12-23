import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../../shared/theme';
import { Button } from '../../../shared/components/ui';
import { FeedbackEntry, ConsolidatedFeedback } from '../types';

/**
 * FeedbackDisplay component props
 */
export interface FeedbackDisplayProps {
    /** Generated feedback entries */
    feedback: FeedbackEntry[];
    /** AI-generated summary (2-3 sentences) */
    summary?: string | null;
    /** Consolidated feedback summary */
    consolidated?: ConsolidatedFeedback;
    /** Copy handler */
    onCopy?: () => void;
    /** Clear handler */
    onClear?: () => void;
    /** Save to history handler */
    onSaveToHistory?: () => void;
}

/**
 * Star rating display
 */
const StarRating = ({ rating }: { rating: number }) => (
    <span style={{ display: 'inline-flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
            <span
                key={star}
                style={{
                    color: star <= rating ? colors.amber[500] : colors.text.muted,
                    fontSize: typography.fontSize.sm,
                }}
            >
                ★
            </span>
        ))}
    </span>
);

/**
 * Get rating color
 */
const getRatingColor = (rating: number): string => {
    if (rating >= 4) return colors.success;
    if (rating >= 3) return colors.warning;
    return colors.error;
};

/**
 * FeedbackDisplay component for showing generated feedback.
 *
 * @example
 * ```tsx
 * <FeedbackDisplay
 *   feedback={generatedFeedback}
 *   consolidated={consolidatedSummary}
 *   onCopy={handleCopy}
 *   onClear={handleClear}
 * />
 * ```
 *
 * **Validates: Requirements 13.3**
 */
export function FeedbackDisplay({
    feedback,
    summary,
    consolidated,
    onCopy,
    onClear,
    onSaveToHistory,
}: FeedbackDisplayProps) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.lg,
    };

    const cardStyle: React.CSSProperties = {
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    };

    const actionsStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.sm,
    };

    if (feedback.length === 0) {
        return null;
    }

    const averageRating =
        feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;

    return (
        <div style={containerStyle}>
            {/* Summary Card */}
            <div style={cardStyle}>
                <div style={headerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                        <span
                            style={{
                                fontSize: typography.fontSize.lg,
                                fontWeight: typography.fontWeight.bold,
                                color: colors.text.primary,
                            }}
                        >
                            Feedback Summary
                        </span>
                        <span
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: spacing.xs,
                                padding: `${spacing.xs} ${spacing.sm}`,
                                backgroundColor: `${getRatingColor(averageRating)}20`,
                                borderRadius: borderRadius.md,
                                color: getRatingColor(averageRating),
                                fontWeight: typography.fontWeight.medium,
                            }}
                        >
                            <StarRating rating={Math.round(averageRating)} />
                            <span>{averageRating.toFixed(1)}</span>
                        </span>
                    </div>
                    <div style={actionsStyle}>
                        {onCopy && (
                            <Button variant="ghost" size="sm" onClick={onCopy}>
                                📋 Copy
                            </Button>
                        )}
                        {onSaveToHistory && (
                            <Button variant="primary" size="sm" onClick={onSaveToHistory}>
                                💾 Save
                            </Button>
                        )}
                        {onClear && (
                            <Button variant="ghost" size="sm" onClick={onClear}>
                                Clear
                            </Button>
                        )}
                    </div>
                </div>

                {summary ? (
                    <p
                        style={{
                            fontSize: typography.fontSize.sm,
                            color: colors.text.secondary,
                            lineHeight: typography.lineHeight.relaxed,
                            marginBottom: spacing.md,
                        }}
                    >
                        {summary}
                    </p>
                ) : (
                    <p
                        style={{
                            fontSize: typography.fontSize.sm,
                            color: colors.text.secondary,
                            marginBottom: spacing.md,
                        }}
                    >
                        {feedback.length} persona{feedback.length !== 1 ? 's' : ''} provided feedback
                    </p>
                )}

                {/* Consolidated Summary */}
                {consolidated && (
                    <div
                        style={{
                            padding: spacing.md,
                            backgroundColor: colors.background.tertiary,
                            borderRadius: borderRadius.lg,
                            marginBottom: spacing.md,
                        }}
                    >
                        {consolidated.positives.length > 0 && (
                            <div style={{ marginBottom: spacing.sm }}>
                                <span
                                    style={{
                                        fontSize: typography.fontSize.sm,
                                        fontWeight: typography.fontWeight.medium,
                                        color: colors.success,
                                    }}
                                >
                                    ✅ Positives
                                </span>
                                <ul
                                    style={{
                                        margin: `${spacing.xs} 0 0`,
                                        paddingLeft: spacing.lg,
                                        fontSize: typography.fontSize.sm,
                                        color: colors.text.secondary,
                                    }}
                                >
                                    {consolidated.positives.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {consolidated.improvements.length > 0 && (
                            <div style={{ marginBottom: spacing.sm }}>
                                <span
                                    style={{
                                        fontSize: typography.fontSize.sm,
                                        fontWeight: typography.fontWeight.medium,
                                        color: colors.warning,
                                    }}
                                >
                                    💡 Areas for Improvement
                                </span>
                                <ul
                                    style={{
                                        margin: `${spacing.xs} 0 0`,
                                        paddingLeft: spacing.lg,
                                        fontSize: typography.fontSize.sm,
                                        color: colors.text.secondary,
                                    }}
                                >
                                    {consolidated.improvements.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {consolidated.actionItems.length > 0 && (
                            <div>
                                <span
                                    style={{
                                        fontSize: typography.fontSize.sm,
                                        fontWeight: typography.fontWeight.medium,
                                        color: colors.accent,
                                    }}
                                >
                                    🎯 Action Items
                                </span>
                                <ul
                                    style={{
                                        margin: `${spacing.xs} 0 0`,
                                        paddingLeft: spacing.lg,
                                        fontSize: typography.fontSize.sm,
                                        color: colors.text.secondary,
                                    }}
                                >
                                    {consolidated.actionItems.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Individual Feedback Cards */}
            {feedback.map((entry) => (
                <div key={entry.id} style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: borderRadius.full,
                                backgroundColor: colors.amber[500],
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: typography.fontSize.md,
                                fontWeight: typography.fontWeight.bold,
                                color: '#1E1E1E',
                                flexShrink: 0,
                            }}
                        >
                            {entry.personaName ? entry.personaName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: spacing.xs,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: typography.fontSize.md,
                                        fontWeight: typography.fontWeight.semibold,
                                        color: colors.text.primary,
                                    }}
                                >
                                    {entry.personaName || 'Unknown Persona'}
                                </span>
                                {entry.rating !== undefined && <StarRating rating={entry.rating} />}
                            </div>
                            <p
                                style={{
                                    fontSize: typography.fontSize.sm,
                                    color: colors.text.secondary,
                                    lineHeight: typography.lineHeight.relaxed,
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {entry.comment || 'No feedback provided'}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default FeedbackDisplay;
