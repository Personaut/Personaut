import React, { useRef, useState, useCallback } from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../shared/theme';
import { Button, Spinner } from '../../../shared/components/ui';
import { ScreenshotData } from '../types';

/**
 * ScreenshotCapture component props
 */
export interface ScreenshotCaptureProps {
    /** Current screenshot */
    screenshot: ScreenshotData | null;
    /** Handler for capture */
    onCapture: (screenshot: ScreenshotData | null) => void;
    /** Handler for URL capture request */
    onCaptureUrl?: (url: string) => void;
    /** Whether capture is in progress */
    isLoading?: boolean;
    /** Disabled state */
    disabled?: boolean;
}

/**
 * ScreenshotCapture component for capturing screenshots.
 *
 * Supports:
 * - URL input with capture button
 * - File upload with drag-and-drop
 * - Clipboard paste
 *
 * @example
 * ```tsx
 * <ScreenshotCapture
 *   screenshot={screenshot}
 *   onCapture={setScreenshot}
 *   onCaptureUrl={handleCaptureUrl}
 * />
 * ```
 *
 * **Validates: Requirements 13.3**
 */
export function ScreenshotCapture({
    screenshot,
    onCapture,
    onCaptureUrl,
    isLoading = false,
    disabled = false,
}: ScreenshotCaptureProps) {
    const [urlInput, setUrlInput] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
    };

    const urlSectionStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
    };

    const labelStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.secondary,
    };

    const urlInputContainerStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.sm,
        alignItems: 'stretch',
    };

    const inputStyle: React.CSSProperties = {
        flex: 1,
        padding: `${spacing.sm} ${spacing.md}`,
        backgroundColor: colors.input.background,
        border: `2px solid ${isFocused ? colors.accent : colors.input.border}`,
        borderRadius: borderRadius.lg,
        color: colors.input.foreground,
        fontSize: typography.fontSize.sm,
        outline: 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        boxShadow: isFocused ? `0 0 0 3px ${colors.accent}20` : 'none',
    };

    const dropZoneStyle: React.CSSProperties = {
        padding: spacing.xl,
        background: isDragging
            ? `linear-gradient(135deg, ${colors.accent}10 0%, ${colors.accent}05 100%)`
            : `linear-gradient(135deg, ${colors.background.tertiary} 0%, ${colors.background.secondary} 100%)`,
        border: `2px dashed ${isDragging ? colors.accent : colors.border}`,
        borderRadius: borderRadius.xl,
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: transitions.fast,
        opacity: disabled ? 0.5 : 1,
    };

    const dropZoneContentStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing.md,
    };

    const iconCircleStyle: React.CSSProperties = {
        width: 56,
        height: 56,
        borderRadius: borderRadius.full,
        backgroundColor: `${colors.accent}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.accent,
    };

    const previewContainerStyle: React.CSSProperties = {
        position: 'relative',
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        border: `2px solid ${colors.border}`,
        backgroundColor: colors.background.tertiary,
    };

    const imageStyle: React.CSSProperties = {
        width: '100%',
        maxHeight: 200,
        objectFit: 'contain',
        display: 'block',
    };

    const previewFooterStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.background.secondary,
        borderTop: `1px solid ${colors.border}`,
    };

    const sourceIconStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    };

    const handleFileSelect = useCallback(
        (file: File) => {
            if (!file.type.startsWith('image/')) {
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                onCapture({
                    url: result,
                    source: 'file',
                    fileName: file.name,
                    capturedAt: Date.now(),
                });
            };
            reader.readAsDataURL(file);
        },
        [onCapture]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);

            const file = e.dataTransfer.files[0];
            if (file) {
                handleFileSelect(file);
            }
        },
        [handleFileSelect]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handlePaste = useCallback(
        (e: React.ClipboardEvent) => {
            const items = Array.from(e.clipboardData.items);
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        handleFileSelect(file);
                        break;
                    }
                }
            }
        },
        [handleFileSelect]
    );

    const handleUrlCapture = useCallback(() => {
        if (urlInput.trim() && onCaptureUrl) {
            onCaptureUrl(urlInput.trim());
        }
    }, [urlInput, onCaptureUrl]);

    const handleClear = useCallback(() => {
        onCapture(null);
        setUrlInput('');
    }, [onCapture]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && urlInput.trim()) {
            handleUrlCapture();
        }
    }, [urlInput, handleUrlCapture]);

    if (screenshot) {
        return (
            <div style={previewContainerStyle}>
                <img src={screenshot.url} alt="Screenshot" style={imageStyle} />
                <div style={previewFooterStyle}>
                    <div style={sourceIconStyle}>
                        {screenshot.source === 'url' && (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="2" y1="12" x2="22" y2="12" />
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                                <span>Captured from URL</span>
                            </>
                        )}
                        {screenshot.source === 'file' && (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <span>{screenshot.fileName}</span>
                            </>
                        )}
                        {screenshot.source === 'clipboard' && (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                </svg>
                                <span>Pasted from clipboard</span>
                            </>
                        )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClear} disabled={disabled}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ marginRight: spacing.xs }}>
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Remove
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle} onPaste={handlePaste}>
            {/* URL Capture */}
            {onCaptureUrl && (
                <div style={urlSectionStyle}>
                    <label style={labelStyle}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        Capture from URL
                    </label>
                    <div style={urlInputContainerStyle}>
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="https://example.com"
                            style={inputStyle}
                            disabled={disabled || isLoading}
                        />
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleUrlCapture}
                            loading={isLoading}
                            disabled={!urlInput.trim() || disabled}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ marginRight: spacing.xs }}>
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                            Capture
                        </Button>
                    </div>
                </div>
            )}

            {/* Divider with "or" */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                color: colors.text.muted,
                fontSize: typography.fontSize.xs,
            }}>
                <div style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                <span>or</span>
                <div style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </div>

            {/* Drop Zone */}
            <div
                style={dropZoneStyle}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !disabled && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                    }}
                    disabled={disabled}
                />
                {isLoading ? (
                    <div style={dropZoneContentStyle}>
                        <Spinner size="lg" />
                        <div>
                            <div style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, fontWeight: typography.fontWeight.medium }}>
                                Capturing screenshot...
                            </div>
                            <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                                This may take a few seconds
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={dropZoneContentStyle}>
                        <div style={iconCircleStyle}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, fontWeight: typography.fontWeight.semibold }}>
                                Drop an image here, or click to upload
                            </div>
                            <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                                You can also paste an image from your clipboard (Ctrl/Cmd+V)
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ScreenshotCapture;
