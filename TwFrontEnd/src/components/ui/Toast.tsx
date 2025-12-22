import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';

// Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

// Context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Provider
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: Toast = { ...toast, id };

        setToasts((prev) => [...prev, newToast]);

        // Auto remove after duration
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const success = useCallback((title: string, message?: string) => {
        addToast({ type: 'success', title, message });
    }, [addToast]);

    const error = useCallback((title: string, message?: string) => {
        addToast({ type: 'error', title, message });
    }, [addToast]);

    const warning = useCallback((title: string, message?: string) => {
        addToast({ type: 'warning', title, message });
    }, [addToast]);

    const info = useCallback((title: string, message?: string) => {
        addToast({ type: 'info', title, message });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

// Hook
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Toast Container
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
                ))}
            </AnimatePresence>
        </div>
    );
}

// Toast Item
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const icons: Record<ToastType, ReactNode> = {
        success: <CheckCircle className="w-5 h-5 text-green-400" />,
        error: <AlertCircle className="w-5 h-5 text-red-400" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        info: <Info className="w-5 h-5 text-blue-400" />,
    };

    const borderColors: Record<ToastType, string> = {
        success: 'border-l-green-500',
        error: 'border-l-red-500',
        warning: 'border-l-amber-500',
        info: 'border-l-blue-500',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
                'pointer-events-auto glass rounded-xl p-4 shadow-lg',
                'border-l-4',
                borderColors[toast.type]
            )}
        >
            <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                    {icons[toast.type]}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                        {toast.title}
                    </p>
                    {toast.message && (
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                            {toast.message}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => onRemove(toast.id)}
                    className="flex-shrink-0 p-1 -m-1 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </motion.div>
    );
}
