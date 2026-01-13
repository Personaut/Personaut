import React from 'react';
import { colors, spacing, borderRadius, typography, shadows } from '../../../shared/theme';
import { Button, Spinner } from '../../../shared/components/ui';
import { EditableCard } from '../../../shared/components/EditableCard';
import { UserFlow, Screen, Framework, FRAMEWORKS } from '../types';

/**
 * DesignStage component props
 */
export interface DesignStageProps {
    /** User flows */
    userFlows: UserFlow[];
    /** Handler for flows change */
    onFlowsChange: (flows: UserFlow[]) => void;
    /** Generated screens */
    screens: Screen[];
    /** Handler for screens change */
    onScreensChange: (screens: Screen[]) => void;
    /** Selected framework */
    selectedFramework: Framework;
    /** Handler for framework change */
    onFrameworkChange: (framework: Framework) => void;
    /** Look and Feel / Branding data */
    lookAndFeel?: LookAndFeelData | null;
    /** Handler to generate look and feel */
    onGenerateLookAndFeel?: () => void;
    /** Handler to update look and feel */
    onLookAndFeelChange?: (data: LookAndFeelData) => void;
    /** Handler to generate flows */
    onGenerateFlows: () => void;
    /** Handler to generate screens */
    onGenerateScreens: () => void;
    /** Handler to edit a screen */
    onEditScreen?: (id: string, updates: { name?: string; description?: string }) => void;
    /** Handler to regenerate a single screen */
    onRegenerateScreen?: (id: string) => void;
    /** Handler to remove a screen */
    onRemoveScreen?: (id: string) => void;
    /** Handler for proceeding to next stage */
    onNext: () => void;
    /** Handler for going back */
    onBack: () => void;
    /** Loading state */
    isLoading?: boolean;
    /** Loading state for look and feel generation */
    isLoadingLookAndFeel?: boolean;
    /** ID of screen currently being regenerated */
    regeneratingScreenId?: string | null;
}

/**
 * Look and Feel / Branding data structure
 */
export interface LookAndFeelData {
    /** Primary color */
    primaryColor: string;
    /** Secondary color */
    secondaryColor: string;
    /** Accent color */
    accentColor: string;
    /** Background color */
    backgroundColor: string;
    /** Text color */
    textColor: string;
    /** Font family recommendations */
    fontFamily: string;
    /** Overall mood/tone */
    mood: string;
    /** Design style (minimal, bold, playful, etc.) */
    style: string;
    /** Target audience appeal */
    audienceAppeal: string;
    /** Logo description/concept */
    logoDescription: string;
    /** Key visual elements */
    visualElements: string[];
    /** Persona feedback summary */
    personaFeedback?: string[];
}

/**
 * Framework display info
 */
const FRAMEWORK_INFO: Record<Framework, { icon: string; label: string; description: string }> = {
    react: { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>', label: 'React', description: 'Modern component-based UI' },
    nextjs: { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 2 22 22 22"/></svg>', label: 'Next.js', description: 'React with SSR & routing' },
    vue: { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M2 3h5l7 12 7-12h5L12 22z"/><path d="M7 3l5 8.5L17 3h3L12 17 4 3z" fill="#42b883"/></svg>', label: 'Vue.js', description: 'Progressive JavaScript framework' },
    flutter: { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 22 12 12 22 2 12"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>', label: 'Flutter', description: 'Cross-platform native apps' },
    html: { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', label: 'HTML/CSS/JS', description: 'Simple static website' },
};

/**
 * DesignStage component - creates UX flows and screen designs.
 *
 * @example
 * ```tsx
 * <DesignStage
 *   userFlows={userFlows}
 *   screens={generatedScreens}
 *   selectedFramework={selectedFramework}
 *   onFrameworkChange={setSelectedFramework}
 *   onGenerateFlows={handleGenerateFlows}
 *   onGenerateScreens={handleGenerateScreens}
 *   onNext={goToNextStage}
 *   onBack={goToPreviousStage}
 * />
 * ```
 *
 * **Validates: Requirements 13.2**
 */
export function DesignStage({
    userFlows,
    onFlowsChange: _onFlowsChange,
    screens,
    onScreensChange: _onScreensChange,
    selectedFramework,
    onFrameworkChange,
    lookAndFeel,
    onGenerateLookAndFeel,
    onLookAndFeelChange: _onLookAndFeelChange,
    onGenerateFlows,
    onGenerateScreens,
    onEditScreen,
    onRegenerateScreen,
    onRemoveScreen,
    onNext,
    onBack,
    isLoading = false,
    isLoadingLookAndFeel = false,
    regeneratingScreenId,
}: DesignStageProps) {
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

    const sectionTitleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    };

    const selectStyle: React.CSSProperties = {
        width: '100%',
        padding: spacing.md,
        fontSize: typography.fontSize.md,
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        color: colors.text.primary,
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: '40px',
    };

    const flowCardStyle: React.CSSProperties = {
        padding: spacing.md,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
    };

    const buttonsStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.md,
        marginTop: spacing.lg,
    };

    const isValid = userFlows.length > 0 && screens.length > 0;

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h1 style={titleStyle}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '8px' }}><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>Design</h1>
                <p style={subtitleStyle}>
                    Create user flows and generate screen designs for your application.
                </p>
            </div>

            {/* Framework Selection */}
            <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Select Framework</h3>
                <select
                    value={selectedFramework}
                    onChange={(e) => onFrameworkChange(e.target.value as Framework)}
                    style={selectStyle}
                >
                    {FRAMEWORKS.map((fw) => (
                        <option key={fw} value={fw}>
                            {FRAMEWORK_INFO[fw].label} - {FRAMEWORK_INFO[fw].description}
                        </option>
                    ))}
                </select>
            </div>

            {/* Look and Feel Section */}
            <div style={sectionStyle}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: spacing.md,
                    }}
                >
                    <h3 style={{ ...sectionTitleStyle, marginBottom: 0 }}>🎨 Look & Feel</h3>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onGenerateLookAndFeel}
                        loading={isLoadingLookAndFeel}
                        disabled={!onGenerateLookAndFeel}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '4px' }}><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>
                        {lookAndFeel ? 'Regenerate' : 'Generate Look & Feel'}
                    </Button>
                </div>

                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md }}>
                    Interview your personas to discover their visual preferences and generate a cohesive design language.
                </p>

                {!lookAndFeel && !isLoadingLookAndFeel && (
                    <div
                        style={{
                            padding: spacing.lg,
                            backgroundColor: colors.background.tertiary,
                            borderRadius: borderRadius.lg,
                            textAlign: 'center',
                            border: `2px dashed ${colors.border}`,
                        }}
                    >
                        <p style={{ color: colors.text.muted, margin: 0 }}>
                            Click "Generate Look & Feel" to interview your personas about visual preferences
                        </p>
                    </div>
                )}

                {isLoadingLookAndFeel && (
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
                            Interviewing personas about visual preferences...
                        </span>
                    </div>
                )}

                {lookAndFeel && !isLoadingLookAndFeel && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                        {/* Color Palette */}
                        <div style={{ padding: spacing.md, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg }}>
                            <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.sm }}>
                                Color Palette
                            </h4>
                            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                                    <div style={{ width: 24, height: 24, borderRadius: borderRadius.sm, backgroundColor: lookAndFeel.primaryColor, border: `1px solid ${colors.border}` }} />
                                    <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Primary</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                                    <div style={{ width: 24, height: 24, borderRadius: borderRadius.sm, backgroundColor: lookAndFeel.secondaryColor, border: `1px solid ${colors.border}` }} />
                                    <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Secondary</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                                    <div style={{ width: 24, height: 24, borderRadius: borderRadius.sm, backgroundColor: lookAndFeel.accentColor, border: `1px solid ${colors.border}` }} />
                                    <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Accent</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                                    <div style={{ width: 24, height: 24, borderRadius: borderRadius.sm, backgroundColor: lookAndFeel.backgroundColor, border: `1px solid ${colors.border}` }} />
                                    <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Background</span>
                                </div>
                            </div>
                        </div>

                        {/* Style & Mood */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                            <div style={{ padding: spacing.md, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg }}>
                                <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs }}>
                                    Style
                                </h4>
                                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, margin: 0 }}>{lookAndFeel.style}</p>
                            </div>
                            <div style={{ padding: spacing.md, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg }}>
                                <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs }}>
                                    Mood
                                </h4>
                                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, margin: 0 }}>{lookAndFeel.mood}</p>
                            </div>
                        </div>

                        {/* Typography */}
                        <div style={{ padding: spacing.md, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg }}>
                            <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs }}>
                                Typography
                            </h4>
                            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, margin: 0, fontFamily: lookAndFeel.fontFamily }}>
                                {lookAndFeel.fontFamily}
                            </p>
                        </div>

                        {/* Logo & Visual Elements */}
                        <div style={{ padding: spacing.md, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg }}>
                            <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs }}>
                                Logo Concept
                            </h4>
                            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>{lookAndFeel.logoDescription}</p>

                            {lookAndFeel.visualElements && lookAndFeel.visualElements.length > 0 && (
                                <>
                                    <h5 style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, color: colors.text.primary, marginBottom: spacing.xs }}>
                                        Key Visual Elements
                                    </h5>
                                    <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                                        {lookAndFeel.visualElements.map((element, i) => (
                                            <span
                                                key={i}
                                                style={{
                                                    padding: `${spacing.xs} ${spacing.sm}`,
                                                    backgroundColor: colors.background.secondary,
                                                    borderRadius: borderRadius.sm,
                                                    fontSize: typography.fontSize.xs,
                                                    color: colors.text.secondary,
                                                }}
                                            >
                                                {element}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Persona Feedback */}
                        {lookAndFeel.personaFeedback && lookAndFeel.personaFeedback.length > 0 && (
                            <div style={{ padding: spacing.md, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg }}>
                                <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.sm }}>
                                    💬 Persona Insights
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: spacing.lg, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                                    {lookAndFeel.personaFeedback.map((feedback, i) => (
                                        <li key={i} style={{ marginBottom: spacing.xs }}>{feedback}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Screens - Generate first to define what screens exist */}
            <div style={sectionStyle}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: spacing.md,
                    }}
                >
                    <h3 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Screens</h3>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onGenerateScreens}
                        loading={isLoading}
                    >
                        {screens.length > 0 ? (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>Regenerate</>) : (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '4px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>Generate Screens</>)}
                    </Button>
                </div>

                {isLoading && screens.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                        <Spinner size="sm" />
                        <span style={{ color: colors.text.secondary }}>Generating screen designs...</span>
                    </div>
                )}

                {screens.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                        {screens.map((screen) => (
                            <EditableCard
                                key={screen.id}
                                id={screen.id}
                                title={screen.name}
                                description={screen.description || `Purpose: ${(screen as any).purpose || 'User interface screen'}`}
                                tags={screen.components?.slice(0, 5)}
                                editable={!!onEditScreen}
                                onEdit={onEditScreen ? (id, updates) => onEditScreen(id, { name: updates.title, description: updates.description }) : undefined}
                                onRegenerate={onRegenerateScreen}
                                onRemove={onRemoveScreen}
                                isRegenerating={regeneratingScreenId === screen.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* User Flows - Generate second to define navigation between screens */}
            <div style={sectionStyle}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: spacing.md,
                    }}
                >
                    <h3 style={{ ...sectionTitleStyle, marginBottom: 0 }}>User Flows</h3>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onGenerateFlows}
                        loading={isLoading}
                        disabled={screens.length === 0}
                    >
                        {userFlows.length > 0 ? (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>Regenerate</>) : (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ verticalAlign: 'middle', marginRight: '4px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>Generate Flows</>)}
                    </Button>
                </div>

                {isLoading && userFlows.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                        <Spinner size="sm" />
                        <span style={{ color: colors.text.secondary }}>Generating user flows...</span>
                    </div>
                )}

                {userFlows.length > 0 && (
                    <div>
                        {userFlows.map((flow) => (
                            <div key={flow.id} style={flowCardStyle}>
                                <div
                                    style={{
                                        fontWeight: typography.fontWeight.semibold,
                                        color: colors.text.primary,
                                        marginBottom: spacing.xs,
                                    }}
                                >
                                    {flow.name}
                                </div>
                                <div
                                    style={{
                                        fontSize: typography.fontSize.sm,
                                        color: colors.text.secondary,
                                        marginBottom: spacing.sm,
                                    }}
                                >
                                    {flow.description}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
                                    {flow.steps.map((step, i) => {
                                        // Handle both string format and object format
                                        const stepText = typeof step === 'string'
                                            ? step
                                            : (step as any).action || `${(step as any).fromScreen} → ${(step as any).toScreen}`;

                                        return (
                                            <React.Fragment key={i}>
                                                <span
                                                    style={{
                                                        padding: `${spacing.xs} ${spacing.sm}`,
                                                        backgroundColor: colors.background.secondary,
                                                        borderRadius: borderRadius.md,
                                                        fontSize: typography.fontSize.xs,
                                                        color: colors.text.secondary,
                                                    }}
                                                >
                                                    {stepText}
                                                </span>
                                                {i < flow.steps.length - 1 && (
                                                    <span style={{ color: colors.text.muted }}>→</span>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
                    Finalize Design →
                </Button>
            </div>
        </div>
    );
}

export default DesignStage;
