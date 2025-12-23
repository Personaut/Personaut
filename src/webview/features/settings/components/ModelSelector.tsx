import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';
import { GEMINI_MODELS, BEDROCK_MODELS, ApiProvider } from '../types';

/**
 * ModelSelector component props
 */
export interface ModelSelectorProps {
    /** Current provider */
    provider: ApiProvider;
    /** Currently selected model */
    value: string;
    /** Handler for model changes */
    onChange: (model: string) => void;
    /** Whether the selector is disabled */
    disabled?: boolean;
}

/**
 * ModelSelector component for selecting AI model.
 *
 * Displays a grouped dropdown based on the selected provider.
 *
 * @example
 * ```tsx
 * <ModelSelector
 *   provider={settings.provider}
 *   value={settings.geminiModel}
 *   onChange={(model) => updateSetting('geminiModel', model)}
 * />
 * ```
 *
 * **Validates: Requirements 13.5, 21.1**
 */
export function ModelSelector({ provider, value, onChange, disabled = false }: ModelSelectorProps) {
    const models = provider === 'gemini' ? GEMINI_MODELS : BEDROCK_MODELS;

    // Group models by their group property
    const groupedModels = models.reduce((acc, model) => {
        if (!acc[model.group]) {
            acc[model.group] = [];
        }
        acc[model.group].push(model);
        return acc;
    }, {} as Record<string, typeof models>);

    const selectStyle: React.CSSProperties = {
        width: '100%',
        backgroundColor: colors.input.background,
        color: colors.input.foreground,
        border: `1px solid ${colors.input.border}`,
        borderRadius: borderRadius.lg,
        padding: `${spacing.md} ${spacing.lg}`,
        fontSize: typography.fontSize.sm,
        outline: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: transitions.normal,
    };

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            style={selectStyle}
        >
            {Object.entries(groupedModels).map(([group, groupModels]) => (
                <optgroup key={group} label={group}>
                    {groupModels.map((model) => (
                        <option key={model.value} value={model.value}>
                            {model.label}
                        </option>
                    ))}
                </optgroup>
            ))}
        </select>
    );
}

export default ModelSelector;
