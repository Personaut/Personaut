import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../../shared/theme';
import { ChatMessage } from '../types';

/**
 * MessageBubble component props
 */
export interface MessageBubbleProps {
    /** The message to display */
    message: ChatMessage;
    /** Whether this is the last message */
    isLast?: boolean;
    /** Custom color for user messages */
    userColor?: string;
    /** Custom color for agent messages */
    agentColor?: string;
    /** Persona name to display */
    personaName?: string;
    /** Persona icon (emoji or letter) */
    personaIcon?: string;
}

/**
 * Calculate relative luminance of a color
 */
function getLuminance(hex: string): number {
    // Remove # if present
    const color = hex.replace('#', '');

    // Handle short hex codes
    const fullColor = color.length === 3
        ? color.split('').map(c => c + c).join('')
        : color;

    // Parse RGB values
    let r = parseInt(fullColor.substring(0, 2), 16) / 255;
    let g = parseInt(fullColor.substring(2, 4), 16) / 255;
    let b = parseInt(fullColor.substring(4, 6), 16) / 255;

    // Apply gamma correction
    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Get contrasting text color (black or white) based on background color
 */
function getContrastingTextColor(backgroundColor?: string): string {
    if (!backgroundColor || !backgroundColor.startsWith('#') || backgroundColor.length < 4) {
        return colors.text.primary;
    }

    const luminance = getLuminance(backgroundColor);
    // Use white text for dark backgrounds, dark text for light backgrounds
    return luminance > 0.4 ? '#1E1E1E' : '#FFFFFF';
}

/**
 * Get role-based styles for message bubbles
 */
const getRoleStyles = (
    role: ChatMessage['role'],
    userColor?: string,
    agentColor?: string
): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        fontSize: typography.fontSize.md,
        lineHeight: typography.lineHeight.normal,
        maxWidth: '85%',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
    };

    switch (role) {
        case 'user':
            return {
                ...baseStyles,
                backgroundColor: userColor || colors.primary,
                color: getContrastingTextColor(userColor || colors.primary),
                alignSelf: 'flex-end',
                borderBottomRightRadius: borderRadius.sm,
            };
        case 'error':
            return {
                ...baseStyles,
                backgroundColor: 'rgba(244, 135, 113, 0.15)',
                color: colors.error,
                alignSelf: 'flex-start',
                border: `1px solid ${colors.error}`,
            };
        case 'model':
        default:
            return {
                ...baseStyles,
                backgroundColor: agentColor || colors.background.tertiary,
                color: getContrastingTextColor(agentColor || colors.background.tertiary),
                alignSelf: 'flex-start',
                borderBottomLeftRadius: borderRadius.sm,
            };
    }
};

/**
 * Role icon component
 */
const RoleIcon = ({
    role,
    personaName,
    personaIcon,
    backgroundColor,
}: {
    role: ChatMessage['role'];
    personaName?: string;
    personaIcon?: string;
    backgroundColor?: string;
}) => {
    const iconStyle: React.CSSProperties = {
        width: 24,
        height: 24,
        borderRadius: borderRadius.full,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: typography.fontSize.xs,
        flexShrink: 0,
    };

    // Determine display content
    const displayContent = personaIcon || personaName?.charAt(0).toUpperCase() || (role === 'user' ? 'U' : 'P');

    switch (role) {
        case 'user':
            return (
                <div
                    style={{
                        ...iconStyle,
                        backgroundColor: backgroundColor || colors.primary,
                        color: getContrastingTextColor(backgroundColor || colors.primary),
                    }}
                    title={personaName || 'You'}
                >
                    {displayContent}
                </div>
            );
        case 'error':
            return (
                <div
                    style={{
                        ...iconStyle,
                        backgroundColor: colors.error,
                        color: '#fff',
                    }}
                    title="Error"
                >
                    !
                </div>
            );
        case 'model':
        default:
            return (
                <div
                    style={{
                        ...iconStyle,
                        backgroundColor: backgroundColor || colors.amber[500],
                        color: getContrastingTextColor(backgroundColor || colors.amber[500]),
                    }}
                    title={personaName || 'AI Assistant'}
                >
                    {displayContent}
                </div>
            );
    }
};

/**
 * MessageBubble component for displaying individual chat messages.
 *
 * Supports different styling for user, model, and error messages.
 * Handles markdown-like formatting and code blocks.
 * Supports customizable colors for user and agent messages.
 * Automatically calculates contrasting text color based on background.
 *
 * @example
 * ```tsx
 * <MessageBubble message={{ role: 'user', text: 'Hello!' }} />
 * <MessageBubble message={{ role: 'model', text: 'Hi there!' }} agentColor="#10b981" />
 * ```
 *
 * **Validates: Requirements 9.2, 9.3, 13.1, 17.1, 29.1**
 */
export function MessageBubble({
    message,
    isLast: _isLast = false,
    userColor,
    agentColor,
    personaName,
    personaIcon,
}: MessageBubbleProps) {
    const isUser = message.role === 'user';

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: spacing.sm,
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    };

    return (
        <div style={containerStyle}>
            <RoleIcon
                role={message.role}
                personaName={personaName}
                personaIcon={personaIcon}
                backgroundColor={isUser ? userColor : agentColor}
            />
            <div style={getRoleStyles(message.role, userColor, agentColor)}>{message.text}</div>
        </div>
    );
}

export default MessageBubble;
