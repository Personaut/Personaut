import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';
import { Button, Spinner } from '../../../shared/components/ui';
import { IterationState } from '../types';

/**
 * IterationControls component props
 */
export interface IterationControlsProps {
    /** Iteration state */
    iteration: IterationState;
    /** Whether build is in progress */
    isBuilding: boolean;
    /** Start build handler */
    onStart: () => void;
    /** Stop build handler */
    onStop: () => void;
    /** Whether controls are disabled */
    disabled?: boolean;
}

/**
 * IterationControls component for starting/stopping builds.
 *
 * @example
 * ```tsx
 * <IterationControls
 *   iteration={iteration}
 *   isBuilding={isLoading}
 *   onStart={startBuild}
 *   onStop={stopBuild}
 * />
 * ```
 *
 * **Validates: Requirements 15.7**
 */
export function IterationControls({
    iteration,
    isBuilding,
    onStart,
    onStop,
    disabled = false,
}: IterationControlsProps) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        border: `1px solid ${colors.border}`,
    };

    const statusStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    };

    const progressStyle: React.CSSProperties = {
        width: '100%',
        maxWidth: 300,
        height: 8,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    };

    const progressFillStyle: React.CSSProperties = {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: borderRadius.full,
        transition: transitions.normal,
        width:
            iteration.totalIterations > 0
                ? `${(iteration.currentIteration / iteration.totalIterations) * 100}%`
                : '0%',
    };

    const iterationTextStyle: React.CSSProperties = {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
    };

    if (iteration.isComplete) {
        return (
            <div style={containerStyle}>
                <span style={{ fontSize: '48px' }}>✅</span>
                <span
                    style={{
                        fontSize: typography.fontSize.lg,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.success,
                    }}
                >
                    Build Complete!
                </span>
                <Button variant="primary" onClick={onStart} disabled={disabled}>
                    🔄 Rebuild
                </Button>
            </div>
        );
    }

    if (isBuilding) {
        return (
            <div style={containerStyle}>
                <Spinner size="lg" />
                <span style={iterationTextStyle}>Building...</span>
                {iteration.totalIterations > 0 && (
                    <>
                        <div style={progressStyle}>
                            <div style={progressFillStyle} />
                        </div>
                        <span style={statusStyle}>
                            Iteration {iteration.currentIteration} of {iteration.totalIterations}
                        </span>
                    </>
                )}
                <Button variant="danger" onClick={onStop}>
                    Stop Build
                </Button>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <span style={{ fontSize: '48px' }}>🚀</span>
            <span style={iterationTextStyle}>Ready to Build</span>
            <span style={statusStyle}>
                Click Start to begin the build process
            </span>
            <Button variant="primary" size="lg" onClick={onStart} disabled={disabled}>
                🚀 Start Build
            </Button>
        </div>
    );
}

export default IterationControls;
