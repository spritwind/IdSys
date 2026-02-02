/**
 * User Permissions Modal
 * 使用者權限管理 Modal
 *
 * 顯示使用者的有效權限（含從角色繼承）+ 管理個人權限
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
    Shield,
    User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import * as permissionV2Api from '../../../services/permissionV2Api';
import type { UserListDto } from '../../../types/user';
import type {
    PermissionResourceDto,
    PermissionDto,
    PermissionScopeDto,
    EffectivePermissionDto,
} from '../../../types/permissionV2';
import { SCOPE_NAMES, SUBJECT_TYPES } from '../../../types/permissionV2';

interface Props {
    user: UserListDto;
    onClose: () => void;
    onSave: () => void;
}

// Tab 類型
type TabType = 'effective' | 'direct';

// 權限來源標籤
function SourceBadge({ source, sourceName }: { source: string; sourceName?: string }) {
    const colors: Record<string, string> = {
        Direct: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        Role: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        Organization: 'bg-green-500/20 text-green-400 border-green-500/30',
        Group: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };

    const labels: Record<string, string> = {
        Direct: '直接授權',
        Role: '角色繼承',
        Organization: '組織繼承',
        Group: '群組繼承',
    };

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${
                colors[source] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
            }`}
            title={sourceName}
        >
            {source === 'Role' ? <Shield className="w-3 h-3 mr-1" /> : null}
            {labels[source] || source}
            {sourceName && ` (${sourceName})`}
        </span>
    );
}

// 有效權限列表項
function EffectivePermissionItem({ permission }: { permission: EffectivePermissionDto }) {
    return (
        <div className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg">
            <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{permission.resourceName}</div>
                <div className="text-xs text-gray-500 truncate">{permission.resourceCode}</div>
            </div>
            <div className="flex items-center gap-2">
                {/* 範圍 */}
                <div className="flex items-center gap-1">
                    {permission.scopes.map((scope) => (
                        <span
                            key={scope}
                            className="w-6 h-6 flex items-center justify-center bg-blue-500/20 text-blue-400 rounded text-xs font-medium"
                            title={SCOPE_NAMES[scope] || scope}
                        >
                            {scope.toUpperCase()}
                        </span>
                    ))}
                </div>
                {/* 來源 */}
                <SourceBadge source={permission.source} sourceName={permission.sourceName} />
            </div>
        </div>
    );
}

// 資源項目組件（用於編輯直接權限）
function ResourceItem({
    resource,
    selectedScopes,
    allScopes,
    inheritedScopes,
    onToggleScope,
    depth = 0,
}: {
    resource: PermissionResourceDto;
    selectedScopes: Record<string, string[]>;
    allScopes: PermissionScopeDto[];
    inheritedScopes: Record<string, string[]>; // 從角色繼承的權限（不可編輯）
    onToggleScope: (resourceId: string, scope: string) => void;
    depth?: number;
}) {
    const [expanded, setExpanded] = useState(depth < 2);
    const hasChildren = resource.children && resource.children.length > 0;
    const resourceScopes = selectedScopes[resource.id] || [];
    const inherited = inheritedScopes[resource.id] || [];

    return (
        <div className="border-b border-white/5 last:border-0">
            <div
                className="flex items-center gap-2 py-2 hover:bg-white/5 transition-colors"
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
                {/* 展開/收合按鈕 */}
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

                {/* 資源名稱 */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{resource.name}</div>
                    <div className="text-xs text-gray-500 truncate">{resource.code}</div>
                </div>

                {/* 權限範圍選擇 */}
                <div className="flex items-center gap-1">
                    {allScopes.map((scope) => {
                        const isSelected = resourceScopes.includes(scope.code);
                        const isInherited = inherited.includes(scope.code);

                        if (isInherited && !isSelected) {
                            // 純繼承（無直接授權）：顯示但不可編輯
                            return (
                                <span
                                    key={scope.code}
                                    title={`${scope.name} (繼承，不可編輯)`}
                                    className="w-7 h-7 flex items-center justify-center rounded text-xs font-medium bg-purple-500/30 text-purple-300 cursor-not-allowed"
                                >
                                    {scope.code.toUpperCase()}
                                </span>
                            );
                        }

                        return (
                            <button
                                key={scope.code}
                                onClick={() => onToggleScope(resource.id, scope.code)}
                                title={isSelected && isInherited
                                    ? `${scope.name} (直接授權 + 繼承)`
                                    : scope.name}
                                className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${
                                    isSelected && isInherited
                                        ? 'bg-blue-500 text-white ring-2 ring-purple-400/50'
                                        : isSelected
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                            >
                                {scope.code.toUpperCase()}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 子資源 */}
            {hasChildren && expanded && (
                <div>
                    {resource.children!.map((child) => (
                        <ResourceItem
                            key={child.id}
                            resource={child}
                            selectedScopes={selectedScopes}
                            allScopes={allScopes}
                            inheritedScopes={inheritedScopes}
                            onToggleScope={onToggleScope}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function UserPermissionsModal({ user, onClose, onSave }: Props) {
    const [activeTab, setActiveTab] = useState<TabType>('effective');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState('');

    // 資料
    const [resources, setResources] = useState<PermissionResourceDto[]>([]);
    const [scopes, setScopes] = useState<PermissionScopeDto[]>([]);
    const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermissionDto[]>([]);
    const [directPermissions, setDirectPermissions] = useState<PermissionDto[]>([]);

    // 編輯狀態
    const [selectedScopes, setSelectedScopes] = useState<Record<string, string[]>>({});
    const [originalScopes, setOriginalScopes] = useState<Record<string, string[]>>({});

    // 從其他來源繼承的權限（僅在該 scope 沒有直接授權時才標記為不可編輯）
    const inheritedScopes = useMemo(() => {
        // 先收集所有非 Direct 來源的 scopes
        const inherited: Record<string, string[]> = {};
        effectivePermissions
            .filter((p) => p.source !== 'Direct')
            .forEach((p) => {
                if (!inherited[p.resourceId]) {
                    inherited[p.resourceId] = [];
                }
                p.scopes.forEach((s) => {
                    if (!inherited[p.resourceId].includes(s)) {
                        inherited[p.resourceId].push(s);
                    }
                });
            });

        // 收集所有 Direct 來源的 scopes
        const direct: Record<string, string[]> = {};
        effectivePermissions
            .filter((p) => p.source === 'Direct')
            .forEach((p) => {
                if (!direct[p.resourceId]) {
                    direct[p.resourceId] = [];
                }
                p.scopes.forEach((s) => {
                    if (!direct[p.resourceId].includes(s)) {
                        direct[p.resourceId].push(s);
                    }
                });
            });

        // 只標記「僅繼承、無直接授權」的 scopes 為不可編輯
        const result: Record<string, string[]> = {};
        for (const [resourceId, scopes] of Object.entries(inherited)) {
            const directScopes = direct[resourceId] || [];
            const pureInherited = scopes.filter((s) => !directScopes.includes(s));
            if (pureInherited.length > 0) {
                result[resourceId] = pureInherited;
            }
        }
        return result;
    }, [effectivePermissions]);

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

    // 載入資料
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [resourcesData, scopesData, effectiveData, directData] = await Promise.all([
                    permissionV2Api.getResources(),
                    permissionV2Api.getScopes(),
                    permissionV2Api.getUserEffectivePermissions(user.id),
                    permissionV2Api.getUserPermissions(user.id),
                ]);

                setResources(resourcesData);
                setScopes(scopesData);
                setEffectivePermissions(effectiveData.permissions || []);
                setDirectPermissions(directData);

                // 解析直接權限為選中狀態
                const scopeMap: Record<string, string[]> = {};
                directData.forEach((p) => {
                    let scopeList: string[] = [];
                    if (p.scopes.startsWith('@')) {
                        scopeList = p.scopes.split('@').filter(Boolean);
                    } else if (p.scopes.startsWith('[')) {
                        try {
                            scopeList = JSON.parse(p.scopes);
                        } catch {
                            scopeList = [];
                        }
                    } else {
                        scopeList = p.scopeList || [];
                    }
                    scopeMap[p.resourceId] = scopeList;
                });

                setSelectedScopes(scopeMap);
                setOriginalScopes(JSON.parse(JSON.stringify(scopeMap)));
            } catch (error) {
                console.error('Failed to load permission data:', error);
                toast.error('載入權限資料失敗');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [user.id]);

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

    // 篩選有效權限
    const filteredEffectivePermissions = useMemo(() => {
        let result = effectivePermissions;

        if (clientFilter) {
            result = result.filter((p) => p.clientId === clientFilter);
        }

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(
                (p) =>
                    p.resourceName?.toLowerCase().includes(search) ||
                    p.resourceCode?.toLowerCase().includes(search)
            );
        }

        return result;
    }, [effectivePermissions, searchTerm, clientFilter]);

    // 檢查是否有變更
    const hasChanges = useMemo(() => {
        const currentKeys = Object.keys(selectedScopes);
        const originalKeys = Object.keys(originalScopes);

        if (currentKeys.length !== originalKeys.length) return true;

        for (const key of currentKeys) {
            if (!originalScopes[key]) return true;
            const current = [...(selectedScopes[key] || [])].sort();
            const original = [...(originalScopes[key] || [])].sort();
            if (current.join(',') !== original.join(',')) return true;
        }

        return false;
    }, [selectedScopes, originalScopes]);

    // 儲存
    const handleSave = async () => {
        if (!hasChanges) {
            onClose();
            return;
        }

        setSaving(true);
        try {
            const toRevoke: string[] = [];
            const toGrant: { resourceId: string; scopes: string[] }[] = [];

            const allResourceIds = new Set([
                ...Object.keys(selectedScopes),
                ...Object.keys(originalScopes),
            ]);

            for (const resourceId of allResourceIds) {
                const current = selectedScopes[resourceId] || [];
                const original = originalScopes[resourceId] || [];

                if (current.length === 0 && original.length > 0) {
                    const permission = directPermissions.find((p) => p.resourceId === resourceId);
                    if (permission) {
                        toRevoke.push(permission.id);
                    }
                } else if (current.length > 0) {
                    const currentSorted = [...current].sort().join(',');
                    const originalSorted = [...original].sort().join(',');
                    if (currentSorted !== originalSorted) {
                        toGrant.push({ resourceId, scopes: current });
                    }
                }
            }

            if (toRevoke.length > 0) {
                await permissionV2Api.batchRevokePermissions(toRevoke);
            }

            if (toGrant.length > 0) {
                await permissionV2Api.batchGrantPermissions({
                    subjectType: SUBJECT_TYPES.USER,
                    subjectId: user.id,
                    subjectName: user.displayName || user.userName,
                    resourceScopes: toGrant,
                    inheritToChildren: false,
                });
            }

            toast.success('權限已更新');
            onSave();
        } catch (error: any) {
            console.error('Failed to save permissions:', error);
            toast.error(error.response?.data?.message || '儲存失敗');
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
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Lock className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">使用者權限管理</h2>
                            <p className="text-sm text-gray-400 flex items-center gap-2">
                                <UserIcon className="w-3 h-3" />
                                {user.displayName || user.userName}
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

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('effective')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'effective'
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        有效權限（含繼承）
                    </button>
                    <button
                        onClick={() => setActiveTab('direct')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'direct'
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        編輯個人權限
                    </button>
                </div>

                {/* Search & Client Filter */}
                <div className="px-6 py-3 border-b border-white/10">
                    <div className="flex gap-3">
                        {clientOptions.length > 1 && (
                            <select
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50 min-w-[160px]"
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
                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                            />
                        </div>
                    </div>

                    {activeTab === 'direct' && (
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
                            <span className="ml-4 flex items-center gap-1">
                                <span className="w-5 h-5 flex items-center justify-center bg-purple-500/30 rounded text-purple-300 font-medium">
                                    X
                                </span>
                                <span>= 僅繼承（不可編輯）</span>
                            </span>
                            <span className="ml-2 flex items-center gap-1">
                                <span className="w-5 h-5 flex items-center justify-center bg-blue-500 rounded text-white font-medium ring-2 ring-purple-400/50">
                                    X
                                </span>
                                <span>= 直接 + 繼承（可編輯）</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        </div>
                    ) : activeTab === 'effective' ? (
                        /* 有效權限列表 */
                        filteredEffectivePermissions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
                                <p>{searchTerm ? '沒有找到符合的權限' : '此使用者沒有任何權限'}</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-2">
                                {filteredEffectivePermissions.map((p, idx) => (
                                    <EffectivePermissionItem key={`${p.resourceId}-${idx}`} permission={p} />
                                ))}
                            </div>
                        )
                    ) : /* 編輯個人權限 */
                    filteredResources.length === 0 ? (
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
                                    inheritedScopes={inheritedScopes}
                                    onToggleScope={handleToggleScope}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* 變更摘要 */}
                {hasChanges && activeTab === 'direct' && (
                    <div className="px-6 py-3 bg-blue-500/10 border-t border-blue-500/30">
                        <p className="text-sm text-blue-300">有未儲存的變更</p>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        {activeTab === 'effective' ? '關閉' : '取消'}
                    </button>
                    {activeTab === 'direct' && (
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {saving ? '儲存中...' : '儲存變更'}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
