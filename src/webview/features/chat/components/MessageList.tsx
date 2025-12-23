import React, { useRef, useEffect } from 'react';
import { colors, spacing, typography } from '../../../shared/theme';
import { ChatMessage } from '../types';
import { MessageBubble } from './MessageBubble';
import { Spinner } from '../../../shared/components/ui';

/**
 * MessageList component props
 */
export interface MessageListProps {
    /** Array of messages to display */
    messages: ChatMessage[];
    /** Whether the AI is currently typing */
    isTyping?: boolean;
    /** Current status message */
    status?: string;
    /** Ref to the bottom of the list for auto-scroll */
    bottomRef?: React.RefObject<HTMLDivElement>;
    /** Custom color for user messages */
    userMessageColor?: string;
    /** Custom color for agent messages */
    agentMessageColor?: string;
    /** Agent persona name */
    agentPersonaName?: string;
    /** Agent persona icon (emoji) */
    agentPersonaIcon?: string;
}

/**
 * Typing indicator component
 */
function TypingIndicator({ status }: { status?: string }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                color: colors.text.muted,
                fontSize: typography.fontSize.sm,
            }}
        >
            <Spinner size="sm" />
            <span>{status || 'Thinking...'}</span>
        </div>
    );
}

/**
 * Empty state component
 */
function EmptyState() {
    // Get logo URI from window (set by extension)
    const logoUri = (window as any).logoUri || (window as any).iconUri;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                padding: spacing.xl,
                color: colors.text.muted,
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.lg,
                    overflow: 'hidden',
                }}
            >
                {logoUri ? (
                    <img
                        src={logoUri}
                        alt="Personaut"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <span style={{ fontSize: '48px' }}>🤖</span>
                )}
            </div>
            <h3
                style={{
                    margin: 0,
                    marginBottom: spacing.sm,
                    color: colors.text.primary,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.semibold,
                }}
            >
                Start a conversation
            </h3>
            <p
                style={{
                    margin: 0,
                    maxWidth: '300px',
                    fontSize: typography.fontSize.sm,
                    lineHeight: typography.lineHeight.relaxed,
                }}
            >
                Ask Pippet anything about personas, user research, or product development.
            </p>
        </div>
    );
}

/**
 * MessageList component for displaying chat messages.
 *
 * Features:
 * - Auto-scroll to newest messages
 * - Typing indicator when AI is responding
 * - Empty state for new conversations
 * - Customizable message colors
 *
 * @example
 * ```tsx
 * <MessageList
 *   messages={messages}
 *   isTyping={isTyping}
 *   status={status}
 *   bottomRef={bottomRef}
 *   userMessageColor="#3b82f6"
 *   agentMessageColor="#10b981"
 * />
 * ```
 *
 * **Validates: Requirements 9.2, 9.3, 13.1, 31.1, 31.2**
 */
export function MessageList({
    messages,
    isTyping = false,
    status,
    bottomRef,
    userMessageColor,
    agentMessageColor,
    agentPersonaName,
    agentPersonaIcon,
}: MessageListProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (bottomRef?.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    const containerStyle: React.CSSProperties = {
        flex: 1,
        overflowY: 'auto',
        padding: spacing.lg,
        display: 'flex',
        flexDirection: 'column',
    };

    if (messages.length === 0 && !isTyping) {
        return (
            <div style={containerStyle}>
                <EmptyState />
            </div>
        );
    }

    return (
        <div ref={containerRef} style={containerStyle}>
            {messages.map((message, index) => (
                <MessageBubble
                    key={index}
                    message={message}
                    isLast={index === messages.length - 1}
                    userColor={userMessageColor}
                    agentColor={agentMessageColor}
                    personaName={message.role === 'model' ? (message.personaName || agentPersonaName) : undefined}
                    personaIcon={message.role === 'model' ? (message.personaIcon || agentPersonaIcon) : undefined}
                />
            ))}
            {isTyping && <TypingIndicator status={status} />}
            <div ref={bottomRef} />
        </div>
    );
}

export default MessageList;
