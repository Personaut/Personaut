import React, { useEffect, useState, createContext, useContext, useCallback, ReactNode } from 'react';
import { colors, spacing, borderRadius, typography, shadows, zIndex } from '../../theme';

/**
 * Toast variant types
 */
export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

/**
 * Toast item interface
 */
export interface ToastItem {
    id: string;
    message: string;
    variant: ToastVariant;
    duration?: number;
}

/**
 * Toast context value
 */
interface ToastContextValue {
    toasts: ToastItem[];
    addToast: (message: string, variant?: ToastVariant, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Hook to access toast functionality
 */
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

/**
 * Toast provider props
 */
interface ToastProviderProps {
    children: ReactNode;
}

/**
 * Toast provider component
 */
export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const addToast = useCallback((message: string, variant: ToastVariant = 'info', duration = 3000) => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, message, variant, duration }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

/**
 * Get variant-specific styles
 */
const getVariantStyles = (variant: ToastVariant): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `${spacing.md} ${spacing.lg}`,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.lg,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        animation: 'slideIn 0.2s ease-out',
    };

    switch (variant) {
        case 'success':
            return { ...baseStyles, backgroundColor: colors.success, color: '#1E1E1E' };
        case 'warning':
            return { ...baseStyles, backgroundColor: colors.warning, color: '#1E1E1E' };
        case 'error':
            return { ...baseStyles, backgroundColor: colors.error, color: '#FFFFFF' };
        case 'info':
        default:
            return { ...baseStyles, backgroundColor: colors.info, color: '#1E1E1E' };
    }
};

/**
 * Toast icons by variant
 */
const ToastIcon = ({ variant }: { variant: ToastVariant }) => {
    const iconProps = { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2 };

    switch (variant) {
        case 'success':
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                </svg>
            );
        case 'warning':
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            );
        case 'error':
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            );
        case 'info':
        default:
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
    }
};

/**
 * Single toast component
 */
function Toast({ item, onRemove }: { item: ToastItem; onRemove: () => void }) {
    useEffect(() => {
        if (item.duration && item.duration > 0) {
            const timer = setTimeout(onRemove, item.duration);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [item.duration, onRemove]);

    return (
        <div style={getVariantStyles(item.variant)}>
            <ToastIcon variant={item.variant} />
            <span style={{ flex: 1 }}>{item.message}</span>
            <button
                onClick={onRemove}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'inherit',
                    opacity: 0.7,
                    display: 'flex',
                }}
                aria-label="Close toast"
            >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

/**
 * Toast container component
 */
function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
    if (toasts.length === 0) return null;

    return (
        <>
            <style>
                {`
          @keyframes slideIn {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}
            </style>
            <div
                style={{
                    position: 'fixed',
                    bottom: spacing.lg,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: zIndex.toast,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: spacing.sm,
                }}
            >
                {toasts.map((toast) => (
                    <Toast key={toast.id} item={toast} onRemove={() => onRemove(toast.id)} />
                ))}
            </div>
        </>
    );
}

/**
 * Standalone toast component for simple usage
 */
export interface ToastProps {
    message: string;
    variant?: ToastVariant;
    visible?: boolean;
    onClose?: () => void;
}

export function StandaloneToast({ message, variant = 'info', visible = true, onClose }: ToastProps) {
    if (!visible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: spacing.lg,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: zIndex.toast,
            }}
        >
            <div style={getVariantStyles(variant)}>
                <ToastIcon variant={variant} />
                <span>{message}</span>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            color: 'inherit',
                            opacity: 0.7,
                            display: 'flex',
                            marginLeft: spacing.sm,
                        }}
                    >
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}

export default ToastProvider;
