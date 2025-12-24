/**
 * Group Permissions Tab Component
 * UC Capital Identity Admin
 *
 * 群組權限管理標籤頁
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Trash2, Building2, Check, X, Tag, Shield, Users } from 'lucide-react';
import { permissionApi } from '@/services/permissionApi';
import type {
    GroupPermissionDto,
    SetGroupPermissionDto,
    GroupBriefDto,
    ResourceDto,
} from '@/types/permission';
import { GlassTable } from '@/components/common/GlassTable';
import clsx from 'clsx';

interface GroupPermissionsTabProps {
    onUpdate?: () => void;
}

export function GroupPermissionsTab({ onUpdate }: GroupPermissionsTabProps) {
    const [permissions, setPermissions] = useState<GroupPermissionDto[]>([]);
    const [resources, setResources] = useState<ResourceDto[]>([]);
    const [groups, setGroups] = useState<GroupBriefDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState<string>('');
    const [clients, setClients] = useState<string[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<GroupPermissionDto | null>(null);

    useEffect(() => {
        loadClients();
        loadGroups();
    }, []);

    useEffect(() => {
        loadPermissions();
        loadResources();
    }, [clientFilter]);

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

    const loadGroups = async () => {
        try {
            const data = await permissionApi.getGroups();
            setGroups(data);
        } catch (error) {
            console.error('Failed to load groups:', error);
        }
    };

    const loadPermissions = async () => {
        try {
            setLoading(true);
            // 取得所有資源的群組權限
            const allResources = await permissionApi.getAllResources(clientFilter || undefined);
            const allPermissions: GroupPermissionDto[] = [];

            for (const resource of allResources) {
                const perms = await permissionApi.getResourceGroupPermissions(resource.id, resource.clientId);
                allPermissions.push(...perms);
            }

            setPermissions(allPermissions);
        } catch (error) {
            console.error('Failed to load permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadResources = async () => {
        try {
            const data = await permissionApi.getAllResources(clientFilter || undefined);
            setResources(data);
        } catch (error) {
            console.error('Failed to load resources:', error);
        }
    };

    const handleCreate = () => {
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await permissionApi.removeGroupPermission(
                deleteTarget.groupId,
                deleteTarget.clientId,
                deleteTarget.resourceId
            );
            await loadPermissions();
            onUpdate?.();
            setDeleteTarget(null);
        } catch (error) {
            console.error('Failed to delete permission:', error);
        }
    };

    const handleSave = async (data: SetGroupPermissionDto) => {
        try {
            await permissionApi.setGroupPermission(data.groupId, data);
            await loadPermissions();
            onUpdate?.();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save permission:', error);
        }
    };

    const filteredPermissions = permissions.filter(perm =>
        perm.groupName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.resourceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.groupPath?.toLowerCase().includes(searchTerm.toLowerCase())
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
                        placeholder="搜尋群組或資源..."
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
                    <span>新增群組授權</span>
                </motion.button>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <Users size={20} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[var(--color-text-secondary)]">
                    <span className="text-indigo-400 font-medium">群組授權說明：</span>
                    授予群組的權限會自動繼承給所有成員。若啟用「繼承至子群組」，子群組的成員也會獲得相同權限。
                </div>
            </div>

            {/* Data Table */}
            <GlassTable
                data={filteredPermissions}
                isLoading={loading}
                columns={[
                    {
                        header: '群組',
                        accessor: (perm) => (
                            <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-purple-400" />
                                <div>
                                    <div className="font-medium text-white">{perm.groupName || perm.groupId}</div>
                                    {perm.groupPath && (
                                        <div className="text-xs text-[var(--color-text-secondary)]">{perm.groupPath}</div>
                                    )}
                                </div>
                            </div>
                        ),
                    },
                    {
                        header: '資源',
                        accessor: (perm) => (
                            <span className="text-cyan-400">{perm.resourceName || perm.resourceId}</span>
                        ),
                    },
                    {
                        header: '權限範圍',
                        accessor: (perm) => (
                            <div className="flex items-center gap-1 flex-wrap">
                                {perm.scopes?.map(scope => (
                                    <span
                                        key={scope}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    >
                                        {scope}
                                    </span>
                                ))}
                            </div>
                        ),
                    },
                    {
                        header: '繼承',
                        accessor: (perm) => (
                            <span className={clsx(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                perm.inheritToChildren
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                            )}>
                                {perm.inheritToChildren ? '繼承至子群組' : '僅本群組'}
                            </span>
                        ),
                    },
                    {
                        header: '狀態',
                        accessor: (perm) => (
                            <span className={clsx(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                perm.enabled
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            )}>
                                {perm.enabled ? '啟用' : '停用'}
                            </span>
                        ),
                    },
                    {
                        header: '',
                        accessor: (perm) => (
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setDeleteTarget(perm)}
                                    className="p-2 text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="移除授權"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ),
                    },
                ]}
            />

            {/* Create Permission Modal */}
            <AnimatePresence>
                {showModal && (
                    <GroupPermissionModal
                        clients={clients}
                        resources={resources}
                        groups={groups}
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
                        permission={deleteTarget}
                        onConfirm={handleDelete}
                        onCancel={() => setDeleteTarget(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Group Permission Modal
function GroupPermissionModal({
    clients,
    resources,
    groups,
    defaultClientId,
    onSave,
    onClose,
}: {
    clients: string[];
    resources: ResourceDto[];
    groups: GroupBriefDto[];
    defaultClientId: string;
    onSave: (data: SetGroupPermissionDto) => Promise<void>;
    onClose: () => void;
}) {
    const [formData, setFormData] = useState({
        clientId: defaultClientId || (clients.length > 0 ? clients[0] : ''),
        groupId: '',
        groupName: '',
        groupPath: '',
        resourceId: '',
        resourceName: '',
        scopes: [] as string[],
        inheritToChildren: true,
    });
    const [saving, setSaving] = useState(false);

    // 過濾資源
    const availableResources = resources.filter(r => r.clientId === formData.clientId);
    const selectedResource = availableResources.find(r => r.id === formData.resourceId);
    const availableScopes = selectedResource?.scopes || [];

    const handleGroupChange = (groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        setFormData(prev => ({
            ...prev,
            groupId,
            groupName: group?.name || '',
            groupPath: group?.path || '',
        }));
    };

    const handleResourceChange = (resourceId: string) => {
        const resource = availableResources.find(r => r.id === resourceId);
        setFormData(prev => ({
            ...prev,
            resourceId,
            resourceName: resource?.displayName || resource?.name || '',
            scopes: [],
        }));
    };

    const toggleScope = (scope: string) => {
        setFormData(prev => ({
            ...prev,
            scopes: prev.scopes.includes(scope)
                ? prev.scopes.filter(s => s !== scope)
                : [...prev.scopes, scope],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.groupId || !formData.resourceId || formData.scopes.length === 0) {
            return;
        }
        setSaving(true);
        try {
            await onSave({
                groupId: formData.groupId,
                groupName: formData.groupName,
                groupPath: formData.groupPath,
                clientId: formData.clientId,
                resourceId: formData.resourceId,
                resourceName: formData.resourceName,
                scopes: formData.scopes,
                inheritToChildren: formData.inheritToChildren,
            });
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
                className="w-full max-w-lg bg-[#1a1a2e] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Shield size={20} className="text-purple-400" />
                        新增群組授權
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {/* Client */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            客戶端
                        </label>
                        <select
                            value={formData.clientId}
                            onChange={(e) => setFormData({ ...formData, clientId: e.target.value, resourceId: '', scopes: [] })}
                            className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white focus:outline-none focus:border-[var(--color-accent-primary)]"
                            required
                        >
                            {clients.map(client => (
                                <option key={client} value={client}>{client}</option>
                            ))}
                        </select>
                    </div>

                    {/* Group */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            群組
                        </label>
                        <select
                            value={formData.groupId}
                            onChange={(e) => handleGroupChange(e.target.value)}
                            className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white focus:outline-none focus:border-[var(--color-accent-primary)]"
                            required
                        >
                            <option value="">選擇群組</option>
                            {groups.map(group => (
                                <option key={group.id} value={group.id}>
                                    {group.deptZhName || group.name} {group.path && `(${group.path})`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Resource */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            資源
                        </label>
                        <select
                            value={formData.resourceId}
                            onChange={(e) => handleResourceChange(e.target.value)}
                            className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white focus:outline-none focus:border-[var(--color-accent-primary)]"
                            required
                        >
                            <option value="">選擇資源</option>
                            {availableResources.map(resource => (
                                <option key={resource.id} value={resource.id}>
                                    {resource.displayName || resource.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Scopes */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            權限範圍
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl min-h-[60px]">
                            {availableScopes.length === 0 ? (
                                <span className="text-sm text-[var(--color-text-secondary)]">
                                    {formData.resourceId ? '此資源沒有可用的範圍' : '請先選擇資源'}
                                </span>
                            ) : (
                                availableScopes.map(scope => (
                                    <button
                                        key={scope}
                                        type="button"
                                        onClick={() => toggleScope(scope)}
                                        className={clsx(
                                            'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                                            formData.scopes.includes(scope)
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                : 'bg-[rgba(255,255,255,0.03)] text-[var(--color-text-secondary)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]'
                                        )}
                                    >
                                        <Tag size={14} />
                                        {scope}
                                        {formData.scopes.includes(scope) && (
                                            <Check size={14} className="text-amber-400" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Inherit to Children */}
                    <div className="flex items-center gap-3 p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl">
                        <input
                            type="checkbox"
                            id="inheritToChildren"
                            checked={formData.inheritToChildren}
                            onChange={(e) => setFormData({ ...formData, inheritToChildren: e.target.checked })}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.03)] text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                        />
                        <label htmlFor="inheritToChildren" className="flex-1">
                            <div className="text-sm font-medium text-white">繼承至子群組</div>
                            <div className="text-xs text-[var(--color-text-secondary)]">
                                啟用後，所有子群組的成員也會獲得此權限
                            </div>
                        </label>
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
                            disabled={saving || !formData.groupId || !formData.resourceId || formData.scopes.length === 0}
                            className="btn-primary disabled:opacity-50"
                        >
                            {saving ? '儲存中...' : '授權'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
    permission,
    onConfirm,
    onCancel,
}: {
    permission: GroupPermissionDto;
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
                    <h3 className="text-lg font-semibold text-white mb-2">確認移除群組授權</h3>
                    <p className="text-[var(--color-text-secondary)] mb-6">
                        確定要移除 <span className="text-purple-400 font-medium">{permission.groupName}</span> 對{' '}
                        <span className="text-cyan-400 font-medium">{permission.resourceName}</span> 的存取權限嗎？
                        <br />
                        <span className="text-xs">所有群組成員將失去此權限。</span>
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
                            確認移除
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
