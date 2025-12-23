import React, { useState } from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../theme';

/**
 * Tool types supported
 */
export type ToolType = 'write_file' | 'read_file' | 'list_files' | 'execute_command' | 'search' | 'unknown';

/**
 * Tool call data interface
 */
export interface ToolCallData {
    /** Tool name/type */
    tool: ToolType | string;
    /** Path for file operations */
    path?: string;
    /** Command for execute operations */
    command?: string;
    /** Content/output of the tool call */
    content?: string;
    /** Whether the operation succeeded */
    success?: boolean;
    /** Error message if failed */
    error?: string;
}

/**
 * ToolCallDisplay component props
 */
export interface ToolCallDisplayProps {
    /** Tool call data */
    data: ToolCallData;
    /** Whether to start collapsed */
    defaultCollapsed?: boolean;
}

/**
 * Get icon for tool type
 */
const getToolIcon = (tool: string): React.ReactNode => {
    const iconProps = {
        width: 14,
        height: 14,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
    };

    switch (tool) {
        case 'write_file':
            return (
                <svg {...iconProps}>
                    <path d="M12 3v12M5 10l7 7 7-7" />
                </svg>
            );
        case 'read_file':
            return (
                <svg {...iconProps}>
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
            );
        case 'list_files':
            return (
                <svg {...iconProps}>
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
            );
        case 'execute_command':
            return (
                <svg {...iconProps}>
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
            );
        case 'search':
            return (
                <svg {...iconProps}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            );
        default:
            return (
                <svg {...iconProps}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            );
    }
};

/**
 * Get tool display name
 */
const getToolName = (tool: string): string => {
    switch (tool) {
        case 'write_file':
            return 'Write File';
        case 'read_file':
            return 'Read File';
        case 'list_files':
            return 'List Files';
        case 'execute_command':
            return 'Execute Command';
        case 'search':
            return 'Search';
        default:
            return tool.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
};

/**
 * ToolCallDisplay component for showing tool executions in chat.
 *
 * Features:
 * - Expand/collapse with smooth animation
 * - Syntax highlighting for code content
 * - Clickable file paths
 * - Success/error status indicators
 *
 * @example
 * ```tsx
 * <ToolCallDisplay
 *   data={{
 *     tool: 'write_file',
 *     path: '/src/components/Button.tsx',
 *     content: 'export const Button = ...',
 *     success: true,
 *   }}
 * />
 * ```
 *
 * **Validates: Requirements 17.1, 17.2, 17.3, 17.4**
 */
export function ToolCallDisplay({ data, defaultCollapsed = true }: ToolCallDisplayProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    const hasContent = Boolean(data.content || data.error);
    const displayPath = data.path || data.command;

    // Header styles
    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `${spacing.sm} ${spacing.md}`,
        backgroundColor: colors.background.tertiary,
        borderRadius: isCollapsed ? borderRadius.md : `${borderRadius.md} ${borderRadius.md} 0 0`,
        cursor: hasContent ? 'pointer' : 'default',
        transition: transitions.fast,
        border: `1px solid ${colors.border}`,
        borderBottom: isCollapsed ? undefined : 'none',
    };

    // Icon container styles
    const iconStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: borderRadius.sm,
        backgroundColor: data.success === false ? 'rgba(244, 135, 113, 0.15)' : 'rgba(255, 191, 36, 0.15)',
        color: data.success === false ? colors.error : colors.amber[500],
    };

    // Tool name styles
    const toolNameStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    };

    // Path styles
    const pathStyle: React.CSSProperties = {
        flex: 1,
        fontSize: typography.fontSize.sm,
        fontFamily: typography.fontFamily.mono,
        color: colors.text.primary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };

    // Chevron styles
    const chevronStyle: React.CSSProperties = {
        color: colors.text.muted,
        transition: transitions.fast,
        transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
    };

    // Content styles
    const contentStyle: React.CSSProperties = {
        padding: spacing.md,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderTop: 'none',
        borderRadius: `0 0 ${borderRadius.md} ${borderRadius.md}`,
        maxHeight: isCollapsed ? 0 : '300px',
        overflow: isCollapsed ? 'hidden' : 'auto',
        transition: 'max-height 0.2s ease-out',
    };

    // Code block styles
    const codeStyle: React.CSSProperties = {
        fontFamily: typography.fontFamily.mono,
        fontSize: typography.fontSize.xs,
        lineHeight: typography.lineHeight.relaxed,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        color: data.error ? colors.error : colors.text.primary,
        margin: 0,
    };

    const handleClick = () => {
        if (hasContent) {
            setIsCollapsed(!isCollapsed);
        }
    };

    const handlePathClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Could emit event to open file in VS Code
        console.log('Open file:', displayPath);
    };

    return (
        <div style={{ marginBottom: spacing.sm }}>
            {/* Header */}
            <div
                style={headerStyle}
                onClick={handleClick}
                role={hasContent ? 'button' : undefined}
                aria-expanded={hasContent ? !isCollapsed : undefined}
            >
                <div style={iconStyle}>{getToolIcon(data.tool)}</div>
                <span style={toolNameStyle}>{getToolName(data.tool)}</span>
                {displayPath && (
                    <span
                        style={pathStyle}
                        onClick={data.path ? handlePathClick : undefined}
                        title={displayPath}
                    >
                        {displayPath}
                    </span>
                )}
                {data.success !== undefined && (
                    <span
                        style={{
                            fontSize: typography.fontSize.xs,
                            color: data.success ? colors.success : colors.error,
                        }}
                    >
                        {data.success ? '✓' : '✗'}
                    </span>
                )}
                {hasContent && (
                    <svg
                        style={chevronStyle}
                        width={14}
                        height={14}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                )}
            </div>

            {/* Content */}
            {hasContent && !isCollapsed && (
                <div style={contentStyle}>
                    <pre style={codeStyle}>{data.error || data.content}</pre>
                </div>
            )}
        </div>
    );
}

export default ToolCallDisplay;
