/**
 * Shared Styles Module
 *
 * Provides reusable style factories for common UI patterns across the extension.
 * These styles implement the compact, elegant design system.
 *
 * Usage:
 * ```tsx
 * import { createHeaderStyles, createSectionStyles, createFormStyles } from '../../shared/theme/styles';
 * const { header, title, tabs, tabStyle } = createHeaderStyles();
 * ```
 */

import { colors, spacing, typography, borderRadius, transitions } from './theme';

/**
 * Header style configuration
 */
export interface HeaderStyleConfig {
    /** Use compact padding */
    compact?: boolean;
    /** Include border bottom */
    withBorder?: boolean;
    /** Use sticky positioning */
    sticky?: boolean;
}

/**
 * Creates header styles for views
 */
export function createHeaderStyles(config: HeaderStyleConfig = {}) {
    const { compact = true, withBorder = true, sticky = false } = config;

    const header: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: compact ? `${spacing.sm} ${spacing.md}` : spacing.lg,
        backgroundColor: colors.background.secondary,
        ...(withBorder && { borderBottom: `1px solid ${colors.border}` }),
        ...(sticky && { position: 'sticky', top: 0, zIndex: 10 }),
    };

    const title: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        fontSize: compact ? typography.fontSize.md : typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
    };

    const tabs: React.CSSProperties = {
        display: 'flex',
        gap: spacing.xs,
    };

    const createTabStyle = (isActive: boolean): React.CSSProperties => ({
        padding: compact ? `${spacing.xs} ${spacing.sm}` : `${spacing.sm} ${spacing.md}`,
        backgroundColor: isActive ? colors.accent : 'transparent',
        border: 'none',
        borderRadius: borderRadius.md,
        color: isActive ? '#1E1E1E' : colors.text.secondary,
        fontSize: compact ? typography.fontSize.xs : typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        cursor: 'pointer',
        transition: transitions.fast,
    });

    return { header, title, tabs, createTabStyle };
}

/**
 * Section style configuration
 */
export interface SectionStyleConfig {
    /** Use compact padding */
    compact?: boolean;
    /** Section has elevation/card style */
    elevated?: boolean;
}

/**
 * Creates section/card styles
 */
export function createSectionStyles(config: SectionStyleConfig = {}) {
    const { compact = true, elevated = true } = config;

    const section: React.CSSProperties = {
        padding: compact ? spacing.sm : spacing.md,
        backgroundColor: elevated ? colors.background.secondary : 'transparent',
        border: elevated ? `1px solid ${colors.border}` : 'none',
        borderRadius: compact ? borderRadius.md : borderRadius.lg,
    };

    const sectionTitle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        fontSize: compact ? '10px' : typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.muted,
        marginBottom: compact ? spacing.xs : spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    };

    const sectionContent: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? spacing.xs : spacing.sm,
    };

    return { section, sectionTitle, sectionContent };
}

/**
 * Form style configuration
 */
export interface FormStyleConfig {
    /** Maximum width of form */
    maxWidth?: number | string;
    /** Use compact spacing */
    compact?: boolean;
}

/**
 * Creates form/input styles
 */
export function createFormStyles(config: FormStyleConfig = {}) {
    const { maxWidth = 600, compact = true } = config;

    const form: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? spacing.sm : spacing.md,
        maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
        margin: '0 auto',
        width: '100%',
    };

    const input: React.CSSProperties = {
        padding: compact ? spacing.sm : spacing.md,
        backgroundColor: colors.input.background,
        border: `1px solid ${colors.input.border}`,
        borderRadius: compact ? borderRadius.md : borderRadius.lg,
        color: colors.input.foreground,
        fontSize: compact ? typography.fontSize.sm : typography.fontSize.md,
        outline: 'none',
        transition: transitions.fast,
    };

    const textarea: React.CSSProperties = {
        ...input,
        minHeight: compact ? 60 : 100,
        resize: 'vertical',
        fontFamily: 'inherit',
    };

    const label: React.CSSProperties = {
        fontSize: compact ? typography.fontSize.xs : typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    };

    const inputGroup: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xs,
    };

    const inputRow: React.CSSProperties = {
        display: 'flex',
        gap: compact ? spacing.sm : spacing.md,
        alignItems: 'center',
    };

    return { form, input, textarea, label, inputGroup, inputRow };
}

/**
 * Creates content area styles
 */
export function createContentStyles(compact = true) {
    const content: React.CSSProperties = {
        flex: 1,
        overflow: 'auto',
        padding: compact ? spacing.sm : spacing.lg,
    };

    const scrollable: React.CSSProperties = {
        ...content,
        overflowY: 'auto',
        overflowX: 'hidden',
    };

    return { content, scrollable };
}

/**
 * Creates list/grid styles
 */
export function createListStyles(compact = true) {
    const list: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? spacing.xs : spacing.sm,
    };

    const grid: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: compact ? spacing.xs : spacing.sm,
    };

    const listItem: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: compact ? spacing.xs : spacing.sm,
        padding: compact ? `${spacing.xs} ${spacing.sm}` : spacing.sm,
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${colors.border}`,
        borderRadius: compact ? borderRadius.md : borderRadius.lg,
        cursor: 'pointer',
        transition: transitions.fast,
    };

    const createListItemStyle = (isSelected: boolean, isDisabled = false): React.CSSProperties => ({
        ...listItem,
        backgroundColor: isSelected ? 'rgba(255, 191, 36, 0.15)' : colors.background.tertiary,
        borderColor: isSelected ? colors.accent : colors.border,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled && !isSelected ? 0.5 : 1,
    });

    return { list, grid, listItem, createListItemStyle };
}

/**
 * Creates avatar/badge styles
 */
export function createAvatarStyles(size: 'sm' | 'md' | 'lg' = 'sm') {
    const sizes = {
        sm: { width: 24, height: 24, fontSize: '10px' },
        md: { width: 32, height: 32, fontSize: '12px' },
        lg: { width: 40, height: 40, fontSize: '14px' },
    };

    const sizeConfig = sizes[size];

    const avatar: React.CSSProperties = {
        width: sizeConfig.width,
        height: sizeConfig.height,
        borderRadius: borderRadius.full,
        backgroundColor: colors.amber[500],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: sizeConfig.fontSize,
        fontWeight: typography.fontWeight.bold,
        color: '#1E1E1E',
        flexShrink: 0,
    };

    return { avatar };
}

/**
 * Creates checkbox/selection styles
 */
export function createCheckboxStyles(compact = true) {
    const size = compact ? 14 : 20;

    const createCheckboxStyle = (isSelected: boolean): React.CSSProperties => ({
        width: size,
        height: size,
        borderRadius: compact ? '3px' : borderRadius.md,
        border: `1px solid ${isSelected ? colors.accent : colors.border}`,
        backgroundColor: isSelected ? colors.accent : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#1E1E1E',
        flexShrink: 0,
        transition: transitions.fast,
    });

    return { createCheckboxStyle, checkboxIconSize: compact ? 10 : 14 };
}

/**
 * Creates button container styles
 */
export function createButtonContainerStyles(compact = true) {
    const buttonRow: React.CSSProperties = {
        display: 'flex',
        gap: compact ? spacing.sm : spacing.md,
        marginTop: compact ? spacing.xs : spacing.sm,
    };

    const buttonGroup: React.CSSProperties = {
        display: 'flex',
        gap: spacing.xs,
    };

    return { buttonRow, buttonGroup };
}

/**
 * Creates empty state styles
 */
export function createEmptyStateStyles(compact = true) {
    const emptyState: React.CSSProperties = {
        padding: compact ? spacing.sm : spacing.xl,
        textAlign: 'center',
        fontSize: compact ? typography.fontSize.xs : typography.fontSize.sm,
        color: colors.text.muted,
        backgroundColor: colors.background.tertiary,
        borderRadius: compact ? borderRadius.md : borderRadius.lg,
    };

    return { emptyState };
}

/**
 * Creates icon styles for section headers
 */
export function createIconStyles(compact = true) {
    const iconSize = compact ? 10 : 14;

    const icon: React.CSSProperties = {
        width: iconSize,
        height: iconSize,
        marginRight: compact ? 4 : 6,
    };

    return { icon, iconSize, strokeWidth: compact ? 2.5 : 2 };
}

/**
 * Creates drop zone styles
 */
export function createDropZoneStyles(isDragging = false, disabled = false, compact = true) {
    const dropZone: React.CSSProperties = {
        padding: compact ? spacing.md : spacing.xl,
        backgroundColor: isDragging ? 'rgba(255, 191, 36, 0.1)' : colors.background.tertiary,
        border: `1px dashed ${isDragging ? colors.accent : colors.border}`,
        borderRadius: compact ? borderRadius.md : borderRadius.xl,
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: transitions.fast,
        opacity: disabled ? 0.5 : 1,
    };

    const dropZoneContent: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    };

    return { dropZone, dropZoneContent };
}
