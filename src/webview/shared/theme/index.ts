/**
 * Theme System Exports
 *
 * Central export point for the theme system including tokens,
 * provider, hooks, and utilities.
 */

// Theme tokens
export { theme, colors, spacing, typography, shadows, borderRadius, transitions, zIndex } from './theme';
export type {
    Theme,
    ColorToken,
    SpacingToken,
    FontSizeToken,
    FontWeightToken,
    ShadowToken,
    BorderRadiusToken,
    TransitionToken,
    ZIndexToken,
} from './theme';

// Theme provider and hooks
export { ThemeProvider, useTheme, useThemeTokens, useColorTheme, ThemeContext } from './ThemeProvider';

// Theme utilities
export {
    WCAG_AA,
    parseColor,
    getRelativeLuminance,
    getContrastRatio,
    validateContrast,
    warnOnLowContrast,
    ensureAccessibleColor,
    THEME_CONTRAST_RATIOS,
} from './utils';
export type { ContrastValidationResult } from './utils';

// Shared styles
export {
    createHeaderStyles,
    createSectionStyles,
    createFormStyles,
    createContentStyles,
    createListStyles,
    createAvatarStyles,
    createCheckboxStyles,
    createButtonContainerStyles,
    createEmptyStateStyles,
    createIconStyles,
    createDropZoneStyles,
} from './styles';
export type {
    HeaderStyleConfig,
    SectionStyleConfig,
    FormStyleConfig,
} from './styles';
