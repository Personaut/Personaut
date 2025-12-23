import React from 'react';
import { colors, spacing, borderRadius, typography, shadows, transitions, zIndex } from '../../../shared/theme';
import { BuildStage, BUILD_STAGES, STAGE_INFO } from '../types';

/**
 * StageProgress component props
 */
export interface StageProgressProps {
    /** Current active stage */
    currentStage: BuildStage;
    /** Array of completed stages */
    completedStages: BuildStage[];
    /** Handler for stage navigation */
    onStageClick?: (stage: BuildStage) => void;
    /** Whether navigation is disabled */
    disabled?: boolean;
}

/**
 * Check if a stage can be navigated to
 */
function canNavigate(
    stage: BuildStage,
    currentStage: BuildStage,
    completedStages: BuildStage[]
): boolean {
    const targetIndex = BUILD_STAGES.indexOf(stage);
    const currentIndex = BUILD_STAGES.indexOf(currentStage);

    // Can always go backwards
    if (targetIndex <= currentIndex) return true;

    // Can only go forward if all previous stages are complete
    for (let i = 0; i < targetIndex; i++) {
        if (!completedStages.includes(BUILD_STAGES[i])) return false;
    }
    return true;
}

/**
 * StageProgress component - displays build stage progress with navigation.
 *
 * Features:
 * - Sticky positioning at top of build view
 * - Visual completion checkmarks
 * - Click to navigate between stages
 * - Disabled states for unreachable stages
 *
 * @example
 * ```tsx
 * <StageProgress
 *   currentStage="features"
 *   completedStages={['idea', 'team', 'users']}
 *   onStageClick={setCurrentStage}
 * />
 * ```
 *
 * **Validates: Requirements 32.1, 32.2, 32.3, 36.3**
 */
export function StageProgress({
    currentStage,
    completedStages,
    onStageClick,
    disabled = false,
}: StageProgressProps) {
    const containerStyle: React.CSSProperties = {
        position: 'sticky',
        top: 0,
        zIndex: zIndex.sticky,
        backgroundColor: colors.background.secondary,
        borderBottom: `1px solid ${colors.border}`,
        padding: `${spacing.md} ${spacing.lg}`,
        boxShadow: shadows.sm,
    };

    const progressBarStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.xs,
    };

    return (
        <div style={containerStyle}>
            <div style={progressBarStyle}>
                {BUILD_STAGES.map((stage, index) => {
                    const info = STAGE_INFO[stage];
                    const isActive = stage === currentStage;
                    const isComplete = completedStages.includes(stage);
                    const canNav = canNavigate(stage, currentStage, completedStages);
                    const isClickable = onStageClick && canNav && !disabled;

                    return (
                        <React.Fragment key={stage}>
                            <StageItem
                                stage={stage}
                                icon={info.icon}
                                label={info.label}
                                isActive={isActive}
                                isComplete={isComplete}
                                isClickable={!!isClickable}
                                onClick={isClickable ? () => onStageClick(stage) : undefined}
                            />
                            {index < BUILD_STAGES.length - 1 && (
                                <StageConnector isComplete={isComplete} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Individual stage item
 */
interface StageItemProps {
    stage: BuildStage;
    icon: string;
    label: string;
    isActive: boolean;
    isComplete: boolean;
    isClickable: boolean;
    onClick?: () => void;
}

function StageItem({
    stage: _stage,
    icon,
    label,
    isActive,
    isComplete,
    isClickable,
    onClick,
}: StageItemProps) {
    const itemStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing.xs,
        cursor: isClickable ? 'pointer' : 'default',
        opacity: isActive || isComplete ? 1 : 0.5,
        transition: transitions.fast,
        padding: spacing.sm,
        borderRadius: borderRadius.lg,
        backgroundColor: isActive ? 'rgba(255, 191, 36, 0.1)' : 'transparent',
        border: isActive ? `1px solid ${colors.accent}` : '1px solid transparent',
        minWidth: '60px',
    };

    const iconContainerStyle: React.CSSProperties = {
        width: 32,
        height: 32,
        borderRadius: borderRadius.full,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        backgroundColor: isComplete
            ? colors.success
            : isActive
                ? colors.accent
                : colors.background.tertiary,
        color: isComplete || isActive ? '#1E1E1E' : colors.text.muted,
        position: 'relative',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
        color: isActive ? colors.text.primary : colors.text.secondary,
        textAlign: 'center',
    };

    return (
        <div style={itemStyle} onClick={onClick} role={isClickable ? 'button' : undefined}>
            <div style={iconContainerStyle}>
                {isComplete ? (
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                ) : (
                    <div dangerouslySetInnerHTML={{ __html: icon }} />
                )}
            </div>
            <span style={labelStyle}>{label}</span>
        </div>
    );
}

/**
 * Connector line between stages
 */
function StageConnector({ isComplete }: { isComplete: boolean }) {
    const connectorStyle: React.CSSProperties = {
        flex: 1,
        height: 2,
        backgroundColor: isComplete ? colors.success : colors.border,
        transition: transitions.slow,
        minWidth: spacing.md,
        maxWidth: spacing.xl,
    };

    return <div style={connectorStyle} />;
}

export default StageProgress;
