import React, { useState, useRef, useEffect } from 'react';
import { ChatPersona } from '../types';
import { colors, spacing, borderRadius, typography } from '../../../shared/theme';

/**
 * PersonaSelector component props
 */
export interface PersonaSelectorProps {
    /** Currently selected persona */
    selectedPersona: ChatPersona;
    /** Handler for persona change */
    onPersonaChange: (persona: ChatPersona) => void;
    /** Custom personas from user base */
    customPersonas?: ChatPersona[];
}

/**
 * System agent icons (emoji)
 */
const SYSTEM_AGENT_ICONS: Record<string, string> = {
    'pippet': '🐾',
    'ux-designer': '🎨',
    'developer': '💻',
};

/**
 * Built-in personas available for chat
 */
const BUILT_IN_PERSONAS: ChatPersona[] = [
    {
        type: 'agent',
        id: 'pippet',
        name: 'Pippet',
        context: 'General AI assistant for personas, user research, and product development.',
    },
    {
        type: 'agent',
        id: 'ux-designer',
        name: 'UX Designer',
        context: 'Expert in user experience design, usability, and design systems.',
    },
    {
        type: 'agent',
        id: 'developer',
        name: 'Developer',
        context: 'Expert in software development, coding, and technical architecture.',
    },
];

/**
 * Maximum number of user personas to display
 */
const MAX_USER_PERSONAS = 5;

/**
 * Get initials from a name
 */
const getInitials = (name: string): string => {
    return name.charAt(0).toUpperCase();
};

/**
 * PersonaSelector component for switching between chat personas.
 *
 * Features:
 * - Dropdown menu with built-in personas
 * - Support for custom user personas (limited to 5)
 * - Visual indicator of current persona
 * - Emoji icons for system agents (🐾, 🎨, 💻)
 * - Initials for user personas
 * - Hover popovers showing persona details
 *
 * @example
 * ```tsx
 * <PersonaSelector
 *   selectedPersona={selectedPersona}
 *   onPersonaChange={setSelectedPersona}
 *   customPersonas={userPersonas}
 * />
 * ```
 *
 * **Validates: Requirements 1.1, 4.1, 4.2, 4.3, 4.4, 4.5, 8.5, 27.1**
 */
export function PersonaSelector({
    selectedPersona,
    onPersonaChange,
    customPersonas = [],
}: PersonaSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredPersona, setHoveredPersona] = useState<ChatPersona | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Limit custom personas to MAX_USER_PERSONAS
    const displayedCustomPersonas = customPersonas.slice(0, MAX_USER_PERSONAS);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-block',
    };

    const buttonStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        color: colors.text.primary,
        fontSize: typography.fontSize.xs,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    };

    const dropdownStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '100%',
        left: 0,
        marginBottom: spacing.xs,
        minWidth: '220px',
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 100,
        overflow: 'hidden',
    };

    const sectionHeaderStyle: React.CSSProperties = {
        padding: `${spacing.xs} ${spacing.sm}`,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.muted,
        backgroundColor: colors.background.tertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    };

    const itemStyle = (isSelected: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `${spacing.sm} ${spacing.md}`,
        cursor: 'pointer',
        backgroundColor: isSelected ? colors.primary + '20' : 'transparent',
        color: isSelected ? colors.primary : colors.text.primary,
        fontSize: typography.fontSize.sm,
        transition: 'background-color 0.15s ease',
        position: 'relative' as const,
    });

    const iconStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        fontSize: '16px',
    };

    const initialsStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: borderRadius.full,
        backgroundColor: colors.primary,
        color: colors.primaryForeground,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
    };

    const popoverStyle: React.CSSProperties = {
        position: 'absolute',
        left: '100%',
        top: '50%',
        transform: 'translateY(-50%)',
        marginLeft: spacing.sm,
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.sm,
        fontSize: typography.fontSize.xs,
        color: colors.text.primary,
        whiteSpace: 'nowrap',
        zIndex: 101,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    };

    /**
     * Get display element for a persona (emoji or initials)
     */
    const getPersonaDisplay = (persona: ChatPersona): React.ReactNode => {
        // System agents use emojis
        if (persona.type === 'agent' && persona.id && SYSTEM_AGENT_ICONS[persona.id]) {
            return <span style={iconStyle}>{SYSTEM_AGENT_ICONS[persona.id]}</span>;
        }

        // User personas use initials
        return <span style={initialsStyle}>{getInitials(persona.name)}</span>;
    };

    const handleSelect = (persona: ChatPersona) => {
        onPersonaChange(persona);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} style={containerStyle}>
            <button
                style={buttonStyle}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Select chat persona"
                aria-expanded={isOpen}
                title={`Current: ${selectedPersona.name}`}
            >
                {getPersonaDisplay(selectedPersona)}
                <span>{selectedPersona.name}</span>
                <svg
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                    }}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && (
                <div style={dropdownStyle}>
                    <div style={sectionHeaderStyle}>AI Assistants</div>
                    {BUILT_IN_PERSONAS.map((persona) => (
                        <div
                            key={persona.id}
                            style={itemStyle(selectedPersona.id === persona.id)}
                            onClick={() => handleSelect(persona)}
                            onMouseEnter={(e) => {
                                setHoveredPersona(persona);
                                if (selectedPersona.id !== persona.id) {
                                    e.currentTarget.style.backgroundColor = colors.background.tertiary;
                                }
                            }}
                            onMouseLeave={(e) => {
                                setHoveredPersona(null);
                                if (selectedPersona.id !== persona.id) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                            title={persona.context || persona.name}
                        >
                            {getPersonaDisplay(persona)}
                            <span>{persona.name}</span>
                            {hoveredPersona?.id === persona.id && (
                                <div style={popoverStyle}>{persona.context || persona.name}</div>
                            )}
                        </div>
                    ))}

                    {displayedCustomPersonas.length > 0 && (
                        <>
                            <div style={sectionHeaderStyle}>Your Personas</div>
                            <div style={{
                                maxHeight: '200px', // Approximately 5 personas (40px each)
                                overflowY: 'auto',
                                overflowX: 'hidden',
                            }}>
                                {displayedCustomPersonas.map((persona) => (
                                    <div
                                        key={persona.id}
                                        style={itemStyle(selectedPersona.id === persona.id)}
                                        onClick={() => handleSelect(persona)}
                                        onMouseEnter={(e) => {
                                            setHoveredPersona(persona);
                                            if (selectedPersona.id !== persona.id) {
                                                e.currentTarget.style.backgroundColor = colors.background.tertiary;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            setHoveredPersona(null);
                                            if (selectedPersona.id !== persona.id) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                        title={persona.context || persona.name}
                                    >
                                        {getPersonaDisplay(persona)}
                                        <span>{persona.name}</span>
                                        {hoveredPersona?.id === persona.id && (
                                            <div style={popoverStyle}>{persona.context || persona.name}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default PersonaSelector;
