import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../../shared/theme';
import { Screen } from '../types';

/**
 * ScreenCard component props
 */
export interface ScreenCardProps {
    /** Screen to display */
    screen: Screen;
    /** Click handler */
    onClick?: () => void;
}

/**
 * ScreenCard component for displaying a screen design.
 *
 * @example
 * ```tsx
 * <ScreenCard
 *   screen={screen}
 *   onClick={() => selectScreen(screen.id)}
 * />
 * ```
 *
 * **Validates: Requirements 15.6, 22.1**
 */
export function ScreenCard({ screen, onClick }: ScreenCardProps) {
    const cardStyle: React.CSSProperties = {
        padding: spacing.md,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
    };

    const previewStyle: React.CSSProperties = {
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
        overflow: 'hidden',
    };

    const nameStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    };

    const descriptionStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    };

    const componentCountStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    };

    return (
        <div style={cardStyle} onClick={onClick}>
            <div style={previewStyle}>
                {screen.screenshot ? (
                    <img
                        src={screen.screenshot}
                        alt={screen.name}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            borderRadius: borderRadius.md,
                            objectFit: 'cover',
                        }}
                    />
                ) : (
                    '📱 Preview'
                )}
            </div>
            <div style={nameStyle}>{screen.name}</div>
            {screen.description && <div style={descriptionStyle}>{screen.description}</div>}
            <div style={componentCountStyle}>{screen.components.length} components</div>
        </div>
    );
}

export default ScreenCard;
