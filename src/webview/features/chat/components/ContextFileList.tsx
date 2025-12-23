import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';
import { ContextFile } from '../types';

/**
 * ContextFileList component props
 */
export interface ContextFileListProps {
    /** Array of context files */
    files: ContextFile[];
    /** Handler to remove a file */
    onRemove?: (path: string) => void;
    /** Maximum number of files to show before collapsing */
    maxVisible?: number;
}

/**
 * Get file icon based on extension
 */
const getFileIcon = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
        case 'ts':
        case 'tsx':
            return '📘';
        case 'js':
        case 'jsx':
            return '📒';
        case 'css':
        case 'scss':
            return '🎨';
        case 'json':
            return '📋';
        case 'md':
            return '📝';
        case 'html':
            return '🌐';
        default:
            return '📄';
    }
};

/**
 * Get file name from path
 */
const getFileName = (path: string): string => {
    return path.split('/').pop() || path;
};

/**
 * ContextFileList component for displaying attached context files.
 *
 * Shows a list of files with icons, names, and remove buttons.
 *
 * @example
 * ```tsx
 * <ContextFileList
 *   files={contextFiles}
 *   onRemove={(path) => removeContextFile(path)}
 * />
 * ```
 *
 * **Validates: Requirements 13.1**
 */
export function ContextFileList({ files, onRemove, maxVisible = 5 }: ContextFileListProps) {
    if (files.length === 0) {
        return null;
    }

    const visibleFiles = maxVisible ? files.slice(0, maxVisible) : files;
    const hiddenCount = files.length - visibleFiles.length;

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing.xs,
        padding: spacing.sm,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        border: `1px solid ${colors.border}`,
    };

    const fileTagStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        maxWidth: '200px',
    };

    const fileNameStyle: React.CSSProperties = {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };

    const removeButtonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.text.muted,
        transition: transitions.fast,
        marginLeft: spacing.xs,
    };

    const moreTagStyle: React.CSSProperties = {
        ...fileTagStyle,
        backgroundColor: 'transparent',
        color: colors.text.muted,
    };

    return (
        <div style={containerStyle}>
            {visibleFiles.map((file) => (
                <div key={file.path} style={fileTagStyle} title={file.path}>
                    <span>{getFileIcon(file.path)}</span>
                    <span style={fileNameStyle}>{getFileName(file.path)}</span>
                    {onRemove && (
                        <button
                            onClick={() => onRemove(file.path)}
                            style={removeButtonStyle}
                            aria-label={`Remove ${getFileName(file.path)}`}
                        >
                            <svg
                                width={12}
                                height={12}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            ))}
            {hiddenCount > 0 && (
                <div style={moreTagStyle}>+{hiddenCount} more</div>
            )}
        </div>
    );
}

export default ContextFileList;
