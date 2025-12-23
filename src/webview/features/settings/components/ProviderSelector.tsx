import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';
import { ApiProvider } from '../types';

/**
 * Provider option interface
 */
interface ProviderOption {
    id: ApiProvider;
    name: string;
    description: string;
}

/**
 * Available providers
 */
const PROVIDERS: ProviderOption[] = [
    {
        id: 'gemini',
        name: 'Google Gemini',
        description: "Use Google's Gemini API",
    },
    {
        id: 'bedrock',
        name: 'AWS Bedrock',
        description: 'Use AWS Bedrock (Claude)',
    },
];

/**
 * ProviderSelector component props
 */
export interface ProviderSelectorProps {
    /** Currently selected provider */
    value: ApiProvider;
    /** Handler for provider changes */
    onChange: (provider: ApiProvider) => void;
    /** Whether the selector is disabled */
    disabled?: boolean;
}

/**
 * ProviderSelector component for selecting API provider.
 *
 * Displays radio-button style cards for each provider option.
 *
 * @example
 * ```tsx
 * <ProviderSelector
 *   value={settings.provider}
 *   onChange={(provider) => updateSetting('provider', provider)}
 * />
 * ```
 *
 * **Validates: Requirements 13.5, 21.1**
 */
export function ProviderSelector({ value, onChange, disabled = false }: ProviderSelectorProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {PROVIDERS.map((provider) => {
                const isSelected = value === provider.id;

                const cardStyle: React.CSSProperties = {
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: borderRadius.lg,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: transitions.normal,
                    opacity: disabled ? 0.5 : 1,
                    backgroundColor: isSelected ? 'rgba(255, 191, 36, 0.1)' : colors.background.secondary,
                    border: `1px solid ${isSelected ? 'rgba(255, 191, 36, 0.3)' : colors.border}`,
                };

                return (
                    <label key={provider.id} style={cardStyle}>
                        <input
                            type="radio"
                            name="provider"
                            value={provider.id}
                            checked={isSelected}
                            onChange={() => onChange(provider.id)}
                            disabled={disabled}
                            style={{
                                marginTop: '2px',
                                accentColor: colors.accent,
                            }}
                        />
                        <div>
                            <div
                                style={{
                                    fontSize: typography.fontSize.sm,
                                    fontWeight: typography.fontWeight.medium,
                                    color: colors.text.primary,
                                }}
                            >
                                {provider.name}
                            </div>
                            <div
                                style={{
                                    fontSize: typography.fontSize.xs,
                                    color: colors.text.secondary,
                                }}
                            >
                                {provider.description}
                            </div>
                        </div>
                    </label>
                );
            })}
        </div>
    );
}

export default ProviderSelector;
