import React, { useState } from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';
import { Button } from '../../../shared/components/ui';
import { FeedbackEntry } from '../types';

/**
 * FeedbackHistory component props
 */
export interface FeedbackHistoryProps {
    /** Feedback history entries */
    entries: FeedbackEntry[];
    /** Delete entry handler */
    onDelete?: (id: string) => void;
    /** View entry handler */
    onView?: (entry: FeedbackEntry) => void;
    /** Empty state message */
    emptyMessage?: string;
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
                    fontSize: typography.fontSize.xs,
                }}
            >
                ★
            </span>
        ))}
    </span>
);

/**
 * FeedbackHistory component for displaying past feedback.
 *
 * @example
 * ```tsx
 * <FeedbackHistory
 *   entries={feedbackHistory}
 *   onDelete={handleDelete}
 *   onView={handleView}
 * />
 * ```
 *
 * **Validates: Requirements 13.3**
 */
export function FeedbackHistory({
    entries,
    onDelete,
    onView,
    emptyMessage = 'No feedback history yet',
}: FeedbackHistoryProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'rating'>('newest');

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.md,
        flexWrap: 'wrap',
    };

    const inputStyle: React.CSSProperties = {
        flex: 1,
        minWidth: 200,
        padding: spacing.sm,
        backgroundColor: colors.input.background,
        border: `1px solid ${colors.input.border}`,
        borderRadius: borderRadius.lg,
        color: colors.input.foreground,
        fontSize: typography.fontSize.sm,
        outline: 'none',
    };

    const selectStyle: React.CSSProperties = {
        padding: spacing.sm,
        backgroundColor: colors.input.background,
        border: `1px solid ${colors.input.border}`,
        borderRadius: borderRadius.lg,
        color: colors.input.foreground,
        fontSize: typography.fontSize.sm,
        outline: 'none',
        cursor: 'pointer',
    };

    const entryStyle: React.CSSProperties = {
        padding: spacing.md,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
        cursor: onView ? 'pointer' : 'default',
        transition: transitions.fast,
    };

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Filter entries
    const filteredEntries = entries.filter((entry) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            entry.personaName.toLowerCase().includes(query) ||
            entry.comment.toLowerCase().includes(query)
        );
    });

    // Sort entries
    const sortedEntries = [...filteredEntries].sort((a, b) => {
        switch (sortOrder) {
            case 'oldest':
                return a.timestamp - b.timestamp;
            case 'rating':
                return b.rating - a.rating;
            case 'newest':
            default:
                return b.timestamp - a.timestamp;
        }
    });

    return (
        <div style={containerStyle}>
            {/* Search and Filter */}
            <div style={headerStyle}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search feedback..."
                    style={inputStyle}
                />
                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'rating')}
                    style={selectStyle}
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="rating">Highest Rating</option>
                </select>
            </div>

            {/* Results count */}
            {searchQuery && (
                <div style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
                    {sortedEntries.length} result{sortedEntries.length !== 1 ? 's' : ''} found
                </div>
            )}

            {/* Entries List */}
            {sortedEntries.length === 0 ? (
                <div
                    style={{
                        padding: spacing.xl,
                        textAlign: 'center',
                        color: colors.text.muted,
                        backgroundColor: colors.background.tertiary,
                        borderRadius: borderRadius.lg,
                    }}
                >
                    {searchQuery ? 'No matching feedback found' : emptyMessage}
                </div>
            ) : (
                sortedEntries.map((entry) => (
                    <div
                        key={entry.id}
                        style={entryStyle}
                        onClick={() => onView?.(entry)}
                        onMouseEnter={(e) => {
                            if (onView) {
                                (e.currentTarget as HTMLElement).style.backgroundColor =
                                    colors.background.tertiary;
                            }
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor =
                                colors.background.secondary;
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: spacing.sm,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: borderRadius.full,
                                        backgroundColor: colors.amber[500],
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: typography.fontSize.sm,
                                        fontWeight: typography.fontWeight.bold,
                                        color: '#1E1E1E',
                                        flexShrink: 0,
                                    }}
                                >
                                    {entry.personaName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontSize: typography.fontSize.sm,
                                            fontWeight: typography.fontWeight.semibold,
                                            color: colors.text.primary,
                                        }}
                                    >
                                        {entry.personaName}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                                        <StarRating rating={entry.rating} />
                                        <span
                                            style={{
                                                fontSize: typography.fontSize.xs,
                                                color: colors.text.muted,
                                            }}
                                        >
                                            {formatDate(entry.timestamp)}
                                        </span>
                                    </div>
                                </div>
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
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {entry.comment}
                        </p>
                    </div>
                ))
            )}
        </div>
    );
}

export default FeedbackHistory;
