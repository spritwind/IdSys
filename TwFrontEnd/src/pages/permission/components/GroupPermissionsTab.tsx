/**
 * Group/Organization Permissions Tab Component
 * UC Capital Identity Admin
 *
 * 組織權限管理標籤頁 (使用新架構 v2 API)
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    Trash2,
    Building2,
    Check,
    X,
    Shield,
    RefreshCw,
    Info,
    ChevronRight,
    ChevronDown,
    Box,
    Filter,
    Database,
    FileText,
    Globe,
    Zap,
    Menu,
    Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import * as permissionV2Api from '@/services/permissionV2Api';
import { organizationApi } from '@/services/organizationApi';
import type {
    PermissionResourceDto,
    PermissionScopeDto,
    PermissionDto,
} from '@/types/permissionV2';
import { SUBJECT_TYPES, SCOPE_NAMES } from '@/types/permissionV2';
import type { OrganizationTreeNode } from '@/types/organization';
import clsx from 'clsx';

// 資源類型配置
interface ResourceTypeConfig {
    key: string;
    label: string;
    icon: React.ElementType;
    matcher: (code: string) => boolean;
    priority: number;
}

const RESOURCE_TYPE_CONFIGS: ResourceTypeConfig[] = [
    {
        key: 'module_search',
        label: '搜尋模組',
        icon: Filter,
        matcher: (code) => code.toLowerCase().startsWith('module_search'),
        priority: 1,
    },
    {
        key: 'module',
        label: '功能模組',
        icon: Box,
        matcher: (code) => code.toLowerCase().startsWith('module_') && !code.toLowerCase().startsWith('module_search'),
        priority: 2,
    },
    {
        key: 'data',
        label: '資料流',
        icon: Database,
        matcher: (code) => code.toLowerCase().startsWith('data_'),
        priority: 3,
    },
    {
        key: 'report',
        label: '報表',
        icon: FileText,
        matcher: (code) => code.toLowerCase().startsWith('report_'),
        priority: 4,
    },
    {
        key: 'api',
        label: 'API',
        icon: Globe,
        matcher: (code) => code.toLowerCase().startsWith('api_'),
        priority: 5,
    },
    {
        key: 'page',
        label: '頁面',
        icon: FileText,
        matcher: (code) => code.toLowerCase().startsWith('page_'),
        priority: 6,
    },
    {
        key: 'menu',
        label: '選單',
        icon: Menu,
        matcher: (code) => code.toLowerCase().startsWith('menu_'),
        priority: 7,
    },
    {
        key: 'feature',
        label: '功能',
        icon: Zap,
        matcher: (code) => code.toLowerCase().startsWith('feature_'),
        priority: 8,
    },
    {
        key: 'other',
        label: '其他',
        icon: Settings,
        matcher: () => true,
        priority: 99,
    },
];

function getResourceType(code: string): ResourceTypeConfig {
    for (const config of RESOURCE_TYPE_CONFIGS) {
        if (config.key !== 'other' && config.matcher(code)) {
            return config;
        }
    }
    return RESOURCE_TYPE_CONFIGS[RESOURCE_TYPE_CONFIGS.length - 1];
}

interface GroupPermissionsTabProps {
    onUpdate?: () => void;
}

export function GroupPermissionsTab({ onUpdate }: GroupPermissionsTabProps) {
    const [resources, setResources] = useState<PermissionResourceDto[]>([]);
    const [scopes, setScopes] = useState<PermissionScopeDto[]>([]);
    const [organizations, setOrganizations] = useState<OrganizationTreeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<OrganizationTreeNode | null>(null);
    const [orgPermissions, setOrgPermissions] = useState<PermissionDto[]>([]);
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [resourcesData, scopesData, orgsData] = await Promise.all([
                permissionV2Api.getResources(),
                permissionV2Api.getScopes(),
                organizationApi.getOrganizationTree(),
            ]);
            setResources(resourcesData);
            setScopes(scopesData);
            setOrganizations(orgsData);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            toast.error('載入資料失敗');
        } finally {
            setLoading(false);
        }
    };

    const loadOrgPermissions = async (org: OrganizationTreeNode) => {
        setSelectedOrg(org);
        setLoadingPermissions(true);
        try {
            const permissions = await permissionV2Api.getOrganizationPermissions(org.id);
            setOrgPermissions(permissions);
        } catch (error) {
            console.error('Failed to load organization permissions:', error);
            toast.error('載入組織權限失敗');
        } finally {
            setLoadingPermissions(false);
        }
    };

    const handleRevokePermission = async (permissionId: string) => {
        try {
            await permissionV2Api.revokePermission(permissionId);
            toast.success('權限已撤銷');
            if (selectedOrg) {
                loadOrgPermissions(selectedOrg);
            }
            onUpdate?.();
        } catch (error) {
            console.error('Failed to revoke permission:', error);
            toast.error('撤銷權限失敗');
        }
    };

    const handleGrantPermissions = async (
        orgId: string,
        orgName: string,
        resourceScopes: { resourceId: string; scopes: string[] }[],
        inheritToChildren: boolean
    ) => {
        try {
            await permissionV2Api.batchGrantPermissions({
                subjectType: SUBJECT_TYPES.ORGANIZATION,
                subjectId: orgId,
                subjectName: orgName,
                resourceScopes,
                inheritToChildren,
            });
            toast.success('權限已授予');
            if (selectedOrg) {
                loadOrgPermissions(selectedOrg);
            }
            onUpdate?.();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to grant permissions:', error);
            toast.error('授予權限失敗');
        }
    };

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-sm text-blue-300">
                        在這裡可以授予組織對特定資源的存取權限。
                        組織的權限可以選擇是否讓子組織繼承，組織成員會自動獲得組織的權限。
                    </p>
                </div>
            </div>

            {/* Layout: Organization Tree + Permissions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Organization Tree */}
                <div className="lg:col-span-1">
                    <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)]">
                            <h3 className="text-sm font-medium text-white">組織架構</h3>
                        </div>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <RefreshCw className="w-6 h-6 text-[var(--color-accent-primary)] animate-spin" />
                            </div>
                        ) : organizations.length === 0 ? (
                            <div className="text-center py-8 text-[var(--color-text-secondary)]">
                                尚無組織資料
                            </div>
                        ) : (
                            <div className="p-2 max-h-[500px] overflow-y-auto">
                                {organizations.map((org) => (
                                    <OrganizationTreeItem
                                        key={org.id}
                                        org={org}
                                        selectedId={selectedOrg?.id}
                                        onSelect={loadOrgPermissions}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Permissions Panel */}
                <div className="lg:col-span-2">
                    {selectedOrg ? (
                        <div className="space-y-4">
                            {/* Selected Org Info */}
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
                            >
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <Building2 size={20} className="text-emerald-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-medium">{selectedOrg.name}</p>
                                    <p className="text-sm text-[var(--color-text-secondary)]">
                                        {selectedOrg.deptCode} · 共 {orgPermissions.length} 項權限
                                    </p>
                                </div>
                                <button
                                    onClick={() => loadOrgPermissions(selectedOrg)}
                                    disabled={loadingPermissions}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <RefreshCw size={18} className={clsx('text-[var(--color-text-secondary)]', loadingPermissions && 'animate-spin')} />
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowModal(true)}
                                    className="btn-primary text-sm"
                                >
                                    <Plus size={16} />
                                    授予權限
                                </motion.button>
                            </motion.div>

                            {/* Permissions List */}
                            <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
                                {loadingPermissions ? (
                                    <div className="flex items-center justify-center py-12">
                                        <RefreshCw className="w-8 h-8 text-[var(--color-accent-primary)] animate-spin" />
                                    </div>
                                ) : orgPermissions.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Shield className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-secondary)] opacity-50" />
                                        <p className="text-[var(--color-text-secondary)]">此組織尚未有任何權限</p>
                                        <button
                                            onClick={() => setShowModal(true)}
                                            className="mt-4 text-emerald-400 hover:text-emerald-300 transition-colors"
                                        >
                                            點此授予權限
                                        </button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[rgba(255,255,255,0.05)]">
                                        {orgPermissions.map((permission) => (
                                            <PermissionItem
                                                key={permission.id}
                                                permission={permission}
                                                scopes={scopes}
                                                onRevoke={() => handleRevokePermission(permission.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-xl">
                            <Building2 className="w-20 h-20 mx-auto mb-4 text-[var(--color-text-secondary)] opacity-30" />
                            <p className="text-xl text-[var(--color-text-secondary)]">請從左側選擇組織</p>
                            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                                選擇組織後可查看及管理其權限
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Grant Permission Modal */}
            <AnimatePresence>
                {showModal && selectedOrg && (
                    <GrantOrgPermissionModal
                        orgId={selectedOrg.id}
                        orgName={selectedOrg.name}
                        resources={resources}
                        scopes={scopes}
                        existingPermissions={orgPermissions}
                        onGrant={handleGrantPermissions}
                        onClose={() => setShowModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Organization Tree Item Component
function OrganizationTreeItem({
    org,
    selectedId,
    onSelect,
    depth = 0,
}: {
    org: OrganizationTreeNode;
    selectedId?: string;
    onSelect: (org: OrganizationTreeNode) => void;
    depth?: number;
}) {
    const [expanded, setExpanded] = useState(depth < 1);
    const hasChildren = org.children && org.children.length > 0;
    const isSelected = org.id === selectedId;

    return (
        <div>
            <div
                className={clsx(
                    'flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-colors',
                    isSelected
                        ? 'bg-emerald-500/20 text-white'
                        : 'hover:bg-white/5 text-[var(--color-text-secondary)]'
                )}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => onSelect(org)}
            >
                {hasChildren ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}
                        className="p-0.5 hover:bg-white/10 rounded"
                    >
                        {expanded ? (
                            <ChevronDown size={14} />
                        ) : (
                            <ChevronRight size={14} />
                        )}
                    </button>
                ) : (
                    <div className="w-4" />
                )}
                <Building2 size={14} className={isSelected ? 'text-emerald-400' : ''} />
                <span className="text-sm truncate flex-1">{org.name}</span>
            </div>

            {hasChildren && expanded && (
                <div>
                    {org.children!.map((child: OrganizationTreeNode) => (
                        <OrganizationTreeItem
                            key={child.id}
                            org={child}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Permission Item Component
function PermissionItem({
    permission,
    scopes,
    onRevoke,
}: {
    permission: PermissionDto;
    scopes: PermissionScopeDto[];
    onRevoke: () => void;
}) {
    const [showConfirm, setShowConfirm] = useState(false);

    const permissionScopes = useMemo(() => {
        if (permission.scopeList && permission.scopeList.length > 0) {
            return permission.scopeList;
        }
        if (permission.scopes.startsWith('@')) {
            return permission.scopes.split('@').filter(Boolean);
        }
        if (permission.scopes.startsWith('[')) {
            try {
                return JSON.parse(permission.scopes);
            } catch {
                return [];
            }
        }
        return permission.scopes.split(',').filter(Boolean);
    }, [permission.scopes, permission.scopeList]);

    return (
        <div className="flex items-center gap-4 p-4 hover:bg-[rgba(255,255,255,0.03)] transition-colors group">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Shield size={18} className="text-cyan-400" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">
                        {permission.resourceName || permission.resourceCode || permission.resourceId}
                    </p>
                    {permission.inheritToChildren && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-400">
                            繼承
                        </span>
                    )}
                </div>
                {permission.clientId && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                        客戶端: {permission.clientId}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap max-w-[200px]">
                {permissionScopes.map((scope: string) => {
                    const scopeInfo = scopes.find((s) => s.code === scope);
                    return (
                        <span
                            key={scope}
                            title={scopeInfo?.name || SCOPE_NAMES[scope]}
                            className="px-2 py-0.5 text-xs font-medium rounded bg-amber-500/20 text-amber-400 uppercase"
                        >
                            {scope}
                        </span>
                    );
                })}
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {showConfirm ? (
                    <>
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="p-2 text-[var(--color-text-secondary)] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={16} />
                        </button>
                        <button
                            onClick={onRevoke}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                            <Check size={16} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="p-2 text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="撤銷權限"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}

// Grant Organization Permission Modal
function GrantOrgPermissionModal({
    orgId,
    orgName,
    resources,
    scopes,
    existingPermissions,
    onGrant,
    onClose,
}: {
    orgId: string;
    orgName: string;
    resources: PermissionResourceDto[];
    scopes: PermissionScopeDto[];
    existingPermissions: PermissionDto[];
    onGrant: (orgId: string, orgName: string, resourceScopes: { resourceId: string; scopes: string[] }[], inheritToChildren: boolean) => Promise<void>;
    onClose: () => void;
}) {
    const [selectedScopes, setSelectedScopes] = useState<Record<string, string[]>>({});
    const [inheritToChildren, setInheritToChildren] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());

    // 計算客戶端列表
    const clients = useMemo(() => {
        const clientMap = new Map<string, { id: string; name: string; resourceCount: number }>();
        const countResources = (items: PermissionResourceDto[]): number => {
            return items.reduce((acc, item) => {
                return acc + 1 + (item.children ? countResources(item.children) : 0);
            }, 0);
        };

        resources.forEach(r => {
            if (r.clientId && !clientMap.has(r.clientId)) {
                clientMap.set(r.clientId, {
                    id: r.clientId,
                    name: r.clientName || r.clientId,
                    resourceCount: 0,
                });
            }
        });

        clientMap.forEach((info, clientId) => {
            const clientResources = resources.filter(r => r.clientId === clientId);
            info.resourceCount = countResources(clientResources);
        });

        return Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [resources]);

    // 當 clients 載入後自動選擇第一個
    useEffect(() => {
        if (clients.length > 0 && !selectedClient) {
            setSelectedClient(clients[0].id);
        }
    }, [clients, selectedClient]);

    // 過濾當前客戶端的資源
    const clientResources = useMemo(() => {
        return resources.filter(r => r.clientId === selectedClient);
    }, [resources, selectedClient]);

    // 按資源類型分組
    const resourcesByType = useMemo(() => {
        const groups: Record<string, PermissionResourceDto[]> = {};
        const flattenAndGroup = (items: PermissionResourceDto[]) => {
            items.forEach(item => {
                const typeConfig = getResourceType(item.code);
                if (!groups[typeConfig.key]) {
                    groups[typeConfig.key] = [];
                }
                groups[typeConfig.key].push(item);
                if (item.children) {
                    flattenAndGroup(item.children);
                }
            });
        };
        flattenAndGroup(clientResources);
        return groups;
    }, [clientResources]);

    // 取得可用的資源類型標籤
    const availableTypes = useMemo(() => {
        return RESOURCE_TYPE_CONFIGS.filter(config =>
            resourcesByType[config.key] && resourcesByType[config.key].length > 0
        ).sort((a, b) => a.priority - b.priority);
    }, [resourcesByType]);

    // 當可用類型變化時，選擇第一個
    useEffect(() => {
        if (availableTypes.length > 0 && (!selectedType || !availableTypes.find(t => t.key === selectedType))) {
            setSelectedType(availableTypes[0].key);
        }
    }, [availableTypes, selectedType]);

    // 當前類型的資源
    const currentTypeResources = useMemo(() => {
        if (!selectedType) return [];
        return resourcesByType[selectedType] || [];
    }, [resourcesByType, selectedType]);

    // 搜尋過濾
    const filteredResources = useMemo(() => {
        if (!searchTerm) return currentTypeResources;
        const term = searchTerm.toLowerCase();
        return currentTypeResources.filter(r =>
            r.name.toLowerCase().includes(term) ||
            r.code.toLowerCase().includes(term)
        );
    }, [currentTypeResources, searchTerm]);

    const getExistingScopes = (resourceId: string): string[] => {
        const permission = existingPermissions.find((p) => p.resourceId === resourceId);
        if (!permission) return [];

        if (permission.scopeList && permission.scopeList.length > 0) {
            return permission.scopeList;
        }
        if (permission.scopes.startsWith('@')) {
            return permission.scopes.split('@').filter(Boolean);
        }
        return [];
    };

    const toggleScope = (resourceId: string, scope: string) => {
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

    const toggleExpand = (resourceId: string) => {
        setExpandedResources(prev => {
            const next = new Set(prev);
            if (next.has(resourceId)) {
                next.delete(resourceId);
            } else {
                next.add(resourceId);
            }
            return next;
        });
    };

    const handleSubmit = async () => {
        const resourceScopes = Object.entries(selectedScopes).map(([resourceId, scopeList]) => ({
            resourceId,
            scopes: scopeList,
        }));

        if (resourceScopes.length === 0) {
            toast.warning('請至少選擇一項權限');
            return;
        }

        setSaving(true);
        try {
            await onGrant(orgId, orgName, resourceScopes, inheritToChildren);
        } finally {
            setSaving(false);
        }
    };

    const selectedCount = Object.values(selectedScopes).reduce((acc, s) => acc + s.length, 0);

    // 渲染資源項目
    const renderResourceItem = (resource: PermissionResourceDto, depth: number = 0) => {
        const currentScopes = selectedScopes[resource.id] || [];
        const existingResourceScopes = getExistingScopes(resource.id);
        const hasChildren = resource.children && resource.children.length > 0;
        const isExpanded = expandedResources.has(resource.id);

        return (
            <div key={resource.id}>
                <div
                    className="flex items-center gap-2 py-2 px-3 hover:bg-white/5 rounded-lg transition-colors group"
                    style={{ paddingLeft: `${depth * 16 + 12}px` }}
                >
                    {/* Expand/Collapse Button */}
                    {hasChildren ? (
                        <button
                            onClick={() => toggleExpand(resource.id)}
                            className="p-0.5 hover:bg-white/10 rounded"
                        >
                            {isExpanded ? (
                                <ChevronDown size={14} className="text-gray-400" />
                            ) : (
                                <ChevronRight size={14} className="text-gray-400" />
                            )}
                        </button>
                    ) : (
                        <div className="w-4" />
                    )}

                    <div className="flex-1 min-w-0">
                        <span className="text-white text-sm">{resource.name}</span>
                        <span className="ml-2 text-xs text-gray-500 font-mono">{resource.code}</span>
                    </div>

                    <div className="flex items-center gap-1">
                        {scopes.map((scope) => {
                            const isSelected = currentScopes.includes(scope.code);
                            const isExisting = existingResourceScopes.includes(scope.code);

                            return (
                                <button
                                    key={scope.code}
                                    onClick={() => toggleScope(resource.id, scope.code)}
                                    disabled={isExisting}
                                    title={isExisting ? '已有此權限' : scope.name || SCOPE_NAMES[scope.code]}
                                    className={clsx(
                                        'w-6 h-6 flex items-center justify-center rounded text-[10px] font-medium uppercase transition-colors',
                                        isExisting
                                            ? 'bg-green-500/30 text-green-300 cursor-not-allowed'
                                            : isSelected
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    )}
                                >
                                    {scope.code}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div>
                        {resource.children!.map(child => renderResourceItem(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-5xl bg-[#1a1a2e] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <Building2 size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">授予組織權限</h3>
                            <p className="text-sm text-[var(--color-text-secondary)]">{orgName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-[var(--color-text-secondary)]" />
                    </button>
                </div>

                {/* System Selector + Search */}
                <div className="px-6 py-3 border-b border-[rgba(255,255,255,0.05)] space-y-3">
                    <div className="flex items-center gap-4">
                        {/* System Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                className="appearance-none h-10 pl-4 pr-10 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50 cursor-pointer min-w-[200px]"
                            >
                                {clients.map(client => (
                                    <option key={client.id} value={client.id} className="bg-[#1a1a2e]">
                                        {client.name} ({client.resourceCount})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="搜尋資源..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500/50"
                            />
                        </div>

                        {/* Inherit Option */}
                        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={inheritToChildren}
                                onChange={(e) => setInheritToChildren(e.target.checked)}
                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                            />
                            <span className="text-sm text-[var(--color-text-secondary)]">
                                子組織繼承
                            </span>
                        </label>
                    </div>

                    {/* Resource Type Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                        {availableTypes.map(typeConfig => {
                            const Icon = typeConfig.icon;
                            const count = resourcesByType[typeConfig.key]?.length || 0;
                            const isActive = selectedType === typeConfig.key;

                            return (
                                <button
                                    key={typeConfig.key}
                                    onClick={() => setSelectedType(typeConfig.key)}
                                    className={clsx(
                                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors',
                                        isActive
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    )}
                                >
                                    <Icon size={14} />
                                    <span>{typeConfig.label}</span>
                                    <span className={clsx(
                                        'px-1.5 py-0.5 rounded text-xs',
                                        isActive ? 'bg-emerald-500/30' : 'bg-white/10'
                                    )}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Scope Legend */}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>權限範圍:</span>
                        {scopes.map((scope) => (
                            <span key={scope.code} className="flex items-center gap-1">
                                <span className="w-5 h-5 flex items-center justify-center bg-white/10 rounded text-gray-300 font-medium uppercase">
                                    {scope.code}
                                </span>
                                <span>{scope.name || SCOPE_NAMES[scope.code]}</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Resources List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredResources.length === 0 ? (
                        <div className="text-center py-8 text-[var(--color-text-secondary)]">
                            沒有找到符合的資源
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {filteredResources.map((resource) => renderResourceItem(resource))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.1)] flex items-center justify-between">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        已選擇 <span className="text-white font-medium">{selectedCount}</span> 項權限
                        {inheritToChildren && <span className="text-emerald-400 ml-2">(將繼承給子組織)</span>}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-white transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving || selectedCount === 0}
                            className="btn-primary disabled:opacity-50"
                        >
                            {saving ? '授權中...' : '確認授權'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
