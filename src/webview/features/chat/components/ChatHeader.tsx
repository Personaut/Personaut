import React, { useState } from 'react';
import { colors, spacing, typography, borderRadius } from '../../../shared/theme';

/**
 * ChatHeader component props
 */
export interface ChatHeaderProps {
    /** Handler for new session button */
    onNewSession?: () => void;
    /** Handler for history button */
    onHistoryToggle?: () => void;
    /** Handler for incognito toggle */
    onIncognitoToggle?: (enabled: boolean) => void;
    /** Handler for settings button */
    onSettingsClick?: () => void;
    /** Whether history panel is visible */
    isHistoryOpen?: boolean;
    /** Whether incognito mode is active */
    isIncognito?: boolean;
    /** Current session ID */
    sessionId?: string;
}

/**
 * Tooltip/Popover component for icons
 */
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            style={{ position: 'relative', display: 'inline-flex' }}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '4px',
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: colors.background.tertiary,
                        color: colors.text.primary,
                        fontSize: typography.fontSize.xs,
                        borderRadius: borderRadius.md,
                        whiteSpace: 'nowrap',
                        zIndex: 1000,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    }}
                >
                    {text}
                </div>
            )}
        </div>
    );
}

/**
 * Icon button component
 */
function IconBtn({
    icon,
    onClick,
    tooltip,
    isActive,
    ariaLabel,
}: {
    icon: React.ReactNode;
    onClick?: () => void;
    tooltip: string;
    isActive?: boolean;
    ariaLabel: string;
}) {
    const [isHovered, setIsHovered] = useState(false);

    const buttonStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        padding: 0,
        backgroundColor: isActive
            ? `${colors.primary}20`
            : isHovered
                ? colors.background.tertiary
                : 'transparent',
        border: 'none',
        borderRadius: borderRadius.md,
        color: isActive ? colors.primary : colors.text.secondary,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    };

    return (
        <Tooltip text={tooltip}>
            <button
                style={buttonStyle}
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                aria-label={ariaLabel}
            >
                {icon}
            </button>
        </Tooltip>
    );
}

/**
 * ChatHeader component with icon buttons.
 *
 * Features:
 * - History button with "Chat History" popover
 * - New session button with descriptive popover
 * - Incognito toggle with explanatory popover
 * - Settings button
 * - All icons have popovers on hover
 *
 * @example
 * ```tsx
 * <ChatHeader
 *   onNewSession={handleNewSession}
 *   onHistoryToggle={toggleHistory}
 *   onIncognitoToggle={setIncognito}
 *   isIncognito={isIncognitoMode}
 * />
 * ```
 *
 * **Validates: Requirements 6.1, 6.3, 8.1, 8.2, 8.3, 8.4**
 */
export function ChatHeader({
    onNewSession,
    onHistoryToggle,
    onIncognitoToggle,
    onSettingsClick,
    isHistoryOpen = false,
    isIncognito = false,
}: ChatHeaderProps) {
    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${spacing.sm} ${spacing.md}`,
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.background.secondary,
    };

    const leftGroup: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
    };

    const rightGroup: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
    };

    // Icons
    const HistoryIcon = () => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 3v5h5" />
            <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
            <path d="M12 7v5l4 2" />
        </svg>
    );

    const NewSessionIcon = () => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 5v14M5 12h14" />
        </svg>
    );

    const IncognitoIcon = () => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 19c-2.3 0-6.4-.2-8.1-.6-.7-.2-1.2-.7-1.4-1.4-.3-1.1 0-3 2-5.5 1.7-2.2 4.5-3.5 7.5-3.5s5.8 1.3 7.5 3.5c2 2.5 2.3 4.4 2 5.5-.2.7-.7 1.2-1.4 1.4-1.7.4-5.8.6-8.1.6z" />
            <path d="M3 11l2 1" />
            <path d="M19 11l2-1" />
            <circle cx="9" cy="15" r="1" />
            <circle cx="15" cy="15" r="1" />
        </svg>
    );

    const SettingsIcon = () => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );

    return (
        <header style={headerStyle}>
            <div style={leftGroup}>
                <IconBtn
                    icon={<HistoryIcon />}
                    onClick={onHistoryToggle}
                    tooltip="Chat History"
                    isActive={isHistoryOpen}
                    ariaLabel="Toggle chat history"
                />
                <IconBtn
                    icon={<NewSessionIcon />}
                    onClick={onNewSession}
                    tooltip="New Session"
                    ariaLabel="Start new chat session"
                />
            </div>

            <div style={rightGroup}>
                <IconBtn
                    icon={<IncognitoIcon />}
                    onClick={() => onIncognitoToggle?.(!isIncognito)}
                    tooltip={
                        isIncognito
                            ? 'Incognito mode is ON - Messages not saved'
                            : 'Enable incognito mode - Only for current chat'
                    }
                    isActive={isIncognito}
                    ariaLabel={isIncognito ? 'Disable incognito mode' : 'Enable incognito mode'}
                />
                <IconBtn
                    icon={<SettingsIcon />}
                    onClick={onSettingsClick}
                    tooltip="Chat Settings"
                    ariaLabel="Open chat settings"
                />
            </div>
        </header>
    );
}

export default ChatHeader;
