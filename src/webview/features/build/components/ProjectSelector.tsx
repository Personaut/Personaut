import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../../shared/theme';
import { Button } from '../../../shared/components/ui';

/**
 * ProjectSelector component props
 */
export interface ProjectSelectorProps {
    /** Current project name */
    value: string;
    /** Handler for selection change */
    onChange: (name: string) => void;
    /** Project history */
    projectHistory: string[];
    /** Handler for creating new project */
    onCreateNew?: () => void;
    /** Placeholder text */
    placeholder?: string;
    /** Whether selector is disabled */
    disabled?: boolean;
}

/**
 * ProjectSelector component for selecting from project history.
 *
 * @example
 * ```tsx
 * <ProjectSelector
 *   value={projectName}
 *   onChange={setProjectName}
 *   projectHistory={['project-1', 'project-2']}
 *   onCreateNew={() => setShowCreateNew(true)}
 * />
 * ```
 *
 * **Validates: Requirements 15.1**
 */
export function ProjectSelector({
    value,
    onChange,
    projectHistory,
    onCreateNew,
    placeholder = 'Select a project...',
    disabled = false,
}: ProjectSelectorProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const containerStyle: React.CSSProperties = {
        position: 'relative',
    };

    const triggerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        backgroundColor: colors.input.background,
        border: `1px solid ${colors.input.border}`,
        borderRadius: borderRadius.lg,
        color: value ? colors.input.foreground : colors.input.placeholderForeground,
        fontSize: typography.fontSize.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        width: '100%',
    };

    const dropdownStyle: React.CSSProperties = {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: spacing.xs,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 100,
        maxHeight: 250,
        overflowY: 'auto',
    };

    const optionStyle: React.CSSProperties = {
        padding: spacing.md,
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        cursor: 'pointer',
        borderBottom: `1px solid ${colors.border}`,
    };

    const handleSelect = (name: string) => {
        onChange(name);
        setIsOpen(false);
    };

    return (
        <div style={containerStyle} ref={containerRef}>
            <div
                style={triggerStyle}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span>{value || placeholder}</span>
                <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 150ms ease',
                    }}
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </div>

            {isOpen && (
                <div style={dropdownStyle} role="listbox">
                    {projectHistory.length === 0 ? (
                        <div
                            style={{
                                padding: spacing.lg,
                                textAlign: 'center',
                                color: colors.text.muted,
                            }}
                        >
                            No projects yet
                        </div>
                    ) : (
                        projectHistory.map((name) => (
                            <div
                                key={name}
                                style={{
                                    ...optionStyle,
                                    backgroundColor: value === name ? 'rgba(255, 191, 36, 0.1)' : 'transparent',
                                }}
                                onClick={() => handleSelect(name)}
                                onMouseEnter={(e) => {
                                    if (value !== name) {
                                        (e.target as HTMLElement).style.backgroundColor =
                                            colors.background.tertiary;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (value !== name) {
                                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                                    }
                                }}
                                role="option"
                                aria-selected={value === name}
                            >
                                {name}
                            </div>
                        ))
                    )}
                    {onCreateNew && (
                        <div
                            style={{
                                padding: spacing.md,
                                borderTop: projectHistory.length > 0 ? `1px solid ${colors.border}` : 'none',
                            }}
                        >
                            <Button variant="ghost" size="sm" fullWidth onClick={onCreateNew}>
                                + Create New Project
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ProjectSelector;
