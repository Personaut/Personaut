import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../../shared/theme';
import { Button, Spinner } from '../../../shared/components/ui';
import { EditableCard } from '../../../shared/components/EditableCard';
import { UserStory, GeneratedFeature } from '../types';

/**
 * StoriesStage component props
 */
export interface StoriesStageProps {
    /** Features to generate stories from */
    features: GeneratedFeature[];
    /** User stories */
    stories: UserStory[];
    /** Handler for stories change */
    onStoriesChange: (stories: UserStory[]) => void;
    /** Handler to generate stories */
    onGenerateStories: () => void;
    /** Handler to edit a story */
    onEditStory?: (id: string, updates: { title?: string; description?: string }) => void;
    /** Handler to regenerate a story */
    onRegenerateStory?: (id: string) => void;
    /** Handler for proceeding to next stage */
    onNext: () => void;
    /** Handler for going back */
    onBack: () => void;
    /** Loading state */
    isLoading?: boolean;
    /** ID of story being regenerated */
    regeneratingStoryId?: string | null;
}

/**
 * StoriesStage component - generates user stories with requirements.
 *
 * @example
 * ```tsx
 * <StoriesStage
 *   features={generatedFeatures}
 *   stories={userStories}
 *   onStoriesChange={setUserStories}
 *   onGenerateStories={handleGenerateStories}
 *   onNext={goToNextStage}
 *   onBack={goToPreviousStage}
 * />
 * ```
 *
 * **Validates: Requirements 13.2**
 */
export function StoriesStage({
    features,
    stories,
    onStoriesChange,
    onGenerateStories,
    onEditStory,
    onRegenerateStory,
    onNext,
    onBack,
    isLoading = false,
    regeneratingStoryId,
}: StoriesStageProps) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xl,
        maxWidth: '900px',
        margin: '0 auto',
    };

    const headerStyle: React.CSSProperties = {
        textAlign: 'center',
        marginBottom: spacing.lg,
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '24px',
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    };

    const subtitleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.md,
        color: colors.text.secondary,
        lineHeight: typography.lineHeight.relaxed,
    };

    const buttonsStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.md,
        marginTop: spacing.lg,
    };

    const handleRemoveStory = (id: string) => {
        onStoriesChange(stories.filter((s) => s.id !== id));
    };

    const isValid = stories.length > 0;

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h1 style={titleStyle}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '8px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>User Stories</h1>
                <p style={subtitleStyle}>
                    Generate detailed user stories from your {features.length} feature(s).
                </p>
            </div>

            {/* Generate button */}
            {stories.length === 0 && !isLoading && (
                <div
                    style={{
                        textAlign: 'center',
                        padding: spacing.xl,
                        backgroundColor: colors.background.secondary,
                        borderRadius: borderRadius.xl,
                        border: `2px dashed ${colors.border}`,
                    }}
                >
                    <p
                        style={{
                            fontSize: typography.fontSize.md,
                            color: colors.text.secondary,
                            marginBottom: spacing.lg,
                        }}
                    >
                        Generate user stories with requirements and acceptance criteria
                    </p>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={onGenerateStories}
                        disabled={features.length === 0}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '6px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                        Generate User Stories
                    </Button>
                </div>
            )}

            {/* Loading state */}
            {isLoading && stories.length === 0 && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: spacing.xl,
                    }}
                >
                    <Spinner size="lg" />
                    <span style={{ color: colors.text.secondary }}>
                        Generating user stories from features...
                    </span>
                </div>
            )}

            {/* Stories list */}
            {stories.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <h3
                            style={{
                                fontSize: typography.fontSize.lg,
                                fontWeight: typography.fontWeight.semibold,
                                color: colors.text.primary,
                            }}
                        >
                            User Stories ({stories.length})
                        </h3>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onGenerateStories}
                            loading={isLoading}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
                            Regenerate
                        </Button>
                    </div>

                    {stories.map((story) => {
                        const priorityColor = story.priority === 'High' ? '#ef4444' : story.priority === 'Medium' ? '#f59e0b' : '#22c55e';
                        const priorityBg = story.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : story.priority === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)';

                        return (
                            <EditableCard
                                key={story.id}
                                id={story.id}
                                title={story.title}
                                description={story.description}
                                badge={story.featureName ? {
                                    text: `📦 ${story.featureName}`,
                                    color: colors.accent,
                                    backgroundColor: 'rgba(255, 191, 36, 0.15)',
                                } : story.priority ? {
                                    text: story.priority,
                                    color: priorityColor,
                                    backgroundColor: priorityBg,
                                } : undefined}
                                expandable={true}
                                initialExpanded={story.expanded}
                                editable={!!onEditStory}
                                onEdit={onEditStory ? (id, updates) => onEditStory(id, { title: updates.title, description: updates.description }) : undefined}
                                onRegenerate={onRegenerateStory}
                                onRemove={handleRemoveStory}
                                isRegenerating={regeneratingStoryId === story.id}
                                expandedContent={
                                    <>
                                        {/* Requirements */}
                                        {story.requirements && story.requirements.length > 0 && (
                                            <div style={{ marginBottom: spacing.md }}>
                                                <h5
                                                    style={{
                                                        fontSize: typography.fontSize.sm,
                                                        fontWeight: typography.fontWeight.medium,
                                                        color: colors.text.primary,
                                                        marginBottom: spacing.sm,
                                                    }}
                                                >
                                                    Requirements
                                                </h5>
                                                <ul
                                                    style={{
                                                        margin: 0,
                                                        paddingLeft: spacing.lg,
                                                        color: colors.text.secondary,
                                                        fontSize: typography.fontSize.sm,
                                                    }}
                                                >
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
                                            <div>
                                                <h5
                                                    style={{
                                                        fontSize: typography.fontSize.sm,
                                                        fontWeight: typography.fontWeight.medium,
                                                        color: colors.text.primary,
                                                        marginBottom: spacing.sm,
                                                    }}
                                                >
                                                    Acceptance Criteria
                                                </h5>
                                                <ul
                                                    style={{
                                                        margin: 0,
                                                        paddingLeft: spacing.lg,
                                                        color: colors.text.secondary,
                                                        fontSize: typography.fontSize.sm,
                                                    }}
                                                >
                                                    {story.acceptanceCriteria.map((criteria, i) => (
                                                        <li key={i} style={{ marginBottom: spacing.xs }}>
                                                            {criteria}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                }
                            />
                        );
                    })}
                </div>
            )}

            <div style={buttonsStyle}>
                <Button variant="secondary" onClick={onBack} disabled={isLoading}>
                    ← Back
                </Button>
                <Button
                    variant="primary"
                    onClick={onNext}
                    loading={isLoading}
                    disabled={!isValid}
                    fullWidth
                >
                    Continue to Design →
                </Button>
            </div>
        </div>
    );
}

export default StoriesStage;
