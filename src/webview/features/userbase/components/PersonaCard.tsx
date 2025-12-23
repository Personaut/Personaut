import React from 'react';
import { colors, spacing, borderRadius, typography, shadows, transitions } from '../../../shared/theme';
import { Persona } from '../types';

/**
 * PersonaCard component props
 */
export interface PersonaCardProps {
    /** Persona to display */
    persona: Persona;
    /** Whether this card is selected */
    isSelected?: boolean;
    /** Click handler */
    onClick?: () => void;
    /** Edit handler */
    onEdit?: () => void;
    /** Delete handler */
    onDelete?: () => void;
}

/**
 * Get initials from name
 */
const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

/**
 * Get avatar color based on name
 */
const getAvatarColor = (name: string): string => {
    const colors = [
        '#F59E0B', // amber
        '#10B981', // green
        '#3B82F6', // blue
        '#8B5CF6', // purple
        '#EC4899', // pink
        '#EF4444', // red
        '#06B6D4', // cyan
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
};

/**
 * PersonaCard component for displaying a persona in grid/list view.
 *
 * @example
 * ```tsx
 * <PersonaCard
 *   persona={persona}
 *   isSelected={selectedId === persona.id}
 *   onClick={() => selectPersona(persona.id)}
 *   onEdit={() => openEditor(persona)}
 * />
 * ```
 *
 * **Validates: Requirements 13.2**
 */
export function PersonaCard({
    persona,
    isSelected = false,
    onClick,
    onEdit,
    onDelete,
}: PersonaCardProps) {
    const cardStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        padding: spacing.lg,
        backgroundColor: isSelected ? 'rgba(255, 191, 36, 0.1)' : colors.background.secondary,
        border: `1px solid ${isSelected ? colors.accent : colors.border}`,
        borderRadius: borderRadius.lg,
        cursor: onClick ? 'pointer' : 'default',
        transition: transitions.normal,
        boxShadow: isSelected ? shadows.md : shadows.sm,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.md,
        marginBottom: spacing.md,
    };

    const avatarStyle: React.CSSProperties = {
        width: 48,
        height: 48,
        borderRadius: borderRadius.full,
        backgroundColor: persona.avatar ? 'transparent' : getAvatarColor(persona.name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: '#1E1E1E',
        flexShrink: 0,
    };

    const infoStyle: React.CSSProperties = {
        flex: 1,
        minWidth: 0,
    };

    const nameStyle: React.CSSProperties = {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };

    const metaStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    };

    const tagsStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginTop: spacing.md,
    };

    const tagStyle: React.CSSProperties = {
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    };

    const actionsStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.sm,
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTop: `1px solid ${colors.border}`,
    };

    const actionButtonStyle: React.CSSProperties = {
        flex: 1,
        padding: spacing.sm,
        backgroundColor: 'transparent',
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        cursor: 'pointer',
        transition: transitions.fast,
    };

    return (
        <div style={cardStyle} onClick={onClick}>
            <div style={headerStyle}>
                <div style={avatarStyle}>
                    {persona.avatar ? (
                        <img
                            src={persona.avatar}
                            alt={persona.name}
                            style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }}
                        />
                    ) : (
                        getInitials(persona.name)
                    )}
                </div>
                <div style={infoStyle}>
                    <div style={nameStyle}>{persona.name}</div>
                    <div style={metaStyle}>
                        {[persona.age && `${persona.age} years`, persona.occupation, persona.location]
                            .filter(Boolean)
                            .join(' • ')}
                    </div>
                </div>
            </div>

            {persona.background && (
                <p
                    style={{
                        margin: 0,
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        lineHeight: typography.lineHeight.relaxed,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                    }}
                >
                    {persona.background}
                </p>
            )}

            {persona.goals && persona.goals.length > 0 && (
                <div style={tagsStyle}>
                    {persona.goals.slice(0, 3).map((goal, i) => (
                        <span key={i} style={tagStyle}>
                            🎯 {goal}
                        </span>
                    ))}
                </div>
            )}

            {(onEdit || onDelete) && (
                <div style={actionsStyle} onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                        <button style={actionButtonStyle} onClick={onEdit}>
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button style={{ ...actionButtonStyle, color: colors.error }} onClick={onDelete}>
                            Delete
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default PersonaCard;
