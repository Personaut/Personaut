import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';
import { BuildLogEntry } from '../types';

/**
 * BuildLogsPanel component props
 */
export interface BuildLogsPanelProps {
    /** Array of log entries */
    logs: BuildLogEntry[];
    /** Handler to clear logs */
    onClear?: () => void;
    /** Whether panel is expanded */
    isExpanded?: boolean;
    /** Toggle expand handler */
    onToggleExpand?: () => void;
    /** Maximum height when expanded */
    maxHeight?: string;
}

/**
 * Get color for log type
 */
const getLogColor = (type: BuildLogEntry['type']): string => {
    switch (type) {
        case 'error':
            return colors.error;
        case 'success':
            return colors.success;
        case 'warning':
            return colors.warning;
        case 'info':
            return colors.info;
        case 'assistant':
            return colors.amber[400];
        case 'user':
            return colors.text.primary;
        case 'system':
        default:
            return colors.text.secondary;
    }
};

/**
 * Get icon for log type
 */
const getLogIcon = (type: BuildLogEntry['type']): string => {
    switch (type) {
        case 'error':
            return '❌';
        case 'success':
            return '✅';
        case 'warning':
            return '⚠️';
        case 'info':
            return 'ℹ️';
        case 'assistant':
            return '🤖';
        case 'user':
            return '👤';
        case 'system':
        default:
            return '⚙️';
    }
};

/**
 * Format timestamp
 */
const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

/**
 * BuildLogsPanel component - displays build operation logs.
 *
 * Features:
 * - Collapsible panel
 * - Color-coded log types
 * - Timestamps for each entry
 * - Clear logs option
 *
 * @example
 * ```tsx
 * <BuildLogsPanel
 *   logs={buildLogs}
 *   onClear={clearLogs}
 *   isExpanded={showLogs}
 *   onToggleExpand={() => setShowLogs(!showLogs)}
 * />
 * ```
 *
 * **Validates: Requirements 5.5**
 */
export function BuildLogsPanel({
    logs,
    onClear,
    isExpanded = true,
    onToggleExpand,
    maxHeight = '200px',
}: BuildLogsPanelProps) {
    const containerStyle: React.CSSProperties = {
        backgroundColor: colors.background.secondary,
        borderTop: `1px solid ${colors.border}`,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${spacing.sm} ${spacing.md}`,
        cursor: onToggleExpand ? 'pointer' : 'default',
        borderBottom: isExpanded ? `1px solid ${colors.border}` : 'none',
    };

    const titleStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.primary,
    };

    const logsContainerStyle: React.CSSProperties = {
        maxHeight: isExpanded ? maxHeight : 0,
        overflow: isExpanded ? 'auto' : 'hidden',
        transition: transitions.normal,
        padding: isExpanded ? spacing.md : 0,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xs,
    };

    const buttonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: spacing.xs,
        color: colors.text.muted,
        fontSize: typography.fontSize.xs,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle} onClick={onToggleExpand}>
                <div style={titleStyle}>
                    <svg
                        width={12}
                        height={12}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        style={{
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: transitions.fast,
                        }}
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                    <span>Build Logs</span>
                    <span style={{ color: colors.text.muted }}>({logs.length})</span>
                </div>
                {onClear && logs.length > 0 && (
                    <button
                        style={buttonStyle}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }}
                    >
                        Clear
                    </button>
                )}
            </div>
            <div style={logsContainerStyle}>
                {logs.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            color: colors.text.muted,
                            fontSize: typography.fontSize.sm,
                            padding: spacing.lg,
                        }}
                    >
                        No logs yet
                    </div>
                ) : (
                    logs.map((log) => (
                        <LogEntry key={log.id} log={log} />
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * Individual log entry
 */
function LogEntry({ log }: { log: BuildLogEntry }) {
    const entryStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xs,
        padding: spacing.sm,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.sm,
    };

    const timeStyle: React.CSSProperties = {
        color: colors.text.muted,
        fontFamily: typography.fontFamily.mono,
        flexShrink: 0,
    };

    const iconStyle: React.CSSProperties = {
        flexShrink: 0,
    };

    const contentStyle: React.CSSProperties = {
        flex: 1,
        color: getLogColor(log.type),
        wordBreak: 'break-word',
        lineHeight: typography.lineHeight.relaxed,
    };

    const stageStyle: React.CSSProperties = {
        backgroundColor: 'rgba(255, 191, 36, 0.1)',
        color: colors.accent,
        padding: `${spacing.xs} ${spacing.sm}`,
        borderRadius: borderRadius.sm,
        fontSize: typography.fontSize.xs,
        flexShrink: 0,
    };

    const metadataStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.md,
        paddingLeft: `calc(${spacing.sm} + 12px + ${spacing.sm})`, // Align with content
        color: colors.text.muted,
        fontSize: typography.fontSize.xs,
        fontFamily: typography.fontFamily.mono,
    };

    const metadataItemStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
    };

    const hasMetadata = log.metadata && (log.metadata.model || log.metadata.tokens || log.metadata.duration);
    // Check if content already starts with an emoji (to avoid double icons)
    const startsWithEmoji = /^[\u{1F300}-\u{1F9FF}]|^[\u{2600}-\u{26FF}]|^[\u{2700}-\u{27BF}]/u.test(log.content);


    return (
        <div style={entryStyle}>
            <div style={headerStyle}>
                <span style={timeStyle}>{formatTime(log.timestamp)}</span>
                {!startsWithEmoji && <span style={iconStyle}>{getLogIcon(log.type)}</span>}
                <span style={contentStyle}>{log.content}</span>
                {log.stage && <span style={stageStyle}>{log.stage}</span>}
            </div>
            {hasMetadata && (
                <div style={metadataStyle}>
                    {log.metadata?.model && (
                        <span style={metadataItemStyle}>
                            <span>🤖</span>
                            <span>{log.metadata.model}</span>
                        </span>
                    )}
                    {log.metadata?.tokens && (
                        <span style={metadataItemStyle}>
                            <span>🎫</span>
                            <span>{log.metadata.tokens.toLocaleString()} tokens</span>
                        </span>
                    )}
                    {log.metadata?.duration && (
                        <span style={metadataItemStyle}>
                            <span>⏱️</span>
                            <span>{(log.metadata.duration / 1000).toFixed(2)}s</span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export default BuildLogsPanel;
