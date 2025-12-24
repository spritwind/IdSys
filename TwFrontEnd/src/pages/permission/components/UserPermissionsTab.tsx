/**
 * User Permissions Tab Component
 * UC Capital Identity Admin
 *
 * 使用者權限管理標籤頁
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Trash2, Users, Check, X, Tag, Shield } from 'lucide-react';
import { permissionApi } from '@/services/permissionApi';
import type {
    UserPermissionDto,
    SetUserPermissionDto,
    UserBriefDto,
    ResourceDto,
    ScopeDto,
} from '@/types/permission';
import { GlassTable } from '@/components/common/GlassTable';
import clsx from 'clsx';

interface UserPermissionsTabProps {
    onUpdate?: () => void;
}

export function UserPermissionsTab({ onUpdate }: UserPermissionsTabProps) {
    const [permissions, setPermissions] = useState<UserPermissionDto[]>([]);
    const [resources, setResources] = useState<ResourceDto[]>([]);
    const [scopes, setScopes] = useState<ScopeDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState<string>('');
    const [clients, setClients] = useState<string[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<UserPermissionDto | null>(null);

    useEffect(() => {
        loadClients();
    }, []);

    useEffect(() => {
        loadPermissions();
        loadResources();
        loadScopes();
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

    const loadPermissions = async () => {
        try {
            setLoading(true);
            // 取得所有資源的使用者權限
            const allResources = await permissionApi.getAllResources(clientFilter || undefined);
            const allPermissions: UserPermissionDto[] = [];

            for (const resource of allResources) {
                const perms = await permissionApi.getResourceUserPermissions(resource.id, resource.clientId);
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

    const loadScopes = async () => {
        try {
            const data = await permissionApi.getAllScopes(clientFilter || undefined);
            setScopes(data);
        } catch (error) {
            console.error('Failed to load scopes:', error);
        }
    };

    const handleCreate = () => {
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await permissionApi.removeUserPermission(
                deleteTarget.userId,
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

    const handleSave = async (data: SetUserPermissionDto) => {
        try {
            await permissionApi.setUserPermission(data.userId, data);
            await loadPermissions();
            onUpdate?.();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save permission:', error);
        }
    };

    const filteredPermissions = permissions.filter(perm =>
        perm.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.resourceName?.toLowerCase().includes(searchTerm.toLowerCase())
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
                        placeholder="搜尋使用者或資源..."
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
                    <span>新增授權</span>
                </motion.button>
            </div>

            {/* Data Table */}
            <GlassTable
                data={filteredPermissions}
                isLoading={loading}
                columns={[
                    {
                        header: '使用者',
                        accessor: (perm) => (
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-indigo-400" />
                                <span className="font-medium text-white">{perm.username || perm.userId}</span>
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
                        header: '客戶端',
                        accessor: 'clientId',
                        className: 'text-[var(--color-text-secondary)]',
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
                    <UserPermissionModal
                        clients={clients}
                        resources={resources}
                        scopes={scopes}
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

// User Permission Modal
function UserPermissionModal({
    clients,
    resources,
    scopes,
    defaultClientId,
    onSave,
    onClose,
}: {
    clients: string[];
    resources: ResourceDto[];
    scopes: ScopeDto[];
    defaultClientId: string;
    onSave: (data: SetUserPermissionDto) => Promise<void>;
    onClose: () => void;
}) {
    const [formData, setFormData] = useState({
        clientId: defaultClientId || (clients.length > 0 ? clients[0] : ''),
        userId: '',
        username: '',
        resourceId: '',
        resourceName: '',
        scopes: [] as string[],
    });
    const [users, setUsers] = useState<UserBriefDto[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // 搜尋使用者
    useEffect(() => {
        const search = async () => {
            if (userSearch.length < 2) {
                setUsers([]);
                return;
            }
            setLoadingUsers(true);
            try {
                const data = await permissionApi.searchUsers(userSearch);
                setUsers(data);
            } catch (error) {
                console.error('Failed to search users:', error);
            } finally {
                setLoadingUsers(false);
            }
        };
        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [userSearch]);

    // 過濾資源和範圍
    const availableResources = resources.filter(r => r.clientId === formData.clientId);
    const selectedResource = availableResources.find(r => r.id === formData.resourceId);
    const availableScopes = selectedResource?.scopes || [];

    const handleUserSelect = (user: UserBriefDto) => {
        setFormData(prev => ({
            ...prev,
            userId: user.id,
            username: user.username,
        }));
        setUserSearch(user.username);
        setUsers([]);
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
        if (!formData.userId || !formData.resourceId || formData.scopes.length === 0) {
            return;
        }
        setSaving(true);
        try {
            await onSave({
                userId: formData.userId,
                username: formData.username,
                clientId: formData.clientId,
                resourceId: formData.resourceId,
                resourceName: formData.resourceName,
                scopes: formData.scopes,
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
                        <Shield size={20} className="text-indigo-400" />
                        新增使用者授權
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

                    {/* User Search */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            使用者
                        </label>
                        <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => {
                                setUserSearch(e.target.value);
                                if (formData.userId) {
                                    setFormData(prev => ({ ...prev, userId: '', username: '' }));
                                }
                            }}
                            placeholder="輸入使用者名稱搜尋..."
                            className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                            required
                        />
                        {formData.userId && (
                            <Check size={16} className="absolute right-3 top-10 text-green-400" />
                        )}
                        {/* User Dropdown */}
                        {users.length > 0 && !formData.userId && (
                            <div className="absolute z-10 w-full mt-1 bg-[#1a1a2e] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                {users.map(user => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => handleUserSelect(user)}
                                        className="w-full px-4 py-2 text-left hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                                    >
                                        <div className="text-white">{user.username}</div>
                                        {user.fullName && (
                                            <div className="text-xs text-[var(--color-text-secondary)]">{user.fullName}</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                        {loadingUsers && (
                            <div className="absolute right-3 top-10">
                                <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                            </div>
                        )}
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
                            disabled={saving || !formData.userId || !formData.resourceId || formData.scopes.length === 0}
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
    permission: UserPermissionDto;
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
                    <h3 className="text-lg font-semibold text-white mb-2">確認移除授權</h3>
                    <p className="text-[var(--color-text-secondary)] mb-6">
                        確定要移除 <span className="text-indigo-400 font-medium">{permission.username}</span> 對{' '}
                        <span className="text-cyan-400 font-medium">{permission.resourceName}</span> 的存取權限嗎？
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
