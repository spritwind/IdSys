/**
 * Batch Permissions Modal
 * 批次權限設定 Modal
 *
 * 為多個使用者同時設定相同的權限
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    Lock,
    Save,
    ChevronDown,
    ChevronRight,
    Search,
    Loader2,
    AlertCircle,
    Users,
} from 'lucide-react';
import { toast } from 'sonner';
import * as permissionV2Api from '../../../services/permissionV2Api';
import type { UserListDto } from '../../../types/user';
import type {
    PermissionResourceDto,
    PermissionScopeDto,
} from '../../../types/permissionV2';
import { SUBJECT_TYPES } from '../../../types/permissionV2';

interface Props {
    users: UserListDto[];
    onClose: () => void;
    onSave: () => void;
}

// 資源項目組件
function ResourceItem({
    resource,
    selectedScopes,
    allScopes,
    onToggleScope,
    depth = 0,
}: {
    resource: PermissionResourceDto;
    selectedScopes: Record<string, string[]>;
    allScopes: PermissionScopeDto[];
    onToggleScope: (resourceId: string, scope: string) => void;
    depth?: number;
}) {
    const [expanded, setExpanded] = useState(depth < 2);
    const hasChildren = resource.children && resource.children.length > 0;
    const resourceScopes = selectedScopes[resource.id] || [];

    return (
        <div className="border-b border-white/5 last:border-0">
            <div
                className="flex items-center gap-2 py-2 hover:bg-white/5 transition-colors"
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
                {hasChildren ? (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-0.5 hover:bg-white/10 rounded"
                    >
                        {expanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                    </button>
                ) : (
                    <div className="w-5" />
                )}

                <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{resource.name}</div>
                    <div className="text-xs text-gray-500 truncate">{resource.code}</div>
                </div>

                <div className="flex items-center gap-1">
                    {allScopes.map((scope) => {
                        const isSelected = resourceScopes.includes(scope.code);
                        return (
                            <button
                                key={scope.code}
                                onClick={() => onToggleScope(resource.id, scope.code)}
                                title={scope.name}
                                className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${
                                    isSelected
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                            >
                                {scope.code.toUpperCase()}
                            </button>
                        );
                    })}
                </div>
            </div>

            {hasChildren && expanded && (
                <div>
                    {resource.children!.map((child) => (
                        <ResourceItem
                            key={child.id}
                            resource={child}
                            selectedScopes={selectedScopes}
                            allScopes={allScopes}
                            onToggleScope={onToggleScope}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function BatchPermissionsModal({ users, onClose, onSave }: Props) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState('');

    const [resources, setResources] = useState<PermissionResourceDto[]>([]);
    const [scopes, setScopes] = useState<PermissionScopeDto[]>([]);
    const [selectedScopes, setSelectedScopes] = useState<Record<string, string[]>>({});

    // 載入資源和範圍
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [resourcesData, scopesData] = await Promise.all([
                    permissionV2Api.getResources(),
                    permissionV2Api.getScopes(),
                ]);
                setResources(resourcesData);
                setScopes(scopesData);
            } catch (error) {
                console.error('Failed to load resource data:', error);
                toast.error('載入資源資料失敗');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // 提取 Client 選項
    const clientOptions = useMemo(() => {
        const clients = new Map<string, string>();
        const extract = (items: PermissionResourceDto[]) => {
            for (const item of items) {
                if (item.clientId && !clients.has(item.clientId)) {
                    clients.set(item.clientId, item.clientName || item.clientId);
                }
                if (item.children) extract(item.children);
            }
        };
        extract(resources);
        return Array.from(clients.entries()).map(([id, name]) => ({ id, name }));
    }, [resources]);

    // 切換權限範圍
    const handleToggleScope = (resourceId: string, scope: string) => {
        setSelectedScopes((prev) => {
            const current = prev[resourceId] || [];
            const newScopes = current.includes(scope)
                ? current.filter((s) => s !== scope)
                : [...current, scope];

            if (newScopes.length === 0) {
                const { [resourceId]: _, ...rest } = prev;
                return rest;
            }

            return { ...prev, [resourceId]: newScopes };
        });
    };

    // 篩選資源
    const filteredResources = useMemo(() => {
        let result = resources;

        if (clientFilter) {
            const filterByClient = (items: PermissionResourceDto[]): PermissionResourceDto[] => {
                return items
                    .map((item) => ({
                        ...item,
                        children: item.children ? filterByClient(item.children) : [],
                    }))
                    .filter(
                        (item) =>
                            item.clientId === clientFilter ||
                            (item.children && item.children.length > 0)
                    );
            };
            result = filterByClient(result);
        }

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const filterBySearch = (items: PermissionResourceDto[]): PermissionResourceDto[] => {
                return items
                    .map((item) => ({
                        ...item,
                        children: item.children ? filterBySearch(item.children) : [],
                    }))
                    .filter(
                        (item) =>
                            item.name.toLowerCase().includes(search) ||
                            item.code.toLowerCase().includes(search) ||
                            (item.children && item.children.length > 0)
                    );
            };
            result = filterBySearch(result);
        }

        return result;
    }, [resources, searchTerm, clientFilter]);

    // 是否有選擇任何權限
    const hasSelections = Object.keys(selectedScopes).length > 0;

    // 儲存 - 為每個使用者批次授予權限
    const handleSave = async () => {
        if (!hasSelections) {
            onClose();
            return;
        }

        setSaving(true);
        try {
            const resourceScopesList = Object.entries(selectedScopes).map(
                ([resourceId, scopeList]) => ({ resourceId, scopes: scopeList })
            );

            // 為每個使用者批次授予
            const results = await Promise.allSettled(
                users.map((user) =>
                    permissionV2Api.batchGrantPermissions({
                        subjectType: SUBJECT_TYPES.USER,
                        subjectId: user.id,
                        subjectName: user.displayName || user.userName,
                        resourceScopes: resourceScopesList,
                        inheritToChildren: false,
                    })
                )
            );

            const succeeded = results.filter((r) => r.status === 'fulfilled').length;
            const failed = results.filter((r) => r.status === 'rejected').length;

            if (failed === 0) {
                toast.success(`已為 ${succeeded} 位使用者設定權限`);
            } else {
                toast.warning(`${succeeded} 位成功，${failed} 位失敗`);
            }

            onSave();
        } catch (error: any) {
            console.error('Failed to batch set permissions:', error);
            toast.error(error.response?.data?.message || '批次設定失敗');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Lock className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">批次設定權限</h2>
                            <p className="text-sm text-gray-400 flex items-center gap-2">
                                <Users className="w-3 h-3" />
                                已選擇 {users.length} 位使用者
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Selected Users Preview */}
                <div className="px-6 py-2 border-b border-white/10 bg-white/5">
                    <div className="flex flex-wrap gap-2">
                        {users.slice(0, 10).map((user) => (
                            <span
                                key={user.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            >
                                {user.displayName || user.userName}
                            </span>
                        ))}
                        {users.length > 10 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs text-gray-400">
                                +{users.length - 10} 位
                            </span>
                        )}
                    </div>
                </div>

                {/* Search & Client Filter */}
                <div className="px-6 py-3 border-b border-white/10">
                    <div className="flex gap-3">
                        {clientOptions.length > 1 && (
                            <select
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50 min-w-[160px]"
                            >
                                <option value="" className="bg-gray-800">全部 Client</option>
                                {clientOptions.map((c) => (
                                    <option key={c.id} value={c.id} className="bg-gray-800">
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="搜尋資源..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span>權限範圍:</span>
                        {scopes.map((scope) => (
                            <span key={scope.code} className="flex items-center gap-1">
                                <span className="w-5 h-5 flex items-center justify-center bg-white/10 rounded text-gray-300 font-medium">
                                    {scope.code.toUpperCase()}
                                </span>
                                <span>{scope.name}</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                        </div>
                    ) : filteredResources.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
                            <p>{searchTerm ? '沒有找到符合的資源' : '沒有可用的資源'}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredResources.map((resource) => (
                                <ResourceItem
                                    key={resource.id}
                                    resource={resource}
                                    selectedScopes={selectedScopes}
                                    allScopes={scopes}
                                    onToggleScope={handleToggleScope}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Change Summary */}
                {hasSelections && (
                    <div className="px-6 py-3 bg-amber-500/10 border-t border-amber-500/30">
                        <p className="text-sm text-amber-300">
                            將為 {users.length} 位使用者設定 {Object.keys(selectedScopes).length} 項資源權限
                        </p>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasSelections}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? '設定中...' : '批次設定權限'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
