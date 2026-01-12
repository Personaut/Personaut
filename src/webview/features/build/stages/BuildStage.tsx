import React from 'react';
import { colors, spacing, borderRadius, typography, shadows } from '../../../shared/theme';
import { Button, Spinner } from '../../../shared/components/ui';
import { Screen, Framework, IterationState } from '../types';

/**
 * BuildStage component props
 */
export interface BuildStageProps {
    /** Screens to build */
    screens: Screen[];
    /** Selected framework */
    framework: Framework;
    /** Project name */
    projectName: string;
    /** Code folder name */
    codeFolderName: string;
    /** Iteration state */
    iteration: IterationState;
    /** Handler to start build */
    onStartBuild: () => void;
    /** Handler to stop build */
    onStopBuild: () => void;
    /** Handler for going back */
    onBack: () => void;
    /** Loading state */
    isLoading?: boolean;
    /** Current page being built */
    currentPage?: { pageId: string; pageName: string; pageIndex: number; totalPages: number };
    /** Current phase */
    currentPhase?: 'design' | 'development' | 'review' | 'consolidation' | 'decision';
    /** Feedback from reviewers */
    feedback?: Array<{
        reviewerId: string;
        reviewerName: string;
        rating: number;
        comments: string;
        strengths: string[];
        improvements: string[];
    }>;
    /** Average rating */
    averageRating?: number;
    /** Handler for user decision */
    onDecision?: (decision: 'iterate' | 'next-page') => void;
}

/**
 * BuildStage component - Enhanced UI for build workflow
 */
export function BuildStage({
    screens,
    framework,
    projectName,
    codeFolderName,
    iteration,
    onStartBuild,
    onStopBuild,
    onBack,
    isLoading = false,
    currentPage,
    currentPhase,
    feedback,
    averageRating,
    onDecision,
}: BuildStageProps) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xl,
        maxWidth: '1200px',
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

    const sectionStyle: React.CSSProperties = {
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
        boxShadow: shadows.sm,
    };

    const buildInProgress = isLoading && !iteration.isComplete && currentPhase !== 'decision';
    const showFeedback = feedback && feedback.length > 0;
    const showDecision = currentPhase === 'decision' && !buildInProgress;

    // Phase indicator component
    const phases = [
        { id: 'design', label: 'Design', icon: '🎨' },
        { id: 'development', label: 'Development', icon: '💻' },
        { id: 'review', label: 'Review', icon: '👥' },
        { id: 'consolidation', label: 'Consolidation', icon: '📊' },
    ];

    const renderPhaseIndicator = () => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: spacing.md,
            backgroundColor: colors.background.tertiary,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.lg,
        }}>
            {phases.map((phase, index) => {
                const isActive = currentPhase === phase.id;
                const isComplete = phases.findIndex(p => p.id === currentPhase) > index;

                return (
                    <React.Fragment key={phase.id}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: spacing.xs,
                            flex: 1,
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                backgroundColor: isActive ? colors.primary : isComplete ? colors.success : colors.background.secondary,
                                border: `2px solid ${isActive ? colors.primary : isComplete ? colors.success : colors.border}`,
                                transition: 'all 0.3s ease',
                            }}>
                                {isComplete ? '✓' : phase.icon}
                            </div>
                            <span style={{
                                fontSize: typography.fontSize.xs,
                                color: isActive ? colors.primary : isComplete ? colors.success : colors.text.secondary,
                                fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
                            }}>
                                {phase.label}
                            </span>
                        </div>
                        {index < phases.length - 1 && (
                            <div style={{
                                flex: 0.5,
                                height: '2px',
                                backgroundColor: isComplete ? colors.success : colors.border,
                                transition: 'all 0.3s ease',
                            }} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );



    // Feedback display
    const renderFeedback = () => {
        if (!showFeedback || !feedback || feedback.length === 0) return null;

        return (
            <div style={sectionStyle}>
                <h3 style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.primary,
                    marginBottom: spacing.md,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                }}>
                    💬 Reviewer Feedback
                    {averageRating && (
                        <span style={{
                            marginLeft: 'auto',
                            fontSize: typography.fontSize.md,
                            color: averageRating >= 4 ? colors.success : averageRating >= 3 ? '#f59e0b' : colors.error,
                            fontWeight: typography.fontWeight.bold,
                        }}>
                            ⭐ {averageRating.toFixed(1)} / 5.0
                        </span>
                    )}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                    {feedback.map((review, index) => (
                        <div key={index} style={{
                            padding: spacing.md,
                            backgroundColor: colors.background.tertiary,
                            borderRadius: borderRadius.md,
                            border: `1px solid ${colors.border}`,
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: spacing.sm,
                            }}>
                                <span style={{
                                    fontWeight: typography.fontWeight.semibold,
                                    color: colors.text.primary,
                                }}>
                                    {review?.reviewerName || 'Unknown Reviewer'}
                                </span>
                                <span style={{
                                    fontSize: typography.fontSize.sm,
                                    color: (review?.rating || 0) >= 4 ? colors.success : (review?.rating || 0) >= 3 ? '#f59e0b' : colors.error,
                                    fontWeight: typography.fontWeight.bold,
                                }}>
                                    {'⭐'.repeat(Math.min(review?.rating || 0, 5))}
                                </span>
                            </div>

                            {review?.comments && (
                                <p style={{
                                    color: colors.text.secondary,
                                    fontSize: typography.fontSize.sm,
                                    marginBottom: spacing.sm,
                                    fontStyle: 'italic',
                                }}>
                                    "{review.comments}"
                                </p>
                            )}

                            {review?.strengths && Array.isArray(review.strengths) && review.strengths.length > 0 && (
                                <div style={{ marginBottom: spacing.xs }}>
                                    <strong style={{ color: colors.success, fontSize: typography.fontSize.xs }}>
                                        ✓ Strengths:
                                    </strong>
                                    <ul style={{ margin: `${spacing.xs} 0`, paddingLeft: spacing.lg }}>
                                        {review.strengths.map((strength, i) => (
                                            <li key={i} style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs }}>
                                                {strength}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {review?.improvements && Array.isArray(review.improvements) && review.improvements.length > 0 && (
                                <div>
                                    <strong style={{ color: '#f59e0b', fontSize: typography.fontSize.xs }}>
                                        ⚠ Improvements:
                                    </strong>
                                    <ul style={{ margin: `${spacing.xs} 0`, paddingLeft: spacing.lg }}>
                                        {review.improvements.map((improvement, i) => (
                                            <li key={i} style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs }}>
                                                {improvement}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Decision prompt
    const renderDecisionPrompt = () => {
        if (!showDecision) return null;

        return (
            <div style={{
                ...sectionStyle,
                borderColor: colors.primary,
                borderWidth: '2px',
            }}>
                <h3 style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.primary,
                    marginBottom: spacing.md,
                    textAlign: 'center',
                }}>
                    🤔 What would you like to do?
                </h3>

                <p style={{
                    color: colors.text.secondary,
                    textAlign: 'center',
                    marginBottom: spacing.lg,
                }}>
                    Review the feedback above and decide whether to iterate on this page or move to the next one.
                </p>

                <div style={{
                    display: 'flex',
                    gap: spacing.md,
                    justifyContent: 'center',
                }}>
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => onDecision?.('iterate')}
                        style={{ minWidth: '200px' }}
                    >
                        🔄 Iterate Again
                    </Button>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={() => onDecision?.('next-page')}
                        style={{ minWidth: '200px' }}
                    >
                        ➡️ Move to Next Page
                    </Button>
                </div>

                {iteration.currentIteration >= 3 && (
                    <div style={{
                        marginTop: spacing.md,
                        padding: spacing.sm,
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        border: `1px solid #f59e0b`,
                        borderRadius: borderRadius.md,
                        textAlign: 'center',
                    }}>
                        <span style={{ color: '#f59e0b', fontSize: typography.fontSize.sm }}>
                            ⚠️ You've completed {iteration.currentIteration} iterations. Consider moving to the next page to manage costs.
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h1 style={titleStyle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    Build
                </h1>
                {currentPage && (
                    <p style={{
                        fontSize: typography.fontSize.md,
                        color: colors.text.secondary,
                        fontWeight: typography.fontWeight.medium,
                    }}>
                        Building: <strong style={{ color: colors.primary }}>{currentPage.pageName}</strong>
                        {' '}(Page {currentPage.pageIndex + 1} of {currentPage.totalPages})
                        {' '}• Iteration {iteration.currentIteration}
                    </p>
                )}
            </div>

            {/* Build Configuration */}
            <div style={sectionStyle}>
                <h3 style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.primary,
                    marginBottom: spacing.md,
                }}>
                    ⚙️ Build Configuration
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                    <div>
                        <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Project Name</span>
                        <div style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>{projectName || 'Not set'}</div>
                    </div>
                    <div>
                        <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Framework</span>
                        <div style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>{framework}</div>
                    </div>
                    <div>
                        <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Total Screens</span>
                        <div style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>{screens.length}</div>
                    </div>
                    <div>
                        <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Code Folder</span>
                        <div style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>{codeFolderName || projectName || 'Not set'}</div>
                    </div>
                </div>
            </div>

            {/* Phase Indicator */}
            {buildInProgress && currentPhase && renderPhaseIndicator()}

            {/* Build Progress */}
            {buildInProgress && (
                <div style={sectionStyle}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: spacing.xl,
                    }}>
                        <Spinner size="lg" />
                        <div style={{
                            fontSize: typography.fontSize.md,
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.text.primary,
                        }}>
                            {iteration.isStopping ? 'Stopping build...' : 'Building...'}
                        </div>
                        <Button
                            variant="danger"
                            onClick={onStopBuild}
                            disabled={iteration.isStopping}
                        >
                            {iteration.isStopping ? 'Stopping...' : 'Stop Build'}
                        </Button>
                    </div>
                </div>
            )}



            {/* Feedback */}
            {renderFeedback()}

            {/* Decision Prompt */}
            {renderDecisionPrompt()}

            {/* Build Complete */}
            {iteration.isComplete && (
                <div style={sectionStyle}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: spacing.xl,
                    }}>
                        <span style={{ fontSize: '48px' }}>✅</span>
                        <div style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.success,
                        }}>
                            Build Complete!
                        </div>
                        <p style={{ color: colors.text.secondary, textAlign: 'center' }}>
                            Your application has been generated. Check the output folder for the code.
                        </p>
                        <Button variant="primary" onClick={onStartBuild}>
                            🔄 Rebuild
                        </Button>
                    </div>
                </div>
            )}

            {/* Build Error */}
            {iteration.lastError && (
                <div style={{
                    ...sectionStyle,
                    borderColor: colors.error,
                    backgroundColor: 'rgba(244, 135, 113, 0.1)',
                }}>
                    <div style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.error,
                        marginBottom: spacing.sm,
                    }}>
                        ❌ Build Error
                    </div>
                    <p style={{ color: colors.error, margin: 0 }}>{iteration.lastError}</p>
                </div>
            )}

            {/* Start Build */}
            {!buildInProgress && !iteration.isComplete && !showDecision && (
                <div style={{
                    textAlign: 'center',
                    padding: spacing.xl,
                    backgroundColor: colors.background.secondary,
                    borderRadius: borderRadius.xl,
                    border: `2px dashed ${colors.border}`,
                }}>
                    <p style={{
                        fontSize: typography.fontSize.md,
                        color: colors.text.secondary,
                        marginBottom: spacing.lg,
                    }}>
                        Ready to generate code for {screens.length} screen(s) using {framework}
                    </p>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={onStartBuild}
                        disabled={screens.length === 0}
                    >
                        {iteration.isPaused ? '▶️ Resume Build' : '🚀 Start Build'}
                    </Button>
                </div>
            )}

            <div style={{ display: 'flex', gap: spacing.md }}>
                <Button variant="secondary" onClick={onBack} disabled={isLoading}>
                    ← Back
                </Button>
            </div>
        </div>
    );
}

export default BuildStage;
