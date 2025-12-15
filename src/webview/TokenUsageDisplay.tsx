import React from 'react';

/**
 * Token Usage Display Component
 * 
 * Shows current token usage statistics with visual indicators for
 * warning (above threshold) and error (at/above limit) states.
 * 
 * Feature: llm-token-monitoring
 * Validates: Requirements 6.1, 6.4, 6.5
 */

interface TokenUsageDisplayProps {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    limit: number;
    remaining: number;
    percentUsed: number;
    warningThreshold: number;
    conversationSpecific?: boolean;
    onReset?: () => void;
}

export const TokenUsageDisplay: React.FC<TokenUsageDisplayProps> = ({
    totalTokens,
    inputTokens,
    outputTokens,
    limit,
    remaining,
    percentUsed,
    warningThreshold,
    conversationSpecific = false,
    onReset,
}) => {
    // Determine color state based on usage
    const isWarning = percentUsed >= warningThreshold && percentUsed < 100;
    const isError = percentUsed >= 100;

    // Get status color class
    const getStatusClass = () => {
        if (isError) return 'token-usage--error';
        if (isWarning) return 'token-usage--warning';
        return 'token-usage--normal';
    };

    // Get progress bar color
    const getProgressColor = () => {
        if (isError) return 'var(--vscode-errorForeground, #f44747)';
        if (isWarning) return 'var(--vscode-editorWarning-foreground, #cca700)';
        return 'var(--vscode-progressBar-background, #0e639c)';
    };

    return (
        <div className={`token-usage ${getStatusClass()}`} style={styles.container}>
            <div style={styles.header}>
                <span style={styles.title}>
                    🔢 Token Usage
                    {conversationSpecific && (
                        <span style={styles.badge}>Conversation Limit</span>
                    )}
                </span>
                {onReset && (
                    <button onClick={onReset} style={styles.resetButton} title="Reset token usage">
                        ↺
                    </button>
                )}
            </div>

            {/* Progress bar */}
            <div style={styles.progressContainer}>
                <div
                    style={{
                        ...styles.progressBar,
                        width: `${Math.min(percentUsed, 100)}%`,
                        backgroundColor: getProgressColor(),
                    }}
                />
            </div>

            {/* Usage stats */}
            <div style={styles.stats}>
                <div style={styles.mainStat}>
                    <span style={styles.value}>
                        {totalTokens.toLocaleString()}
                    </span>
                    <span style={styles.separator}>/</span>
                    <span style={styles.limit}>
                        {limit.toLocaleString()}
                    </span>
                    <span style={{ ...styles.percent, color: getProgressColor() }}>
                        ({percentUsed}%)
                    </span>
                </div>
                <div style={styles.detailStats}>
                    <span style={styles.detailStat}>
                        In: {inputTokens.toLocaleString()}
                    </span>
                    <span style={styles.detailSeparator}>|</span>
                    <span style={styles.detailStat}>
                        Out: {outputTokens.toLocaleString()}
                    </span>
                    <span style={styles.detailSeparator}>|</span>
                    <span style={{
                        ...styles.detailStat,
                        color: remaining <= 0 ? getProgressColor() : undefined,
                    }}>
                        Left: {remaining.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Warning/Error message */}
            {isError && (
                <div style={styles.errorMessage}>
                    ⚠️ Token limit reached. Reset usage or increase your limit in settings.
                </div>
            )}
            {isWarning && !isError && (
                <div style={styles.warningMessage}>
                    ⚠️ Approaching token limit ({warningThreshold}% threshold reached)
                </div>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
        border: '1px solid var(--vscode-panel-border, #3c3c3c)',
        borderRadius: '4px',
        padding: '12px',
        marginBottom: '8px',
        fontSize: '12px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
    },
    title: {
        fontWeight: 'bold',
        color: 'var(--vscode-foreground, #cccccc)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    badge: {
        fontSize: '10px',
        padding: '2px 6px',
        borderRadius: '3px',
        backgroundColor: 'var(--vscode-badge-background, #4d4d4d)',
        color: 'var(--vscode-badge-foreground, #ffffff)',
    },
    resetButton: {
        background: 'none',
        border: 'none',
        color: 'var(--vscode-foreground, #cccccc)',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '4px',
        borderRadius: '3px',
    },
    progressContainer: {
        height: '4px',
        backgroundColor: 'var(--vscode-progressBar-background, #3c3c3c)',
        borderRadius: '2px',
        overflow: 'hidden',
        marginBottom: '8px',
    },
    progressBar: {
        height: '100%',
        borderRadius: '2px',
        transition: 'width 0.3s ease, background-color 0.3s ease',
    },
    stats: {
        color: 'var(--vscode-descriptionForeground, #8c8c8c)',
    },
    mainStat: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
        marginBottom: '4px',
    },
    value: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: 'var(--vscode-foreground, #cccccc)',
    },
    separator: {
        color: 'var(--vscode-descriptionForeground, #8c8c8c)',
    },
    limit: {
        color: 'var(--vscode-descriptionForeground, #8c8c8c)',
    },
    percent: {
        marginLeft: '4px',
        fontWeight: 'bold',
    },
    detailStats: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11px',
    },
    detailStat: {
        color: 'var(--vscode-descriptionForeground, #8c8c8c)',
    },
    detailSeparator: {
        color: 'var(--vscode-panel-border, #3c3c3c)',
    },
    errorMessage: {
        marginTop: '8px',
        padding: '6px 8px',
        backgroundColor: 'var(--vscode-inputValidation-errorBackground, #5a1d1d)',
        border: '1px solid var(--vscode-inputValidation-errorBorder, #be1100)',
        borderRadius: '3px',
        color: 'var(--vscode-errorForeground, #f44747)',
        fontSize: '11px',
    },
    warningMessage: {
        marginTop: '8px',
        padding: '6px 8px',
        backgroundColor: 'var(--vscode-inputValidation-warningBackground, #352a05)',
        border: '1px solid var(--vscode-inputValidation-warningBorder, #b89500)',
        borderRadius: '3px',
        color: 'var(--vscode-editorWarning-foreground, #cca700)',
        fontSize: '11px',
    },
};

export default TokenUsageDisplay;
