import React from 'react';
import { colors } from '../../theme';

/**
 * Spinner size
 */
export type SpinnerSize = 'sm' | 'md' | 'lg';

/**
 * Spinner component props
 */
export interface SpinnerProps {
    /**
     * Size of the spinner
     * @default 'md'
     */
    size?: SpinnerSize;

    /**
     * Color of the spinner
     */
    color?: string;

    /**
     * Custom CSS class name
     */
    className?: string;

    /**
     * Additional inline styles
     */
    style?: React.CSSProperties;
}

/**
 * Get size in pixels
 */
const getSizePixels = (size: SpinnerSize): number => {
    switch (size) {
        case 'sm':
            return 16;
        case 'lg':
            return 32;
        case 'md':
        default:
            return 24;
    }
};

/**
 * Spinner component for loading states.
 *
 * A simple animated spinner to indicate loading.
 *
 * @example
 * ```tsx
 * // Default spinner
 * <Spinner />
 *
 * // Small spinner
 * <Spinner size="sm" />
 *
 * // Custom color spinner
 * <Spinner color="#FF5500" />
 * ```
 *
 * **Validates: Requirements 20.5, 24.5**
 */
export function Spinner({ size = 'md', color, className = '', style }: SpinnerProps) {
    const sizePixels = getSizePixels(size);
    const strokeColor = color || colors.text.primary;

    const spinnerStyle: React.CSSProperties = {
        animation: 'spin 1s linear infinite',
        ...style,
    };

    return (
        <>
            <style>
                {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
            </style>
            <svg
                className={className}
                style={spinnerStyle}
                width={sizePixels}
                height={sizePixels}
                viewBox="0 0 24 24"
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
        </>
    );
}

/**
 * Full-page loading spinner with centered layout
 */
export function LoadingOverlay({ message }: { message?: string }) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '24px',
            }}
        >
            <Spinner size="lg" />
            {message && (
                <span style={{ color: colors.text.secondary, fontSize: '13px' }}>{message}</span>
            )}
        </div>
    );
}

export default Spinner;
