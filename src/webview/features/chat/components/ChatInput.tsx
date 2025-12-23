import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ContextFile, ChatPersona } from '../types';
import { colors, spacing, borderRadius, typography } from '../../../shared/theme';
import { Button, IconButton } from '../../../shared/components/ui';
import { PersonaSelector } from './PersonaSelector';

/**
 * ChatInput component props
 */
export interface ChatInputProps {
    /** Current input value */
    value: string;
    /** Handler for input changes */
    onChange: (value: string) => void;
    /** Handler for message submission */
    onSubmit: () => void;
    /** Handler to add active file as context */
    onAddActiveFile?: () => void;
    /** Handler for file upload */
    onFileUpload?: (files: File[]) => void;
    /** Attached context files */
    contextFiles?: ContextFile[];
    /** Handler to remove a context file */
    onRemoveContextFile?: (path: string) => void;
    /** Selected persona */
    persona?: ChatPersona;
    /** Handler for persona change */
    onPersonaChange?: (persona: ChatPersona) => void;
    /** Custom personas from user base */
    customPersonas?: ChatPersona[];
    /** Whether the AI is currently typing */
    isTyping?: boolean;
    /** Placeholder text */
    placeholder?: string;
    /** Whether the input is disabled */
    disabled?: boolean;
    /** Whether incognito mode is active */
    isIncognito?: boolean;
    /** Handler for toggling incognito mode */
    onIncognitoToggle?: () => void;
    /** Handler for starting a new chat */
    onNewChat?: () => void;
}

/**
 * Chat input component with file attachment and persona support.
 *
 * Features:
 * - Auto-resizing textarea
 * - Context file display with remove buttons
 * - Persona indicator
 * - Keyboard shortcuts (Enter to submit, Shift+Enter for newline)
 *
 * @example
 * ```tsx
 * <ChatInput
 *   value={input}
 *   onChange={setInput}
 *   onSubmit={sendMessage}
 *   contextFiles={contextFiles}
 *   onRemoveContextFile={removeFile}
 *   isTyping={isTyping}
 * />
 * ```
 *
 * **Validates: Requirements 22.2, 22.3**
 */
export function ChatInput({
    value,
    onChange,
    onSubmit,
    onAddActiveFile,
    onFileUpload,
    contextFiles = [],
    onRemoveContextFile,
    persona,
    onPersonaChange,
    customPersonas = [],
    isTyping = false,
    placeholder = 'Type a message...',
    disabled = false,
    isIncognito = false,
    onIncognitoToggle,
    onNewChat,
}: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [rows, setRows] = useState(1);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            const lineCount = (value.match(/\n/g) || []).length + 1;
            setRows(Math.min(Math.max(lineCount, 1), 5));
        }
    }, [value]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0 && onFileUpload) {
            onFileUpload(Array.from(files));
            // Reset input so the same file can be selected again
            e.target.value = '';
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && !isTyping && value.trim()) {
                onSubmit();
            }
        }
    };

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
        padding: spacing.md,
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.background.secondary,
    };

    const contextFilesStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing.xs,
    };

    const contextFileStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    };

    const inputRowStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.sm,
        alignItems: 'flex-end',
    };

    const textareaStyle: React.CSSProperties = {
        flex: 1,
        resize: 'none',
        padding: spacing.md,
        backgroundColor: colors.input.background,
        color: colors.input.foreground,
        border: `1px solid ${colors.input.border}`,
        borderRadius: borderRadius.lg,
        fontFamily: typography.fontFamily.sans,
        fontSize: typography.fontSize.md,
        lineHeight: typography.lineHeight.normal,
        outline: 'none',
        minHeight: '40px',
    };

    return (
        <div style={containerStyle}>
            {/* Context files */}
            {contextFiles.length > 0 && (
                <div style={contextFilesStyle}>
                    {contextFiles.map((file) => (
                        <div key={file.path} style={contextFileStyle}>
                            <span>📄 {file.path.split('/').pop()}</span>
                            {onRemoveContextFile && (
                                <button
                                    onClick={() => onRemoveContextFile(file.path)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: colors.text.muted,
                                        padding: 0,
                                        display: 'flex',
                                    }}
                                    aria-label={`Remove ${file.path}`}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Input row */}
            <div style={inputRowStyle}>
                {/* New chat button */}
                {onNewChat && (
                    <IconButton
                        icon={
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                        }
                        aria-label="New chat"
                        variant="ghost"
                        size="sm"
                        onClick={onNewChat}
                    />
                )}

                {/* Add file button */}
                {onAddActiveFile && (
                    <IconButton
                        icon={
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="12" y1="18" x2="12" y2="12" />
                                <line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                        }
                        aria-label="Add active file"
                        variant="ghost"
                        size="sm"
                        onClick={onAddActiveFile}
                    />
                )}

                {/* File upload button */}
                {onFileUpload && (
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,.txt,.md,.json,.csv,.log"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                        <IconButton
                            icon={
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                >
                                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                            }
                            aria-label="Upload files"
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                        />
                    </>
                )}


                {/* Incognito toggle button */}
                {onIncognitoToggle && (
                    <IconButton
                        icon={
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={isIncognito ? colors.warning : 'currentColor'}
                                strokeWidth="1.5"
                            >
                                <path d="M12 19c-2.3 0-6.4-.2-8.1-.6-.7-.2-1.2-.7-1.4-1.4-.3-1.1 0-3 2-5.5 1.7-2.2 4.5-3.5 7.5-3.5s5.8 1.3 7.5 3.5c2 2.5 2.3 4.4 2 5.5-.2.7-.7 1.2-1.4 1.4-1.7.4-5.8.6-8.1.6z" />
                                <path d="M3 11l2 1" />
                                <path d="M19 11l2-1" />
                                <circle cx="9" cy="15" r="1" />
                                <circle cx="15" cy="15" r="1" />
                            </svg>
                        }
                        aria-label={isIncognito ? 'Disable incognito mode' : 'Enable incognito mode'}
                        variant="ghost"
                        size="sm"
                        onClick={onIncognitoToggle}
                        style={{
                            backgroundColor: isIncognito ? `${colors.warning}20` : undefined,
                        }}
                    />
                )}

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isTyping ? 'AI is typing...' : placeholder}
                    disabled={disabled || isTyping}
                    rows={rows}
                    style={textareaStyle}
                />

                {/* Send button */}
                <Button
                    onClick={onSubmit}
                    disabled={disabled || isTyping || !value.trim()}
                    size="md"
                    aria-label="Send message"
                >
                    {isTyping ? (
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            style={{ animation: 'spin 1s linear infinite' }}
                        >
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                    ) : (
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <path d="m22 2-7 20-4-9-9-4 20-7z" />
                            <path d="M22 2 11 13" />
                        </svg>
                    )}
                </Button>
            </div>

            {/* Persona selector */}
            {persona && onPersonaChange && (
                <PersonaSelector
                    selectedPersona={persona}
                    onPersonaChange={onPersonaChange}
                    customPersonas={customPersonas}
                />
            )}
            {persona && !onPersonaChange && (
                <div
                    style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.muted,
                    }}
                >
                    Chatting as {persona.name}
                </div>
            )}
        </div>
    );
}

export default ChatInput;
