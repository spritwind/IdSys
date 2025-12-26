/**
 * Resources Tab Component
 * UC Capital Identity Admin
 *
 * 受保護資源顯示標籤頁 (使用新架構 v2 API)
 * 階層結構：系統選擇 => 資源類型標籤 => 資源樹
 *
 * 資源類型依據 code 前綴分類：
 * - module_search_* => 搜尋模組
 * - module_* => 功能模組
 * - data_* => 資料流
 * - report_* => 報表
 * - api_* => API
 * - page_* => 頁面
 * - menu_* => 選單
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Layers,
    RefreshCw,
    Info,
    ChevronRight,
    ChevronDown,
    Folder,
    File,
    Server,
    Layout,
    Globe,
    Zap,
    Menu,
    FileText,
    Box,
    Settings,
    Database,
    Filter,
} from 'lucide-react';
import * as permissionV2Api from '@/services/permissionV2Api';
import type { PermissionResourceDto } from '@/types/permissionV2';
import clsx from 'clsx';

interface ResourcesTabProps {
    onUpdate?: () => void;
}

// 資源類型定義 - 按照實際資料格式
interface ResourceTypeConfig {
    key: string;
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
    matcher: (code: string, type?: string) => boolean;
    priority: number;
}

// 資源類型配置 - 根據 code 前綴匹配
const RESOURCE_TYPE_CONFIGS: ResourceTypeConfig[] = [
    {
        key: 'module_search',
        label: '搜尋模組',
        icon: Filter,
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/20',
        borderColor: 'border-violet-500/30',
        matcher: (code) => code.toLowerCase().startsWith('module_search'),
        priority: 1,
    },
    {
        key: 'module',
        label: '功能模組',
        icon: Box,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        matcher: (code) => code.toLowerCase().startsWith('module_') && !code.toLowerCase().startsWith('module_search'),
        priority: 2,
    },
    {
        key: 'data',
        label: '資料流',
        icon: Database,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/30',
        matcher: (code) => code.toLowerCase().startsWith('data_'),
        priority: 3,
    },
    {
        key: 'report',
        label: '報表',
        icon: FileText,
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/20',
        borderColor: 'border-cyan-500/30',
        matcher: (code, type) => code.toLowerCase().startsWith('report_') || type?.toLowerCase() === 'report',
        priority: 4,
    },
    {
        key: 'api',
        label: 'API',
        icon: Globe,
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
        matcher: (code, type) => code.toLowerCase().startsWith('api_') || type?.toLowerCase() === 'api',
        priority: 5,
    },
    {
        key: 'page',
        label: '頁面',
        icon: Layout,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-500/30',
        matcher: (code, type) => code.toLowerCase().startsWith('page_') || type?.toLowerCase() === 'page',
        priority: 6,
    },
    {
        key: 'menu',
        label: '選單',
        icon: Menu,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500/30',
        matcher: (code, type) => code.toLowerCase().startsWith('menu_') || type?.toLowerCase() === 'menu',
        priority: 7,
    },
    {
        key: 'feature',
        label: '功能',
        icon: Zap,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/30',
        matcher: (code, type) => code.toLowerCase().startsWith('feature_') || type?.toLowerCase() === 'feature',
        priority: 8,
    },
    {
        key: 'other',
        label: '其他',
        icon: Settings,
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30',
        matcher: () => true, // 兜底
        priority: 99,
    },
];

// 根據 code 和 resourceType 獲取資源類型配置
function getResourceTypeConfig(code: string, resourceType?: string): ResourceTypeConfig {
    for (const config of RESOURCE_TYPE_CONFIGS) {
        if (config.key !== 'other' && config.matcher(code, resourceType)) {
            return config;
        }
    }
    return RESOURCE_TYPE_CONFIGS[RESOURCE_TYPE_CONFIGS.length - 1]; // other
}

// 系統/客戶端資訊
interface ClientInfo {
    id: string;
    name: string;
    resourceCount: number;
}

// 資源樹狀項目組件
function ResourceTreeItem({
    resource,
    depth = 0,
    searchTerm = '',
}: {
    resource: PermissionResourceDto;
    depth?: number;
    searchTerm?: string;
}) {
    const [expanded, setExpanded] = useState(searchTerm.length > 0 || depth < 2);
    const hasChildren = resource.children && resource.children.length > 0;
    const typeConfig = getResourceTypeConfig(resource.code, resource.resourceType);

    const matchesSearch = searchTerm
        ? resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          resource.code.toLowerCase().includes(searchTerm.toLowerCase())
        : false;

    return (
        <div>
            <div
                className={clsx(
                    'flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer group',
                    matchesSearch && 'bg-amber-500/10 ring-1 ring-amber-500/30'
                )}
                style={{ paddingLeft: `${depth * 20 + 12}px` }}
                onClick={() => hasChildren && setExpanded(!expanded)}
            >
                {/* 展開/收合按鈕 */}
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {hasChildren ? (
                        <button className="p-0.5 hover:bg-[rgba(255,255,255,0.1)] rounded transition-colors">
                            {expanded ? (
                                <ChevronDown size={14} className="text-[var(--color-text-secondary)]" />
                            ) : (
                                <ChevronRight size={14} className="text-[var(--color-text-secondary)]" />
                            )}
                        </button>
                    ) : (
                        <File size={12} className="text-[var(--color-text-secondary)] opacity-50" />
                    )}
                </div>

                {/* 圖示 */}
                <div className={clsx('p-1.5 rounded-lg flex-shrink-0', typeConfig.bgColor)}>
                    {hasChildren ? (
                        <Folder size={14} className={typeConfig.color} />
                    ) : (
                        <Layers size={14} className={typeConfig.color} />
                    )}
                </div>

                {/* 資源資訊 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">{resource.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-[var(--color-text-secondary)] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">
                            {resource.code}
                        </span>
                        {resource.description && (
                            <span className="text-[10px] text-[var(--color-text-secondary)] truncate hidden group-hover:inline">
                                {resource.description}
                            </span>
                        )}
                    </div>
                </div>

                {/* 子項目數量 */}
                {hasChildren && (
                    <span className="text-[10px] text-[var(--color-text-secondary)] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">
                        {resource.children!.length}
                    </span>
                )}

                {/* 狀態 */}
                <span className={clsx(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    resource.isEnabled ? 'bg-green-400' : 'bg-red-400'
                )} title={resource.isEnabled ? '啟用' : '停用'} />
            </div>

            {/* 子資源 */}
            <AnimatePresence>
                {hasChildren && expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        <div className="border-l-2 border-[rgba(255,255,255,0.05)] ml-6">
                            {resource.children!.map((child) => (
                                <ResourceTreeItem
                                    key={child.id}
                                    resource={child}
                                    depth={depth + 1}
                                    searchTerm={searchTerm}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function ResourcesTab({ onUpdate: _onUpdate }: ResourcesTabProps) {
    const [resources, setResources] = useState<PermissionResourceDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('all');

    useEffect(() => {
        loadResources();
    }, []);

    const loadResources = async () => {
        try {
            setLoading(true);
            const data = await permissionV2Api.getResources();
            setResources(data);

            // 自動選擇第一個客戶端
            const clientIds = [...new Set(data.map(r => r.clientId).filter(Boolean))] as string[];
            if (clientIds.length > 0 && !selectedClient) {
                setSelectedClient(clientIds[0]);
            }
        } catch (error) {
            console.error('Failed to load resources:', error);
        } finally {
            setLoading(false);
        }
    };

    // 提取客戶端資訊（使用名稱）
    const clients = useMemo((): ClientInfo[] => {
        const clientMap = new Map<string, ClientInfo>();

        const countResources = (items: PermissionResourceDto[]): number => {
            return items.reduce((acc, item) => {
                return acc + 1 + (item.children ? countResources(item.children) : 0);
            }, 0);
        };

        resources.forEach(r => {
            if (r.clientId) {
                if (!clientMap.has(r.clientId)) {
                    clientMap.set(r.clientId, {
                        id: r.clientId,
                        name: r.clientName || r.clientId, // 優先使用名稱
                        resourceCount: 0,
                    });
                }
            }
        });

        // 計算每個客戶端的資源數量
        clientMap.forEach((info, clientId) => {
            const clientResources = resources.filter(r => r.clientId === clientId);
            info.resourceCount = countResources(clientResources);
        });

        return Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [resources]);

    // 過濾當前客戶端的資源
    const clientResources = useMemo(() => {
        return resources.filter(r => r.clientId === selectedClient);
    }, [resources, selectedClient]);

    // 按資源類型分組
    const resourcesByType = useMemo(() => {
        const groups: Record<string, PermissionResourceDto[]> = {};

        clientResources.forEach(resource => {
            // 只處理頂層資源
            if (!resource.parentId || !resources.find(r => r.id === resource.parentId)) {
                const typeConfig = getResourceTypeConfig(resource.code, resource.resourceType);
                const key = typeConfig.key;
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(resource);
            }
        });

        return groups;
    }, [clientResources, resources]);

    // 可用的資源類型標籤
    const availableTypes = useMemo(() => {
        const types = Object.keys(resourcesByType);
        return RESOURCE_TYPE_CONFIGS
            .filter(config => types.includes(config.key))
            .sort((a, b) => a.priority - b.priority);
    }, [resourcesByType]);

    // 當前顯示的資源
    const displayResources = useMemo(() => {
        let result: PermissionResourceDto[];

        if (selectedType === 'all') {
            result = clientResources.filter(r => !r.parentId || !resources.find(res => res.id === r.parentId));
        } else {
            result = resourcesByType[selectedType] || [];
        }

        // 搜尋過濾
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const filterRecursive = (items: PermissionResourceDto[]): PermissionResourceDto[] => {
                return items.filter(item => {
                    const matches = item.name.toLowerCase().includes(search) ||
                        item.code.toLowerCase().includes(search) ||
                        item.description?.toLowerCase().includes(search);
                    const hasMatchingChildren = item.children && filterRecursive(item.children).length > 0;
                    return matches || hasMatchingChildren;
                }).map(item => ({
                    ...item,
                    children: item.children ? filterRecursive(item.children) : undefined,
                }));
            };
            result = filterRecursive(result);
        }

        return result;
    }, [selectedType, clientResources, resourcesByType, resources, searchTerm]);

    // 計算總數
    const totalCount = useMemo(() => {
        const count = (items: PermissionResourceDto[]): number => {
            return items.reduce((acc, item) => {
                return acc + 1 + (item.children ? count(item.children) : 0);
            }, 0);
        };
        return count(displayResources);
    }, [displayResources]);

    return (
        <div className="space-y-4">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-300">
                    選擇系統後，使用類型標籤快速篩選資源。點擊資源可展開查看子項目。
                </p>
            </div>

            {/* 頂部控制列 */}
            <div className="flex flex-wrap items-center gap-3">
                {/* 系統選擇器 */}
                <div className="flex items-center gap-2">
                    <Server size={16} className="text-cyan-400" />
                    <span className="text-sm text-[var(--color-text-secondary)]">系統：</span>
                    <select
                        value={selectedClient}
                        onChange={(e) => {
                            setSelectedClient(e.target.value);
                            setSelectedType('all');
                        }}
                        disabled={loading}
                        className="h-9 px-3 pr-8 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-accent-primary)] cursor-pointer appearance-none"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                        }}
                    >
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>
                                {client.name} ({client.resourceCount})
                            </option>
                        ))}
                    </select>
                </div>

                {/* 分隔線 */}
                <div className="w-px h-6 bg-[rgba(255,255,255,0.1)]" />

                {/* 搜尋框 */}
                <div className="relative flex-1 max-w-sm group">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] group-focus-within:text-[var(--color-accent-primary)] transition-colors" />
                    <input
                        type="text"
                        placeholder="搜尋資源名稱或代碼..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-9 pl-9 pr-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white text-sm placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)] transition-all"
                    />
                </div>

                {/* 統計 */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg">
                    <Layers size={14} className="text-cyan-400" />
                    <span className="text-sm text-[var(--color-text-secondary)]">
                        <span className="text-white font-medium">{totalCount}</span> 個資源
                    </span>
                </div>

                {/* 重新整理 */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadResources}
                    disabled={loading}
                    className="p-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-[var(--color-text-secondary)] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all disabled:opacity-50"
                    title="重新整理"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </motion.button>
            </div>

            {/* 資源類型標籤列 */}
            {!loading && selectedClient && availableTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {/* 全部標籤 */}
                    <button
                        onClick={() => setSelectedType('all')}
                        className={clsx(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border',
                            selectedType === 'all'
                                ? 'bg-[var(--color-accent-primary)] text-white border-transparent shadow-lg shadow-indigo-500/25'
                                : 'bg-[rgba(255,255,255,0.03)] text-[var(--color-text-secondary)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white'
                        )}
                    >
                        <Layers size={16} />
                        <span>全部</span>
                        <span className={clsx(
                            'px-1.5 py-0.5 text-xs rounded-full',
                            selectedType === 'all' ? 'bg-white/20' : 'bg-[rgba(255,255,255,0.1)]'
                        )}>
                            {clientResources.filter(r => !r.parentId || !resources.find(res => res.id === r.parentId)).length}
                        </span>
                    </button>

                    {/* 類型標籤 */}
                    {availableTypes.map((config) => {
                        const Icon = config.icon;
                        const count = resourcesByType[config.key]?.length || 0;
                        const isSelected = selectedType === config.key;

                        return (
                            <button
                                key={config.key}
                                onClick={() => setSelectedType(config.key)}
                                className={clsx(
                                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border',
                                    isSelected
                                        ? `${config.bgColor} ${config.color} ${config.borderColor}`
                                        : 'bg-[rgba(255,255,255,0.03)] text-[var(--color-text-secondary)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white'
                                )}
                            >
                                <Icon size={16} className={isSelected ? config.color : ''} />
                                <span>{config.label}</span>
                                <span className={clsx(
                                    'px-1.5 py-0.5 text-xs rounded-full',
                                    isSelected ? 'bg-white/20' : 'bg-[rgba(255,255,255,0.1)]'
                                )}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 資源列表 */}
            <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw className="w-8 h-8 text-[var(--color-accent-primary)] animate-spin" />
                    </div>
                ) : !selectedClient ? (
                    <div className="text-center py-16">
                        <Server className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-secondary)] opacity-30" />
                        <p className="text-lg text-[var(--color-text-secondary)]">請選擇系統</p>
                    </div>
                ) : displayResources.length === 0 ? (
                    <div className="text-center py-16">
                        <Layers className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-secondary)] opacity-30" />
                        <p className="text-lg text-[var(--color-text-secondary)]">
                            {searchTerm ? '沒有找到符合的資源' : '此類型尚無資源'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-[rgba(255,255,255,0.03)] max-h-[600px] overflow-y-auto">
                        {displayResources.map((resource) => (
                            <ResourceTreeItem
                                key={resource.id}
                                resource={resource}
                                searchTerm={searchTerm}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* 圖例 */}
            {selectedClient && displayResources.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-400" /> 啟用
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400" /> 停用
                    </span>
                    <span className="border-l border-[rgba(255,255,255,0.1)] pl-4 text-[var(--color-text-secondary)]">
                        類型辨識：依資源代碼前綴 (module_search_, module_, data_, report_, api_, page_, menu_)
                    </span>
                </div>
            )}
        </div>
    );
}
