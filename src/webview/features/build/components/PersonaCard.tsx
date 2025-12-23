import React from 'react';
import { colors, spacing, borderRadius, typography, shadows, transitions } from '../../../shared/theme';
import { GeneratedPersona } from '../types';

/**
 * PersonaCard component props
 */
export interface PersonaCardProps {
    /** Persona to display */
    persona: GeneratedPersona;
    /** Whether selected */
    isSelected?: boolean;
    /** Toggle selection handler */
    onToggleSelect?: () => void;
    /** Remove handler */
    onRemove?: () => void;
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
    const colorPalette = [
        colors.amber[500],
        colors.success,
        '#3B82F6', // blue
        '#8B5CF6', // purple
        '#EC4899', // pink
        '#EF4444', // red
        '#06B6D4', // cyan
    ];
    const index = name.charCodeAt(0) % colorPalette.length;
    return colorPalette[index];
};

/**
 * PersonaCard component for displaying a generated persona.
 *
 * @example
 * ```tsx
 * <PersonaCard
 *   persona={persona}
 *   isSelected={selectedIds.includes(persona.id)}
 *   onToggleSelect={() => toggleSelect(persona.id)}
 *   onRemove={() => removePersona(persona.id)}
 * />
 * ```
 *
 * **Validates: Requirements 15.2, 22.1**
 */
export function PersonaCard({
    persona,
    isSelected = false,
    onToggleSelect,
    onRemove,
}: PersonaCardProps) {
    const cardStyle: React.CSSProperties = {
        padding: spacing.lg,
        backgroundColor: isSelected ? 'rgba(255, 191, 36, 0.1)' : colors.background.secondary,
        border: `2px solid ${isSelected ? colors.accent : colors.border}`,
        borderRadius: borderRadius.xl,
        boxShadow: isSelected ? shadows.md : shadows.sm,
        cursor: onToggleSelect ? 'pointer' : 'default',
        transition: transitions.normal,
    };

    const avatarStyle: React.CSSProperties = {
        width: 48,
        height: 48,
        borderRadius: borderRadius.full,
        backgroundColor: getAvatarColor(persona.name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: '#1E1E1E',
        marginBottom: spacing.md,
    };

    const nameStyle: React.CSSProperties = {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    };

    const metaStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    };

    const backstoryStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: typography.lineHeight.relaxed,
        marginBottom: spacing.md,
    };

    const attributesStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing.xs,
    };

    const attributeTagStyle: React.CSSProperties = {
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    };

    const removeButtonStyle: React.CSSProperties = {
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: 'transparent',
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        cursor: 'pointer',
        transition: transitions.fast,
        marginTop: spacing.md,
    };

    return (
        <div style={cardStyle} onClick={onToggleSelect}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
                <div style={avatarStyle}>{getInitials(persona.name)}</div>
                <div style={{ flex: 1 }}>
                    <div style={nameStyle}>{persona.name}</div>
                    <div style={metaStyle}>
                        {persona.age} • {persona.occupation}
                    </div>
                </div>
                {onToggleSelect && (
                    <div
                        style={{
                            width: 22,
                            height: 22,
                            borderRadius: borderRadius.md,
                            border: `2px solid ${isSelected ? colors.accent : colors.border}`,
                            backgroundColor: isSelected ? colors.accent : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#1E1E1E',
                            flexShrink: 0,
                        }}
                    >
                        {isSelected && (
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        )}
                    </div>
                )}
            </div>

            <p style={backstoryStyle}>{persona.backstory}</p>

            {persona.attributes && Object.keys(persona.attributes).length > 0 && (
                <div style={attributesStyle}>
                    {Object.entries(persona.attributes).map(([key, value]) => (
                        <span key={key} style={attributeTagStyle}>
                            {key}: {value}
                        </span>
                    ))}
                </div>
            )}

            {onRemove && (
                <button
                    style={removeButtonStyle}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                >
                    Remove
                </button>
            )}
        </div>
    );
}

export default PersonaCard;
