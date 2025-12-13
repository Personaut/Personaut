/**
 * AccessibilityValidator - Validates UI accessibility compliance
 *
 * This service validates that UI components meet WCAG 2.1 AA standards
 * including ARIA labels, keyboard navigation, and color contrast.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.5
 */

/**
 * Interactive element types that require ARIA labels
 */
export const INTERACTIVE_ELEMENTS = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'checkbox',
  'radio',
  'slider',
  'switch',
  'tab',
  'menuitem',
  'option',
] as const;

/**
 * ARIA attributes that provide accessible names
 */
export const ARIA_LABEL_ATTRIBUTES = [
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'title',
] as const;

/**
 * Keyboard navigation keys that should be supported
 */
export const NAVIGATION_KEYS = [
  'Tab',
  'Enter',
  'Space',
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
] as const;

/**
 * WCAG 2.1 AA minimum contrast ratios
 */
export const WCAG_CONTRAST_RATIOS = {
  normalText: 4.5, // For text smaller than 18pt (or 14pt bold)
  largeText: 3.0, // For text 18pt+ (or 14pt+ bold)
  uiComponents: 3.0, // For UI components and graphical objects
} as const;

export interface AriaValidationResult {
  valid: boolean;
  hasAriaLabel: boolean;
  hasTitle: boolean;
  hasVisibleText: boolean;
  missingAttributes: string[];
  suggestions: string[];
}

export interface KeyboardNavigationResult {
  valid: boolean;
  supportedKeys: string[];
  missingKeys: string[];
  hasFocusIndicator: boolean;
  hasTabIndex: boolean;
}

export interface ColorContrastResult {
  valid: boolean;
  contrastRatio: number;
  meetsNormalText: boolean;
  meetsLargeText: boolean;
  meetsUIComponents: boolean;
  suggestion?: string;
}

export interface AccessibilityIssue {
  type: 'aria' | 'keyboard' | 'contrast';
  severity: 'error' | 'warning';
  message: string;
  element?: string;
  suggestion?: string;
}

/**
 * Parse RGB color from various formats
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Handle hex colors
  const hexMatch = color.match(/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
    };
  }

  // Handle short hex colors
  const shortHexMatch = color.match(/^#?([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
  if (shortHexMatch) {
    return {
      r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
      g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
      b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16),
    };
  }

  // Handle rgb/rgba colors
  const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  return null;
}

/**
 * Calculate relative luminance according to WCAG 2.1
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
function calculateContrastRatio(
  foreground: { r: number; g: number; b: number },
  background: { r: number; g: number; b: number }
): number {
  const l1 = getRelativeLuminance(foreground.r, foreground.g, foreground.b);
  const l2 = getRelativeLuminance(background.r, background.g, background.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * AccessibilityValidator class for validating UI accessibility compliance
 */
export class AccessibilityValidator {
  /**
   * Validate ARIA label presence for an interactive element
   */
  validateAriaLabel(props: {
    elementType: string;
    ariaLabel?: string;
    ariaLabelledby?: string;
    ariaDescribedby?: string;
    title?: string;
    children?: string;
    role?: string;
  }): AriaValidationResult {
    const missingAttributes: string[] = [];
    const suggestions: string[] = [];

    const hasAriaLabel = !!props.ariaLabel && props.ariaLabel.trim().length > 0;
    const hasAriaLabelledby = !!props.ariaLabelledby && props.ariaLabelledby.trim().length > 0;
    const hasTitle = !!props.title && props.title.trim().length > 0;
    const hasVisibleText = !!props.children && props.children.trim().length > 0;

    // Check if element has any accessible name (aria-describedby alone is not sufficient)
    const hasAccessibleName = hasAriaLabel || hasAriaLabelledby || hasTitle || hasVisibleText;

    if (!hasAccessibleName) {
      missingAttributes.push('aria-label');
      suggestions.push(`Add aria-label attribute to describe the ${props.elementType}`);
    }

    // For icon-only buttons, aria-label is required
    if (props.elementType === 'button' && !hasVisibleText && !hasAriaLabel && !hasTitle) {
      suggestions.push('Icon-only buttons must have aria-label or title attribute');
    }

    // For inputs, check for associated label
    if (
      (props.elementType === 'input' ||
        props.elementType === 'select' ||
        props.elementType === 'textarea') &&
      !hasAriaLabel &&
      !hasAriaLabelledby
    ) {
      suggestions.push('Form inputs should have aria-label or be associated with a label element');
    }

    return {
      valid: hasAccessibleName,
      hasAriaLabel,
      hasTitle,
      hasVisibleText,
      missingAttributes,
      suggestions,
    };
  }

  /**
   * Check if an element has proper ARIA attributes for its role
   */
  hasProperAriaAttributes(props: {
    role?: string;
    ariaLabel?: string;
    ariaExpanded?: boolean;
    ariaSelected?: boolean;
    ariaChecked?: boolean;
    ariaDisabled?: boolean;
    ariaHidden?: boolean;
  }): boolean {
    // If element has a role, check for required ARIA attributes
    if (props.role) {
      switch (props.role) {
        case 'button':
          // Buttons should have aria-label if no visible text
          return props.ariaLabel !== undefined || props.ariaDisabled !== undefined;
        case 'checkbox':
        case 'switch':
          // Checkboxes and switches need aria-checked
          return props.ariaChecked !== undefined;
        case 'tab':
          // Tabs need aria-selected
          return props.ariaSelected !== undefined;
        case 'menu':
        case 'listbox':
          // Expandable elements need aria-expanded
          return props.ariaExpanded !== undefined;
        default:
          return true;
      }
    }
    return true;
  }

  /**
   * Validate keyboard navigation support for an element
   */
  validateKeyboardNavigation(props: {
    elementType: string;
    tabIndex?: number;
    onKeyDown?: boolean;
    onKeyUp?: boolean;
    onClick?: boolean;
    hasFocusStyles?: boolean;
    supportedKeys?: string[];
  }): KeyboardNavigationResult {
    const supportedKeys: string[] = props.supportedKeys || [];
    const missingKeys: string[] = [];

    // Check if element is focusable
    const isFocusable =
      props.tabIndex !== undefined ||
      ['button', 'a', 'input', 'select', 'textarea'].includes(props.elementType);

    // Check for keyboard event handlers
    const hasKeyboardHandler = props.onKeyDown || props.onKeyUp;

    // Determine required keys based on element type
    const requiredKeys: string[] = ['Tab'];

    if (props.elementType === 'button' || props.onClick) {
      requiredKeys.push('Enter', 'Space');
    }

    if (props.elementType === 'select' || props.elementType === 'menu') {
      requiredKeys.push('ArrowUp', 'ArrowDown', 'Escape');
    }

    // Check for missing keys
    for (const key of requiredKeys) {
      if (!supportedKeys.includes(key)) {
        missingKeys.push(key);
      }
    }

    // For custom interactive elements, keyboard support is required
    const valid =
      isFocusable && (hasKeyboardHandler || ['button', 'a', 'input'].includes(props.elementType));

    return {
      valid,
      supportedKeys,
      missingKeys,
      hasFocusIndicator: props.hasFocusStyles || false,
      hasTabIndex: props.tabIndex !== undefined,
    };
  }

  /**
   * Check if an element supports keyboard activation
   */
  supportsKeyboardActivation(props: {
    elementType: string;
    onClick?: boolean;
    onKeyDown?: boolean;
    role?: string;
  }): boolean {
    // Native interactive elements support keyboard by default
    if (['button', 'a', 'input', 'select', 'textarea'].includes(props.elementType)) {
      return true;
    }

    // Custom interactive elements need keyboard handlers
    if (props.onClick && !props.onKeyDown) {
      return false;
    }

    // Elements with interactive roles need keyboard support
    if (props.role && ['button', 'link', 'menuitem', 'tab'].includes(props.role)) {
      return props.onKeyDown === true;
    }

    return true;
  }

  /**
   * Validate color contrast between foreground and background colors
   */
  validateColorContrast(
    foregroundColor: string,
    backgroundColor: string,
    options: { isLargeText?: boolean; isUIComponent?: boolean } = {}
  ): ColorContrastResult {
    const foreground = parseColor(foregroundColor);
    const background = parseColor(backgroundColor);

    if (!foreground || !background) {
      return {
        valid: false,
        contrastRatio: 0,
        meetsNormalText: false,
        meetsLargeText: false,
        meetsUIComponents: false,
        suggestion: 'Unable to parse color values',
      };
    }

    const contrastRatio = calculateContrastRatio(foreground, background);
    const meetsNormalText = contrastRatio >= WCAG_CONTRAST_RATIOS.normalText;
    const meetsLargeText = contrastRatio >= WCAG_CONTRAST_RATIOS.largeText;
    const meetsUIComponents = contrastRatio >= WCAG_CONTRAST_RATIOS.uiComponents;

    let valid: boolean;
    let suggestion: string | undefined;

    if (options.isUIComponent) {
      valid = meetsUIComponents;
      if (!valid) {
        suggestion = `UI component contrast ratio ${contrastRatio.toFixed(2)}:1 is below the required ${WCAG_CONTRAST_RATIOS.uiComponents}:1`;
      }
    } else if (options.isLargeText) {
      valid = meetsLargeText;
      if (!valid) {
        suggestion = `Large text contrast ratio ${contrastRatio.toFixed(2)}:1 is below the required ${WCAG_CONTRAST_RATIOS.largeText}:1`;
      }
    } else {
      valid = meetsNormalText;
      if (!valid) {
        suggestion = `Normal text contrast ratio ${contrastRatio.toFixed(2)}:1 is below the required ${WCAG_CONTRAST_RATIOS.normalText}:1`;
      }
    }

    return {
      valid,
      contrastRatio,
      meetsNormalText,
      meetsLargeText,
      meetsUIComponents,
      suggestion,
    };
  }

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio(foregroundColor: string, backgroundColor: string): number {
    const foreground = parseColor(foregroundColor);
    const background = parseColor(backgroundColor);

    if (!foreground || !background) {
      return 0;
    }

    return calculateContrastRatio(foreground, background);
  }

  /**
   * Check if a color combination meets WCAG 2.1 AA standards
   */
  meetsWCAGAA(
    foregroundColor: string,
    backgroundColor: string,
    options: { isLargeText?: boolean } = {}
  ): boolean {
    const result = this.validateColorContrast(foregroundColor, backgroundColor, options);
    return options.isLargeText ? result.meetsLargeText : result.meetsNormalText;
  }

  /**
   * Suggest a color adjustment to meet contrast requirements
   */
  suggestContrastFix(
    foregroundColor: string,
    backgroundColor: string,
    targetRatio: number = WCAG_CONTRAST_RATIOS.normalText
  ): string | null {
    const foreground = parseColor(foregroundColor);
    const background = parseColor(backgroundColor);

    if (!foreground || !background) {
      return null;
    }

    const currentRatio = calculateContrastRatio(foreground, background);

    if (currentRatio >= targetRatio) {
      return null; // Already meets requirements
    }

    // Determine if we should lighten or darken the foreground
    const fgLuminance = getRelativeLuminance(foreground.r, foreground.g, foreground.b);
    const bgLuminance = getRelativeLuminance(background.r, background.g, background.b);

    if (fgLuminance > bgLuminance) {
      // Foreground is lighter, suggest making it even lighter
      return 'Consider using a lighter foreground color or darker background';
    } else {
      // Foreground is darker, suggest making it even darker
      return 'Consider using a darker foreground color or lighter background';
    }
  }

  /**
   * Validate overall accessibility of a component
   */
  validateComponent(props: {
    elementType: string;
    ariaLabel?: string;
    title?: string;
    children?: string;
    tabIndex?: number;
    onClick?: boolean;
    onKeyDown?: boolean;
    foregroundColor?: string;
    backgroundColor?: string;
    hasFocusStyles?: boolean;
  }): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check ARIA labels
    const ariaResult = this.validateAriaLabel({
      elementType: props.elementType,
      ariaLabel: props.ariaLabel,
      title: props.title,
      children: props.children,
    });

    if (!ariaResult.valid) {
      issues.push({
        type: 'aria',
        severity: 'error',
        message: `Missing accessible name for ${props.elementType}`,
        element: props.elementType,
        suggestion: ariaResult.suggestions[0],
      });
    }

    // Check keyboard navigation
    const keyboardResult = this.validateKeyboardNavigation({
      elementType: props.elementType,
      tabIndex: props.tabIndex,
      onKeyDown: props.onKeyDown,
      onClick: props.onClick,
      hasFocusStyles: props.hasFocusStyles,
    });

    if (!keyboardResult.valid && props.onClick) {
      issues.push({
        type: 'keyboard',
        severity: 'error',
        message: `Interactive element not keyboard accessible`,
        element: props.elementType,
        suggestion: 'Add keyboard event handlers or use native interactive elements',
      });
    }

    if (!keyboardResult.hasFocusIndicator && props.onClick) {
      issues.push({
        type: 'keyboard',
        severity: 'warning',
        message: `Missing focus indicator`,
        element: props.elementType,
        suggestion: 'Add visible focus styles using :focus or :focus-visible',
      });
    }

    // Check color contrast
    if (props.foregroundColor && props.backgroundColor) {
      const contrastResult = this.validateColorContrast(
        props.foregroundColor,
        props.backgroundColor
      );

      if (!contrastResult.valid) {
        issues.push({
          type: 'contrast',
          severity: 'error',
          message: `Insufficient color contrast (${contrastResult.contrastRatio.toFixed(2)}:1)`,
          suggestion: contrastResult.suggestion,
        });
      }
    }

    return issues;
  }
}
