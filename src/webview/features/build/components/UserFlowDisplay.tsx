import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';
import { UserFlow } from '../types';

/**
 * UserFlowDisplay component props
 */
export interface UserFlowDisplayProps {
    /** Flow to display */
    flow: UserFlow;
    /** Whether expanded */
    isExpanded?: boolean;
    /** Toggle expand handler */
    onToggleExpand?: () => void;
}

/**
 * UserFlowDisplay component for showing a user flow with steps.
 *
 * @example
 * ```tsx
 * <UserFlowDisplay
 *   flow={flow}
 *   isExpanded={expandedFlowId === flow.id}
 *   onToggleExpand={() => toggleFlow(flow.id)}
 * />
 * ```
 *
 * **Validates: Requirements 15.6**
 */
export function UserFlowDisplay({
    flow,
    isExpanded = true,
    onToggleExpand,
}: UserFlowDisplayProps) {
    const containerStyle: React.CSSProperties = {
        padding: spacing.md,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: onToggleExpand ? 'pointer' : 'default',
    };

    const nameStyle: React.CSSProperties = {
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    };

    const descriptionStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    };

    const stepsContainerStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing.xs,
        alignItems: 'center',
    };

    const stepStyle: React.CSSProperties = {
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    };

    const arrowStyle: React.CSSProperties = {
        color: colors.text.muted,
        fontSize: typography.fontSize.sm,
    };

    const chevronStyle: React.CSSProperties = {
        color: colors.text.muted,
        transition: transitions.fast,
        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle} onClick={onToggleExpand}>
                <div>
                    <div style={nameStyle}>{flow.name}</div>
                    {isExpanded && <div style={descriptionStyle}>{flow.description}</div>}
                </div>
                {onToggleExpand && (
                    <svg
                        style={chevronStyle}
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                )}
            </div>

            {isExpanded && (
                <div style={stepsContainerStyle}>
                    {flow.steps.map((step, i) => (
                        <React.Fragment key={i}>
                            <span style={stepStyle}>{step}</span>
                            {i < flow.steps.length - 1 && <span style={arrowStyle}>→</span>}
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
}

export default UserFlowDisplay;
