import React, { useState } from 'react';
import { colors, spacing, borderRadius, typography, shadows, transitions } from '../theme';
import { Button, Spinner } from './ui';

/**
 * Props for the EditableCard component
 */
export interface EditableCardProps {
    /** Unique identifier for the item */
    id: string;
    /** Title of the item */
    title: string;
    /** Description of the item */
    description?: string;
    /** Additional metadata to display as tags */
    tags?: string[];
    /** Optional badge text (e.g., feature name, priority) */
    badge?: { text: string; color?: string; backgroundColor?: string };
    /** Whether the card is expandable */
    expandable?: boolean;
    /** Initial expanded state */
    initialExpanded?: boolean;
    /** Content to show when expanded */
    expandedContent?: React.ReactNode;
    /** Handler for editing the item */
    onEdit?: (id: string, updates: { title?: string; description?: string }) => void;
    /** Handler for regenerating the item */
    onRegenerate?: (id: string) => void;
    /** Handler for removing the item */
    onRemove?: (id: string) => void;
    /** Whether the item is being regenerated */
    isRegenerating?: boolean;
    /** Whether editing is enabled */
    editable?: boolean;
    /** Custom actions to render */
    customActions?: React.ReactNode;
}

/**
 * EditableCard - A reusable card component for displaying and editing items
 * across features, stories, screens, and other list items.
 */
export function EditableCard({
    id,
    title,
    description,
    tags,
    badge,
    expandable = false,
    initialExpanded = false,
    expandedContent,
    onEdit,
    onRegenerate,
    onRemove,
    isRegenerating = false,
    editable = true,
    customActions,
}: EditableCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(title);
    const [editedDescription, setEditedDescription] = useState(description || '');
    const [isExpanded, setIsExpanded] = useState(initialExpanded);

    const handleSaveEdit = () => {
        if (onEdit) {
            onEdit(id, {
                title: editedTitle,
                description: editedDescription,
            });
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditedTitle(title);
        setEditedDescription(description || '');
        setIsEditing(false);
    };

    const cardStyle: React.CSSProperties = {
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
        boxShadow: shadows.sm,
        transition: transitions.normal,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: spacing.md,
    };

    const titleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        margin: 0,
    };

    const descriptionStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        margin: `${spacing.xs} 0 0 0`,
        lineHeight: typography.lineHeight.relaxed,
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: spacing.sm,
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.semibold,
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        color: colors.text.primary,
        outline: 'none',
    };

    const textareaStyle: React.CSSProperties = {
        ...inputStyle,
        fontWeight: typography.fontWeight.normal,
        fontSize: typography.fontSize.sm,
        minHeight: '60px',
        resize: 'vertical',
    };

    const actionsStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.xs,
        flexShrink: 0,
    };

    const tagStyle: React.CSSProperties = {
        display: 'inline-block',
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.sm,
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    };

    const badgeStyle: React.CSSProperties = {
        display: 'inline-block',
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        color: badge?.color || colors.accent,
        backgroundColor: badge?.backgroundColor || 'rgba(255, 191, 36, 0.15)',
        padding: `${spacing.xs} ${spacing.sm}`,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.sm,
        marginRight: spacing.sm,
    };

    return (
        <div style={cardStyle}>
            {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        style={inputStyle}
                        placeholder="Title"
                    />
                    <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        style={textareaStyle}
                        placeholder="Description"
                    />
                    <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
                        <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                            Cancel
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                            Save
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <div
                        style={headerStyle}
                        onClick={expandable ? () => setIsExpanded(!isExpanded) : undefined}
                        role={expandable ? 'button' : undefined}
                    >
                        <div style={{ flex: 1, cursor: expandable ? 'pointer' : 'default' }}>
                            <h4 style={titleStyle}>{title}</h4>

                            {/* Badge */}
                            {badge && (
                                <span style={badgeStyle}>
                                    {badge.text}
                                </span>
                            )}

                            {/* Description */}
                            {description && (
                                <p style={descriptionStyle}>{description}</p>
                            )}

                            {/* Tags */}
                            {tags && tags.length > 0 && (
                                <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.sm }}>
                                    {tags.map((tag, i) => (
                                        <span key={i} style={tagStyle}>{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={actionsStyle}>
                            {isRegenerating ? (
                                <Spinner size="sm" />
                            ) : (
                                <>
                                    {editable && onEdit && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsEditing(true);
                                            }}
                                            title="Edit"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </Button>
                                    )}
                                    {onRegenerate && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRegenerate(id);
                                            }}
                                            title="Regenerate"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                                <path d="M3 3v5h5" />
                                                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                                <path d="M16 21h5v-5" />
                                            </svg>
                                        </Button>
                                    )}
                                    {onRemove && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove(id);
                                            }}
                                            title="Remove"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M3 6h18" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </Button>
                                    )}
                                    {customActions}
                                    {expandable && (
                                        <svg
                                            width={16}
                                            height={16}
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke={colors.text.muted}
                                            strokeWidth={1.5}
                                            style={{
                                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: transitions.fast,
                                                marginLeft: spacing.xs,
                                            }}
                                        >
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Expanded content */}
                    {expandable && isExpanded && expandedContent && (
                        <div
                            style={{
                                marginTop: spacing.md,
                                paddingTop: spacing.md,
                                borderTop: `1px solid ${colors.border}`,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {expandedContent}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default EditableCard;
