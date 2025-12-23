import React, { useState } from 'react';
import { colors, spacing, typography, borderRadius } from '../../../shared/theme';

/**
 * ChatSettings interface
 */
export interface ChatSettingsData {
    trackHistory: boolean;
    userMessageColor: string;
    agentMessageColor: string;
    incognitoMode: boolean;
    selectedPersonaId: string;
}

/**
 * ChatSettingsPanel component props
 */
export interface ChatSettingsPanelProps {
    /** Current settings */
    settings: ChatSettingsData;
    /** Handler for settings changes */
    onSettingsChange?: (settings: Partial<ChatSettingsData>) => void;
    /** Handler to close the panel */
    onClose?: () => void;
}

/**
 * Color picker predefined options
 */
const COLOR_OPTIONS = [
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Green', value: '#10b981' },
    { label: 'Purple', value: '#8b5cf6' },
    { label: 'Pink', value: '#ec4899' },
    { label: 'Orange', value: '#f97316' },
    { label: 'Cyan', value: '#06b6d4' },
    { label: 'Yellow', value: '#eab308' },
    { label: 'Red', value: '#ef4444' },
];

/**
 * Toggle switch component
 */
function Toggle({
    checked,
    onChange,
    label,
    description,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
}) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: `${spacing.md} 0`,
        borderBottom: `1px solid ${colors.border}`,
    };

    const labelContainerStyle: React.CSSProperties = {
        flex: 1,
    };

    const labelStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.primary,
        margin: 0,
    };

    const descriptionStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        margin: 0,
        marginTop: '4px',
    };

    const switchStyle: React.CSSProperties = {
        width: '42px',
        height: '24px',
        backgroundColor: checked ? colors.primary : colors.background.tertiary,
        borderRadius: '12px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        border: 'none',
        padding: 0,
        flexShrink: 0,
        marginLeft: spacing.md,
    };

    const knobStyle: React.CSSProperties = {
        width: '20px',
        height: '20px',
        backgroundColor: colors.text.primary,
        borderRadius: '50%',
        position: 'absolute',
        top: '2px',
        left: checked ? '20px' : '2px',
        transition: 'left 0.2s ease',
    };

    return (
        <div style={containerStyle}>
            <div style={labelContainerStyle}>
                <p style={labelStyle}>{label}</p>
                {description && <p style={descriptionStyle}>{description}</p>}
            </div>
            <button
                style={switchStyle}
                onClick={() => onChange(!checked)}
                role="switch"
                aria-checked={checked}
                aria-label={label}
            >
                <div style={knobStyle} />
            </button>
        </div>
    );
}

/**
 * Color picker component
 */
function ColorPicker({
    value,
    onChange,
    label,
    description,
}: {
    value: string;
    onChange: (color: string) => void;
    label: string;
    description?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);

    const containerStyle: React.CSSProperties = {
        padding: `${spacing.md} 0`,
        borderBottom: `1px solid ${colors.border}`,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.primary,
        margin: 0,
    };

    const descriptionStyle: React.CSSProperties = {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        margin: 0,
        marginTop: '4px',
    };

    const selectedColorStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        cursor: 'pointer',
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        border: 'none',
    };

    const colorSwatchStyle: React.CSSProperties = {
        width: '20px',
        height: '20px',
        borderRadius: borderRadius.sm,
        backgroundColor: value,
        border: `1px solid ${colors.border}`,
    };

    const dropdownStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: spacing.xs,
        marginTop: spacing.sm,
        padding: spacing.sm,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
    };

    const colorOptionStyle = (color: string, isSelected: boolean): React.CSSProperties => ({
        width: '32px',
        height: '32px',
        borderRadius: borderRadius.sm,
        backgroundColor: color,
        border: isSelected ? `2px solid ${colors.text.primary}` : 'none',
        cursor: 'pointer',
        padding: 0,
    });

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <div>
                    <p style={labelStyle}>{label}</p>
                    {description && <p style={descriptionStyle}>{description}</p>}
                </div>
                <button style={selectedColorStyle} onClick={() => setIsOpen(!isOpen)}>
                    <div style={colorSwatchStyle} />
                    <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                        {value.toUpperCase()}
                    </span>
                </button>
            </div>
            {isOpen && (
                <div style={dropdownStyle}>
                    {COLOR_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            style={colorOptionStyle(option.value, value === option.value)}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            aria-label={option.label}
                            title={option.label}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * ChatSettingsPanel component for configuring chat preferences.
 *
 * Features:
 * - "Track History" toggle control
 * - Color picker for user messages
 * - Color picker for agent messages
 * - Settings save/load functionality
 *
 * @example
 * ```tsx
 * <ChatSettingsPanel
 *   settings={currentSettings}
 *   onSettingsChange={handleSettingsChange}
 * />
 * ```
 *
 * **Validates: Requirements 1.1, 5.1, 9.1**
 */
export function ChatSettingsPanel({
    settings,
    onSettingsChange,
    onClose,
}: ChatSettingsPanelProps) {
    const panelStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.background.primary,
        height: '100%',
        overflow: 'hidden',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.background.secondary,
    };

    const headerTitleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        margin: 0,
    };

    const closeButtonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        color: colors.text.secondary,
        cursor: 'pointer',
        padding: spacing.xs,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.sm,
    };

    const contentStyle: React.CSSProperties = {
        flex: 1,
        overflowY: 'auto',
        padding: spacing.md,
    };

    const sectionStyle: React.CSSProperties = {
        marginBottom: spacing.lg,
    };

    const sectionTitleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        margin: 0,
        marginBottom: spacing.sm,
    };

    return (
        <div style={panelStyle}>
            <div style={headerStyle}>
                <h2 style={headerTitleStyle}>Chat Settings</h2>
                {onClose && (
                    <button
                        style={closeButtonStyle}
                        onClick={onClose}
                        aria-label="Close settings"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            <div style={contentStyle}>
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Privacy</h3>
                    <Toggle
                        checked={settings.trackHistory}
                        onChange={(checked) => onSettingsChange?.({ trackHistory: checked })}
                        label="Track Chat History"
                        description="Save conversations for later reference. Disable to use memory-only mode."
                    />
                    <Toggle
                        checked={settings.incognitoMode}
                        onChange={(checked) => onSettingsChange?.({ incognitoMode: checked })}
                        label="Incognito Mode"
                        description="Don't save messages from this session. Token usage is still tracked."
                    />
                </div>

                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Appearance</h3>
                    <ColorPicker
                        value={settings.userMessageColor}
                        onChange={(color) => onSettingsChange?.({ userMessageColor: color })}
                        label="Your Message Color"
                        description="Background color for messages you send"
                    />
                    <ColorPicker
                        value={settings.agentMessageColor}
                        onChange={(color) => onSettingsChange?.({ agentMessageColor: color })}
                        label="Agent Message Color"
                        description="Background color for AI responses"
                    />
                </div>
            </div>
        </div>
    );
}

export default ChatSettingsPanel;
