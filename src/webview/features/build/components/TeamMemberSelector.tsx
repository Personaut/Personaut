import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';

/**
 * TeamMember definition
 */
export interface TeamMember {
    /** Member ID */
    id: string;
    /** Role name */
    role: string;
    /** Role icon */
    icon: string;
    /** Role description */
    description: string;
    /** Whether this role is mandatory */
    isMandatory?: boolean;
}

/**
 * TeamMemberSelector component props
 */
export interface TeamMemberSelectorProps {
    /** Available team members */
    members: TeamMember[];
    /** Selected member IDs */
    selectedIds: string[];
    /** Handler for selection change */
    onSelectionChange: (ids: string[]) => void;
    /** Whether selector is disabled */
    disabled?: boolean;
}

/**
 * Default team members
 */
export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
    {
        id: 'ux',
        role: 'UX',
        icon: '🎨',
        description: 'Creates user flows, wireframes, and screen designs',
        isMandatory: true,
    },
    {
        id: 'developer',
        role: 'Developer',
        icon: '💻',
        description: 'Implements the code based on UX specifications',
        isMandatory: true,
    },
];

/**
 * TeamMemberSelector component for selecting AI team members.
 *
 * @example
 * ```tsx
 * <TeamMemberSelector
 *   members={DEFAULT_TEAM_MEMBERS}
 *   selectedIds={selectedTeam}
 *   onSelectionChange={setSelectedTeam}
 * />
 * ```
 *
 * **Validates: Requirements 15.4**
 */
export function TeamMemberSelector({
    members,
    selectedIds,
    onSelectionChange,
    disabled = false,
}: TeamMemberSelectorProps) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
    };

    const memberCardStyle = (isSelected: boolean, isMandatory: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        backgroundColor: isSelected ? 'rgba(255, 191, 36, 0.1)' : colors.background.tertiary,
        border: `2px solid ${isSelected ? colors.accent : colors.border}`,
        borderRadius: borderRadius.lg,
        cursor: disabled || isMandatory ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: transitions.fast,
    });

    const iconStyle: React.CSSProperties = {
        fontSize: '24px',
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 191, 36, 0.1)',
        borderRadius: borderRadius.lg,
    };

    const infoStyle: React.CSSProperties = {
        flex: 1,
    };

    const roleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
    };

    const descStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    };

    const checkboxStyle = (isSelected: boolean, isMandatory: boolean): React.CSSProperties => ({
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
        opacity: isMandatory ? 0.7 : 1,
    });

    const mandatoryBadgeStyle: React.CSSProperties = {
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    };

    const handleToggle = (member: TeamMember) => {
        if (disabled || member.isMandatory) return;

        const newIds = selectedIds.includes(member.id)
            ? selectedIds.filter((id) => id !== member.id)
            : [...selectedIds, member.id];

        onSelectionChange(newIds);
    };

    return (
        <div style={containerStyle}>
            {members.map((member) => {
                const isSelected = selectedIds.includes(member.id);

                return (
                    <div
                        key={member.id}
                        style={memberCardStyle(isSelected, !!member.isMandatory)}
                        onClick={() => handleToggle(member)}
                        role="checkbox"
                        aria-checked={isSelected}
                    >
                        <div style={iconStyle}>{member.icon}</div>
                        <div style={infoStyle}>
                            <div style={roleStyle}>
                                <span>{member.role} Agent</span>
                                {member.isMandatory && (
                                    <span style={mandatoryBadgeStyle}>Required</span>
                                )}
                            </div>
                            <div style={descStyle}>{member.description}</div>
                        </div>
                        <div style={checkboxStyle(isSelected, !!member.isMandatory)}>
                            {isSelected && (
                                <svg
                                    width={14}
                                    height={14}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                >
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default TeamMemberSelector;
