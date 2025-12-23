import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';
import { FeedbackPersona, MAX_FEEDBACK_PERSONAS } from '../types';

/**
 * PersonaMultiSelect component props
 */
export interface PersonaMultiSelectProps {
    /** Available personas */
    personas: FeedbackPersona[];
    /** Selected persona IDs */
    selectedIds: string[];
    /** Toggle selection handler */
    onToggle: (personaId: string) => void;
    /** Maximum selection count */
    maxSelection?: number;
    /** Disabled state */
    disabled?: boolean;
}

/**
 * PersonaMultiSelect component for selecting personas for feedback.
 *
 * @example
 * ```tsx
 * <PersonaMultiSelect
 *   personas={availablePersonas}
 *   selectedIds={selectedPersonaIds}
 *   onToggle={togglePersonaSelection}
 *   maxSelection={5}
 * />
 * ```
 *
 * **Validates: Requirements 13.3**
 */
export function PersonaMultiSelect({
    personas,
    selectedIds,
    onToggle,
    maxSelection = MAX_FEEDBACK_PERSONAS,
    disabled = false,
}: PersonaMultiSelectProps) {
    const isAtLimit = selectedIds.length >= maxSelection;

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    const titleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.secondary,
    };

    const countContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: isAtLimit ? `${colors.warning}15` : colors.background.tertiary,
        borderRadius: borderRadius.md,
        border: `1px solid ${isAtLimit ? colors.warning : 'transparent'}`,
    };

    const countStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: isAtLimit ? colors.warning : colors.text.muted,
    };

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: spacing.sm,
    };

    const personaCardStyle = (isSelected: boolean, isDisabled: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        backgroundColor: isSelected
            ? `${colors.accent}15`
            : colors.background.tertiary,
        border: `2px solid ${isSelected ? colors.accent : 'transparent'}`,
        borderRadius: borderRadius.lg,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled && !isSelected ? 0.5 : 1,
        transition: transitions.fast,
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isSelected ? `0 4px 12px ${colors.accent}20` : 'none',
    });

    const avatarStyle = (isSelected: boolean): React.CSSProperties => ({
        width: 36,
        height: 36,
        borderRadius: borderRadius.full,
        background: isSelected
            ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.amber[600]} 100%)`
            : `linear-gradient(135deg, ${colors.amber[400]} 0%, ${colors.amber[600]} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
        color: '#1E1E1E',
        flexShrink: 0,
        boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
    });

    const checkBadgeStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: borderRadius.full,
        backgroundColor: colors.success,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        border: `2px solid ${colors.background.secondary}`,
    };

    const personaInfoStyle: React.CSSProperties = {
        flex: 1,
        minWidth: 0,
    };

    const personaNameStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };

    const personaRoleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };

    const getInitials = (name: string): string => {
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleClick = (personaId: string) => {
        if (disabled) return;
        const isSelected = selectedIds.includes(personaId);
        if (!isSelected && isAtLimit) return;
        onToggle(personaId);
    };

    const emptyStateStyle: React.CSSProperties = {
        padding: spacing.xl,
        textAlign: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        border: `2px dashed ${colors.border}`,
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <span style={titleStyle}>Choose up to {maxSelection} personas</span>
                <div style={countContainerStyle}>
                    {isAtLimit && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    )}
                    <span style={countStyle}>
                        {selectedIds.length} / {maxSelection}
                    </span>
                </div>
            </div>

            {personas.length === 0 ? (
                <div style={emptyStateStyle}>
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={colors.text.muted}
                        strokeWidth={1.5}
                        style={{ marginBottom: spacing.sm, opacity: 0.5 }}
                    >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, fontWeight: typography.fontWeight.medium }}>
                        No personas available
                    </div>
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                        Generate personas in Build mode first
                    </div>
                </div>
            ) : (
                <div style={gridStyle}>
                    {personas.map((persona) => {
                        const isSelected = selectedIds.includes(persona.id);
                        const isDisabled = disabled || (!isSelected && isAtLimit);

                        return (
                            <div
                                key={persona.id}
                                style={personaCardStyle(isSelected, isDisabled)}
                                onClick={() => handleClick(persona.id)}
                                role="checkbox"
                                aria-checked={isSelected}
                            >
                                <div style={{ position: 'relative' }}>
                                    <div style={avatarStyle(isSelected)}>
                                        {getInitials(persona.name)}
                                    </div>
                                    {isSelected && (
                                        <div style={checkBadgeStyle}>
                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div style={personaInfoStyle}>
                                    <div style={personaNameStyle}>{persona.name}</div>
                                    {persona.occupation && <div style={personaRoleStyle}>{persona.occupation}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default PersonaMultiSelect;
