import React, { useState } from 'react';
import { colors, spacing, borderRadius, typography, transitions, shadows } from '../../../shared/theme';
import { Input, Button } from '../../../shared/components/ui';

/**
 * IdeaStage component props
 */
export interface IdeaStageProps {
    /** Current project name */
    projectName: string;
    /** Handler for project name change */
    onProjectNameChange: (name: string) => void;
    /** Current project title/idea */
    projectTitle: string;
    /** Handler for project title change */
    onProjectTitleChange: (title: string) => void;
    /** Handler for proceeding to next stage */
    onNext: () => void;
    /** Loading state */
    isLoading?: boolean;
    /** Validation error */
    error?: string;
    /** Project history for selection */
    projectHistory?: string[];
    /** Handler for selecting from history */
    onSelectProject?: (name: string) => void;
}

type ProjectMode = 'existing' | 'new';

/**
 * Validate project name
 */
const validateProjectName = (name: string): string | null => {
    if (!name.trim()) {
        return 'Project name is required';
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
        return 'Project name can only contain letters, numbers, hyphens, and underscores';
    }
    if (name.length < 3) {
        return 'Project name must be at least 3 characters';
    }
    if (name.length > 50) {
        return 'Project name must be less than 50 characters';
    }
    return null;
};

/**
 * IdeaStage component - first stage of build mode.
 *
 * Features:
 * - Mode selection (existing project or new project)
 * - Project selection dropdown for existing projects
 * - Project name input with validation for new projects
 * - Project title/description input
 * - Proceed to next stage
 *
 * @example
 * ```tsx
 * <IdeaStage
 *   projectName={projectName}
 *   onProjectNameChange={setProjectName}
 *   projectTitle={projectTitle}
 *   onProjectTitleChange={setProjectTitle}
 *   onNext={goToNextStage}
 *   projectHistory={['project-1', 'project-2']}
 *   onSelectProject={loadProject}
 * />
 * ```
 *
 * **Validates: Requirements 15.1, 21.1, 21.3**
 */
export function IdeaStage({
    projectName,
    onProjectNameChange,
    projectTitle,
    onProjectTitleChange,
    onNext,
    isLoading = false,
    error: externalError,
    projectHistory = [],
    onSelectProject,
}: IdeaStageProps) {
    const [touched, setTouched] = useState(false);
    const [mode, setMode] = useState<ProjectMode>(projectHistory.length > 0 ? 'existing' : 'new');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const validationError = touched ? validateProjectName(projectName) : null;
    const error = externalError || validationError;
    const isValid = !error && projectName.trim() && projectTitle.trim();

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

    const modeTabsStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.xs,
        padding: spacing.xs,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
    };

    const modeTabStyle = (isActive: boolean): React.CSSProperties => ({
        flex: 1,
        padding: `${spacing.sm} ${spacing.md}`,
        backgroundColor: isActive ? colors.background.primary : 'transparent',
        border: 'none',
        borderRadius: borderRadius.md,
        color: isActive ? colors.text.primary : colors.text.secondary,
        fontSize: typography.fontSize.sm,
        fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
        cursor: 'pointer',
        transition: transitions.fast,
        boxShadow: isActive ? shadows.sm : 'none',
    });

    const sectionStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
    };

    const labelStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.primary,
    };

    const dropdownContainerStyle: React.CSSProperties = {
        position: 'relative',
        width: '100%',
    };

    const dropdownButtonStyle: React.CSSProperties = {
        width: '100%',
        padding: spacing.md,
        backgroundColor: colors.input.background,
        border: `1px solid ${colors.input.border}`,
        borderRadius: borderRadius.lg,
        color: projectName ? colors.text.primary : colors.text.muted,
        fontSize: typography.fontSize.md,
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    const dropdownMenuStyle: React.CSSProperties = {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: spacing.xs,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.md,
        maxHeight: '250px',
        overflowY: 'auto',
        zIndex: 1000,
    };

    const dropdownItemStyle: React.CSSProperties = {
        padding: spacing.md,
        cursor: 'pointer',
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        transition: transitions.fast,
        borderBottom: `1px solid ${colors.border}`,
    };

    const handleProjectNameBlur = () => {
        setTouched(true);
    };

    const handleSelectProject = (name: string) => {
        onSelectProject?.(name);
        setIsDropdownOpen(false);
    };

    const handleModeChange = (newMode: ProjectMode) => {
        setMode(newMode);
        if (newMode === 'new') {
            onProjectNameChange('');
            onProjectTitleChange('');
        }
        setTouched(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (isValid) {
            onNext();
        }
    };

    return (
        <form style={containerStyle} onSubmit={handleSubmit}>
            <div style={headerStyle}>
                <h1 style={titleStyle}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{verticalAlign: 'middle', marginRight: '8px'}}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>What's your idea?</h1>
                <p style={subtitleStyle}>
                    {projectHistory.length > 0
                        ? 'Continue working on an existing project or start a new one.'
                        : 'Let\'s start by giving your project a name and describing what you want to build.'
                    }
                </p>
            </div>

            {/* Mode Selection Tabs */}
            {projectHistory.length > 0 && (
                <div style={modeTabsStyle}>
                    <button
                        type="button"
                        style={modeTabStyle(mode === 'existing')}
                        onClick={() => handleModeChange('existing')}
                    >
                        📂 Select Existing Project
                    </button>
                    <button
                        type="button"
                        style={modeTabStyle(mode === 'new')}
                        onClick={() => handleModeChange('new')}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{verticalAlign: 'middle', marginRight: '6px'}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Create New Project
                    </button>
                </div>
            )}

            {/* Existing Project Selection */}
            {mode === 'existing' && projectHistory.length > 0 && (
                <div style={sectionStyle}>
                    <label style={labelStyle}>Select Project</label>
                    <div style={dropdownContainerStyle}>
                        <button
                            type="button"
                            style={dropdownButtonStyle}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span>
                                {projectName || 'Choose a project to continue...'}
                            </span>
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d={isDropdownOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                            </svg>
                        </button>

                        {isDropdownOpen && (
                            <div style={dropdownMenuStyle}>
                                {projectHistory.map((name) => (
                                    <div
                                        key={name}
                                        style={dropdownItemStyle}
                                        onClick={() => handleSelectProject(name)}
                                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                            (e.target as HTMLElement).style.backgroundColor = colors.background.tertiary;
                                        }}
                                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                            (e.target as HTMLElement).style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <div style={{ fontWeight: typography.fontWeight.semibold }}>
                                            {name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {projectName && (
                        <div style={{
                            fontSize: typography.fontSize.xs,
                            color: colors.text.secondary,
                            padding: spacing.sm,
                            backgroundColor: colors.background.tertiary,
                            borderRadius: borderRadius.md,
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{verticalAlign: 'middle', marginRight: '4px'}}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/></svg>Selected: <strong>{projectName}</strong>
                        </div>
                    )}
                </div>
            )}

            {/* New Project Creation */}
            {mode === 'new' && (
                <div style={sectionStyle}>
                    <label style={labelStyle}>Project Name</label>
                    <Input
                        value={projectName}
                        onChange={(e) => onProjectNameChange(e.target.value)}
                        onBlur={handleProjectNameBlur}
                        placeholder="my-awesome-project"
                        error={error || undefined}
                        helperText="A unique identifier for your project (letters, numbers, hyphens)"
                        fullWidth
                    />
                </div>
            )}

            {/* Project Description (shown for both modes) */}
            <div style={sectionStyle}>
                <label style={labelStyle}>
                    {mode === 'existing' ? 'Update Project Description (Optional)' : 'Project Description'}
                </label>
                <textarea
                    value={projectTitle}
                    onChange={(e) => onProjectTitleChange(e.target.value)}
                    placeholder="Describe your project idea in a few sentences..."
                    rows={4}
                    style={{
                        width: '100%',
                        padding: spacing.md,
                        backgroundColor: colors.input.background,
                        border: `1px solid ${colors.input.border}`,
                        borderRadius: borderRadius.lg,
                        color: colors.input.foreground,
                        fontSize: typography.fontSize.md,
                        lineHeight: typography.lineHeight.relaxed,
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                    }}
                />
            </div>

            <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                disabled={!isValid}
            >
                {mode === 'existing' ? 'Continue with Selected Project →' : 'Continue to Team Setup →'}
            </Button>
        </form>
    );
}

export default IdeaStage;

