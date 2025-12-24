/**
 * Scopes Tab Component
 * UC Capital Identity Admin
 *
 * 權限範圍管理標籤頁
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Key, Check, X } from 'lucide-react';
import { permissionApi } from '@/services/permissionApi';
import type { ScopeDto, CreateScopeDto, UpdateScopeDto } from '@/types/permission';
import { GlassTable } from '@/components/common/GlassTable';
import clsx from 'clsx';

interface ScopesTabProps {
    onUpdate?: () => void;
}

export function ScopesTab({ onUpdate }: ScopesTabProps) {
    const [scopes, setScopes] = useState<ScopeDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState<string>('');
    const [clients, setClients] = useState<string[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingScope, setEditingScope] = useState<ScopeDto | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ScopeDto | null>(null);

    useEffect(() => {
        loadClients();
    }, []);

    useEffect(() => {
        loadScopes();
    }, [clientFilter]);

    const loadClients = async () => {
        try {
            const data = await permissionApi.getClients();
            setClients(data);
            // 如果只有一個客戶端，自動選擇
            if (data.length === 1) {
                setClientFilter(data[0]);
            }
        } catch (error) {
            console.error('Failed to load clients:', error);
        }
    };

    const loadScopes = async () => {
        try {
            setLoading(true);
            const data = await permissionApi.getAllScopes(clientFilter || undefined);
            setScopes(data);
        } catch (error) {
            console.error('Failed to load scopes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingScope(null);
        setShowModal(true);
    };

    const handleEdit = (scope: ScopeDto) => {
        setEditingScope(scope);
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await permissionApi.deleteScope(deleteTarget.id, deleteTarget.clientId);
            await loadScopes();
            onUpdate?.();
            setDeleteTarget(null);
        } catch (error) {
            console.error('Failed to delete scope:', error);
        }
    };

    const handleSave = async (data: CreateScopeDto | UpdateScopeDto) => {
        try {
            if (editingScope) {
                await permissionApi.updateScope(editingScope.id, data as UpdateScopeDto);
            } else {
                await permissionApi.createScope(data as CreateScopeDto);
            }
            await loadScopes();
            onUpdate?.();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save scope:', error);
        }
    };

    const filteredScopes = scopes.filter(scope =>
        scope.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scope.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Client Filter */}
                <div className="flex-shrink-0">
                    <select
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className="h-12 px-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white focus:outline-none focus:border-[var(--color-accent-primary)]"
                    >
                        <option value="">所有客戶端</option>
                        {clients.map(client => (
                            <option key={client} value={client}>{client}</option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-md group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-[var(--color-text-secondary)] group-focus-within:text-[var(--color-accent-primary)] transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="搜尋權限範圍..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 pl-10 pr-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)] transition-all"
                    />
                </div>

                {/* Add Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCreate}
                    className="btn-primary group flex-shrink-0"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span>新增範圍</span>
                </motion.button>
            </div>

            {/* Data Table */}
            <GlassTable
                data={filteredScopes}
                isLoading={loading}
                onRowClick={handleEdit}
                columns={[
                    {
                        header: '範圍識別碼',
                        accessor: (scope) => (
                            <div className="flex items-center gap-2">
                                <Key size={16} className="text-amber-400" />
                                <span className="font-mono text-amber-400">{scope.name}</span>
                            </div>
                        ),
                    },
                    {
                        header: '顯示名稱',
                        accessor: 'displayName',
                    },
                    {
                        header: '客戶端',
                        accessor: 'clientId',
                        className: 'text-[var(--color-text-secondary)]',
                    },
                    {
                        header: '狀態',
                        accessor: (scope) => (
                            <span className={clsx(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                scope.enabled
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            )}>
                                {scope.enabled ? '啟用' : '停用'}
                            </span>
                        ),
                    },
                    {
                        header: '',
                        accessor: (scope) => (
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => handleEdit(scope)}
                                    className="p-2 text-[var(--color-text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
                                    title="編輯"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => setDeleteTarget(scope)}
                                    className="p-2 text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="刪除"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ),
                    },
                ]}
            />

            {/* Edit/Create Modal */}
            <AnimatePresence>
                {showModal && (
                    <ScopeModal
                        scope={editingScope}
                        clients={clients}
                        defaultClientId={clientFilter}
                        onSave={handleSave}
                        onClose={() => setShowModal(false)}
                    />
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <DeleteConfirmModal
                        scope={deleteTarget}
                        onConfirm={handleDelete}
                        onCancel={() => setDeleteTarget(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Scope Edit/Create Modal
function ScopeModal({
    scope,
    clients,
    defaultClientId,
    onSave,
    onClose,
}: {
    scope: ScopeDto | null;
    clients: string[];
    defaultClientId: string;
    onSave: (data: CreateScopeDto | UpdateScopeDto) => Promise<void>;
    onClose: () => void;
}) {
    const [formData, setFormData] = useState({
        clientId: scope?.clientId || defaultClientId || (clients.length > 0 ? clients[0] : ''),
        name: scope?.name || '',
        displayName: scope?.displayName || '',
        iconUri: scope?.iconUri || '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (scope) {
                await onSave({
                    id: scope.id,
                    clientId: formData.clientId,
                    name: formData.name,
                    displayName: formData.displayName,
                    iconUri: formData.iconUri,
                } as UpdateScopeDto);
            } else {
                await onSave({
                    clientId: formData.clientId,
                    name: formData.name,
                    displayName: formData.displayName,
                    iconUri: formData.iconUri,
                } as CreateScopeDto);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-[#1a1a2e] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
                    <h3 className="text-lg font-semibold text-white">
                        {scope ? '編輯權限範圍' : '新增權限範圍'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            客戶端
                        </label>
                        <select
                            value={formData.clientId}
                            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                            disabled={!!scope}
                            className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white focus:outline-none focus:border-[var(--color-accent-primary)] disabled:opacity-50"
                            required
                        >
                            {clients.map(client => (
                                <option key={client} value={client}>{client}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            範圍識別碼
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="例如: read, write, delete"
                            className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            顯示名稱
                        </label>
                        <input
                            type="text"
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            placeholder="例如: 讀取權限"
                            className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            圖示 URI (選填)
                        </label>
                        <input
                            type="text"
                            value={formData.iconUri}
                            onChange={(e) => setFormData({ ...formData, iconUri: e.target.value })}
                            placeholder="例如: /icons/read.svg"
                            className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-white transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary"
                        >
                            {saving ? '儲存中...' : (scope ? '更新' : '建立')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
    scope,
    onConfirm,
    onCancel,
}: {
    scope: ScopeDto;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-[#1a1a2e] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <Trash2 className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">確認刪除</h3>
                    <p className="text-[var(--color-text-secondary)] mb-6">
                        確定要刪除權限範圍 <span className="text-amber-400 font-mono">{scope.name}</span> 嗎？
                        <br />
                        <span className="text-xs">此操作無法復原。</span>
                    </p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-white transition-colors flex items-center gap-2"
                        >
                            <X size={16} />
                            取消
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Check size={16} />
                            確認刪除
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
