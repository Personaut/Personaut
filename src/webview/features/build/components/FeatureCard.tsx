import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../../shared/theme';
import { Button } from '../../../shared/components/ui';
import { GeneratedFeature } from '../types';

/**
 * FeatureCard component props
 */
export interface FeatureCardProps {
    /** Feature to display */
    feature: GeneratedFeature;
    /** Whether the card is expanded */
    isExpanded?: boolean;
    /** Toggle expand handler */
    onToggleExpand?: () => void;
    /** Remove handler */
    onRemove?: () => void;
    /** Whether the card is draggable */
    isDraggable?: boolean;
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
 * FeatureCard component for displaying a feature in the features stage.
 *
 * @example
 * ```tsx
 * <FeatureCard
 *   feature={feature}
 *   isExpanded={expandedId === feature.id}
 *   onToggleExpand={() => toggleExpand(feature.id)}
 *   onRemove={() => removeFeature(feature.id)}
 * />
 * ```
 *
 * **Validates: Requirements 15.3, 22.1**
 */
export function FeatureCard({
    feature,
    isExpanded = false,
    onToggleExpand,
    onRemove,
    isDraggable = false,
}: FeatureCardProps) {
    const cardStyle: React.CSSProperties = {
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
        cursor: onToggleExpand ? 'pointer' : isDraggable ? 'grab' : 'default',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    };

    const badgeStyle: React.CSSProperties = {
        padding: `${spacing.xs} ${spacing.sm}`,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        backgroundColor: `${PRIORITY_COLORS[feature.priority] || colors.text.muted}20`,
        color: PRIORITY_COLORS[feature.priority] || colors.text.muted,
        textTransform: 'capitalize',
    };

    const scoreStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        fontSize: typography.fontSize.sm,
        color: colors.amber[500],
        fontWeight: typography.fontWeight.semibold,
    };

    const personasStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginTop: spacing.sm,
    };

    const personaTagStyle: React.CSSProperties = {
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    };

    return (
        <div style={cardStyle} onClick={onToggleExpand}>
            <div style={headerStyle}>
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing.sm,
                            marginBottom: spacing.xs,
                        }}
                    >
                        {isDraggable && (
                            <span style={{ color: colors.text.muted, cursor: 'grab' }}>⋮⋮</span>
                        )}
                        <span
                            style={{
                                fontSize: typography.fontSize.md,
                                fontWeight: typography.fontWeight.semibold,
                                color: colors.text.primary,
                            }}
                        >
                            {feature.name}
                        </span>
                        <span style={badgeStyle}>{feature.priority}</span>
                    </div>
                    <p
                        style={{
                            fontSize: typography.fontSize.sm,
                            color: colors.text.secondary,
                            margin: 0,
                            lineHeight: typography.lineHeight.relaxed,
                        }}
                    >
                        {feature.description}
                    </p>
                </div>
                <div style={scoreStyle}>⭐ {feature.score}</div>
            </div>

            {isExpanded && (
                <div
                    style={{
                        marginTop: spacing.md,
                        paddingTop: spacing.md,
                        borderTop: `1px solid ${colors.border}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ marginBottom: spacing.sm }}>
                        <span
                            style={{
                                fontSize: typography.fontSize.xs,
                                color: colors.text.muted,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Frequency: {feature.frequency}
                        </span>
                    </div>
                    {feature.personas.length > 0 && (
                        <div>
                            <span
                                style={{
                                    fontSize: typography.fontSize.xs,
                                    color: colors.text.muted,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Mentioned by:
                            </span>
                            <div style={personasStyle}>
                                {feature.personas.map((name) => (
                                    <span key={name} style={personaTagStyle}>
                                        {name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {onRemove && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                            style={{ marginTop: spacing.md }}
                        >
                            Remove Feature
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

export default FeatureCard;
