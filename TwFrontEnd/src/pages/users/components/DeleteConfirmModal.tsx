/**
 * Delete Confirm Modal
 * 刪除確認 Modal (通用)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface Props {
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
    onCancel: () => void;
    confirmText?: string;
    confirmColor?: 'red' | 'amber';
}

export default function DeleteConfirmModal({
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = '確認刪除',
    confirmColor = 'red',
}: Props) {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
        } finally {
            setLoading(false);
        }
    };

    const buttonColorClass =
        confirmColor === 'red'
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-amber-500 hover:bg-amber-600 text-gray-900';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 border border-white/10 rounded-xl w-full max-w-md"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">{title}</h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-300">{message}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2 ${buttonColorClass} text-white font-medium rounded-lg transition-colors disabled:opacity-50`}
                    >
                        <Trash2 className="w-4 h-4" />
                        {loading ? '處理中...' : confirmText}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
