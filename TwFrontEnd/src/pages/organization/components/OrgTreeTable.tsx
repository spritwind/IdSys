/**
 * 組織樹狀表格元件
 * UC Capital Identity Admin
 *
 * 支援階層展開與 CRUD 操作
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    ChevronDown,
    Plus,
    Edit3,
    Trash2,
    Eye,
    Building2,
    Crown,
    Users,
    User,
    UserCheck,
    AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import type { OrganizationTreeNode } from '../../../types/organization';
import { getNodeType } from '../../../types/organization';
import { Badge } from '../../../components/ui/Badge';

interface OrgTreeTableProps {
    data: OrganizationTreeNode[];
    searchQuery: string;
    onView: (node: OrganizationTreeNode) => void;
    onEdit: (node: OrganizationTreeNode) => void;
    onCreate: (parentNode: OrganizationTreeNode | null) => void;
    onDelete: (node: OrganizationTreeNode) => void;
}

interface FlatRow {
    node: OrganizationTreeNode;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
    parentId: string | null;
}

// 取得節點圖標
function getNodeIcon(node: OrganizationTreeNode, isRoot: boolean) {
    const nodeType = getNodeType(node, isRoot);
    switch (nodeType) {
        case 'ceo':
            return <Crown size={14} className="text-amber-400" />;
        case 'root':
            return <Building2 size={14} className="text-cyan-400" />;
        case 'branch':
            return <Users size={14} className="text-indigo-400" />;
        default:
            return <User size={14} className="text-slate-400" />;
    }
}

// 取得節點樣式
function getRowStyle(node: OrganizationTreeNode, isRoot: boolean) {
    const nodeType = getNodeType(node, isRoot);
    switch (nodeType) {
        case 'ceo':
            return 'bg-gradient-to-r from-amber-500/5 to-transparent border-l-amber-500/50';
        case 'root':
            return 'bg-gradient-to-r from-cyan-500/5 to-transparent border-l-cyan-500/50';
        case 'branch':
            return 'bg-gradient-to-r from-indigo-500/5 to-transparent border-l-indigo-500/30';
        default:
            return 'border-l-white/10';
    }
}

export function OrgTreeTable({
    data,
    searchQuery,
    onView,
    onEdit,
    onCreate,
    onDelete,
}: OrgTreeTableProps) {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
        // 預設展開前兩層
        const ids = new Set<string>();
        function collectIds(nodes: OrganizationTreeNode[], depth: number) {
            nodes.forEach(node => {
                if (depth < 2) {
                    ids.add(node.id);
                    if (node.children) {
                        collectIds(node.children, depth + 1);
                    }
                }
            });
        }
        collectIds(data, 0);
        return ids;
    });

    const [deleteConfirm, setDeleteConfirm] = useState<OrganizationTreeNode | null>(null);

    // 切換展開狀態
    const toggleExpand = useCallback((nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    // 扁平化樹狀資料
    const flattenedRows = useMemo(() => {
        const rows: FlatRow[] = [];
        const lowerQuery = searchQuery.toLowerCase();

        function traverse(nodes: OrganizationTreeNode[], depth: number, parentId: string | null) {
            nodes.forEach(node => {
                const hasChildren = node.children && node.children.length > 0;
                const isExpanded = expandedNodes.has(node.id);

                // 搜尋過濾
                const matchesSearch = !searchQuery ||
                    node.name?.toLowerCase().includes(lowerQuery) ||
                    node.deptCode?.toLowerCase().includes(lowerQuery) ||
                    node.deptZhName?.toLowerCase().includes(lowerQuery) ||
                    node.manager?.toLowerCase().includes(lowerQuery);

                // 如果有搜尋條件，檢查子節點是否匹配
                let childMatches = false;
                if (searchQuery && hasChildren) {
                    function checkChildren(children: OrganizationTreeNode[]): boolean {
                        return children.some(child => {
                            const matches =
                                child.name?.toLowerCase().includes(lowerQuery) ||
                                child.deptCode?.toLowerCase().includes(lowerQuery) ||
                                child.deptZhName?.toLowerCase().includes(lowerQuery) ||
                                child.manager?.toLowerCase().includes(lowerQuery);
                            if (matches) return true;
                            if (child.children) return checkChildren(child.children);
                            return false;
                        });
                    }
                    childMatches = checkChildren(node.children!);
                }

                if (!searchQuery || matchesSearch || childMatches) {
                    rows.push({
                        node,
                        depth,
                        hasChildren,
                        isExpanded,
                        parentId,
                    });

                    // 遞迴處理子節點（展開時或搜尋時）
                    if (hasChildren && (isExpanded || (searchQuery && childMatches))) {
                        traverse(node.children!, depth + 1, node.id);
                    }
                }
            });
        }

        traverse(data, 0, null);
        return rows;
    }, [data, expandedNodes, searchQuery]);

    // 高亮搜尋文字
    const highlightText = (text: string | null | undefined, query: string) => {
        if (!query || !text) return text;
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);
        if (index === -1) return text;

        return (
            <>
                {text.slice(0, index)}
                <span className="bg-amber-500/30 text-amber-200 px-0.5 rounded">
                    {text.slice(index, index + query.length)}
                </span>
                {text.slice(index + query.length)}
            </>
        );
    };

    return (
        <div className="space-y-4">
            {/* 工具列 */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--color-text-secondary)]">
                    共 {flattenedRows.length} 筆資料
                </p>
                <button
                    onClick={() => onCreate(null)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
                >
                    <Plus size={16} />
                    新增根部門
                </button>
            </div>

            {/* 表格 */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full">
                    <thead>
                        <tr className="bg-[var(--color-bg-secondary)] border-b border-white/5">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                                部門
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider w-28">
                                代碼
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider w-32">
                                主管
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider w-24">
                                子部門
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider w-40">
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence initial={false}>
                            {flattenedRows.map((row, index) => (
                                <motion.tr
                                    key={row.node.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2, delay: index * 0.02 }}
                                    className={clsx(
                                        'border-b border-white/5 hover:bg-white/5 transition-colors border-l-2',
                                        getRowStyle(row.node, row.depth === 0)
                                    )}
                                >
                                    {/* 部門名稱 */}
                                    <td className="px-4 py-3">
                                        <div
                                            className="flex items-center gap-2"
                                            style={{ paddingLeft: `${row.depth * 24}px` }}
                                        >
                                            {/* 展開/收合按鈕 */}
                                            {row.hasChildren ? (
                                                <button
                                                    onClick={() => toggleExpand(row.node.id)}
                                                    className="p-1 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white transition-colors"
                                                >
                                                    {row.isExpanded ? (
                                                        <ChevronDown size={16} />
                                                    ) : (
                                                        <ChevronRight size={16} />
                                                    )}
                                                </button>
                                            ) : (
                                                <div className="w-6" />
                                            )}

                                            {/* 節點圖標 */}
                                            <div className="p-1.5 rounded-lg bg-white/5">
                                                {getNodeIcon(row.node, row.depth === 0)}
                                            </div>

                                            {/* 名稱 */}
                                            <div className="min-w-0">
                                                <div className="font-medium text-white truncate">
                                                    {highlightText(row.node.deptZhName || row.node.name, searchQuery)}
                                                </div>
                                                {row.node.deptEName && (
                                                    <div className="text-xs text-[var(--color-text-muted)] truncate">
                                                        {row.node.deptEName}
                                                    </div>
                                                )}
                                            </div>

                                            {/* CEO 標籤 */}
                                            {row.node.isCeo && (
                                                <Badge variant="warning" className="ml-2">CEO</Badge>
                                            )}
                                        </div>
                                    </td>

                                    {/* 代碼 */}
                                    <td className="px-4 py-3">
                                        {row.node.deptCode ? (
                                            <span className="font-mono text-xs text-[var(--color-text-secondary)] bg-white/5 px-2 py-1 rounded">
                                                {highlightText(row.node.deptCode, searchQuery)}
                                            </span>
                                        ) : (
                                            <span className="text-[var(--color-text-muted)]">-</span>
                                        )}
                                    </td>

                                    {/* 主管 */}
                                    <td className="px-4 py-3">
                                        {row.node.manager ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-[var(--color-accent-primary)]/20 flex items-center justify-center">
                                                    <UserCheck size={12} className="text-[var(--color-accent-primary)]" />
                                                </div>
                                                <span className="text-sm text-white">
                                                    {highlightText(row.node.manager, searchQuery)}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[var(--color-text-muted)]">-</span>
                                        )}
                                    </td>

                                    {/* 子部門數 */}
                                    <td className="px-4 py-3 text-center">
                                        {row.hasChildren ? (
                                            <Badge variant="info">{row.node.children!.length}</Badge>
                                        ) : (
                                            <span className="text-[var(--color-text-muted)]">-</span>
                                        )}
                                    </td>

                                    {/* 操作 */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => onView(row.node)}
                                                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                                                title="檢視詳情"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => onEdit(row.node)}
                                                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                                title="編輯"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                onClick={() => onCreate(row.node)}
                                                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-green-400 hover:bg-green-500/10 transition-all"
                                                title="新增子部門"
                                            >
                                                <Plus size={16} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(row.node)}
                                                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                title="刪除"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>

                        {flattenedRows.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Building2 size={40} className="text-[var(--color-text-muted)]" />
                                        <p className="text-[var(--color-text-muted)]">
                                            {searchQuery ? '找不到符合條件的部門' : '尚無部門資料'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 刪除確認 Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteConfirm(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
                        >
                            <div className="glass rounded-2xl border border-white/10 p-6 shadow-2xl">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <AlertTriangle size={24} className="text-red-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-2">
                                            確認刪除
                                        </h3>
                                        <p className="text-[var(--color-text-secondary)] text-sm mb-1">
                                            確定要刪除「{deleteConfirm.deptZhName || deleteConfirm.name}」嗎？
                                        </p>
                                        {deleteConfirm.children && deleteConfirm.children.length > 0 && (
                                            <p className="text-amber-400 text-sm">
                                                ⚠️ 此部門包含 {deleteConfirm.children.length} 個子部門，將一併刪除
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-3 mt-6">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="px-4 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={() => {
                                            onDelete(deleteConfirm);
                                            setDeleteConfirm(null);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        確認刪除
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default OrgTreeTable;
