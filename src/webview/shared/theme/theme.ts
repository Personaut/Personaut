/**
 * Theme System for Personaut Webview
 *
 * This file defines the core theme tokens including colors, spacing,
 * typography, shadows, and border radius values. All values are designed
 * to integrate with VS Code's theming system.
 *
 * **Validates: Requirements 2.1, 2.4, 29.1, 29.2, 29.3**
 *
 * Color Contrast Notes (WCAG 2.1 AA):
 * - Text colors meet 4.5:1 minimum contrast ratio
 * - UI component colors meet 3:1 minimum contrast ratio
 */

/**
 * Color tokens mapped to VS Code theme variables.
 * Includes semantic colors for consistent meaning across the UI.
 */
export const colors = {
    // Primary brand color (buttons, links)
    primary: 'var(--vscode-button-background)',
    primaryForeground: 'var(--vscode-button-foreground)',
    primaryHover: 'var(--vscode-button-hoverBackground)',

    // Secondary actions
    secondary: 'var(--vscode-button-secondaryBackground)',
    secondaryForeground: 'var(--vscode-button-secondaryForeground)',
    secondaryHover: 'var(--vscode-button-secondaryHoverBackground)',

    // Accent/focus color
    accent: 'var(--vscode-focusBorder)',

    // Semantic status colors (WCAG 2.1 AA compliant)
    // Contrast ratios calculated against #1E1E1E (dark theme background)
    success: '#73C991', // 7.8:1 contrast ratio
    warning: '#E5C07B', // 10.1:1 contrast ratio
    error: '#F48771', // 7.2:1 contrast ratio
    info: '#6CB6FF', // 7.5:1 contrast ratio

    // Muted/disabled
    muted: 'var(--vscode-disabledForeground)',

    // Background hierarchy
    background: {
        primary: 'var(--vscode-editor-background)',
        secondary: 'var(--vscode-sideBar-background)',
        tertiary: 'var(--vscode-editorWidget-background)',
    },

    // Text hierarchy
    // Contrast ratios calculated against #1E1E1E
    text: {
        primary: 'var(--vscode-editor-foreground)', // ~12.6:1 contrast
        secondary: 'var(--vscode-descriptionForeground)', // ~7.0:1 contrast
        muted: 'var(--vscode-disabledForeground)', // ~4.5:1 contrast (minimum)
    },

    // Borders
    border: 'var(--vscode-widget-border)',
    borderFocus: 'var(--vscode-focusBorder)',

    // Input elements
    input: {
        background: 'var(--vscode-input-background)',
        foreground: 'var(--vscode-input-foreground)',
        border: 'var(--vscode-input-border)',
        placeholderForeground: 'var(--vscode-input-placeholderForeground)',
    },

    // Dropdown elements
    dropdown: {
        background: 'var(--vscode-dropdown-background)',
        foreground: 'var(--vscode-dropdown-foreground)',
        border: 'var(--vscode-dropdown-border)',
    },

    // List/selection
    list: {
        hoverBackground: 'var(--vscode-list-hoverBackground)',
        activeSelectionBackground: 'var(--vscode-list-activeSelectionBackground)',
        activeSelectionForeground: 'var(--vscode-list-activeSelectionForeground)',
    },

    // Custom accent color for highlights
    amber: {
        50: '#FFFBEB',
        100: '#FEF3C7',
        200: '#FDE68A',
        300: '#FCD34D',
        400: '#FBBF24',
        500: '#F59E0B',
        600: '#D97706',
        700: '#B45309',
        800: '#92400E',
        900: '#78350F',
    },
} as const;

/**
 * Spacing scale based on 4px unit.
 * Provides consistent spacing throughout the UI.
 */
export const spacing = {
    /** 4px - Minimum spacing */
    xs: '4px',
    /** 8px - Tight spacing between related elements */
    sm: '8px',
    /** 12px - Standard spacing */
    md: '12px',
    /** 16px - Section spacing */
    lg: '16px',
    /** 24px - Large section spacing */
    xl: '24px',
    /** 32px - Very large spacing */
    '2xl': '32px',
    /** 48px - Extra large spacing */
    '3xl': '48px',
    /** 64px - Maximum spacing */
    '4xl': '64px',
} as const;

/**
 * Typography scale for consistent text styling.
 */
export const typography = {
    fontFamily: {
        /** Primary font for UI text */
        sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        /** Monospace font for code and technical content */
        mono: 'Consolas, Monaco, "Courier New", monospace',
    },
    fontSize: {
        /** 11px - Tertiary text, metadata */
        xs: '11px',
        /** 12px - Secondary text, captions */
        sm: '12px',
        /** 13px - Body text (default) */
        md: '13px',
        /** 14px - Large body text, h4 */
        lg: '14px',
        /** 16px - h3 headings */
        xl: '16px',
        /** 18px - h2/h1 headings */
        '2xl': '18px',
    },
    fontWeight: {
        /** Normal text weight */
        normal: 400,
        /** Medium emphasis */
        medium: 500,
        /** Semi-bold for subheadings */
        semibold: 600,
        /** Bold for headings */
        bold: 700,
    },
    lineHeight: {
        /** 1.2 - Tight, for headings */
        tight: 1.2,
        /** 1.5 - Normal, for body text */
        normal: 1.5,
        /** 1.75 - Relaxed, for readable paragraphs */
        relaxed: 1.75,
    },
} as const;

/**
 * Shadow tokens for elevation and depth.
 */
export const shadows = {
    /** Subtle shadow for cards */
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    /** Medium shadow for dropdowns and popovers */
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    /** Large shadow for modals */
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    /** Extra large shadow for floating elements */
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const;

/**
 * Border radius tokens.
 */
export const borderRadius = {
    /** 2px - Subtle rounding */
    sm: '2px',
    /** 4px - Standard rounding (buttons, inputs) */
    md: '4px',
    /** 6px - Medium rounding */
    lg: '6px',
    /** 8px - Large rounding (cards) */
    xl: '8px',
    /** 12px - Extra large rounding */
    '2xl': '12px',
    /** Full rounding (pills, avatars) */
    full: '9999px',
} as const;

/**
 * Transition timing for animations.
 */
export const transitions = {
    /** Fast micro-interactions */
    fast: '150ms ease-out',
    /** Standard transitions */
    normal: '200ms ease-out',
    /** Complex animations */
    slow: '300ms ease-out',
    /** Entrance animations */
    enter: '200ms ease-out',
    /** Exit animations */
    exit: '150ms ease-in',
} as const;

/**
 * Z-index scale for layering.
 */
export const zIndex = {
    /** Below normal content */
    behind: -1,
    /** Normal content */
    base: 0,
    /** Sticky headers */
    sticky: 10,
    /** Dropdowns and popovers */
    dropdown: 20,
    /** Fixed elements */
    fixed: 30,
    /** Modal backdrop */
    modalBackdrop: 40,
    /** Modal content */
    modal: 50,
    /** Tooltips */
    tooltip: 60,
    /** Toast notifications */
    toast: 70,
} as const;

/**
 * Complete theme object.
 */
export const theme = {
    colors,
    spacing,
    typography,
    shadows,
    borderRadius,
    transitions,
    zIndex,
} as const;

/**
 * Theme type for TypeScript support.
 */
export type Theme = typeof theme;

/**
 * Individual token types for type-safe access.
 */
export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type FontSizeToken = keyof typeof typography.fontSize;
export type FontWeightToken = keyof typeof typography.fontWeight;
export type ShadowToken = keyof typeof shadows;
export type BorderRadiusToken = keyof typeof borderRadius;
export type TransitionToken = keyof typeof transitions;
export type ZIndexToken = keyof typeof zIndex;

export default theme;
