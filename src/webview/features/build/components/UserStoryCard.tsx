import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';
import { Button } from '../../../shared/components/ui';
import { UserStory } from '../types';

/**
 * UserStoryCard component props
 */
export interface UserStoryCardProps {
    /** Story to display */
    story: UserStory;
    /** Toggle expand handler */
    onToggleExpand?: () => void;
    /** Remove handler */
    onRemove?: () => void;
    /** Edit requirement handler */
    onEditRequirement?: (index: number, value: string) => void;
}

/**
 * UserStoryCard component for displaying a user story.
 *
 * @example
 * ```tsx
 * <UserStoryCard
 *   story={story}
 *   onToggleExpand={() => toggleStory(story.id)}
 *   onRemove={() => removeStory(story.id)}
 * />
 * ```
 *
 * **Validates: Requirements 15.5, 22.1**
 */
export function UserStoryCard({
    story,
    onToggleExpand,
    onRemove,
    onEditRequirement: _onEditRequirement,
}: UserStoryCardProps) {
    const cardStyle: React.CSSProperties = {
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
        cursor: onToggleExpand ? 'pointer' : 'default',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    };

    const chevronStyle: React.CSSProperties = {
        color: colors.text.muted,
        transition: transitions.fast,
        transform: story.expanded ? 'rotate(180deg)' : 'rotate(0deg)',
    };

    const sectionTitleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    };

    const listStyle: React.CSSProperties = {
        margin: 0,
        paddingLeft: spacing.lg,
        color: colors.text.secondary,
        fontSize: typography.fontSize.sm,
        lineHeight: typography.lineHeight.relaxed,
    };

    return (
        <div style={cardStyle} onClick={onToggleExpand}>
            <div style={headerStyle}>
                <div style={{ flex: 1 }}>
                    <h4
                        style={{
                            fontSize: typography.fontSize.md,
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.text.primary,
                            marginBottom: spacing.xs,
                            marginTop: 0,
                        }}
                    >
                        {story.title}
                    </h4>
                    <p
                        style={{
                            fontSize: typography.fontSize.sm,
                            color: colors.text.secondary,
                            margin: 0,
                            lineHeight: typography.lineHeight.relaxed,
                        }}
                    >
                        {story.description}
                    </p>
                </div>
                <svg
                    style={chevronStyle}
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </div>

            {story.expanded && (
                <div
                    style={{
                        marginTop: spacing.md,
                        paddingTop: spacing.md,
                        borderTop: `1px solid ${colors.border}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Requirements */}
                    {story.requirements.length > 0 && (
                        <div style={{ marginBottom: spacing.md }}>
                            <h5 style={sectionTitleStyle}>Requirements</h5>
                            <ul style={listStyle}>
                                {story.requirements.map((req, i) => (
                                    <li key={i} style={{ marginBottom: spacing.xs }}>
                                        {req}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Acceptance Criteria */}
                    {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
                        <div style={{ marginBottom: spacing.md }}>
                            <h5 style={sectionTitleStyle}>Acceptance Criteria</h5>
                            <ul style={listStyle}>
                                {story.acceptanceCriteria.map((criteria, i) => (
                                    <li key={i} style={{ marginBottom: spacing.xs }}>
                                        {criteria}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Clarifying Questions */}
                    {story.clarifyingQuestions.length > 0 && (
                        <div style={{ marginBottom: spacing.md }}>
                            <h5 style={sectionTitleStyle}>Clarifying Questions</h5>
                            {story.clarifyingQuestions.map((qa, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: spacing.sm,
                                        backgroundColor: colors.background.tertiary,
                                        borderRadius: borderRadius.md,
                                        marginBottom: spacing.xs,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: typography.fontSize.sm,
                                            fontWeight: typography.fontWeight.medium,
                                            color: colors.text.primary,
                                            marginBottom: spacing.xs,
                                        }}
                                    >
                                        Q: {qa.question}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: typography.fontSize.sm,
                                            color: colors.text.secondary,
                                        }}
                                    >
                                        A: {qa.answer}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {onRemove && (
                        <Button variant="ghost" size="sm" onClick={onRemove}>
                            Remove Story
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

export default UserStoryCard;
