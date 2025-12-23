import React from 'react';
import { colors, spacing } from '../../../shared/theme';
import { StageProgress } from './StageProgress';
import { BuildStage } from '../types';

/**
 * BuildLayout component props
 */
export interface BuildLayoutProps {
    /** Current active stage */
    currentStage: BuildStage;
    /** Array of completed stages */
    completedStages: BuildStage[];
    /** Handler for stage navigation */
    onStageClick?: (stage: BuildStage) => void;
    /** Main content to render for current stage */
    children: React.ReactNode;
    /** Optional logs component to render at bottom */
    logsComponent?: React.ReactNode;
}

/**
 * BuildLayout component - provides the layout structure for build mode.
 *
 * Features:
 * - Single scroll context for all stages
 * - Sticky StageProgress at top
 * - Optional BuildLogs at bottom
 *
 * @example
 * ```tsx
 * <BuildLayout
 *   currentStage="features"
 *   completedStages={['idea', 'team', 'users']}
 *   onStageClick={setCurrentStage}
 *   logsComponent={<BuildLogsPanel logs={logs} />}
 * >
 *   <FeaturesStage />
 * </BuildLayout>
 * ```
 *
 * **Validates: Requirements 31.1, 31.2, 32.1**
 */
export function BuildLayout({
    currentStage,
    completedStages,
    onStageClick,
    children,
    logsComponent,
}: BuildLayoutProps) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.background.primary,
        overflow: 'hidden',
    };

    const scrollContainerStyle: React.CSSProperties = {
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
    };

    const contentStyle: React.CSSProperties = {
        flex: 1,
        padding: spacing.lg,
        minHeight: 0,
    };

    const logsContainerStyle: React.CSSProperties = {
        borderTop: `1px solid ${colors.border}`,
        maxHeight: '200px',
        overflowY: 'auto',
    };

    return (
        <div style={containerStyle}>
            <div style={scrollContainerStyle}>
                <StageProgress
                    currentStage={currentStage}
                    completedStages={completedStages}
                    onStageClick={onStageClick}
                />
                <div style={contentStyle}>{children}</div>
            </div>
            {logsComponent && <div style={logsContainerStyle}>{logsComponent}</div>}
        </div>
    );
}

export default BuildLayout;
