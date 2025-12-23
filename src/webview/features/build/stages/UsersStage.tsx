import React, { useState } from 'react';
import { colors, spacing, borderRadius, typography, shadows, transitions } from '../../../shared/theme';
import { Button } from '../../../shared/components/ui';
import { GeneratedPersona, Demographics } from '../types';

/**
 * User persona from PersonaStorage (existing user profiles)
 */
export interface UserPersona {
    id: string;
    name: string;
    age?: string;
    occupation?: string;
    backstory?: string;
    attributes?: Record<string, string>;
}

/**
 * UsersStage component props
 */
export interface UsersStageProps {
    /** Current mode */
    mode: 'personas' | 'demographics';
    /** Handler for mode change */
    onModeChange: (mode: 'personas' | 'demographics') => void;
    /** Demographics data */
    demographics: Demographics;
    /** Handler for demographics change */
    onDemographicsChange: (demographics: Demographics) => void;
    /** Generated personas */
    generatedPersonas: GeneratedPersona[];
    /** Handler for persona changes */
    onPersonasChange: (personas: GeneratedPersona[]) => void;
    /** Handler to generate personas */
    onGeneratePersonas: () => void;
    /** Handler for proceeding to next stage */
    onNext: () => void;
    /** Handler for going back */
    onBack: () => void;
    /** Loading state */
    isLoading?: boolean;
    /** Available user personas from PersonaStorage */
    availablePersonas?: UserPersona[];
}

// TODO: Version 0.1.5 - Re-enable persona generation from demographics
// const DEMOGRAPHICS_FIELDS: Array<{
//     key: keyof Demographics;
//     label: string;
//     placeholder: string;
// }> = [
//     { key: 'ageRange', label: 'Age Range', placeholder: 'e.g., 25-45' },
//     { key: 'incomeRange', label: 'Income Range', placeholder: 'e.g., $50k-$100k' },
//     { key: 'gender', label: 'Gender', placeholder: 'e.g., All genders' },
//     { key: 'location', label: 'Location', placeholder: 'e.g., Urban areas, USA' },
//     { key: 'education', label: 'Education', placeholder: 'e.g., College degree' },
//     { key: 'occupation', label: 'Occupation', placeholder: 'e.g., Professional' },
// ];

const MAX_PERSONAS = 5;

/**
 * UsersStage component - select target users from existing personas.
 *
 * Features:
 * - Multi-select dropdown for existing user personas
 * - Maximum 5 personas can be selected
 * - Display selected persona cards
 *
 * @example
 * ```tsx
 * <UsersStage
 *   generatedPersonas={selectedPersonas}
 *   onPersonasChange={setSelectedPersonas}
 *   availablePersonas={userPersonas}
 *   onNext={goToNextStage}
 *   onBack={goToPreviousStage}
 * />
 * ```
 *
 * **Validates: Requirements 13.2**
 */
export function UsersStage({
    mode: _mode,
    onModeChange: _onModeChange,
    demographics: _demographics,
    onDemographicsChange: _onDemographicsChange,
    generatedPersonas,
    onPersonasChange,
    onGeneratePersonas: _onGeneratePersonas,
    onNext,
    onBack,
    isLoading = false,
    availablePersonas = [],
}: UsersStageProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xl,
        maxWidth: '800px',
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

    const sectionCardStyle: React.CSSProperties = {
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
        boxShadow: shadows.sm,
    };

    const sectionTitleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.md,
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
        color: colors.input.foreground,
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
        maxHeight: '300px',
        overflowY: 'auto',
        zIndex: 1000,
    };

    const dropdownItemStyle = (isSelected: boolean): React.CSSProperties => ({
        padding: spacing.md,
        cursor: 'pointer',
        backgroundColor: isSelected ? 'rgba(255, 191, 36, 0.1)' : 'transparent',
        borderBottom: `1px solid ${colors.border}`,
        transition: transitions.fast,
    });

    const personasGridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: spacing.md,
    };

    const personaCardStyle: React.CSSProperties = {
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
        boxShadow: shadows.sm,
        transition: transitions.normal,
    };

    const avatarStyle: React.CSSProperties = {
        width: 48,
        height: 48,
        borderRadius: borderRadius.full,
        backgroundColor: colors.amber[500],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        fontWeight: typography.fontWeight.bold,
        color: '#1E1E1E',
        marginBottom: spacing.md,
    };

    const buttonsStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.md,
        marginTop: spacing.lg,
    };

    const handleTogglePersona = (persona: UserPersona) => {
        const isSelected = generatedPersonas.some(p => p.id === persona.id);

        if (isSelected) {
            // Remove persona
            onPersonasChange(generatedPersonas.filter(p => p.id !== persona.id));
        } else {
            // Add persona (if under limit)
            if (generatedPersonas.length < MAX_PERSONAS) {
                const newPersona: GeneratedPersona = {
                    id: persona.id,
                    name: persona.name,
                    age: persona.age || 'Unknown',
                    occupation: persona.occupation || 'Unknown',
                    backstory: persona.backstory || 'No backstory available',
                    attributes: persona.attributes || {},
                };
                onPersonasChange([...generatedPersonas, newPersona]);
            }
        }
    };

    const handleRemovePersona = (id: string) => {
        onPersonasChange(generatedPersonas.filter((p) => p.id !== id));
    };

    const isValid = generatedPersonas.length > 0;
    const selectedCount = generatedPersonas.length;

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h1 style={titleStyle}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '8px' }}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>Select Your Target Users</h1>
                <p style={subtitleStyle}>
                    Choose up to {MAX_PERSONAS} user personas from your existing profiles to interview for this project.
                </p>
            </div>

            {/* Persona Selection Dropdown */}
            <div style={sectionCardStyle}>
                <h3 style={sectionTitleStyle}>
                    Select User Personas ({selectedCount}/{MAX_PERSONAS})
                </h3>

                <div style={dropdownContainerStyle}>
                    <button
                        style={dropdownButtonStyle}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        disabled={availablePersonas.length === 0}
                    >
                        <span style={{ color: selectedCount > 0 ? colors.text.primary : colors.text.muted }}>
                            {selectedCount > 0
                                ? `${selectedCount} persona${selectedCount > 1 ? 's' : ''} selected`
                                : availablePersonas.length > 0
                                    ? 'Select personas...'
                                    : 'No personas available - create some in User Base first'
                            }
                        </span>
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path d={isDropdownOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                        </svg>
                    </button>

                    {isDropdownOpen && availablePersonas.length > 0 && (
                        <div style={dropdownMenuStyle}>
                            {availablePersonas.map((persona) => {
                                const isSelected = generatedPersonas.some(p => p.id === persona.id);
                                const isDisabled = !isSelected && selectedCount >= MAX_PERSONAS;

                                return (
                                    <div
                                        key={persona.id}
                                        style={{
                                            ...dropdownItemStyle(isSelected),
                                            opacity: isDisabled ? 0.5 : 1,
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        }}
                                        onClick={() => !isDisabled && handleTogglePersona(persona)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                                            <div
                                                style={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: borderRadius.sm,
                                                    border: `2px solid ${isSelected ? colors.accent : colors.border}`,
                                                    backgroundColor: isSelected ? colors.accent : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {isSelected && (
                                                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#1E1E1E" strokeWidth={1.5}>
                                                        <path d="M20 6L9 17l-5-5" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                                                    {persona.name}
                                                </div>
                                                <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                                                    {persona.occupation || 'No occupation'} • {persona.age || 'Age unknown'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {availablePersonas.length === 0 && (
                    <div style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.md }}>
                        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, margin: 0 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '4px' }}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            You don't have any user personas yet. Go to the <strong>User Base</strong> view to create some personas first.
                        </p>
                    </div>
                )}
            </div>

            {/* TODO: Version 0.1.5 - Add "Generate New Personas" button that opens a modal with demographics form */}
            {/* <div style={sectionCardStyle}>
                <h3 style={sectionTitleStyle}>Or Generate New Personas</h3>
                <Button variant="secondary" onClick={() => setShowGenerateModal(true)}>
                    ✨ Generate Personas from Demographics
                </Button>
            </div> */}

            {/* Selected Personas Display */}
            {generatedPersonas.length > 0 && (
                <div>
                    <h3 style={sectionTitleStyle}>
                        Selected Personas ({generatedPersonas.length})
                    </h3>
                    <div style={personasGridStyle}>
                        {generatedPersonas.map((persona) => (
                            <div key={persona.id} style={personaCardStyle}>
                                <div style={avatarStyle}>
                                    {persona.name.charAt(0).toUpperCase()}
                                </div>
                                <div
                                    style={{
                                        fontSize: typography.fontSize.md,
                                        fontWeight: typography.fontWeight.semibold,
                                        color: colors.text.primary,
                                        marginBottom: spacing.xs,
                                    }}
                                >
                                    {persona.name}
                                </div>
                                <div
                                    style={{
                                        fontSize: typography.fontSize.sm,
                                        color: colors.text.secondary,
                                        marginBottom: spacing.sm,
                                    }}
                                >
                                    {persona.age} • {persona.occupation}
                                </div>
                                <p
                                    style={{
                                        fontSize: typography.fontSize.sm,
                                        color: colors.text.secondary,
                                        lineHeight: typography.lineHeight.relaxed,
                                        marginBottom: spacing.md,
                                    }}
                                >
                                    {persona.backstory}
                                </p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemovePersona(persona.id)}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={buttonsStyle}>
                <Button variant="secondary" onClick={onBack} disabled={isLoading}>
                    ← Back
                </Button>
                <Button
                    variant="primary"
                    onClick={onNext}
                    loading={isLoading}
                    disabled={!isValid}
                    fullWidth
                >
                    Continue to Features →
                </Button>
            </div>
        </div>
    );
}

export default UsersStage;
