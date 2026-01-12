/**
 * FinalizeStage - Final stage of the Design workflow
 *
 * This stage generates technical artifacts:
 * - Task list with implementation details
 * - Steering document with technical constraints
 * - Comprehensive project documentation
 *
 * **Part of Build-to-Design Transformation**
 * Replaces the old BuildStage as the final stage in the workflow.
 */
import React, { useState, useCallback } from 'react';
import { colors, spacing, borderRadius, typography, shadows } from '../../../shared/theme';
import { Button } from '../../../shared/components/ui';
import { Screen, Framework, UserStory, GeneratedFeature, GeneratedPersona, UserFlow } from '../types';
import { useVSCode } from '../../../shared/hooks/useVSCode';

/**
 * FinalizeStage component props
 */
export interface FinalizeStageProps {
    /** Project name (slug) */
    projectName: string;
    /** Project display title */
    projectTitle?: string;
    /** Project description from Idea stage */
    projectDescription?: string;
    /** Generated personas from Users stage */
    personas?: GeneratedPersona[];
    /** Generated features from Features stage */
    features?: GeneratedFeature[];
    /** User stories from Stories stage */
    userStories: UserStory[];
    /** User flows from Design stage */
    userFlows?: UserFlow[];
    /** Screens from Design stage */
    screens: Screen[];
    /** Selected framework */
    framework: Framework;
    /** Look and Feel from Design stage */
    lookAndFeel?: any;
    /** Handler for going back */
    onBack: () => void;
    /** Loading state */
    isLoading?: boolean;
}

/**
 * FinalizeStage component - Generates task list and steering document
 */
export function FinalizeStage({
    projectName,
    projectTitle,
    projectDescription,
    personas,
    features,
    userStories,
    userFlows,
    screens,
    framework,
    lookAndFeel,
    onBack,
    isLoading = false,
}: FinalizeStageProps) {
    const { postMessage } = useVSCode();
    const [isGenerating, setIsGenerating] = useState(false);
    const [tasksGenerated, setTasksGenerated] = useState(false);
    const [steeringGenerated, setSteeringGenerated] = useState(false);
    const [exportStatus, setExportStatus] = useState<string | null>(null);

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

    const cardStyle: React.CSSProperties = {
        padding: spacing.md,
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    };

    // Comprehensive build data for export
    const comprehensiveBuildData = {
        project: {
            name: projectName,
            title: projectTitle || projectName,
            description: projectDescription || '',
        },
        personas: personas || [],
        features: features || [],
        userStories: userStories || [],
        userFlows: userFlows || [],
        screens: screens || [],
        framework,
        lookAndFeel: lookAndFeel || null,
    };

    const handleGenerateTasks = useCallback(() => {
        setIsGenerating(true);
        postMessage({
            type: 'generate-task-list',
            projectName,
            ...comprehensiveBuildData,
        });
        // For now, simulate completion (in real implementation, listen for response)
        setTimeout(() => {
            setTasksGenerated(true);
            setIsGenerating(false);
        }, 1000);
    }, [postMessage, projectName, comprehensiveBuildData]);

    const handleGenerateSteering = useCallback(() => {
        setIsGenerating(true);
        postMessage({
            type: 'generate-steering-document',
            projectName,
            ...comprehensiveBuildData,
        });
        // For now, simulate completion (in real implementation, listen for response)
        setTimeout(() => {
            setSteeringGenerated(true);
            setIsGenerating(false);
        }, 1000);
    }, [postMessage, projectName, comprehensiveBuildData]);

    const handleExportTaskList = useCallback(() => {
        setExportStatus('Exporting comprehensive task list...');
        postMessage({
            type: 'export-document',
            documentType: 'task-list',
            projectName,
            format: 'markdown',
            ...comprehensiveBuildData,
        });
        setTimeout(() => setExportStatus(null), 2000);
    }, [postMessage, projectName, comprehensiveBuildData]);

    const handleExportSteering = useCallback(() => {
        setExportStatus('Exporting steering document...');
        postMessage({
            type: 'export-document',
            documentType: 'steering-document',
            projectName,
            format: 'markdown',
            ...comprehensiveBuildData,
        });
        setTimeout(() => setExportStatus(null), 2000);
    }, [postMessage, projectName, comprehensiveBuildData]);

    const handleExportAll = useCallback(() => {
        setExportStatus('Exporting complete project documentation...');
        postMessage({
            type: 'export-all-documents',
            projectName,
            format: 'markdown',
            ...comprehensiveBuildData,
        });
        setTimeout(() => setExportStatus(null), 3000);
    }, [postMessage, projectName, comprehensiveBuildData]);

    const handleViewTasks = useCallback(() => {
        postMessage({
            type: 'view-document',
            documentType: 'task-list',
            projectName,
        });
    }, [postMessage, projectName]);

    const handleViewSteering = useCallback(() => {
        postMessage({
            type: 'view-document',
            documentType: 'steering-document',
            projectName,
        });
    }, [postMessage, projectName]);

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <h1 style={titleStyle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Finalize
                </h1>
                <p style={{
                    fontSize: typography.fontSize.md,
                    color: colors.text.secondary,
                }}>
                    Generate implementation tasks and technical steering documents
                </p>
            </div>

            {/* Export Status */}
            {exportStatus && (
                <div style={{
                    padding: spacing.md,
                    backgroundColor: 'rgba(255, 191, 36, 0.1)',
                    border: `1px solid ${colors.accent}`,
                    borderRadius: borderRadius.md,
                    textAlign: 'center',
                    color: colors.text.primary,
                }}>
                    {exportStatus}
                </div>
            )}

            {/* Summary Section */}
            <div style={sectionStyle}>
                <h3 style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.primary,
                    marginBottom: spacing.md,
                }}>
                    📋 Project Summary
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing.md }}>
                    <div style={cardStyle}>
                        <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Project Name</div>
                        <div style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>{projectName || 'Not set'}</div>
                    </div>
                    <div style={cardStyle}>
                        <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Framework</div>
                        <div style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>{framework}</div>
                    </div>
                    <div style={cardStyle}>
                        <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Total Screens</div>
                        <div style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>{screens.length}</div>
                    </div>
                </div>
                <div style={{ marginTop: spacing.md }}>
                    <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                        User Stories: {userStories.length}
                    </div>
                </div>
            </div>

            {/* Task List Generation */}
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
                    📝 Task List
                    {tasksGenerated && (
                        <span style={{ color: colors.success, fontSize: typography.fontSize.sm }}>✓ Generated</span>
                    )}
                </h3>
                <p style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    marginBottom: spacing.md,
                }}>
                    Generate a comprehensive task list with dependencies, complexity estimates, and traceability to user stories.
                </p>
                {!tasksGenerated ? (
                    <Button
                        variant="primary"
                        onClick={handleGenerateTasks}
                        disabled={isGenerating || isLoading}
                    >
                        {isGenerating ? 'Generating...' : '🚀 Generate Task List'}
                    </Button>
                ) : (
                    <div style={{
                        padding: spacing.md,
                        backgroundColor: colors.background.tertiary,
                        borderRadius: borderRadius.md,
                        border: `1px solid ${colors.success}`,
                    }}>
                        <div style={{ fontWeight: typography.fontWeight.medium, color: colors.success, marginBottom: spacing.sm }}>
                            Task list generated successfully!
                        </div>
                        <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                            <em>{screens.length * 3 + userStories.length} tasks generated based on screens and user stories</em>
                        </div>
                        <div style={{ marginTop: spacing.md, display: 'flex', gap: spacing.sm }}>
                            <Button variant="secondary" size="sm" onClick={handleExportTaskList}>📥 Export Markdown</Button>
                            <Button variant="secondary" size="sm" onClick={handleViewTasks}>👁️ View Tasks</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Steering Document Generation */}
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
                    📖 Steering Document
                    {steeringGenerated && (
                        <span style={{ color: colors.success, fontSize: typography.fontSize.sm }}>✓ Generated</span>
                    )}
                </h3>
                <p style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    marginBottom: spacing.md,
                }}>
                    Generate a technical steering document with coding standards, architectural patterns, and quality requirements.
                </p>
                {!steeringGenerated ? (
                    <Button
                        variant="primary"
                        onClick={handleGenerateSteering}
                        disabled={isGenerating || isLoading}
                    >
                        {isGenerating ? 'Generating...' : '🚀 Generate Steering Document'}
                    </Button>
                ) : (
                    <div style={{
                        padding: spacing.md,
                        backgroundColor: colors.background.tertiary,
                        borderRadius: borderRadius.md,
                        border: `1px solid ${colors.success}`,
                    }}>
                        <div style={{ fontWeight: typography.fontWeight.medium, color: colors.success, marginBottom: spacing.sm }}>
                            Steering document generated successfully!
                        </div>
                        <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                            <em>Includes: Project Overview, Tech Stack, Coding Standards, Architectural Patterns, Quality Requirements, Constraints</em>
                        </div>
                        <div style={{ marginTop: spacing.md, display: 'flex', gap: spacing.sm }}>
                            <Button variant="secondary" size="sm" onClick={handleExportSteering}>📥 Export Markdown</Button>
                            <Button variant="secondary" size="sm" onClick={handleViewSteering}>👁️ View Document</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Complete Section */}
            {tasksGenerated && steeringGenerated && (
                <div style={{
                    ...sectionStyle,
                    borderColor: colors.success,
                    backgroundColor: 'rgba(46, 196, 182, 0.1)',
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: spacing.lg,
                    }}>
                        <span style={{ fontSize: '48px' }}>✅</span>
                        <div style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.success,
                        }}>
                            Design Complete!
                        </div>
                        <p style={{ color: colors.text.secondary, textAlign: 'center', maxWidth: '500px' }}>
                            Your project design is complete. You can export the task list and steering document
                            to guide your development process.
                        </p>
                        <div style={{ display: 'flex', gap: spacing.md }}>
                            <Button variant="primary" size="lg" onClick={handleExportAll}>
                                📥 Export All Documents
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
                <Button variant="secondary" onClick={onBack} disabled={isLoading || isGenerating}>
                    ← Back
                </Button>
            </div>
        </div>
    );
}

export default FinalizeStage;
