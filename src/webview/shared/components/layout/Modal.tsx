import React, { forwardRef, HTMLAttributes, useEffect, useRef, useCallback, ReactNode } from 'react';
import { colors, spacing, borderRadius, shadows, zIndex, transitions } from '../../theme';

/**
 * Modal size options
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Modal component props
 */
export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
    /**
     * Whether the modal is open
     */
    isOpen: boolean;

    /**
     * Handler called when the modal should close
     */
    onClose: () => void;

    /**
     * Modal title
     */
    title?: ReactNode;

    /**
     * Modal size
     * @default 'md'
     */
    size?: ModalSize;

    /**
     * Whether clicking the backdrop closes the modal
     * @default true
     */
    closeOnBackdropClick?: boolean;

    /**
     * Whether pressing Escape closes the modal
     * @default true
     */
    closeOnEscape?: boolean;

    /**
     * Whether to show the close button
     * @default true
     */
    showCloseButton?: boolean;

    /**
     * Footer content (typically action buttons)
     */
    footer?: ReactNode;

    /**
     * Modal content
     */
    children?: ReactNode;
}

/**
 * Get width based on size
 */
const getSizeWidth = (size: ModalSize): string => {
    switch (size) {
        case 'sm':
            return '320px';
        case 'lg':
            return '640px';
        case 'xl':
            return '800px';
        case 'full':
            return 'calc(100vw - 48px)';
        case 'md':
        default:
            return '480px';
    }
};

/**
 * Modal component for overlay dialogs.
 *
 * Features:
 * - Focus trap for accessibility
 * - Escape key to close
 * - Backdrop click to close
 * - Smooth animations
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 *   footer={
 *     <>
 *       <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
 *       <Button onClick={handleConfirm}>Confirm</Button>
 *     </>
 *   }
 * >
 *   Are you sure you want to proceed?
 * </Modal>
 * ```
 *
 * **Validates: Requirements 3.1, 12.1**
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
    (
        {
            isOpen,
            onClose,
            title,
            size = 'md',
            closeOnBackdropClick = true,
            closeOnEscape = true,
            showCloseButton = true,
            footer,
            children,
            style,
            ...props
        },
        _ref
    ) => {
        const modalRef = useRef<HTMLDivElement>(null);

        // Handle escape key
        useEffect(() => {
            if (!isOpen || !closeOnEscape) return;

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, [isOpen, closeOnEscape, onClose]);

        // Focus trap
        useEffect(() => {
            if (!isOpen) return;

            const modal = modalRef.current;
            if (!modal) return;

            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstFocusable = focusableElements[0] as HTMLElement;
            const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

            const handleTab = (e: KeyboardEvent) => {
                if (e.key !== 'Tab') return;

                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable?.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable?.focus();
                    }
                }
            };

            window.addEventListener('keydown', handleTab);
            firstFocusable?.focus();

            return () => window.removeEventListener('keydown', handleTab);
        }, [isOpen]);

        // Prevent body scroll when modal is open
        useEffect(() => {
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
            return () => {
                document.body.style.overflow = '';
            };
        }, [isOpen]);

        const handleBackdropClick = useCallback(
            (e: React.MouseEvent) => {
                if (closeOnBackdropClick && e.target === e.currentTarget) {
                    onClose();
                }
            },
            [closeOnBackdropClick, onClose]
        );

        if (!isOpen) return null;

        // Backdrop styles
        const backdropStyle: React.CSSProperties = {
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: zIndex.modalBackdrop,
            animation: 'fadeIn 0.2s ease-out',
        };

        // Modal styles
        const modalStyle: React.CSSProperties = {
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.xl,
            boxShadow: shadows.xl,
            width: getSizeWidth(size),
            maxWidth: '100%',
            maxHeight: 'calc(100vh - 48px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: zIndex.modal,
            animation: 'scaleIn 0.2s ease-out',
            ...style,
        };

        // Header styles
        const headerStyle: React.CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.lg,
            borderBottom: `1px solid ${colors.border}`,
        };

        // Body styles
        const bodyStyle: React.CSSProperties = {
            flex: 1,
            padding: spacing.lg,
            overflowY: 'auto',
        };

        // Footer styles
        const footerStyle: React.CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: spacing.sm,
            padding: spacing.lg,
            borderTop: `1px solid ${colors.border}`,
        };

        return (
            <>
                <style>
                    {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
          `}
                </style>
                <div style={backdropStyle} onClick={handleBackdropClick} role="presentation">
                    <div
                        ref={modalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={title ? 'modal-title' : undefined}
                        style={modalStyle}
                        {...props}
                    >
                        {/* Header */}
                        {(title || showCloseButton) && (
                            <div style={headerStyle}>
                                {title && (
                                    <h2
                                        id="modal-title"
                                        style={{
                                            margin: 0,
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            color: colors.text.primary,
                                        }}
                                    >
                                        {title}
                                    </h2>
                                )}
                                {showCloseButton && (
                                    <button
                                        onClick={onClose}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: spacing.xs,
                                            color: colors.text.muted,
                                            display: 'flex',
                                            borderRadius: borderRadius.sm,
                                            transition: transitions.fast,
                                        }}
                                        aria-label="Close modal"
                                    >
                                        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Body */}
                        <div style={bodyStyle}>{children}</div>

                        {/* Footer */}
                        {footer && <div style={footerStyle}>{footer}</div>}
                    </div>
                </div>
            </>
        );
    }
);

Modal.displayName = 'Modal';

export default Modal;
