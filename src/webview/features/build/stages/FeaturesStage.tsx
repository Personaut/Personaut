import React, { useState, useEffect } from 'react';
import { colors, spacing, borderRadius, typography, shadows, transitions } from '../../../shared/theme';
import { Button, Spinner } from '../../../shared/components/ui';
import { GeneratedFeature, GeneratedPersona } from '../types';

/**
 * FeaturesStage component props
 */
export interface FeaturesStageProps {
    /** Generated personas for interviews */
    personas: GeneratedPersona[];
    /** Generated features */
    features: GeneratedFeature[];
    /** Handler for features change */
    onFeaturesChange: (features: GeneratedFeature[]) => void;
    /** Handler to generate features */
    onGenerateFeatures: () => void;
    /** Handler for proceeding to next stage */
    onNext: () => void;
    /** Handler for going back */
    onBack: () => void;
    /** Loading state */
    isLoading?: boolean;
}

/**
 * Priority badge colors
 */
const PRIORITY_COLORS: Record<string, string> = {
    high: colors.error,
    medium: colors.warning,
    low: colors.success,
};

/**
 * FeaturesStage component - defines key features through user interviews.
 *
 * Features:
 * - Interview personas to generate feature ideas
 * - Display feature cards with priority and frequency
 * - Show survey responses from each persona
 * - Handle up to 5 personas and 20+ features
 *
 * @example
 * ```tsx
 * <FeaturesStage
 *   personas={generatedPersonas}
 *   features={generatedFeatures}
 *   onFeaturesChange={setGeneratedFeatures}
 *   onGenerateFeatures={handleGenerateFeatures}
 *   onNext={goToNextStage}
 *   onBack={goToPreviousStage}
 * />
 * ```
 *
 * **Validates: Requirements 13.2**
 */
export function FeaturesStage({
    personas,
    features,
    onFeaturesChange,
    onGenerateFeatures,
    onNext,
    onBack,
    isLoading = false,
}: FeaturesStageProps) {
    const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

    // Ensure all features have IDs
    useEffect(() => {
        const needsIds = features.some(f => !f.id);
        if (needsIds) {
            const featuresWithIds = features.map((f, i) => ({
                ...f,
                id: f.id || `feature-${i + 1}-${Date.now()}`,
            }));
            onFeaturesChange(featuresWithIds);
        }
    }, [features, onFeaturesChange]);

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

    const featureCardStyle: React.CSSProperties = {
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
        boxShadow: shadows.sm,
        transition: transitions.normal,
        cursor: 'pointer',
    };

    const featureHeaderStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    };

    const badgeStyle = (priority: string): React.CSSProperties => ({
        padding: `${spacing.xs} ${spacing.sm}`,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        backgroundColor: `${PRIORITY_COLORS[priority.toLowerCase()] || colors.text.muted}20`,
        color: PRIORITY_COLORS[priority.toLowerCase()] || colors.text.muted,
        textTransform: 'capitalize',
    });

    const scoreStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        fontSize: typography.fontSize.sm,
        color: colors.amber[500],
        fontWeight: typography.fontWeight.semibold,
    };

    const buttonsStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.md,
        marginTop: spacing.lg,
    };

    const handleRemoveFeature = (id: string) => {
        onFeaturesChange(features.filter((f) => f.id !== id));
    };

    const toggleExpanded = (id: string) => {
        setExpandedFeature(expandedFeature === id ? null : id);
    };

    const isValid = features.length > 0;

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h1 style={titleStyle}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '8px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>Define Key Features</h1>
                <p style={subtitleStyle}>
                    We'll interview your {personas.length} persona(s) to discover the most important features.
                </p>
            </div>

            {/* Generate button */}
            {features.length === 0 && (
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
                        Click below to conduct AI interviews with your personas and discover features
                    </p>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={onGenerateFeatures}
                        loading={isLoading}
                        disabled={isLoading || personas.length === 0}
                    >
                        {isLoading ? 'Interviewing Personas...' : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '6px' }}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>Start Persona Interviews</>)}
                    </Button>
                </div>
            )}

            {/* Loading state */}
            {isLoading && features.length === 0 && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: spacing.xl,
                    }}
                >
                    <Spinner size="lg" />
                    <span style={{ color: colors.text.secondary }}>
                        Conducting interviews and analyzing responses...
                    </span>
                </div>
            )}

            {/* Features list */}
            {features.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <h3
                            style={{
                                fontSize: typography.fontSize.lg,
                                fontWeight: typography.fontWeight.semibold,
                                color: colors.text.primary,
                            }}
                        >
                            Discovered Features ({features.length})
                        </h3>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onGenerateFeatures}
                            loading={isLoading}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
                            Re-interview
                        </Button>
                    </div>

                    {features.map((feature) => {
                        // Use mentionedBy or personas field
                        const mentionedByPersonas = feature.mentionedBy || feature.personas || [];

                        return (
                            <div
                                key={feature.id || feature.name}
                                style={featureCardStyle}
                                onClick={() => toggleExpanded(feature.id || feature.name)}
                            >
                                <div style={featureHeaderStyle}>
                                    <div style={{ flex: 1 }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: spacing.sm,
                                                marginBottom: spacing.xs,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: typography.fontSize.md,
                                                    fontWeight: typography.fontWeight.semibold,
                                                    color: colors.text.primary,
                                                }}
                                            >
                                                {feature.name}
                                            </span>
                                            <span style={badgeStyle(feature.priority)}>{feature.priority}</span>
                                        </div>
                                        <p
                                            style={{
                                                fontSize: typography.fontSize.sm,
                                                color: colors.text.secondary,
                                                margin: 0,
                                            }}
                                        >
                                            {feature.description}
                                        </p>
                                    </div>
                                    <div style={scoreStyle}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                        {feature.score}
                                    </div>
                                </div>

                                {expandedFeature === (feature.id || feature.name) && (
                                    <div
                                        style={{
                                            marginTop: spacing.md,
                                            paddingTop: spacing.md,
                                            borderTop: `1px solid ${colors.border}`,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Mentioned by personas */}
                                        {mentionedByPersonas.length > 0 && (
                                            <div style={{ marginBottom: spacing.md }}>
                                                <span
                                                    style={{
                                                        fontSize: typography.fontSize.xs,
                                                        color: colors.text.muted,
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    Mentioned by:
                                                </span>
                                                <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' }}>
                                                    {mentionedByPersonas.map((name) => (
                                                        <span
                                                            key={name}
                                                            style={{
                                                                padding: `${spacing.xs} ${spacing.sm}`,
                                                                backgroundColor: colors.background.tertiary,
                                                                borderRadius: borderRadius.md,
                                                                fontSize: typography.fontSize.xs,
                                                                color: colors.text.secondary,
                                                            }}
                                                        >
                                                            {name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Reasoning */}
                                        {feature.reasoning && (
                                            <div style={{ marginBottom: spacing.md }}>
                                                <span
                                                    style={{
                                                        fontSize: typography.fontSize.xs,
                                                        color: colors.text.muted,
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    Reasoning:
                                                </span>
                                                <p
                                                    style={{
                                                        fontSize: typography.fontSize.sm,
                                                        color: colors.text.secondary,
                                                        marginTop: spacing.xs,
                                                        marginBottom: 0,
                                                    }}
                                                >
                                                    {feature.reasoning}
                                                </p>
                                            </div>
                                        )}

                                        {/* Survey responses */}
                                        {feature.surveyResponses && feature.surveyResponses.length > 0 && (
                                            <div style={{ marginBottom: spacing.md }}>
                                                <span
                                                    style={{
                                                        fontSize: typography.fontSize.xs,
                                                        color: colors.text.muted,
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    Interview Feedback:
                                                </span>
                                                <div style={{ marginTop: spacing.sm, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                                                    {feature.surveyResponses.map((response, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                padding: spacing.sm,
                                                                backgroundColor: colors.background.tertiary,
                                                                borderRadius: borderRadius.md,
                                                                borderLeft: `3px solid ${colors.amber[500]}`,
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    fontSize: typography.fontSize.xs,
                                                                    fontWeight: typography.fontWeight.semibold,
                                                                    color: colors.text.primary,
                                                                    marginBottom: spacing.xs,
                                                                }}
                                                            >
                                                                {response.personaName}
                                                            </div>
                                                            <div
                                                                style={{
                                                                    fontSize: typography.fontSize.sm,
                                                                    color: colors.text.secondary,
                                                                    fontStyle: 'italic',
                                                                }}
                                                            >
                                                                "{response.feedback}"
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveFeature(feature.id || feature.name)}
                                        >
                                            Remove Feature
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
                    Continue to Stories →
                </Button>
            </div>
        </div>
    );
}

export default FeaturesStage;
