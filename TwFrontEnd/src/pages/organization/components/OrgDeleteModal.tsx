/**
 * 組織刪除確認 Modal
 * UC Capital Identity Admin
 *
 * 顯示待刪除的群組及子群組列表，並要求輸入「刪除」確認
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle, Building2, ChevronRight, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { DeleteConfirmation } from '../../../types/organization';

interface OrgDeleteModalProps {
    open: boolean;
    onClose: () => void;
    confirmation: DeleteConfirmation | null;
    loading?: boolean;
    onConfirm: () => Promise<void>;
}

export function OrgDeleteModal({
    open,
    onClose,
    confirmation,
    loading = false,
    onConfirm,
}: OrgDeleteModalProps) {
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 確認文字
    const CONFIRM_KEYWORD = '刪除';

    useEffect(() => {
        if (open) {
            setConfirmText('');
            setError(null);
        }
    }, [open]);

    const handleConfirm = async () => {
        if (confirmText !== CONFIRM_KEYWORD) {
            setError(`請輸入「${CONFIRM_KEYWORD}」以確認刪除`);
            return;
        }

        setDeleting(true);
        setError(null);
        try {
            await onConfirm();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : '刪除失敗');
        } finally {
            setDeleting(false);
        }
    };

    const canConfirm = confirmText === CONFIRM_KEYWORD && !deleting;

    return (
        <AnimatePresence>
            {open && confirmation && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
                    >
                        <div className="glass rounded-2xl border border-red-500/30 shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-red-500/20 bg-gradient-to-r from-red-500/20 to-orange-500/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/30 to-orange-500/20 border border-red-500/40">
                                        <AlertTriangle size={20} className="text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">
                                            確認刪除
                                        </h3>
                                        <p className="text-xs text-red-300">
                                            此操作無法復原
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    disabled={deleting}
                                    className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 size={32} className="animate-spin text-[var(--color-text-muted)]" />
                                    </div>
                                ) : (
                                    <>
                                        {/* 主要群組資訊 */}
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                            <div className="flex items-start gap-3">
                                                <Building2 size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-white font-medium">
                                                        {confirmation.group.deptZhName || confirmation.group.name}
                                                    </p>
                                                    {confirmation.group.deptCode && (
                                                        <p className="text-sm text-[var(--color-text-muted)] font-mono">
                                                            {confirmation.group.deptCode}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 子群組列表 */}
                                        {confirmation.hasDescendants && (
                                            <div className="space-y-2">
                                                <p className="text-sm text-orange-400 flex items-center gap-2">
                                                    <AlertTriangle size={14} />
                                                    以下 {confirmation.descendants.length} 個子群組也將被刪除：
                                                </p>
                                                <div className="max-h-40 overflow-y-auto rounded-xl bg-white/5 border border-white/10 divide-y divide-white/5">
                                                    {confirmation.descendants.map((group) => (
                                                        <div
                                                            key={group.id}
                                                            className="px-4 py-2 flex items-center gap-2 text-sm"
                                                        >
                                                            <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
                                                            <span className="text-[var(--color-text-secondary)]">
                                                                {group.deptZhName || group.name}
                                                            </span>
                                                            {group.deptCode && (
                                                                <span className="text-xs text-[var(--color-text-muted)] font-mono ml-auto">
                                                                    {group.deptCode}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 刪除統計 */}
                                        <div className="flex items-center justify-center py-2">
                                            <span className="text-2xl font-bold text-red-400">
                                                {confirmation.totalCount}
                                            </span>
                                            <span className="text-[var(--color-text-secondary)] ml-2">
                                                個群組將被刪除
                                            </span>
                                        </div>

                                        {/* 確認輸入 */}
                                        <div className="space-y-2">
                                            <label className="block text-sm text-[var(--color-text-secondary)]">
                                                請輸入「<span className="text-red-400 font-bold">{CONFIRM_KEYWORD}</span>」以確認此操作
                                            </label>
                                            <input
                                                type="text"
                                                value={confirmText}
                                                onChange={(e) => setConfirmText(e.target.value)}
                                                placeholder={CONFIRM_KEYWORD}
                                                disabled={deleting}
                                                className={clsx(
                                                    "w-full px-4 py-3 rounded-xl text-center text-lg font-bold",
                                                    "bg-white/5 border-2 transition-colors",
                                                    confirmText === CONFIRM_KEYWORD
                                                        ? "border-red-500 text-red-400"
                                                        : "border-white/10 text-white",
                                                    "placeholder-[var(--color-text-muted)]",
                                                    "focus:outline-none focus:border-red-500/70",
                                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                                )}
                                                autoFocus
                                            />
                                        </div>

                                        {/* 錯誤訊息 */}
                                        {error && (
                                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                                {error}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={deleting}
                                        className="px-4 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirm}
                                        disabled={!canConfirm}
                                        className={clsx(
                                            "flex items-center gap-2 px-5 py-2 rounded-xl font-medium transition-all",
                                            canConfirm
                                                ? "bg-gradient-to-r from-red-500 to-orange-600 text-white hover:from-red-400 hover:to-orange-500"
                                                : "bg-white/10 text-[var(--color-text-muted)] cursor-not-allowed"
                                        )}
                                    >
                                        {deleting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                刪除中...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={16} />
                                                確認刪除
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default OrgDeleteModal;
