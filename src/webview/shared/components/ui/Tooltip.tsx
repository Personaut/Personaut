/**
 * Tooltip - Custom Tooltip Component
 * 
 * Provides styled tooltips above icons with proper z-index and visibility.
 * 
 * Feature: chat-ui-fixes
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

import React, { useState, useRef, useEffect } from 'react';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';

export interface TooltipProps {
    /** Text to display in the tooltip */
    text: string;
    /** Child element that triggers the tooltip */
    children: React.ReactNode;
    /** Delay before showing tooltip (ms) */
    delay?: number;
    /** Position of the tooltip */
    position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tooltip component with high z-index and proper styling
 */
export function Tooltip({
    text,
    children,
    delay = 300,
    position = 'top',
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-flex',
    };

    const tooltipStyle: React.CSSProperties = {
        position: 'absolute',
        zIndex: 10000, // Very high z-index per Requirements 2.2
        pointerEvents: 'none', // Prevent interference per Requirements 2.5
        whiteSpace: 'nowrap',
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.background.tertiary,
        color: colors.text.primary,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        borderRadius: borderRadius.md,
        border: `1px solid ${colors.border}`, // Border for visibility per Requirements 2.3
        boxShadow: shadows.lg, // Increased shadow per Requirements 2.3
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 150ms ease-out, transform 150ms ease-out',
        // Position based on prop
        ...(position === 'top' && {
            bottom: '100%',
            left: '50%',
            transform: `translateX(-50%) ${isVisible ? 'translateY(-4px)' : 'translateY(0)'}`,
            marginBottom: spacing.xs,
        }),
        ...(position === 'bottom' && {
            top: '100%',
            left: '50%',
            transform: `translateX(-50%) ${isVisible ? 'translateY(4px)' : 'translateY(0)'}`,
            marginTop: spacing.xs,
        }),
        ...(position === 'left' && {
            right: '100%',
            top: '50%',
            transform: `translateY(-50%) ${isVisible ? 'translateX(-4px)' : 'translateX(0)'}`,
            marginRight: spacing.xs,
        }),
        ...(position === 'right' && {
            left: '100%',
            top: '50%',
            transform: `translateY(-50%) ${isVisible ? 'translateX(4px)' : 'translateX(0)'}`,
            marginLeft: spacing.xs,
        }),
    };

    // Arrow style
    const arrowStyle: React.CSSProperties = {
        position: 'absolute',
        width: 0,
        height: 0,
        ...(position === 'top' && {
            bottom: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `4px solid ${colors.border}`,
        }),
        ...(position === 'bottom' && {
            top: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: `4px solid ${colors.border}`,
        }),
    };

    return (
        <div
            ref={containerRef}
            style={containerStyle}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}
            {text && (
                <div style={tooltipStyle}>
                    {text}
                    <div style={arrowStyle} />
                </div>
            )}
        </div>
    );
}

export default Tooltip;
