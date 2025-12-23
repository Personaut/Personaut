import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { theme, Theme } from './theme';

/**
 * Theme context for accessing theme tokens throughout the component tree.
 *
 * **Validates: Requirements 2.2, 2.3**
 */
interface ThemeContextValue {
    /** The complete theme object */
    theme: Theme;
    /** Current VS Code color theme kind */
    colorTheme: 'dark' | 'light' | 'high-contrast';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Props for the ThemeProvider component.
 */
interface ThemeProviderProps {
    children: ReactNode;
}

/**
 * ThemeProvider component that wraps the application and provides
 * theme context to all child components.
 *
 * Automatically handles VS Code theme changes and updates CSS custom
 * properties accordingly.
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 *
 * **Validates: Requirements 2.2, 2.3**
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
    const [colorTheme, setColorTheme] = useState<'dark' | 'light' | 'high-contrast'>('dark');

    useEffect(() => {
        // Detect initial color theme from VS Code
        const detectColorTheme = () => {
            const body = document.body;
            if (body.classList.contains('vscode-high-contrast')) {
                return 'high-contrast';
            } else if (body.classList.contains('vscode-light')) {
                return 'light';
            }
            return 'dark';
        };

        setColorTheme(detectColorTheme());

        // Set up mutation observer to detect VS Code theme changes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    setColorTheme(detectColorTheme());
                }
            }
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        // Apply CSS custom properties based on theme
        const root = document.documentElement;

        // Set spacing custom properties
        Object.entries(theme.spacing).forEach(([key, value]) => {
            root.style.setProperty(`--spacing-${key}`, value);
        });

        // Set typography custom properties
        Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
            root.style.setProperty(`--font-size-${key}`, value);
        });

        // Set border radius custom properties
        Object.entries(theme.borderRadius).forEach(([key, value]) => {
            root.style.setProperty(`--radius-${key}`, value);
        });

        // Set shadow custom properties
        Object.entries(theme.shadows).forEach(([key, value]) => {
            root.style.setProperty(`--shadow-${key}`, value);
        });

        // Set z-index custom properties
        Object.entries(theme.zIndex).forEach(([key, value]) => {
            root.style.setProperty(`--z-${key}`, String(value));
        });

        // Set semantic color custom properties
        root.style.setProperty('--color-success', theme.colors.success);
        root.style.setProperty('--color-warning', theme.colors.warning);
        root.style.setProperty('--color-error', theme.colors.error);
        root.style.setProperty('--color-info', theme.colors.info);
    }, []);

    const contextValue: ThemeContextValue = {
        theme,
        colorTheme,
    };

    return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access the theme context.
 *
 * Must be used within a ThemeProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, colorTheme } = useTheme();
 *   return (
 *     <div style={{ padding: theme.spacing.md }}>
 *       Current theme: {colorTheme}
 *     </div>
 *   );
 * }
 * ```
 *
 * @throws {Error} If used outside of ThemeProvider
 *
 * **Validates: Requirements 2.2**
 */
export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

/**
 * Convenience hook to access just the theme object.
 *
 * @example
 * ```tsx
 * const theme = useThemeTokens();
 * // Access: theme.colors.primary, theme.spacing.md, etc.
 * ```
 */
export function useThemeTokens(): Theme {
    return useTheme().theme;
}

/**
 * Convenience hook to get the current color theme.
 *
 * @returns 'dark' | 'light' | 'high-contrast'
 */
export function useColorTheme(): 'dark' | 'light' | 'high-contrast' {
    return useTheme().colorTheme;
}

export { ThemeContext };
