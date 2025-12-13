"use strict";
/**
 * UIStyleValidator - Validates UI styling for VS Code theme compliance
 *
 * This service validates that UI components use VS Code theme variables
 * instead of hardcoded colors, and ensures consistent styling across
 * buttons and headers.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UIStyleValidator = exports.STANDARD_HEADER_STYLES = exports.STANDARD_BUTTON_STYLES = exports.SEMANTIC_COLOR_CLASS_PATTERNS = exports.ALLOWED_HARDCODED_PATTERNS = exports.HARDCODED_COLOR_PATTERNS = exports.CUSTOM_THEME_VARIABLES = exports.VSCODE_THEME_VARIABLES = void 0;
/**
 * VS Code theme CSS variables that should be used instead of hardcoded colors
 */
exports.VSCODE_THEME_VARIABLES = {
    // Background colors
    'editor-background': '--vscode-editor-background',
    'sidebar-background': '--vscode-sideBar-background',
    'widget-background': '--vscode-editorWidget-background',
    'input-background': '--vscode-input-background',
    'dropdown-background': '--vscode-dropdown-background',
    'button-background': '--vscode-button-background',
    'button-hover-background': '--vscode-button-hoverBackground',
    'button-secondary-background': '--vscode-button-secondaryBackground',
    // Foreground/text colors
    'editor-foreground': '--vscode-editor-foreground',
    'description-foreground': '--vscode-descriptionForeground',
    'disabled-foreground': '--vscode-disabledForeground',
    'button-foreground': '--vscode-button-foreground',
    'input-foreground': '--vscode-input-foreground',
    'error-foreground': '--vscode-errorForeground',
    // Border colors
    'widget-border': '--vscode-widget-border',
    'input-border': '--vscode-input-border',
    'focus-border': '--vscode-focusBorder',
    'button-border': '--vscode-button-border',
    // Selection colors
    'selection-background': '--vscode-editor-selectionBackground',
    'list-hover-background': '--vscode-list-hoverBackground',
    'list-active-selection-background': '--vscode-list-activeSelectionBackground',
};
/**
 * Custom CSS variables that map to VS Code theme variables
 */
exports.CUSTOM_THEME_VARIABLES = {
    '--bg-primary': 'var(--vscode-editor-background)',
    '--bg-secondary': 'var(--vscode-sideBar-background)',
    '--bg-tertiary': 'var(--vscode-editorWidget-background)',
    '--text-primary': 'var(--vscode-editor-foreground)',
    '--text-secondary': 'var(--vscode-descriptionForeground)',
    '--text-muted': 'var(--vscode-disabledForeground)',
    '--border-color': 'var(--vscode-widget-border)',
    '--accent-color': 'var(--vscode-button-background)',
    '--accent-hover': 'var(--vscode-button-hoverBackground)',
    '--accent-text': 'var(--vscode-button-foreground)',
    '--accent-dim': 'var(--vscode-editor-selectionBackground)',
};
/**
 * Patterns for hardcoded colors that should be replaced
 */
exports.HARDCODED_COLOR_PATTERNS = [
    // Hex colors (3, 4, 6, or 8 digits)
    /#[0-9a-fA-F]{3,8}\b/g,
    // RGB/RGBA colors
    /rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)/gi,
    // HSL/HSLA colors
    /hsla?\s*\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+)?\s*\)/gi,
    // Named colors (common ones that might be hardcoded)
    /\b(white|black|red|blue|green|yellow|orange|purple|pink|gray|grey)\b/gi,
];
/**
 * Allowed hardcoded colors (Tailwind utility classes that are acceptable)
 */
exports.ALLOWED_HARDCODED_PATTERNS = [
    // Tailwind opacity modifiers (e.g., bg-black/50)
    /\/([\d]+)/,
    // Tailwind color utilities with semantic meaning (error, warning, success)
    /text-red-\d+/,
    /text-green-\d+/,
    /text-amber-\d+/,
    /text-yellow-\d+/,
    /text-blue-\d+/,
    /bg-red-\d+/,
    /bg-green-\d+/,
    /bg-amber-\d+/,
    /bg-yellow-\d+/,
    /bg-blue-\d+/,
    /border-red-\d+/,
    /border-green-\d+/,
    /border-amber-\d+/,
    /border-blue-\d+/,
    // Transparent is acceptable
    /transparent/,
    // Current color is acceptable
    /currentColor/,
    // Inherit is acceptable
    /inherit/,
];
/**
 * Patterns that indicate Tailwind semantic color classes (not hardcoded)
 */
exports.SEMANTIC_COLOR_CLASS_PATTERNS = [
    /^text-(red|green|amber|yellow|blue)-\d+$/,
    /^bg-(red|green|amber|yellow|blue)-\d+$/,
    /^border-(red|green|amber|yellow|blue)-\d+$/,
];
/**
 * Standard button style classes that should be used consistently
 */
exports.STANDARD_BUTTON_STYLES = {
    primary: [
        'bg-accent',
        'text-accent-text',
        'hover:bg-accent-hover',
        'rounded-md',
        'px-3',
        'py-1.5',
        'font-bold',
        'text-xs',
    ],
    secondary: [
        'bg-secondary',
        'text-secondary',
        'hover:bg-tertiary',
        'border',
        'border-border',
        'rounded-md',
        'px-3',
        'py-1.5',
        'text-xs',
    ],
    icon: [
        'p-1.5',
        'rounded-md',
        'text-secondary',
        'hover:text-primary',
        'hover:bg-tertiary',
        'transition-all',
    ],
    danger: ['text-red-400', 'hover:text-red-300', 'hover:bg-red-900/20'],
};
/**
 * Standard header style classes that should be used consistently
 */
exports.STANDARD_HEADER_STYLES = {
    section: ['text-xs', 'font-bold', 'text-muted', 'uppercase', 'tracking-widest'],
    page: ['text-sm', 'font-bold', 'text-primary', 'uppercase', 'tracking-widest'],
    card: ['text-sm', 'font-medium', 'text-primary'],
};
/**
 * UIStyleValidator class for validating UI styling compliance
 */
class UIStyleValidator {
    /**
     * Check if a CSS string contains hardcoded colors that should use theme variables
     */
    containsHardcodedColors(cssContent) {
        // First check if this is a semantic color class (which is acceptable)
        if (exports.SEMANTIC_COLOR_CLASS_PATTERNS.some((pattern) => pattern.test(cssContent.trim()))) {
            return false;
        }
        // First, check if it uses theme variables (which is good)
        const usesThemeVariables = this.usesThemeVariables(cssContent);
        // Check for hardcoded color patterns
        for (const pattern of exports.HARDCODED_COLOR_PATTERNS) {
            const matches = cssContent.match(pattern);
            if (matches) {
                // Filter out allowed patterns
                const disallowedMatches = matches.filter((match) => {
                    return !exports.ALLOWED_HARDCODED_PATTERNS.some((allowed) => allowed.test(match));
                });
                if (disallowedMatches.length > 0 && !usesThemeVariables) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Check if CSS content uses VS Code theme variables
     */
    usesThemeVariables(cssContent) {
        // Check for VS Code theme variables
        const vsCodeVarPattern = /--vscode-[\w-]+/;
        if (vsCodeVarPattern.test(cssContent)) {
            return true;
        }
        // Check for custom theme variables
        for (const customVar of Object.keys(exports.CUSTOM_THEME_VARIABLES)) {
            if (cssContent.includes(customVar)) {
                return true;
            }
        }
        // Check for Tailwind theme utility classes
        const themeUtilityClasses = [
            'bg-primary',
            'bg-secondary',
            'bg-tertiary',
            'text-primary',
            'text-secondary',
            'text-muted',
            'border-border',
            'border-accent',
            'bg-accent',
            'text-accent',
            'text-accent-text',
            'hover:bg-accent-hover',
            'hover:text-accent-hover',
        ];
        return themeUtilityClasses.some((cls) => cssContent.includes(cls));
    }
    /**
     * Extract hardcoded colors from CSS content
     */
    extractHardcodedColors(cssContent) {
        const colors = [];
        for (const pattern of exports.HARDCODED_COLOR_PATTERNS) {
            const matches = cssContent.match(pattern);
            if (matches) {
                for (const match of matches) {
                    // Skip allowed patterns
                    const isAllowed = exports.ALLOWED_HARDCODED_PATTERNS.some((allowed) => allowed.test(match));
                    if (!isAllowed && !colors.includes(match)) {
                        colors.push(match);
                    }
                }
            }
        }
        return colors;
    }
    /**
     * Validate that a className string uses theme variables instead of hardcoded colors
     */
    validateThemeVariableUsage(className) {
        const issues = [];
        // Check for hardcoded Tailwind color classes that should use theme variables
        const hardcodedTailwindPatterns = [
            {
                pattern: /bg-\[#[0-9a-fA-F]+\]/,
                suggestion: 'Use bg-primary, bg-secondary, or bg-tertiary',
            },
            {
                pattern: /text-\[#[0-9a-fA-F]+\]/,
                suggestion: 'Use text-primary, text-secondary, or text-muted',
            },
            { pattern: /border-\[#[0-9a-fA-F]+\]/, suggestion: 'Use border-border or border-accent' },
            {
                pattern: /bg-gray-\d{3}(?!\/)/g,
                suggestion: 'Use bg-secondary or bg-tertiary for gray backgrounds',
            },
            {
                pattern: /text-gray-\d{3}(?!\/)/g,
                suggestion: 'Use text-secondary or text-muted for gray text',
            },
            { pattern: /border-gray-\d{3}(?!\/)/g, suggestion: 'Use border-border for gray borders' },
        ];
        for (const { pattern, suggestion } of hardcodedTailwindPatterns) {
            if (pattern.test(className)) {
                issues.push({
                    type: 'hardcoded-color',
                    message: `Found hardcoded color class: ${className.match(pattern)?.[0]}`,
                    suggestion,
                });
            }
        }
        return {
            valid: issues.length === 0,
            issues,
        };
    }
    /**
     * Analyze button styling for consistency
     */
    analyzeButtonStyle(className) {
        const classes = className.split(/\s+/).filter(Boolean);
        // Determine button type based on classes present
        let buttonType = 'unknown';
        if (classes.includes('bg-accent') && classes.includes('text-accent-text')) {
            buttonType = 'primary';
        }
        else if (classes.includes('bg-secondary') || classes.includes('border-border')) {
            buttonType = 'secondary';
        }
        else if (classes.some((c) => c.includes('red-')) &&
            classes.some((c) => c.includes('hover:'))) {
            buttonType = 'danger';
        }
        else if (classes.includes('p-1.5') && !classes.includes('px-')) {
            buttonType = 'icon';
        }
        if (buttonType === 'unknown') {
            return {
                hasRequiredClasses: false,
                missingClasses: [],
                extraClasses: classes,
                buttonType,
            };
        }
        const requiredClasses = exports.STANDARD_BUTTON_STYLES[buttonType];
        const missingClasses = requiredClasses.filter((req) => !classes.includes(req));
        const extraClasses = classes.filter((cls) => !requiredClasses.includes(cls) &&
            ![
                'transition-all',
                'transition-colors',
                'duration-200',
                'flex',
                'items-center',
                'gap-1',
                'gap-1.5',
                'gap-2',
                'disabled:opacity-50',
                'disabled:cursor-not-allowed',
            ].includes(cls));
        return {
            hasRequiredClasses: missingClasses.length === 0,
            missingClasses,
            extraClasses,
            buttonType,
        };
    }
    /**
     * Validate button style consistency
     */
    validateButtonStyle(className) {
        const analysis = this.analyzeButtonStyle(className);
        const issues = [];
        if (analysis.buttonType === 'unknown') {
            issues.push({
                type: 'inconsistent-button',
                message: 'Button does not match any standard button style pattern',
                suggestion: 'Use one of the standard button styles: primary, secondary, icon, or danger',
            });
        }
        else if (!analysis.hasRequiredClasses) {
            issues.push({
                type: 'inconsistent-button',
                message: `Button is missing required classes for ${analysis.buttonType} style`,
                suggestion: `Add missing classes: ${analysis.missingClasses.join(', ')}`,
            });
        }
        return {
            valid: issues.length === 0,
            issues,
        };
    }
    /**
     * Analyze header styling for consistency
     */
    analyzeHeaderStyle(className) {
        const classes = className.split(/\s+/).filter(Boolean);
        // Determine header type based on classes present
        let headerType = 'unknown';
        // Check for section header (text-xs + uppercase + font-bold)
        if (classes.includes('text-xs') &&
            classes.includes('uppercase') &&
            classes.includes('font-bold')) {
            headerType = 'section';
        }
        else if (classes.includes('text-sm') &&
            classes.includes('uppercase') &&
            classes.includes('font-bold')) {
            headerType = 'page';
        }
        else if (classes.includes('text-sm') && classes.includes('font-medium')) {
            headerType = 'card';
        }
        if (headerType === 'unknown') {
            return {
                hasRequiredClasses: false,
                missingClasses: [],
                headerType,
            };
        }
        const requiredClasses = exports.STANDARD_HEADER_STYLES[headerType];
        const missingClasses = requiredClasses.filter((req) => !classes.includes(req));
        return {
            hasRequiredClasses: missingClasses.length === 0,
            missingClasses,
            headerType,
        };
    }
    /**
     * Validate header style consistency
     */
    validateHeaderStyle(className) {
        const analysis = this.analyzeHeaderStyle(className);
        const issues = [];
        if (analysis.headerType === 'unknown') {
            issues.push({
                type: 'inconsistent-header',
                message: 'Header does not match any standard header style pattern',
                suggestion: 'Use one of the standard header styles: section, page, or card',
            });
        }
        else if (!analysis.hasRequiredClasses) {
            issues.push({
                type: 'inconsistent-header',
                message: `Header is missing required classes for ${analysis.headerType} style`,
                suggestion: `Add missing classes: ${analysis.missingClasses.join(', ')}`,
            });
        }
        return {
            valid: issues.length === 0,
            issues,
        };
    }
    /**
     * Check if a component responds to theme changes
     * This validates that the component uses CSS variables that will update with theme changes
     */
    validateThemeResponsiveness(cssContent) {
        const issues = [];
        // Check if the content uses theme-responsive variables
        const usesThemeVars = this.usesThemeVariables(cssContent);
        if (!usesThemeVars) {
            // Check for hardcoded colors that won't respond to theme changes
            const hardcodedColors = this.extractHardcodedColors(cssContent);
            if (hardcodedColors.length > 0) {
                issues.push({
                    type: 'missing-theme-variable',
                    message: `Found ${hardcodedColors.length} hardcoded color(s) that won't respond to theme changes`,
                    suggestion: 'Replace hardcoded colors with VS Code theme variables or custom theme variables',
                });
            }
        }
        return {
            valid: issues.length === 0,
            issues,
        };
    }
    /**
     * Get suggested theme variable replacement for a hardcoded color
     */
    suggestThemeVariable(hardcodedColor) {
        const colorLower = hardcodedColor.toLowerCase();
        // Map common hardcoded colors to theme variables
        const suggestions = {
            '#1e1e1e': 'var(--bg-primary) or bg-primary',
            '#18181b': 'var(--bg-secondary) or bg-secondary',
            '#252526': 'var(--bg-tertiary) or bg-tertiary',
            '#ffffff': 'var(--text-primary) or text-primary',
            '#cccccc': 'var(--text-secondary) or text-secondary',
            '#808080': 'var(--text-muted) or text-muted',
            white: 'var(--text-primary) or text-primary',
            black: 'var(--bg-primary) or bg-primary',
        };
        return suggestions[colorLower] || null;
    }
}
exports.UIStyleValidator = UIStyleValidator;
//# sourceMappingURL=UIStyleValidator.js.map