import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';

/**
 * Feedback entry
 */
export interface FeedbackEntry {
    /** Entry ID */
    id: string;
    /** User rating 1-5 */
    rating: number;
    /** Feedback text */
    comment: string;
    /** Timestamp */
    timestamp: number;
    /** Iteration number */
    iteration: number;
}

/**
 * FeedbackDisplay component props
 */
export interface FeedbackDisplayProps {
    /** Feedback entries */
    feedback: FeedbackEntry[];
    /** Average rating */
    averageRating?: number;
    /** Whether expanded */
    isExpanded?: boolean;
    /** Toggle expand handler */
    onToggleExpand?: () => void;
}

/**
 * Get color for rating
 */
const getRatingColor = (rating: number): string => {
    if (rating >= 4) return colors.success;
    if (rating >= 3) return colors.warning;
    return colors.error;
};

/**
 * Render star rating
 */
const StarRating = ({ rating }: { rating: number }) => {
    return (
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
};

/**
 * FeedbackDisplay component for showing user ratings and feedback.
 *
 * @example
 * ```tsx
 * <FeedbackDisplay
 *   feedback={feedbackHistory}
 *   averageRating={4.2}
 *   isExpanded={showFeedback}
 *   onToggleExpand={() => setShowFeedback(!showFeedback)}
 * />
 * ```
 *
 * **Validates: Requirements 15.7**
 */
export function FeedbackDisplay({
    feedback,
    averageRating,
    isExpanded = true,
    onToggleExpand,
}: FeedbackDisplayProps) {
    const containerStyle: React.CSSProperties = {
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        cursor: onToggleExpand ? 'pointer' : 'default',
        borderBottom: isExpanded ? `1px solid ${colors.border}` : 'none',
    };

    const titleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
    };

    const avgRatingStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: averageRating
            ? `${getRatingColor(averageRating)}20`
            : colors.background.tertiary,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: averageRating ? getRatingColor(averageRating) : colors.text.muted,
    };

    const contentStyle: React.CSSProperties = {
        maxHeight: isExpanded ? '400px' : '0',
        overflow: isExpanded ? 'auto' : 'hidden',
        transition: transitions.normal,
    };

    const entryStyle: React.CSSProperties = {
        padding: spacing.md,
        borderBottom: `1px solid ${colors.border}`,
    };

    const entryHeaderStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    };

    const commentStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: typography.lineHeight.relaxed,
        margin: 0,
    };

    const metaStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    };

    const chevronStyle: React.CSSProperties = {
        color: colors.text.muted,
        transition: transitions.fast,
        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
    };

    const formatTime = (timestamp: number): string => {
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle} onClick={onToggleExpand}>
                <div style={titleStyle}>
                    <span>💬 Feedback</span>
                    <span style={{ color: colors.text.muted, fontWeight: 'normal' }}>
                        ({feedback.length})
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                    {averageRating !== undefined && (
                        <div style={avgRatingStyle}>
                            <StarRating rating={Math.round(averageRating)} />
                            <span>{averageRating.toFixed(1)}</span>
                        </div>
                    )}
                    {onToggleExpand && (
                        <svg
                            style={chevronStyle}
                            width={16}
                            height={16}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    )}
                </div>
            </div>

            <div style={contentStyle}>
                {feedback.length === 0 ? (
                    <div
                        style={{
                            padding: spacing.xl,
                            textAlign: 'center',
                            color: colors.text.muted,
                        }}
                    >
                        No feedback yet
                    </div>
                ) : (
                    feedback.map((entry) => (
                        <div key={entry.id} style={entryStyle}>
                            <div style={entryHeaderStyle}>
                                <StarRating rating={entry.rating} />
                                <span style={metaStyle}>
                                    Iteration {entry.iteration} • {formatTime(entry.timestamp)}
                                </span>
                            </div>
                            <p style={commentStyle}>{entry.comment}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default FeedbackDisplay;
