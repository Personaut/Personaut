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
}

/**
 * BuildStage component - generates and iterates on code.
 *
 * @example
 * ```tsx
 * <BuildStage
 *   screens={generatedScreens}
 *   framework={selectedFramework}
 *   projectName={projectName}
 *   iteration={iteration}
 *   onStartBuild={handleStartBuild}
 *   onStopBuild={handleStopBuild}
 *   onBack={goToPreviousStage}
 * />
 * ```
 *
 * **Validates: Requirements 13.2**
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
}: BuildStageProps) {
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

    const sectionStyle: React.CSSProperties = {
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
        boxShadow: shadows.sm,
    };

    const infoRowStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        padding: `${spacing.sm} 0`,
        borderBottom: `1px solid ${colors.border}`,
    };

    const labelStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    };

    const valueStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.primary,
    };

    const progressStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.xl,
    };

    const buttonsStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.md,
        marginTop: spacing.lg,
    };

    const buildInProgress = isLoading && !iteration.isComplete;

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h1 style={titleStyle}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '8px' }}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>Build</h1>
                <p style={subtitleStyle}>
                    Generate code for your application based on the UX designs.
                </p>
            </div>

            {/* Build Summary */}
            <div style={sectionStyle}>
                <h3
                    style={{
                        fontSize: typography.fontSize.lg,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                        marginBottom: spacing.md,
                    }}
                >
                    Build Configuration
                </h3>
                <div style={infoRowStyle}>
                    <span style={labelStyle}>Project Name</span>
                    <span style={valueStyle}>{projectName || 'Not set'}</span>
                </div>
                <div style={infoRowStyle}>
                    <span style={labelStyle}>Code Folder</span>
                    <span style={valueStyle}>{codeFolderName || projectName || 'Not set'}</span>
                </div>
                <div style={infoRowStyle}>
                    <span style={labelStyle}>Framework</span>
                    <span style={valueStyle}>{framework}</span>
                </div>
                <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
                    <span style={labelStyle}>Screens</span>
                    <span style={valueStyle}>{screens.length}</span>
                </div>
            </div>

            {/* Build Progress */}
            {buildInProgress && (
                <div style={sectionStyle}>
                    <div style={progressStyle}>
                        <Spinner size="lg" />
                        <div
                            style={{
                                fontSize: typography.fontSize.md,
                                fontWeight: typography.fontWeight.semibold,
                                color: colors.text.primary,
                            }}
                        >
                            {iteration.isStopping ? 'Stopping build...' : 'Building...'}
                        </div>
                        {iteration.totalIterations > 0 && (
                            <div style={{ color: colors.text.secondary }}>
                                Iteration {iteration.currentIteration} of {iteration.totalIterations}
                            </div>
                        )}
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

            {/* Build Complete */}
            {iteration.isComplete && (
                <div style={sectionStyle}>
                    <div style={progressStyle}>
                        <span style={{ fontSize: '48px' }}>✅</span>
                        <div
                            style={{
                                fontSize: typography.fontSize.lg,
                                fontWeight: typography.fontWeight.semibold,
                                color: colors.success,
                            }}
                        >
                            Build Complete!
                        </div>
                        <p style={{ color: colors.text.secondary, textAlign: 'center' }}>
                            Your application has been generated. Check the output folder for the code.
                        </p>
                        <Button variant="primary" onClick={onStartBuild}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>Rebuild
                        </Button>
                    </div>
                </div>
            )}

            {/* Build Error */}
            {iteration.lastError && (
                <div
                    style={{
                        ...sectionStyle,
                        borderColor: colors.error,
                        backgroundColor: 'rgba(244, 135, 113, 0.1)',
                    }}
                >
                    <div
                        style={{
                            fontSize: typography.fontSize.sm,
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.error,
                            marginBottom: spacing.sm,
                        }}
                    >
                        Build Error
                    </div>
                    <p style={{ color: colors.error, margin: 0 }}>{iteration.lastError}</p>
                </div>
            )}

            {/* Start Build */}
            {!buildInProgress && !iteration.isComplete && (
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
                        Ready to generate code for {screens.length} screen(s) using {framework}
                    </p>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={onStartBuild}
                        disabled={screens.length === 0}
                    >
                        {iteration.isPaused ? (
                            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '6px' }}><path d="M5 3l14 9-14 9V3z" /></svg>Resume Build</>
                        ) : (
                            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '6px' }}><path d="M12 2v20M2 12h20" /><circle cx="12" cy="12" r="5" /></svg>Start Build</>
                        )}
                    </Button>
                </div>
            )}

            <div style={buttonsStyle}>
                <Button variant="secondary" onClick={onBack} disabled={isLoading}>
                    ← Back
                </Button>
            </div>
        </div>
    );
}

export default BuildStage;
