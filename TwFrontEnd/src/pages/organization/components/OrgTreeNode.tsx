/**
 * 組織樹狀圖節點組件
 * UC Capital Identity Admin
 */

import { memo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, User, Crown, Building2, Users } from 'lucide-react';
import clsx from 'clsx';
import type { OrganizationTreeNode } from '../../../types/organization';
import { getNodeType, type NodeType } from '../../../types/organization';

interface OrgTreeNodeProps {
    node: OrganizationTreeNode;
    isRoot?: boolean;
    level?: number;
    onNodeClick?: (node: OrganizationTreeNode) => void;
    searchQuery?: string;
    expandedNodes: Set<string>;
    onToggleExpand: (nodeId: string) => void;
}

// 節點樣式配置
const nodeStyles: Record<NodeType, {
    bg: string;
    border: string;
    icon: typeof Crown;
    iconBg: string;
    glow: string;
}> = {
    ceo: {
        bg: 'bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-orange-500/20',
        border: 'border-amber-500/40 hover:border-amber-400/60',
        icon: Crown,
        iconBg: 'bg-gradient-to-br from-amber-500 to-yellow-600',
        glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    },
    root: {
        bg: 'bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-indigo-500/20',
        border: 'border-cyan-500/40 hover:border-cyan-400/60',
        icon: Building2,
        iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
        glow: 'shadow-[0_0_25px_rgba(6,182,212,0.25)]',
    },
    branch: {
        bg: 'bg-gradient-to-br from-indigo-500/15 to-purple-500/10',
        border: 'border-indigo-500/30 hover:border-indigo-400/50',
        icon: Users,
        iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600',
        glow: 'shadow-[0_0_20px_rgba(99,102,241,0.2)]',
    },
    leaf: {
        bg: 'bg-white/5',
        border: 'border-white/10 hover:border-white/20',
        icon: User,
        iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600',
        glow: '',
    },
};

// 高亮搜尋文字
function highlightText(text: string, query: string): React.ReactNode {
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
}

function OrgTreeNodeComponent({
    node,
    isRoot = false,
    level = 0,
    onNodeClick,
    searchQuery = '',
    expandedNodes,
    onToggleExpand,
}: OrgTreeNodeProps) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const nodeType = getNodeType(node, isRoot);
    const style = nodeStyles[nodeType];
    const Icon = style.icon;

    // 檢查是否匹配搜尋
    const isMatch =
        searchQuery &&
        (node.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.deptCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.deptZhName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.manager?.toLowerCase().includes(searchQuery.toLowerCase()));

    // --- 子節點置中偏移計算 ---
    // 當子樹寬度不均時，父節點需偏移至首尾子節點中心的中點
    const childrenRowRef = useRef<HTMLDivElement>(null);
    const [centerOffset, setCenterOffset] = useState(0);

    useEffect(() => {
        const el = childrenRowRef.current;
        if (!el || !hasChildren || !isExpanded) {
            setCenterOffset(0);
            return;
        }

        const measure = () => {
            const cols = Array.from(el.children) as HTMLElement[];
            if (cols.length < 2) {
                setCenterOffset(0);
                return;
            }

            const rowRect = el.getBoundingClientRect();
            const firstRect = cols[0].getBoundingClientRect();
            const lastRect = cols[cols.length - 1].getBoundingClientRect();

            const firstCenter = firstRect.left + firstRect.width / 2 - rowRect.left;
            const lastCenter = lastRect.left + lastRect.width / 2 - rowRect.left;
            const childMidpoint = (firstCenter + lastCenter) / 2;
            const containerCenter = rowRect.width / 2;

            const offset = childMidpoint - containerCenter;
            setCenterOffset(prev => Math.abs(prev - offset) > 0.5 ? offset : prev);
        };

        const rafId = requestAnimationFrame(measure);
        const observer = new ResizeObserver(measure);
        observer.observe(el);

        return () => {
            cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, [hasChildren, isExpanded, expandedNodes]);

    const offsetStyle = centerOffset !== 0
        ? { transform: `translateX(${centerOffset}px)`, transition: 'transform 0.3s ease' } as const
        : undefined;

    return (
        <div className="flex flex-col items-center">
            {/* 節點本體 - 偏移至子節點中心 */}
            <div style={offsetStyle}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: level * 0.05 }}
                    className={clsx(
                        'org-node-card', // 用於拖拉平移時的識別
                        'relative group cursor-pointer',
                        'min-w-[200px] max-w-[280px]',
                        'rounded-xl border backdrop-blur-sm',
                        'transition-all duration-300',
                        style.bg,
                        style.border,
                        style.glow,
                        isMatch && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-[var(--color-bg-primary)]'
                    )}
                    onClick={() => onNodeClick?.(node)}
                >
                    {/* 展開/收合按鈕 */}
                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleExpand(node.id);
                            }}
                            className={clsx(
                                'absolute -left-3 top-1/2 -translate-y-1/2',
                                'w-6 h-6 rounded-full',
                                'bg-[var(--color-bg-tertiary)] border border-white/20',
                                'flex items-center justify-center',
                                'text-white/60 hover:text-white hover:border-white/40',
                                'transition-all duration-200',
                                'z-10'
                            )}
                        >
                            {isExpanded ? (
                                <ChevronDown size={14} />
                            ) : (
                                <ChevronRight size={14} />
                            )}
                        </button>
                    )}

                    <div className="p-4">
                        {/* 頂部：圖標與部門代碼 */}
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className={clsx(
                                    'w-10 h-10 rounded-lg flex items-center justify-center',
                                    'shadow-lg',
                                    style.iconBg
                                )}
                            >
                                <Icon size={20} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                {node.deptCode && (
                                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                                        {highlightText(node.deptCode, searchQuery)}
                                    </span>
                                )}
                                <h4 className="text-sm font-bold text-white truncate">
                                    {highlightText(node.deptZhName || node.name, searchQuery)}
                                </h4>
                            </div>
                        </div>

                        {/* 英文名稱 */}
                        {node.deptEName && (
                            <p className="text-xs text-white/50 mb-2 truncate">
                                {node.deptEName}
                            </p>
                        )}

                        {/* 主管資訊 */}
                        {node.manager && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                                    <User size={12} className="text-white/60" />
                                </div>
                                <span className="text-xs text-white/70">
                                    {highlightText(node.manager, searchQuery)}
                                </span>
                            </div>
                        )}

                        {/* 子部門數量標籤 */}
                        {hasChildren && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                                <span className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--color-bg-tertiary)] border border-white/10 text-white/60">
                                    {node.children.length} 個子部門
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Hover 光暈效果 */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                    </div>
                </motion.div>
            </div>

            {/* 連接線與子節點 */}
            <AnimatePresence>
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center"
                    >
                        {/* 父節點到分支點的垂直連接線 - 同步偏移 */}
                        <div
                            className="w-0.5 h-6 bg-gradient-to-b from-white/40 to-white/20"
                            style={offsetStyle}
                        />

                        {/* 子節點容器 */}
                        <div className="relative">
                            {/* 子節點列表 */}
                            <div ref={childrenRowRef} className="flex items-start gap-3">
                                {node.children.map((child, index) => {
                                    const isFirst = index === 0;
                                    const isLast = index === node.children.length - 1;
                                    const isOnlyChild = node.children.length === 1;

                                    return (
                                        <div key={child.id} className="relative flex flex-col items-center min-w-[200px]">
                                            {/* 水平連接線段 - 使用絕對定位確保無縫連接 */}
                                            {!isOnlyChild && (
                                                <div
                                                    className="absolute h-0.5 bg-white/30"
                                                    style={{
                                                        top: 0,
                                                        // 第一個節點：只畫右半（中心到右邊）
                                                        // 最後節點：只畫左半（左邊到中心）
                                                        // 中間節點：畫全寬（左邊到右邊）並加上 gap 寬度補償
                                                        left: isFirst ? '50%' : '-6px', // -6px 補償 gap-3 的一半 (12px/2)
                                                        right: isLast ? '50%' : '-6px',
                                                    }}
                                                />
                                            )}
                                            {/* 從橫線到子節點的垂直連接線 */}
                                            <div className="w-0.5 h-5 bg-gradient-to-b from-white/35 to-white/15" />
                                            <OrgTreeNodeComponent
                                                node={child}
                                                level={level + 1}
                                                onNodeClick={onNodeClick}
                                                searchQuery={searchQuery}
                                                expandedNodes={expandedNodes}
                                                onToggleExpand={onToggleExpand}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export const OrgTreeNode = memo(OrgTreeNodeComponent);
export default OrgTreeNode;
