/**
 * Resources Tab Component
 * UC Capital Identity Admin
 *
 * 受保護資源管理標籤頁
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Layers, Check, X, Tag } from 'lucide-react';
import { permissionApi } from '@/services/permissionApi';
import type { ResourceDto, CreateResourceDto, UpdateResourceDto, ScopeDto } from '@/types/permission';
import { GlassTable } from '@/components/common/GlassTable';
import clsx from 'clsx';

interface ResourcesTabProps {
    onUpdate?: () => void;
}

export function ResourcesTab({ onUpdate }: ResourcesTabProps) {
    const [resources, setResources] = useState<ResourceDto[]>([]);
    const [scopes, setScopes] = useState<ScopeDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [clients, setClients] = useState<string[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingResource, setEditingResource] = useState<ResourceDto | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ResourceDto | null>(null);

    const resourceTypes = ['page', 'api', 'feature', 'menu', 'report'];

    useEffect(() => {
        loadClients();
    }, []);

    useEffect(() => {
        loadResources();
        loadScopes();
    }, [clientFilter, typeFilter]);

    const loadClients = async () => {
        try {
            const data = await permissionApi.getClients();
            setClients(data);
            if (data.length === 1) {
                setClientFilter(data[0]);
            }
        } catch (error) {
            console.error('Failed to load clients:', error);
        }
    };

    const loadResources = async () => {
        try {
            setLoading(true);
            const data = await permissionApi.getAllResources(
                clientFilter || undefined,
                typeFilter || undefined
            );
            setResources(data);
        } catch (error) {
            console.error('Failed to load resources:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadScopes = async () => {
        try {
            const data = await permissionApi.getAllScopes(clientFilter || undefined);
            setScopes(data);
        } catch (error) {
            console.error('Failed to load scopes:', error);
        }
    };

    const handleCreate = () => {
        setEditingResource(null);
        setShowModal(true);
    };

    const handleEdit = (resource: ResourceDto) => {
        setEditingResource(resource);
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await permissionApi.deleteResource(deleteTarget.id, deleteTarget.clientId);
            await loadResources();
            onUpdate?.();
            setDeleteTarget(null);
        } catch (error) {
            console.error('Failed to delete resource:', error);
        }
    };

    const handleSave = async (data: CreateResourceDto | UpdateResourceDto) => {
        try {
            if (editingResource) {
                await permissionApi.updateResource(editingResource.id, data as UpdateResourceDto);
            } else {
                await permissionApi.createResource(data as CreateResourceDto);
            }
            await loadResources();
            onUpdate?.();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save resource:', error);
        }
    };

    const filteredResources = resources.filter(resource =>
        resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.uri?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTypeColor = (type?: string) => {
        const colors: Record<string, string> = {
            page: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            api: 'bg-green-500/10 text-green-400 border-green-500/20',
            feature: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            menu: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            report: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        };
        return colors[type?.toLowerCase() || ''] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    };

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

                {/* Type Filter */}
                <div className="flex-shrink-0">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="h-12 px-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white focus:outline-none focus:border-[var(--color-accent-primary)]"
                    >
                        <option value="">所有類型</option>
                        {resourceTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
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
                        placeholder="搜尋資源名稱或 URI..."
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
                    <span>新增資源</span>
                </motion.button>
            </div>

            {/* Data Table */}
            <GlassTable
                data={filteredResources}
                isLoading={loading}
                onRowClick={handleEdit}
                columns={[
                    {
                        header: '資源名稱',
                        accessor: (resource) => (
                            <div className="flex items-center gap-2">
                                <Layers size={16} className="text-cyan-400" />
                                <div>
                                    <div className="font-medium text-white">{resource.displayName || resource.name}</div>
                                    {resource.displayName && (
                                        <div className="text-xs text-[var(--color-text-secondary)] font-mono">{resource.name}</div>
                                    )}
                                </div>
                            </div>
                        ),
                    },
                    {
                        header: '類型',
                        accessor: (resource) => resource.type && (
                            <span className={clsx(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                                getTypeColor(resource.type)
                            )}>
                                {resource.type}
                            </span>
                        ),
                    },
                    {
                        header: 'URI',
                        accessor: (resource) => (
                            <span className="text-[var(--color-text-secondary)] font-mono text-sm">
                                {resource.uri || '-'}
                            </span>
                        ),
                    },
                    {
                        header: '範圍',
                        accessor: (resource) => (
                            <div className="flex items-center gap-1 flex-wrap">
                                {resource.scopes?.slice(0, 3).map(scope => (
                                    <span
                                        key={scope}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    >
                                        {scope}
                                    </span>
                                ))}
                                {(resource.scopes?.length || 0) > 3 && (
                                    <span className="text-xs text-[var(--color-text-secondary)]">
                                        +{resource.scopes.length - 3}
                                    </span>
                                )}
                            </div>
                        ),
                    },
                    {
                        header: '狀態',
                        accessor: (resource) => (
                            <span className={clsx(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                resource.enabled
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            )}>
                                {resource.enabled ? '啟用' : '停用'}
                            </span>
                        ),
                    },
                    {
                        header: '',
                        accessor: (resource) => (
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => handleEdit(resource)}
                                    className="p-2 text-[var(--color-text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
                                    title="編輯"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => setDeleteTarget(resource)}
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
                    <ResourceModal
                        resource={editingResource}
                        clients={clients}
                        scopes={scopes}
                        resourceTypes={resourceTypes}
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
                        resource={deleteTarget}
                        onConfirm={handleDelete}
                        onCancel={() => setDeleteTarget(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Resource Edit/Create Modal
function ResourceModal({
    resource,
    clients,
    scopes,
    resourceTypes,
    defaultClientId,
    onSave,
    onClose,
}: {
    resource: ResourceDto | null;
    clients: string[];
    scopes: ScopeDto[];
    resourceTypes: string[];
    defaultClientId: string;
    onSave: (data: CreateResourceDto | UpdateResourceDto) => Promise<void>;
    onClose: () => void;
}) {
    const [formData, setFormData] = useState({
        clientId: resource?.clientId || defaultClientId || (clients.length > 0 ? clients[0] : ''),
        name: resource?.name || '',
        displayName: resource?.displayName || '',
        type: resource?.type || '',
        uri: resource?.uri || '',
        scopeIds: resource?.scopes || [],
    });
    const [saving, setSaving] = useState(false);

    // 當 clientId 變更時，清空 scopeIds（因為 scope 是按 client 分開的）
    const availableScopes = scopes.filter(s => s.clientId === formData.clientId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (resource) {
                await onSave({
                    id: resource.id,
                    clientId: formData.clientId,
                    name: formData.name,
                    displayName: formData.displayName,
                    type: formData.type,
                    uri: formData.uri,
                    scopeIds: formData.scopeIds,
                } as UpdateResourceDto);
            } else {
                await onSave({
                    clientId: formData.clientId,
                    name: formData.name,
                    displayName: formData.displayName,
                    type: formData.type,
                    uri: formData.uri,
                    scopeIds: formData.scopeIds,
                } as CreateResourceDto);
            }
        } finally {
            setSaving(false);
        }
    };

    const toggleScope = (scopeName: string) => {
        setFormData(prev => ({
            ...prev,
            scopeIds: prev.scopeIds.includes(scopeName)
                ? prev.scopeIds.filter(s => s !== scopeName)
                : [...prev.scopeIds, scopeName],
        }));
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
                className="w-full max-w-lg bg-[#1a1a2e] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
                    <h3 className="text-lg font-semibold text-white">
                        {resource ? '編輯資源' : '新增資源'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                客戶端
                            </label>
                            <select
                                value={formData.clientId}
                                onChange={(e) => setFormData({ ...formData, clientId: e.target.value, scopeIds: [] })}
                                disabled={!!resource}
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
                                類型
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white focus:outline-none focus:border-[var(--color-accent-primary)]"
                            >
                                <option value="">選擇類型</option>
                                {resourceTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            資源識別碼
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="例如: orders, users, reports"
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
                            placeholder="例如: 訂單管理"
                            className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            URI (選填)
                        </label>
                        <input
                            type="text"
                            value={formData.uri}
                            onChange={(e) => setFormData({ ...formData, uri: e.target.value })}
                            placeholder="例如: /api/orders 或 /pages/orders"
                            className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            可用權限範圍
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl min-h-[60px]">
                            {availableScopes.length === 0 ? (
                                <span className="text-sm text-[var(--color-text-secondary)]">
                                    請先建立權限範圍
                                </span>
                            ) : (
                                availableScopes.map(scope => (
                                    <button
                                        key={scope.id}
                                        type="button"
                                        onClick={() => toggleScope(scope.name)}
                                        className={clsx(
                                            'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                                            formData.scopeIds.includes(scope.name)
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                : 'bg-[rgba(255,255,255,0.03)] text-[var(--color-text-secondary)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]'
                                        )}
                                    >
                                        <Tag size={14} />
                                        {scope.displayName || scope.name}
                                        {formData.scopeIds.includes(scope.name) && (
                                            <Check size={14} className="text-amber-400" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
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
                            {saving ? '儲存中...' : (resource ? '更新' : '建立')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
    resource,
    onConfirm,
    onCancel,
}: {
    resource: ResourceDto;
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
                        確定要刪除資源 <span className="text-cyan-400 font-medium">{resource.displayName || resource.name}</span> 嗎？
                        <br />
                        <span className="text-xs">此操作無法復原，相關的授權也會被移除。</span>
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
