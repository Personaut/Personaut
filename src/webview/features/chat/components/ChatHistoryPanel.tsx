import React, { useState } from 'react';
import { colors, spacing, typography, borderRadius, shadows } from '../../../shared/theme';

/**
 * Session summary for history display
 * 
 * Feature: chat-ui-fixes
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */
export interface SessionSummary {
    sessionId: string;
    createdAt: number;
    closedAt?: number;
    messageCount: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    /** Whether this session was created by IDE open (vs manual) */
    ideSession?: boolean;
}

/**
 * ChatHistoryPanel component props
 */
export interface ChatHistoryPanelProps {
    /** List of sessions to display */
    sessions: SessionSummary[];
    /** Currently selected session ID */
    selectedSessionId?: string;
    /** Handler for session selection */
    onSessionSelect?: (sessionId: string) => void;
    /** Handler for session delete */
    onSessionDelete?: (sessionId: string) => void;
    /** Whether the panel is loading */
    isLoading?: boolean;
    /** Handler to close the panel */
    onClose?: () => void;
    /** Handler to refresh the history */
    onRefresh?: () => void;
}

/**
 * Format timestamp to human-readable date
 */
function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

/**
 * Format time to readable format
 */
function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Generate a readable title from session ID or date
 */
function generateTitle(session: SessionSummary): string {
    const time = formatTime(session.createdAt);

    if (session.messageCount > 0) {
        return `${session.messageCount} message${session.messageCount > 1 ? 's' : ''} · ${time}`;
    }
    return `New Chat · ${time}`;
}

/**
 * ChatHistoryPanel component for displaying session history.
 *
 * Features:
 * - List of sessions ordered by timestamp (newest first)
 * - Shows session ID, timestamp, and token counts
 * - Session selection handler
 * - Filters out incognito sessions (done at data layer)
 *
 * **Validates: Requirements 3.1, 3.2, 3.5**
 */
export function ChatHistoryPanel({
    sessions,
    selectedSessionId,
    onSessionSelect,
    onSessionDelete,
    isLoading = false,
    onClose,
    onRefresh,
}: ChatHistoryPanelProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const panelStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        width: '300px',
        height: '100%',
        backgroundColor: colors.background.primary,
        borderRight: `1px solid ${colors.border}`,
        overflow: 'hidden',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${spacing.md} ${spacing.lg}`,
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.background.secondary,
    };

    const headerTitleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
    };

    const closeButtonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        color: colors.text.secondary,
        cursor: 'pointer',
        padding: spacing.xs,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.sm,
        transition: 'all 0.15s ease',
    };

    const listStyle: React.CSSProperties = {
        flex: 1,
        overflowY: 'auto',
        padding: spacing.md,
    };

    const emptyStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        color: colors.text.muted,
        textAlign: 'center',
        height: '100%',
    };

    const loadingStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        color: colors.text.muted,
        gap: spacing.md,
    };

    const getSessionItemStyle = (sessionId: string): React.CSSProperties => {
        const isSelected = sessionId === selectedSessionId;
        const isHovered = sessionId === hoveredId;

        return {
            display: 'flex',
            flexDirection: 'column',
            padding: spacing.md,
            marginBottom: spacing.sm,
            backgroundColor: isSelected
                ? `${colors.primary}20`
                : isHovered
                    ? colors.background.tertiary
                    : colors.background.secondary,
            borderRadius: borderRadius.lg,
            cursor: 'pointer',
            border: isSelected
                ? `2px solid ${colors.primary}`
                : `2px solid transparent`,
            transition: 'all 0.15s ease',
            boxShadow: isHovered ? shadows.sm : 'none',
        };
    };

    const sessionTitleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    };

    const sessionMetaStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    };

    const badgeStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: `2px ${spacing.xs}`,
        borderRadius: borderRadius.full,
        fontSize: '10px',
        fontWeight: typography.fontWeight.medium,
    };

    // Spinning loader animation via inline style
    const spinnerKeyframes = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;

    return (
        <div style={panelStyle}>
            <style>{spinnerKeyframes}</style>

            <div style={headerStyle}>
                <h3 style={headerTitleStyle}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Chat History
                </h3>
                <div style={{ display: 'flex', gap: spacing.xs }}>
                    {onRefresh && (
                        <button
                            style={closeButtonStyle}
                            onClick={onRefresh}
                            aria-label="Refresh history"
                            title="Refresh history"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path d="M21 2v6h-6" />
                                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                                <path d="M3 22v-6h6" />
                                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                            </svg>
                        </button>
                    )}
                    {onClose && (
                        <button
                            style={closeButtonStyle}
                            onClick={onClose}
                            aria-label="Close history panel"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div style={listStyle}>
                {isLoading ? (
                    <div style={loadingStyle}>
                        <div style={{
                            width: 32,
                            height: 32,
                            border: `3px solid ${colors.border}`,
                            borderTop: `3px solid ${colors.primary}`,
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                        }} />
                        <span>Loading history...</span>
                    </div>
                ) : sessions.length === 0 ? (
                    <div style={emptyStyle}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: borderRadius.full,
                            backgroundColor: colors.background.tertiary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: spacing.lg,
                        }}>
                            <svg
                                width="40"
                                height="40"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={colors.text.muted}
                                strokeWidth="1.5"
                            >
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <p style={{
                            margin: 0,
                            fontSize: typography.fontSize.md,
                            fontWeight: typography.fontWeight.medium,
                            color: colors.text.primary,
                        }}>
                            No Conversations Yet
                        </p>
                        <p style={{
                            margin: 0,
                            marginTop: spacing.sm,
                            fontSize: typography.fontSize.sm,
                            lineHeight: 1.5,
                        }}>
                            Start a new chat and it will appear here for easy access later.
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={{
                            fontSize: typography.fontSize.xs,
                            color: colors.text.muted,
                            marginBottom: spacing.sm,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            {sessions.length} Conversation{sessions.length > 1 ? 's' : ''}
                        </div>
                        {sessions.map((session) => (
                            <div
                                key={session.sessionId}
                                style={getSessionItemStyle(session.sessionId)}
                                onClick={() => onSessionSelect?.(session.sessionId)}
                                onMouseEnter={() => setHoveredId(session.sessionId)}
                                onMouseLeave={() => setHoveredId(null)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        onSessionSelect?.(session.sessionId);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-selected={session.sessionId === selectedSessionId}
                            >
                                <div style={sessionTitleStyle}>
                                    {generateTitle(session)}
                                </div>

                                <div style={sessionMetaStyle}>
                                    <span style={{
                                        ...badgeStyle,
                                        backgroundColor: colors.background.tertiary,
                                        color: colors.text.secondary,
                                    }}>
                                        {formatDate(session.createdAt)}
                                    </span>

                                    {session.ideSession && (
                                        <span style={{
                                            ...badgeStyle,
                                            backgroundColor: `${colors.info}20`,
                                            color: colors.info,
                                        }}>
                                            IDE
                                        </span>
                                    )}
                                </div>

                                {/* Bottom row: Delete button and token counts */}
                                {(onSessionDelete || session.totalTokens > 0) && (
                                    <div style={{
                                        marginTop: spacing.sm,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: spacing.sm,
                                    }}>
                                        {onSessionDelete && (
                                            <button
                                                style={{
                                                    padding: `${spacing.xs} ${spacing.sm}`,
                                                    fontSize: typography.fontSize.xs,
                                                    color: colors.error,
                                                    backgroundColor: 'transparent',
                                                    border: `1px solid ${colors.error}`,
                                                    borderRadius: borderRadius.sm,
                                                    cursor: 'pointer',
                                                    opacity: hoveredId === session.sessionId ? 1 : 0,
                                                    transition: 'opacity 0.15s ease',
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSessionDelete(session.sessionId);
                                                }}
                                            >
                                                Delete
                                            </button>
                                        )}

                                        {/* Token counts: In, Out, Total - always show */}
                                        <div style={{
                                            display: 'flex',
                                            gap: spacing.xs,
                                            fontSize: typography.fontSize.xs,
                                            color: colors.text.muted,
                                            marginLeft: 'auto',
                                        }}>
                                            <span title="Input tokens">
                                                In: {(session.totalInputTokens || 0).toLocaleString()}
                                            </span>
                                            <span>·</span>
                                            <span title="Output tokens">
                                                Out: {(session.totalOutputTokens || 0).toLocaleString()}
                                            </span>
                                            <span>·</span>
                                            <span title="Total tokens" style={{
                                                color: colors.primary,
                                                fontWeight: typography.fontWeight.medium,
                                            }}>
                                                Total: {(session.totalTokens || 0).toLocaleString()}
                                            </span>
                                        </div>

                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

export default ChatHistoryPanel;
