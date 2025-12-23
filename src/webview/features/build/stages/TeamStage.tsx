import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../../shared/theme';
import { Button } from '../../../shared/components/ui';

/**
 * TeamStage component props
 */
export interface TeamStageProps {
    /** Development flow order */
    devFlowOrder: string[];
    /** Handler for flow order change */
    onDevFlowOrderChange?: (order: string[]) => void;
    /** Handler for proceeding to next stage */
    onNext: () => void;
    /** Handler for going back */
    onBack: () => void;
    /** Loading state */
    isLoading?: boolean;
}

/**
 * Default team members
 */
const DEFAULT_TEAM = ['UX', 'Developer'];

/**
 * Team member info
 */
const TEAM_INFO: Record<string, { icon: string; description: string }> = {
    UX: {
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
        description: 'Creates user flows, wireframes, and screen designs',
    },
    Developer: {
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
        description: 'Implements the code based on UX specifications',
    },
};

/**
 * TeamStage component - configures the development workflow.
 *
 * Features:
 * - Display read-only team flow
 * - Shows UX → Developer → User Feedback pipeline
 *
 * @example
 * ```tsx
 * <TeamStage
 *   devFlowOrder={['UX', 'Developer']}
 *   onNext={goToNextStage}
 *   onBack={goToPreviousStage}
 * />
 * ```
 *
 * **Validates: Requirements 5.5**
 */
export function TeamStage({
    devFlowOrder = DEFAULT_TEAM,
    onNext,
    onBack,
    isLoading = false,
}: TeamStageProps) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xl,
        maxWidth: '600px',
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

    const flowContainerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        border: `1px solid ${colors.border}`,
    };

    const flowItemStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
    };

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

    const nameStyle: React.CSSProperties = {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    };

    const descStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    };

    const arrowStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        color: colors.text.muted,
    };

    const buttonsStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.md,
        marginTop: spacing.lg,
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h1 style={titleStyle}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '8px' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>Development Iteration Flow</h1>
                <p style={subtitleStyle}>
                    Your AI team will iterate through this workflow to build your application.
                </p>
            </div>

            <div style={flowContainerStyle}>
                {devFlowOrder.map((member, index) => (
                    <React.Fragment key={member}>
                        <div style={flowItemStyle}>
                            <div style={iconStyle} dangerouslySetInnerHTML={{ __html: TEAM_INFO[member]?.icon || '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' }} />
                            <div style={infoStyle}>
                                <div style={nameStyle}>{member} Agent</div>
                                <div style={descStyle}>
                                    {TEAM_INFO[member]?.description || 'Team member'}
                                </div>
                            </div>
                        </div>
                        {index < devFlowOrder.length - 1 && (
                            <div style={arrowStyle}>
                                <svg
                                    width={24}
                                    height={24}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <path d="M12 5v14M5 12l7 7 7-7" />
                                </svg>
                            </div>
                        )}
                    </React.Fragment>
                ))}
                {/* Always show User Feedback at the end */}
                <div style={arrowStyle}>
                    <svg
                        width={24}
                        height={24}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                </div>
                <div style={flowItemStyle}>
                    <div style={iconStyle}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg></div>
                    <div style={infoStyle}>
                        <div style={nameStyle}>User Feedback</div>
                        <div style={descStyle}>
                            Review output and provide feedback for the next iteration
                        </div>
                    </div>
                </div>
            </div>

            <div style={buttonsStyle}>
                <Button variant="secondary" onClick={onBack} disabled={isLoading}>
                    ← Back
                </Button>
                <Button
                    variant="primary"
                    onClick={onNext}
                    loading={isLoading}
                    fullWidth
                >
                    Continue to Users →
                </Button>
            </div>
        </div>
    );
}

export default TeamStage;
