import React, { useState } from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';
import { Button } from '../../../shared/components/ui';
import { FeedbackEntry } from '../types';

/**
 * Grouped feedback session (multiple personas reviewing same screenshot)
 */
interface FeedbackSession {
    id: string;
    screenshot?: string;
    timestamp: number;
    entries: FeedbackEntry[];
    averageRating: number;
    summary?: string;
}

/**
 * Props for FeedbackHistoryList
 */
export interface FeedbackHistoryListProps {
    entries: FeedbackEntry[];
    onDelete?: (id: string) => void;
}

/**
 * Star rating display
 */
const StarRating = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) => {
    const fontSize = size === 'lg' ? '20px' : size === 'md' ? '16px' : '12px';

    return (
        <span style={{ display: 'inline-flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    style={{
                        color: star <= rating ? colors.amber[500] : colors.text.muted,
                        fontSize,
                    }}
                >
                    ★
                </span>
            ))}
        </span>
    );
};

/**
 * Group feedback entries by session (same screenshot/timestamp range)
 */
function groupFeedbackBySessions(entries: FeedbackEntry[]): FeedbackSession[] {
    // Group by screenshot URL or timestamp proximity (within 1 minute)
    const sessions = new Map<string, FeedbackEntry[]>();

    entries.forEach(entry => {
        // Use screenshot URL as key, or timestamp rounded to minute
        const key = entry.screenshotUrl || `time-${Math.floor(entry.timestamp / 60000)}`;

        if (!sessions.has(key)) {
            sessions.set(key, []);
        }
        sessions.get(key)!.push(entry);
    });

    // Convert to FeedbackSession objects
    return Array.from(sessions.entries()).map(([key, sessionEntries]) => {
        const averageRating = sessionEntries.reduce((sum, e) => sum + e.rating, 0) / sessionEntries.length;
        const latestEntry = sessionEntries.sort((a, b) => b.timestamp - a.timestamp)[0];

        return {
            id: key,
            screenshot: latestEntry.screenshotUrl,
            timestamp: latestEntry.timestamp,
            entries: sessionEntries,
            averageRating: Math.round(averageRating * 10) / 10,
            summary: (latestEntry as any).summary, // TODO: Add summary to type
        };
    }).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Feedback history list with session grouping and expand/collapse
 */
export function FeedbackHistoryList({ entries, onDelete }: FeedbackHistoryListProps) {
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const sessions = groupFeedbackBySessions(entries);

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (sessions.length === 0) {
        return (
            <div
                style={{
                    padding: spacing.xl,
                    textAlign: 'center',
                    color: colors.text.muted,
                    backgroundColor: colors.background.tertiary,
                    borderRadius: borderRadius.lg,
                }}
            >
                No feedback history yet
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {sessions.map(session => {
                const isExpanded = expandedSession === session.id;

                return (
                    <div
                        key={session.id}
                        style={{
                            backgroundColor: colors.background.secondary,
                            border: `1px solid ${colors.border}`,
                            borderRadius: borderRadius.xl,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Session Preview */}
                        <div
                            onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                            style={{
                                padding: spacing.md,
                                cursor: 'pointer',
                                display: 'flex',
                                gap: spacing.md,
                                transition: transitions.fast,
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.backgroundColor =
                                    colors.background.tertiary;
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.backgroundColor =
                                    'transparent';
                            }}
                        >
                            {/* Thumbnail */}
                            {session.screenshot && (
                                <div
                                    style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: borderRadius.lg,
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        backgroundColor: colors.background.tertiary,
                                    }}
                                >
                                    <img
                                        src={session.screenshot}
                                        alt="Feedback screenshot"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                </div>
                            )}

                            {/* Summary Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                                    <StarRating rating={Math.round(session.averageRating)} size="md" />
                                    <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                                        {session.averageRating.toFixed(1)} / 5.0
                                    </span>
                                    <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                                        • {session.entries.length} persona{session.entries.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {session.summary && (
                                    <p
                                        style={{
                                            fontSize: typography.fontSize.sm,
                                            color: colors.text.secondary,
                                            lineHeight: typography.lineHeight.relaxed,
                                            margin: `${spacing.xs} 0`,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {session.summary}
                                    </p>
                                )}

                                <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                                    {formatDate(session.timestamp)}
                                </div>
                            </div>

                            {/* Expand indicator */}
                            <div style={{ display: 'flex', alignItems: 'center', color: colors.text.muted }}>
                                {isExpanded ? '▼' : '▶'}
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                            <div
                                style={{
                                    borderTop: `1px solid ${colors.border}`,
                                    padding: spacing.md,
                                }}
                            >
                                {/* Full Screenshot */}
                                {session.screenshot && (
                                    <div
                                        style={{
                                            marginBottom: spacing.md,
                                            borderRadius: borderRadius.lg,
                                            overflow: 'hidden',
                                            backgroundColor: colors.background.tertiary,
                                        }}
                                    >
                                        <img
                                            src={session.screenshot}
                                            alt="Feedback screenshot"
                                            style={{
                                                width: '100%',
                                                height: 'auto',
                                                display: 'block',
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Summary Section */}
                                <div style={{ marginBottom: spacing.lg }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
                                        <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                                            Overall Summary
                                        </h3>
                                        <StarRating rating={Math.round(session.averageRating)} size="lg" />
                                        <span style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold }}>
                                            {session.averageRating.toFixed(1)} / 5.0
                                        </span>
                                    </div>

                                    {session.summary && (
                                        <p
                                            style={{
                                                fontSize: typography.fontSize.sm,
                                                color: colors.text.secondary,
                                                lineHeight: typography.lineHeight.relaxed,
                                                margin: 0,
                                            }}
                                        >
                                            {session.summary}
                                        </p>
                                    )}
                                </div>

                                {/* Individual Feedback */}
                                <div>
                                    <h4 style={{ margin: `0 0 ${spacing.sm} 0`, fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold }}>
                                        Individual Feedback ({session.entries.length})
                                    </h4>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                                        {session.entries.map(entry => (
                                            <div
                                                key={entry.id}
                                                style={{
                                                    padding: spacing.sm,
                                                    backgroundColor: colors.background.tertiary,
                                                    borderRadius: borderRadius.lg,
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                                                        <div
                                                            style={{
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: borderRadius.full,
                                                                backgroundColor: colors.amber[500],
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: typography.fontSize.xs,
                                                                fontWeight: typography.fontWeight.bold,
                                                                color: '#1E1E1E',
                                                            }}
                                                        >
                                                            {entry.personaName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                                                            {entry.personaName}
                                                        </span>
                                                        <StarRating rating={entry.rating} />
                                                    </div>

                                                    {onDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDelete(entry.id);
                                                            }}
                                                        >
                                                            🗑️
                                                        </Button>
                                                    )}
                                                </div>

                                                <p
                                                    style={{
                                                        fontSize: typography.fontSize.sm,
                                                        color: colors.text.secondary,
                                                        lineHeight: typography.lineHeight.relaxed,
                                                        margin: 0,
                                                    }}
                                                >
                                                    {entry.comment}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default FeedbackHistoryList;
