/**
 * 組織編輯 Modal
 * UC Capital Identity Admin
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Building2, User, Code, Globe, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { OrganizationTreeNode } from '../../../types/organization';

interface OrgEditModalProps {
    open: boolean;
    onClose: () => void;
    node: OrganizationTreeNode | null;
    mode: 'create' | 'edit';
    parentNode?: OrganizationTreeNode | null;
    onSave: (data: Partial<OrganizationTreeNode>) => Promise<void>;
}

export function OrgEditModal({
    open,
    onClose,
    node,
    mode,
    parentNode,
    onSave,
}: OrgEditModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        deptCode: '',
        deptZhName: '',
        deptEName: '',
        manager: '',
        description: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (mode === 'edit' && node) {
            setFormData({
                name: node.name || '',
                deptCode: node.deptCode || '',
                deptZhName: node.deptZhName || '',
                deptEName: node.deptEName || '',
                manager: node.manager || '',
                description: node.description || '',
            });
        } else if (mode === 'create') {
            setFormData({
                name: '',
                deptCode: '',
                deptZhName: '',
                deptEName: '',
                manager: '',
                description: '',
            });
        }
        setError(null);
    }, [node, mode, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('請輸入部門名稱');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await onSave({
                ...formData,
                parentId: mode === 'create' ? parentNode?.id || null : node?.parentId,
                id: mode === 'edit' ? node?.id : undefined,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : '儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
                    >
                        <div className="glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                                        <Building2 size={20} className="text-cyan-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">
                                            {mode === 'create' ? '新增部門' : '編輯部門'}
                                        </h3>
                                        {mode === 'create' && parentNode && (
                                            <p className="text-xs text-[var(--color-text-muted)]">
                                                上層部門: {parentNode.deptZhName || parentNode.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                {/* Name & Code Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                                            部門名稱 <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => handleInputChange('name', e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-cyan-500/50 transition-colors"
                                                placeholder="部門名稱"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                                            部門代碼
                                        </label>
                                        <div className="relative">
                                            <Code size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                            <input
                                                type="text"
                                                value={formData.deptCode}
                                                onChange={(e) => handleInputChange('deptCode', e.target.value.toUpperCase())}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-cyan-500/50 transition-colors font-mono uppercase"
                                                placeholder="DEPT01"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Chinese & English Name Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                                            中文名稱
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.deptZhName}
                                            onChange={(e) => handleInputChange('deptZhName', e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-cyan-500/50 transition-colors"
                                            placeholder="中文部門名稱"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                                            英文名稱
                                        </label>
                                        <div className="relative">
                                            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                            <input
                                                type="text"
                                                value={formData.deptEName}
                                                onChange={(e) => handleInputChange('deptEName', e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-cyan-500/50 transition-colors"
                                                placeholder="Department Name"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Manager */}
                                <div>
                                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                                        部門主管
                                    </label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                        <input
                                            type="text"
                                            value={formData.manager}
                                            onChange={(e) => handleInputChange('manager', e.target.value)}
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-cyan-500/50 transition-colors"
                                            placeholder="主管姓名"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                                        描述
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                                        placeholder="部門描述..."
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className={clsx(
                                            "flex items-center gap-2 px-5 py-2 rounded-xl font-medium transition-all",
                                            "bg-gradient-to-r from-cyan-500 to-blue-600 text-white",
                                            "hover:from-cyan-400 hover:to-blue-500",
                                            "disabled:opacity-50 disabled:cursor-not-allowed"
                                        )}
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                儲存中...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                儲存
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default OrgEditModal;
