/**
 * Role Permissions Modal
 * 角色權限管理 Modal
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    Shield,
    Save,
    ChevronDown,
    ChevronRight,
    Check,
    Search,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import * as permissionV2Api from '../../../services/permissionV2Api';
import type { RoleDto } from '../../../types/user';
import type {
    PermissionResourceDto,
    PermissionDto,
    PermissionScopeDto,
} from '../../../types/permissionV2';
import { SUBJECT_TYPES } from '../../../types/permissionV2';

interface Props {
    role: RoleDto;
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
                className={`flex items-center gap-2 py-2 hover:bg-white/5 transition-colors ${
                    depth > 0 ? 'pl-' + (depth * 4 + 2) : 'pl-2'
                }`}
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
                        return (
                            <button
                                key={scope.code}
                                onClick={() => onToggleScope(resource.id, scope.code)}
                                title={scope.name}
                                className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${
                                    isSelected
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
                            onToggleScope={onToggleScope}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function RolePermissionsModal({ role, onClose, onSave }: Props) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resources, setResources] = useState<PermissionResourceDto[]>([]);
    const [scopes, setScopes] = useState<PermissionScopeDto[]>([]);
    const [currentPermissions, setCurrentPermissions] = useState<PermissionDto[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // 選中的權限 (resourceId -> scopes[])
    const [selectedScopes, setSelectedScopes] = useState<Record<string, string[]>>({});
    const [originalScopes, setOriginalScopes] = useState<Record<string, string[]>>({});

    // 載入資料
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // 並行載入資源、範圍、當前權限
                const [resourcesData, scopesData, permissionsData] = await Promise.all([
                    permissionV2Api.getResources(),
                    permissionV2Api.getScopes(),
                    permissionV2Api.getUserPermissions(role.id), // Role permissions are stored with SubjectType=Role
                ]);

                setResources(resourcesData);
                setScopes(scopesData);
                setCurrentPermissions(permissionsData);

                // 解析當前權限為選中狀態
                const scopeMap: Record<string, string[]> = {};
                permissionsData.forEach((p) => {
                    // 解析 scopes 字串 (格式: @r@c@u@d 或 JSON array)
                    let scopeList: string[] = [];
                    if (p.scopes.startsWith('@')) {
                        // @r@c@u@d 格式
                        scopeList = p.scopes.split('@').filter(Boolean);
                    } else if (p.scopes.startsWith('[')) {
                        // JSON array 格式
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
    }, [role.id]);

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
        if (!searchTerm) return resources;

        const search = searchTerm.toLowerCase();
        const filterRecursive = (items: PermissionResourceDto[]): PermissionResourceDto[] => {
            return items
                .map((item) => ({
                    ...item,
                    children: item.children ? filterRecursive(item.children) : [],
                }))
                .filter(
                    (item) =>
                        item.name.toLowerCase().includes(search) ||
                        item.code.toLowerCase().includes(search) ||
                        (item.children && item.children.length > 0)
                );
        };
        return filterRecursive(resources);
    }, [resources, searchTerm]);

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
            // 找出需要新增和刪除的權限
            const toRevoke: string[] = [];
            const toGrant: { resourceId: string; scopes: string[] }[] = [];

            // 比較差異
            const allResourceIds = new Set([
                ...Object.keys(selectedScopes),
                ...Object.keys(originalScopes),
            ]);

            for (const resourceId of allResourceIds) {
                const current = selectedScopes[resourceId] || [];
                const original = originalScopes[resourceId] || [];

                if (current.length === 0 && original.length > 0) {
                    // 需要撤銷
                    const permission = currentPermissions.find((p) => p.resourceId === resourceId);
                    if (permission) {
                        toRevoke.push(permission.id);
                    }
                } else if (current.length > 0) {
                    // 需要新增或更新
                    const currentSorted = [...current].sort().join(',');
                    const originalSorted = [...original].sort().join(',');
                    if (currentSorted !== originalSorted) {
                        toGrant.push({ resourceId, scopes: current });
                    }
                }
            }

            // 執行撤銷
            if (toRevoke.length > 0) {
                await permissionV2Api.batchRevokePermissions(toRevoke);
            }

            // 執行授予
            if (toGrant.length > 0) {
                await permissionV2Api.batchGrantPermissions({
                    subjectType: SUBJECT_TYPES.ROLE,
                    subjectId: role.id,
                    subjectName: role.name,
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
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">管理角色權限</h2>
                            <p className="text-sm text-gray-400">{role.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-3 border-b border-white/10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜尋資源..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50"
                        />
                    </div>

                    {/* 權限範圍說明 */}
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
                            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
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

                {/* 變更摘要 */}
                {hasChanges && (
                    <div className="px-6 py-3 bg-purple-500/10 border-t border-purple-500/30">
                        <p className="text-sm text-purple-300">
                            <Check className="w-4 h-4 inline mr-1" />
                            有未儲存的變更
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
                        disabled={saving || !hasChanges}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? '儲存中...' : '儲存變更'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
