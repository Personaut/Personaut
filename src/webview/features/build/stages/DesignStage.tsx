import React from 'react';
import { colors, spacing, borderRadius, typography, shadows, transitions } from '../../../shared/theme';
import { Button, Spinner } from '../../../shared/components/ui';
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
    /** Handler to generate flows */
    onGenerateFlows: () => void;
    /** Handler to generate screens */
    onGenerateScreens: () => void;
    /** Handler for proceeding to next stage */
    onNext: () => void;
    /** Handler for going back */
    onBack: () => void;
    /** Loading state */
    isLoading?: boolean;
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
    onGenerateFlows,
    onGenerateScreens,
    onNext,
    onBack,
    isLoading = false,
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

    const frameworkGridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: spacing.md,
    };

    const frameworkCardStyle = (isSelected: boolean): React.CSSProperties => ({
        padding: spacing.md,
        backgroundColor: isSelected ? 'rgba(255, 191, 36, 0.1)' : colors.background.tertiary,
        border: `2px solid ${isSelected ? colors.accent : colors.border}`,
        borderRadius: borderRadius.lg,
        cursor: 'pointer',
        textAlign: 'center',
        transition: transitions.fast,
    });

    const flowCardStyle: React.CSSProperties = {
        padding: spacing.md,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
    };

    const screenGridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: spacing.md,
    };

    const screenCardStyle: React.CSSProperties = {
        padding: spacing.md,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        textAlign: 'center',
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
                <div style={frameworkGridStyle}>
                    {FRAMEWORKS.map((fw) => (
                        <div
                            key={fw}
                            style={frameworkCardStyle(selectedFramework === fw)}
                            onClick={() => onFrameworkChange(fw)}
                        >
                            <span style={{ fontSize: '24px', display: 'block', marginBottom: spacing.sm }} dangerouslySetInnerHTML={{ __html: FRAMEWORK_INFO[fw].icon }} />
                            <span
                                style={{
                                    fontSize: typography.fontSize.sm,
                                    fontWeight: typography.fontWeight.semibold,
                                    color: colors.text.primary,
                                    display: 'block',
                                }}
                            >
                                {FRAMEWORK_INFO[fw].label}
                            </span>
                            <span
                                style={{
                                    fontSize: typography.fontSize.xs,
                                    color: colors.text.secondary,
                                }}
                            >
                                {FRAMEWORK_INFO[fw].description}
                            </span>
                        </div>
                    ))}
                </div>
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
                    <div style={screenGridStyle}>
                        {screens.map((screen) => (
                            <div key={screen.id} style={screenCardStyle}>
                                <div
                                    style={{
                                        width: '100%',
                                        height: 120,
                                        backgroundColor: colors.background.primary,
                                        borderRadius: borderRadius.md,
                                        marginBottom: spacing.sm,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: colors.text.muted,
                                        fontSize: typography.fontSize.sm,
                                    }}
                                >
                                    {screen.screenshot ? (
                                        <img
                                            src={screen.screenshot}
                                            alt={screen.name}
                                            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: borderRadius.md }}
                                        />
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                                    )}
                                </div>
                                <div
                                    style={{
                                        fontSize: typography.fontSize.sm,
                                        fontWeight: typography.fontWeight.semibold,
                                        color: colors.text.primary,
                                    }}
                                >
                                    {screen.name}
                                </div>
                                <div
                                    style={{
                                        fontSize: typography.fontSize.xs,
                                        color: colors.text.secondary,
                                    }}
                                >
                                    {screen.components.length} components
                                </div>
                            </div>
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
                                    {flow.steps.map((step, i) => (
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
                                                {step}
                                            </span>
                                            {i < flow.steps.length - 1 && (
                                                <span style={{ color: colors.text.muted }}>→</span>
                                            )}
                                        </React.Fragment>
                                    ))}
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
                    Continue to Build →
                </Button>
            </div>
        </div>
    );
}

export default DesignStage;
