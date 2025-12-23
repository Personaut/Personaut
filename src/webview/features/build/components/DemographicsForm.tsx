import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../../shared/theme';
import { Demographics } from '../types';

/**
 * DemographicsForm component props
 */
export interface DemographicsFormProps {
    /** Demographics data */
    demographics: Demographics;
    /** Handler for demographics change */
    onChange: (demographics: Demographics) => void;
    /** Whether form is disabled */
    disabled?: boolean;
}

/**
 * Demographics field config
 */
const DEMOGRAPHICS_FIELDS: Array<{
    key: keyof Demographics;
    label: string;
    placeholder: string;
}> = [
        { key: 'ageRange', label: 'Age Range', placeholder: 'e.g., 25-45' },
        { key: 'incomeRange', label: 'Income Range', placeholder: 'e.g., $50k-$100k' },
        { key: 'gender', label: 'Gender', placeholder: 'e.g., All genders' },
        { key: 'location', label: 'Location', placeholder: 'e.g., Urban areas, USA' },
        { key: 'education', label: 'Education', placeholder: 'e.g., College degree' },
        { key: 'occupation', label: 'Occupation', placeholder: 'e.g., Professional' },
    ];

/**
 * DemographicsForm component for collecting target demographic data.
 *
 * @example
 * ```tsx
 * <DemographicsForm
 *   demographics={demographics}
 *   onChange={setDemographics}
 * />
 * ```
 *
 * **Validates: Requirements 15.2, 21.1, 21.5**
 */
export function DemographicsForm({
    demographics,
    onChange,
    disabled = false,
}: DemographicsFormProps) {
    const containerStyle: React.CSSProperties = {
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
    };

    const titleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.lg,
        marginTop: 0,
    };

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: spacing.md,
    };

    const fieldStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xs,
    };

    const labelStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.primary,
    };

    const inputStyle: React.CSSProperties = {
        padding: spacing.md,
        backgroundColor: colors.input.background,
        border: `1px solid ${colors.input.border}`,
        borderRadius: borderRadius.lg,
        color: colors.input.foreground,
        fontSize: typography.fontSize.md,
        outline: 'none',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'text',
    };

    const handleFieldChange = (key: keyof Demographics, value: string) => {
        onChange({ ...demographics, [key]: value });
    };

    return (
        <div style={containerStyle}>
            <h3 style={titleStyle}>Target Demographics</h3>
            <div style={gridStyle}>
                {DEMOGRAPHICS_FIELDS.map((field) => (
                    <div key={field.key} style={fieldStyle}>
                        <label style={labelStyle}>{field.label}</label>
                        <input
                            type="text"
                            value={demographics[field.key]}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            style={inputStyle}
                            disabled={disabled}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default DemographicsForm;
