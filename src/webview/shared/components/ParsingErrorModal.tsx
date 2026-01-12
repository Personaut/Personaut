/**
 * ParsingErrorModal - Modal component for displaying JSON parsing errors with retry option
 *
 * Shown when the backend fails to parse AI-generated JSON responses.
 * Allows the user to retry the generation operation.
 */
import React from 'react';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { Button } from './ui';

export interface ParsingError {
    stage: string;
    projectName: string;
    error: string;
    retryable: boolean;
    originalMessage: any;
}

export interface ParsingErrorModalProps {
    error: ParsingError | null;
    onRetry: () => void;
    onDismiss: () => void;
}

/**
 * Modal overlay for displaying parsing errors with retry functionality
 */
export function ParsingErrorModal({ error, onRetry, onDismiss }: ParsingErrorModalProps) {
    if (!error) return null;

    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
    };

    const modalStyle: React.CSSProperties = {
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        maxWidth: '480px',
        width: '90%',
        boxShadow: shadows.lg,
        animation: 'fadeInUp 0.2s ease-out',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    };

    const iconStyle: React.CSSProperties = {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
    };

    const titleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    };

    const subtitleStyle: React.CSSProperties = {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    };

    const bodyStyle: React.CSSProperties = {
        marginBottom: spacing.lg,
    };

    const errorBoxStyle: React.CSSProperties = {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginTop: spacing.md,
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: '150px',
        overflow: 'auto',
    };

    const stageLabel: Record<string, string> = {
        users: 'User Personas',
        features: 'Features',
        stories: 'User Stories',
        design: 'Screens & Design',
        idea: 'Project Idea',
    };

    const actionsStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.md,
        justifyContent: 'flex-end',
    };

    return (
        <div style={overlayStyle} onClick={onDismiss}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <div style={headerStyle}>
                    <div style={iconStyle}>⚠️</div>
                    <div>
                        <div style={titleStyle}>Parsing Error</div>
                        <div style={subtitleStyle}>
                            Failed to parse response for {stageLabel[error.stage] || error.stage}
                        </div>
                    </div>
                </div>

                <div style={bodyStyle}>
                    <p style={{ color: colors.text.secondary, marginBottom: spacing.sm }}>
                        The AI generated a response that couldn't be parsed as valid JSON.
                        This sometimes happens when the response format is unexpected.
                    </p>
                    <p style={{ color: colors.text.secondary }}>
                        You can <strong>retry</strong> the generation, which will make a new request to the AI.
                    </p>

                    {error.error && (
                        <div style={errorBoxStyle}>
                            <strong>Error details:</strong>
                            <br />
                            {error.error.slice(0, 300)}
                            {error.error.length > 300 && '...'}
                        </div>
                    )}
                </div>

                <div style={actionsStyle}>
                    <Button variant="secondary" onClick={onDismiss}>
                        Dismiss
                    </Button>
                    {error.retryable && (
                        <Button variant="primary" onClick={onRetry}>
                            🔄 Retry Generation
                        </Button>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    );
}

export default ParsingErrorModal;
