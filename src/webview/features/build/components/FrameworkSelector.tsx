import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';
import { Framework, FRAMEWORKS } from '../types';

/**
 * FrameworkSelector component props
 */
export interface FrameworkSelectorProps {
    /** Currently selected framework */
    value: Framework;
    /** Handler for framework change */
    onChange: (framework: Framework) => void;
    /** Whether selector is disabled */
    disabled?: boolean;
}

/**
 * Framework display info
 */
const FRAMEWORK_INFO: Record<Framework, { icon: string; label: string; description: string }> = {
    react: { icon: '⚛️', label: 'React', description: 'Modern component-based UI' },
    nextjs: { icon: '▲', label: 'Next.js', description: 'React with SSR & routing' },
    vue: { icon: '💚', label: 'Vue.js', description: 'Progressive JavaScript framework' },
    flutter: { icon: '🐦', label: 'Flutter', description: 'Cross-platform native apps' },
    html: { icon: '🌐', label: 'HTML/CSS/JS', description: 'Simple static website' },
};

/**
 * FrameworkSelector component for choosing the target framework.
 *
 * @example
 * ```tsx
 * <FrameworkSelector
 *   value={selectedFramework}
 *   onChange={setSelectedFramework}
 * />
 * ```
 *
 * **Validates: Requirements 15.6**
 */
export function FrameworkSelector({
    value,
    onChange,
    disabled = false,
}: FrameworkSelectorProps) {
    const containerStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: spacing.md,
    };

    const cardStyle = (isSelected: boolean): React.CSSProperties => ({
        padding: spacing.md,
        backgroundColor: isSelected ? 'rgba(255, 191, 36, 0.1)' : colors.background.tertiary,
        border: `2px solid ${isSelected ? colors.accent : colors.border}`,
        borderRadius: borderRadius.lg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'center',
        transition: transitions.fast,
        opacity: disabled ? 0.5 : 1,
    });

    const iconStyle: React.CSSProperties = {
        fontSize: '24px',
        display: 'block',
        marginBottom: spacing.sm,
    };

    const labelStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        display: 'block',
        marginBottom: spacing.xs,
    };

    const descriptionStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    };

    return (
        <div style={containerStyle}>
            {FRAMEWORKS.map((fw) => {
                const info = FRAMEWORK_INFO[fw];
                const isSelected = value === fw;

                return (
                    <div
                        key={fw}
                        style={cardStyle(isSelected)}
                        onClick={() => !disabled && onChange(fw)}
                        role="radio"
                        aria-checked={isSelected}
                    >
                        <span style={iconStyle}>{info.icon}</span>
                        <span style={labelStyle}>{info.label}</span>
                        <span style={descriptionStyle}>{info.description}</span>
                    </div>
                );
            })}
        </div>
    );
}

export default FrameworkSelector;
