import { Fragment, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    size?: ModalSize;
    children: ReactNode;
    footer?: ReactNode;
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEsc?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[calc(100vw-4rem)] max-h-[calc(100vh-4rem)]',
};

export function Modal({
    open,
    onClose,
    title,
    description,
    size = 'md',
    children,
    footer,
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEsc = true,
}: ModalProps) {
    // Handle ESC key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEsc) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <Fragment>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={closeOnOverlayClick ? onClose : undefined}
                        onKeyDown={handleKeyDown}
                        aria-hidden="true"
                    />

                    {/* Modal */}
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onKeyDown={handleKeyDown}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className={clsx(
                                'relative w-full glass rounded-2xl shadow-2xl',
                                'border border-white/10',
                                'overflow-hidden',
                                sizeStyles[size]
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            {(title || showCloseButton) && (
                                <div className="flex items-start justify-between p-6 border-b border-white/10">
                                    <div>
                                        {title && (
                                            <h2 className="text-xl font-semibold text-white">
                                                {title}
                                            </h2>
                                        )}
                                        {description && (
                                            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                                {description}
                                            </p>
                                        )}
                                    </div>
                                    {showCloseButton && (
                                        <button
                                            onClick={onClose}
                                            className="p-2 -m-2 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
                                {children}
                            </div>

                            {/* Footer */}
                            {footer && (
                                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-white/[0.02]">
                                    {footer}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </Fragment>
            )}
        </AnimatePresence>
    );
}

// Confirm Dialog - 確認對話框
interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = '確認',
    cancelText = '取消',
    variant = 'danger',
    loading = false,
}: ConfirmDialogProps) {
    const variantStyles = {
        danger: 'btn-danger',
        warning: 'bg-amber-500 hover:bg-amber-600 text-white',
        info: 'btn-primary',
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <button onClick={onClose} className="btn-secondary" disabled={loading}>
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={clsx('btn', variantStyles[variant])}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="loading-spinner" />
                        ) : (
                            confirmText
                        )}
                    </button>
                </>
            }
        >
            <p className="text-[var(--color-text-secondary)]">{message}</p>
        </Modal>
    );
}
