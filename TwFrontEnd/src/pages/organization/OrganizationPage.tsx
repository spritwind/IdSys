/**
 * 組織架構頁面
 * UC Capital Identity Admin
 */

import { useState, useEffect, useCallback, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { motion } from 'framer-motion';
import {
    Building2,
    Layers,
    UserCheck,
    GitBranch,
    Table,
    Search,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Minimize2,
    ChevronDown,
    ChevronRight,
    Loader2,
    RefreshCw,
    FileDown,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import clsx from 'clsx';
import type {
    OrganizationTreeNode,
    OrganizationStats,
    ViewMode,
} from '../../types/organization';
import { organizationApi } from '../../services/organizationApi';
import { OrgTreeNode } from './components/OrgTreeNode';
import { OrgDetailModal } from './components/OrgDetailModal';
import { OrgEditModal } from './components/OrgEditModal';
import { OrgTreeTable } from './components/OrgTreeTable';
import { GoogleSyncPanel } from './components/GoogleSyncPanel';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

// 統計卡片組件
function StatCard({
    icon: Icon,
    label,
    value,
    color,
    delay = 0,
}: {
    icon: typeof Building2;
    label: string;
    value: number | string;
    color: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="glass p-5 rounded-xl border border-white/5"
        >
            <div className="flex items-center gap-4">
                <div className={clsx('p-3 rounded-xl', color)}>
                    <Icon size={22} className="text-white" />
                </div>
                <div>
                    <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                </div>
            </div>
        </motion.div>
    );
}

// 收集所有節點 ID
function collectAllNodeIds(nodes: OrganizationTreeNode[]): string[] {
    const ids: string[] = [];
    function traverse(node: OrganizationTreeNode) {
        ids.push(node.id);
        node.children?.forEach(traverse);
    }
    nodes.forEach(traverse);
    return ids;
}

// 搜尋節點並返回匹配的 ID 及其祖先
function searchNodes(
    nodes: OrganizationTreeNode[],
    query: string
): { matchIds: Set<string>; ancestorIds: Set<string> } {
    const matchIds = new Set<string>();
    const ancestorIds = new Set<string>();
    const lowerQuery = query.toLowerCase();

    function traverse(node: OrganizationTreeNode, ancestors: string[]): boolean {
        const isMatch =
            node.name?.toLowerCase().includes(lowerQuery) ||
            node.deptCode?.toLowerCase().includes(lowerQuery) ||
            node.deptZhName?.toLowerCase().includes(lowerQuery) ||
            node.manager?.toLowerCase().includes(lowerQuery);

        let hasMatchingChild = false;
        node.children?.forEach((child) => {
            if (traverse(child, [...ancestors, node.id])) {
                hasMatchingChild = true;
            }
        });

        if (isMatch) {
            matchIds.add(node.id);
            ancestors.forEach((id) => ancestorIds.add(id));
        }

        return isMatch || hasMatchingChild;
    }

    nodes.forEach((node) => traverse(node, []));
    return { matchIds, ancestorIds };
}


export default function OrganizationPage() {
    // 狀態管理
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [treeData, setTreeData] = useState<OrganizationTreeNode[]>([]);
    const [stats, setStats] = useState<OrganizationStats | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('chart');
    const [searchQuery, setSearchQuery] = useState('');
    const [zoom, setZoom] = useState(1);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [selectedNode, setSelectedNode] = useState<OrganizationTreeNode | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // 編輯 Modal 狀態
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
    const [editNode, setEditNode] = useState<OrganizationTreeNode | null>(null);
    const [parentNode, setParentNode] = useState<OrganizationTreeNode | null>(null);

    // 拖拉平移狀態
    const [isPanning, setIsPanning] = useState(false);
    const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // 全畫面與匯出狀態
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [exporting, setExporting] = useState(false);

    const chartRef = useRef<HTMLDivElement>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    // 載入資料
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [tree, statistics] = await Promise.all([
                organizationApi.getOrganizationTree(),
                organizationApi.getStats(),
            ]);
            setTreeData(tree);
            setStats(statistics);

            // 預設展開前兩層
            const initialExpanded = new Set<string>();
            function expandFirstTwoLevels(nodes: OrganizationTreeNode[], level: number) {
                nodes.forEach((node) => {
                    if (level < 2) {
                        initialExpanded.add(node.id);
                        if (node.children) {
                            expandFirstTwoLevels(node.children, level + 1);
                        }
                    }
                });
            }
            expandFirstTwoLevels(tree, 0);
            setExpandedNodes(initialExpanded);
        } catch (err) {
            const message = err instanceof Error ? err.message : '無法載入組織架構資料';
            setError(message);
            console.error('Failed to load organization data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // 取得認證狀態
    const { isAuthenticated, accessToken } = useAuth();

    // 只有在認證後才載入資料
    useEffect(() => {
        if (isAuthenticated && accessToken) {
            loadData();
        }
    }, [loadData, isAuthenticated, accessToken]);

    // 搜尋時自動展開匹配的節點
    useEffect(() => {
        if (searchQuery && treeData.length > 0) {
            const { matchIds, ancestorIds } = searchNodes(treeData, searchQuery);
            const newExpanded = new Set([...ancestorIds, ...matchIds]);
            setExpandedNodes(newExpanded);
        }
    }, [searchQuery, treeData]);

    // 切換節點展開狀態
    const handleToggleExpand = useCallback((nodeId: string) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    // 全部展開
    const handleExpandAll = useCallback(() => {
        const allIds = collectAllNodeIds(treeData);
        setExpandedNodes(new Set(allIds));
    }, [treeData]);

    // 全部收合
    const handleCollapseAll = useCallback(() => {
        // 只保留根節點展開
        const rootIds = treeData.map((n) => n.id);
        setExpandedNodes(new Set(rootIds));
    }, [treeData]);

    // 縮放控制
    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2));
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.3));
    const handleZoomReset = () => {
        setZoom(1);
        setPanPosition({ x: 0, y: 0 });
    };

    // 拖拉平移控制
    const handlePanStart = useCallback((e: ReactMouseEvent) => {
        // 只有在圖表容器上直接點擊時才開始拖拉（避免節點點擊時觸發）
        if ((e.target as HTMLElement).closest('.org-node-card')) return;

        setIsPanning(true);
        setDragStart({
            x: e.clientX - panPosition.x,
            y: e.clientY - panPosition.y
        });
        e.preventDefault();
    }, [panPosition]);

    const handlePanMove = useCallback((e: ReactMouseEvent) => {
        if (!isPanning) return;

        setPanPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    }, [isPanning, dragStart]);

    const handlePanEnd = useCallback(() => {
        setIsPanning(false);
    }, []);

    // 滾輪縮放
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(z => Math.min(Math.max(z + delta, 0.3), 2));
    }, []);

    // --- 全畫面控制 ---
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const handleToggleFullscreen = useCallback(() => {
        const container = chartContainerRef.current;
        if (!container) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            container.requestFullscreen();
        }
    }, []);

    // --- PDF 匯出 ---
    // 將標題以 HTML 注入 DOM 一起截圖，避免 jsPDF 不支援 CJK 字型導致亂碼
    const handleExportPdf = useCallback(async () => {
        const chart = chartRef.current;
        if (!chart || exporting) return;

        setExporting(true);

        // 儲存目前狀態
        const savedZoom = zoom;
        const savedPan = { ...panPosition };

        // 重設縮放與平移以取得乾淨的截圖
        setZoom(1);
        setPanPosition({ x: 0, y: 0 });

        // 等待 React 渲染 + 瀏覽器繪製
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        // 額外延遲確保 transition 完成
        await new Promise(r => setTimeout(r, 350));

        // 建立 HTML 頁首，注入 chart DOM 頂部一起截圖（瀏覽器原生渲染中文）
        const header = document.createElement('div');
        header.setAttribute('data-pdf-header', '');
        header.style.cssText = 'padding: 0 0 20px 0; margin-bottom: 20px; border-bottom: 2px solid rgba(255,255,255,0.12);';
        const dateStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const deptCount = stats?.totalGroups ?? '-';
        const maxDepth = stats ? stats.maxDepth + 1 : '-';
        header.innerHTML = `
            <div style="font-size: 28px; font-weight: 800; color: #ffffff; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; letter-spacing: -0.02em;">
                UC Capital 組織架構圖
            </div>
            <div style="font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 8px; font-family: system-ui, sans-serif;">
                匯出日期：${dateStr}　｜　部門數：${deptCount}　｜　最大深度：${maxDepth}
            </div>
        `;
        chart.prepend(header);

        // 等瀏覽器繪製 header
        await new Promise(r => requestAnimationFrame(r));

        try {
            const dataUrl = await toPng(chart, {
                quality: 1.0,
                pixelRatio: 2,
                backgroundColor: '#0a0a0f',
                // 排除拖拉提示浮標與全畫面工具列
                filter: (node: HTMLElement) => !node.classList?.contains('export-exclude'),
            });

            // 移除臨時 header
            header.remove();

            const img = new Image();
            img.src = dataUrl;
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
            });

            // 計算 PDF 尺寸 (A4)
            const imgW = img.width / 2;  // pixelRatio=2 補償
            const imgH = img.height / 2;
            const isLandscape = imgW > imgH;
            const pageW = isLandscape ? 841.89 : 595.28;
            const pageH = isLandscape ? 595.28 : 841.89;
            const margin = 30;
            const availW = pageW - margin * 2;
            const availH = pageH - margin * 2;

            const scale = Math.min(availW / imgW, availH / imgH, 1);
            const scaledW = imgW * scale;
            const scaledH = imgH * scale;

            const pdf = new jsPDF({
                orientation: isLandscape ? 'landscape' : 'portrait',
                unit: 'pt',
                format: 'a4',
            });

            // 整張圖（含 HTML 頁首）置中放入 PDF
            const xOffset = (pageW - scaledW) / 2;
            const yOffset = (pageH - scaledH) / 2;
            pdf.addImage(dataUrl, 'PNG', xOffset, Math.max(margin, yOffset), scaledW, scaledH);

            pdf.save('UC-Capital-Organization-Chart.pdf');
            toast.success('PDF 匯出成功');
        } catch (err) {
            // 確保 header 被移除
            header.remove();
            console.error('PDF export failed:', err);
            toast.error('PDF 匯出失敗');
        } finally {
            // 還原狀態
            setZoom(savedZoom);
            setPanPosition(savedPan);
            setExporting(false);
        }
    }, [exporting, zoom, panPosition, stats]);

    // 節點點擊
    const handleNodeClick = useCallback((node: OrganizationTreeNode) => {
        setSelectedNode(node);
        setModalOpen(true);
    }, []);

    // CRUD 操作
    const handleView = useCallback((node: OrganizationTreeNode) => {
        setSelectedNode(node);
        setModalOpen(true);
    }, []);

    const handleEdit = useCallback((node: OrganizationTreeNode) => {
        setEditMode('edit');
        setEditNode(node);
        setParentNode(null);
        setEditModalOpen(true);
    }, []);

    const handleCreate = useCallback((parent: OrganizationTreeNode | null) => {
        setEditMode('create');
        setEditNode(null);
        setParentNode(parent);
        setEditModalOpen(true);
    }, []);

    const handleDelete = useCallback((node: OrganizationTreeNode) => {
        // TODO: 實作刪除 API
        toast.info('刪除功能尚未實作', {
            description: `部門「${node.deptZhName || node.name}」的刪除功能需要後端 API 支援`,
        });
    }, []);

    const handleSave = useCallback(async (data: Partial<OrganizationTreeNode>) => {
        // TODO: 實作新增/編輯 API
        if (editMode === 'create') {
            toast.success('新增成功（模擬）', {
                description: `已新增部門「${data.deptZhName || data.name}」`,
            });
        } else {
            toast.success('更新成功（模擬）', {
                description: `已更新部門「${data.deptZhName || data.name}」`,
            });
        }
        // 重新載入資料
        await loadData();
    }, [editMode, loadData]);


    return (
        <div className="space-y-6">
            {/* 頁面標題 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                            <Building2 size={24} className="text-cyan-400" />
                        </div>
                        組織架構
                    </h1>
                    <p className="text-[var(--color-text-secondary)] mt-1">
                        檢視與管理優式資本組織架構
                    </p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[var(--color-text-secondary)] hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    重新載入
                </button>
            </div>

            {/* 統計卡片 */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={Building2}
                        label="總部門數"
                        value={stats.totalGroups}
                        color="bg-gradient-to-br from-cyan-500 to-blue-600"
                        delay={0}
                    />
                    <StatCard
                        icon={GitBranch}
                        label="根層級部門"
                        value={stats.totalRootGroups}
                        color="bg-gradient-to-br from-indigo-500 to-purple-600"
                        delay={0.1}
                    />
                    <StatCard
                        icon={Layers}
                        label="最大層級深度"
                        value={stats.maxDepth + 1}
                        color="bg-gradient-to-br from-amber-500 to-orange-600"
                        delay={0.2}
                    />
                    <StatCard
                        icon={UserCheck}
                        label="已指派主管"
                        value={stats.groupsWithManagers}
                        color="bg-gradient-to-br from-emerald-500 to-green-600"
                        delay={0.3}
                    />
                </div>
            )}

            {/* Google Workspace 同步面板 */}
            <GoogleSyncPanel onSyncComplete={loadData} />

            {/* 工具列 */}
            <div className="glass p-4 rounded-xl border border-white/5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* 左側：視圖切換與展開控制 */}
                    <div className="flex items-center gap-3">
                        {/* 視圖切換 */}
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5">
                            <button
                                onClick={() => setViewMode('chart')}
                                className={clsx(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all',
                                    viewMode === 'chart'
                                        ? 'bg-[var(--color-accent-primary)] text-white'
                                        : 'text-[var(--color-text-secondary)] hover:text-white'
                                )}
                            >
                                <GitBranch size={16} />
                                圖表
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={clsx(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all',
                                    viewMode === 'table'
                                        ? 'bg-[var(--color-accent-primary)] text-white'
                                        : 'text-[var(--color-text-secondary)] hover:text-white'
                                )}
                            >
                                <Table size={16} />
                                列表
                            </button>
                        </div>

                        {/* 展開控制 (僅圖表模式) */}
                        {viewMode === 'chart' && (
                            <>
                                <div className="w-px h-6 bg-white/10" />
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleExpandAll}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        <ChevronDown size={14} />
                                        全部展開
                                    </button>
                                    <button
                                        onClick={handleCollapseAll}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        <ChevronRight size={14} />
                                        全部收合
                                    </button>
                                </div>
                            </>
                        )}

                        {/* 縮放控制 (僅圖表模式) */}
                        {viewMode === 'chart' && (
                            <>
                                <div className="w-px h-6 bg-white/10" />
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleZoomOut}
                                        className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                                        title="縮小"
                                    >
                                        <ZoomOut size={16} />
                                    </button>
                                    <span className="px-2 text-sm text-[var(--color-text-muted)] min-w-[50px] text-center">
                                        {Math.round(zoom * 100)}%
                                    </span>
                                    <button
                                        onClick={handleZoomIn}
                                        className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                                        title="放大"
                                    >
                                        <ZoomIn size={16} />
                                    </button>
                                    <button
                                        onClick={handleZoomReset}
                                        className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                                        title="重設縮放"
                                    >
                                        <Maximize2 size={16} />
                                    </button>
                                </div>

                                {/* 全畫面 & PDF 匯出 */}
                                <div className="w-px h-6 bg-white/10" />
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleToggleFullscreen}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                                        title={isFullscreen ? '退出全畫面' : '全畫面'}
                                    >
                                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                        {isFullscreen ? '退出' : '全畫面'}
                                    </button>
                                    <button
                                        onClick={handleExportPdf}
                                        disabled={exporting}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                                        title="匯出 PDF"
                                    >
                                        {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                                        {exporting ? '匯出中...' : 'PDF'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 右側：搜尋 */}
                    <div className="relative">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜尋部門名稱、代碼、主管..."
                            className="w-64 pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* 內容區域 */}
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 size={40} className="text-[var(--color-accent-primary)] animate-spin" />
                        <p className="text-[var(--color-text-secondary)]">載入組織架構中...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="flex items-center justify-center h-96">
                    <div className="flex flex-col items-center gap-4 text-center max-w-md">
                        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
                            <Building2 size={40} className="text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">無法載入資料</h3>
                            <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
                        </div>
                        <button
                            onClick={loadData}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-primary)]/80 transition-all"
                        >
                            <RefreshCw size={16} />
                            重試
                        </button>
                    </div>
                </div>
            ) : viewMode === 'chart' ? (
                /* 組織圖表視圖 - 支援拖拉平移 */
                <div
                    ref={chartContainerRef}
                    className={clsx(
                        "glass rounded-xl border border-white/5 overflow-hidden relative",
                        isPanning ? "cursor-grabbing" : "cursor-grab",
                        isFullscreen && "!rounded-none !border-0 bg-[var(--color-bg-primary)]"
                    )}
                    style={{
                        minHeight: isFullscreen ? '100vh' : '500px',
                        maxHeight: isFullscreen ? '100vh' : 'calc(100vh - 400px)',
                    }}
                    onMouseDown={handlePanStart}
                    onMouseMove={handlePanMove}
                    onMouseUp={handlePanEnd}
                    onMouseLeave={handlePanEnd}
                    onWheel={handleWheel}
                >
                    {/* 拖拉提示 */}
                    <div className="export-exclude absolute top-3 left-3 z-10 px-2 py-1 rounded-md bg-black/40 text-xs text-white/50 pointer-events-none">
                        拖拉移動畫面 | 滾輪縮放
                        {isFullscreen && ' | ESC 退出全畫面'}
                    </div>

                    {/* 全畫面工具列 */}
                    {isFullscreen && (
                        <div className="export-exclude absolute top-3 right-3 z-10 flex items-center gap-2">
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                                <button onClick={handleZoomOut} className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-all" title="縮小">
                                    <ZoomOut size={16} />
                                </button>
                                <span className="px-2 text-xs text-white/50 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                                <button onClick={handleZoomIn} className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-all" title="放大">
                                    <ZoomIn size={16} />
                                </button>
                                <button onClick={handleZoomReset} className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-all" title="重設">
                                    <Maximize2 size={16} />
                                </button>
                                <div className="w-px h-4 bg-white/20 mx-1" />
                                <button onClick={handleExpandAll} className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-all" title="全部展開">
                                    <ChevronDown size={16} />
                                </button>
                                <button onClick={handleCollapseAll} className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-all" title="全部收合">
                                    <ChevronRight size={16} />
                                </button>
                                <div className="w-px h-4 bg-white/20 mx-1" />
                                <button onClick={handleExportPdf} disabled={exporting} className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50" title="匯出 PDF">
                                    {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                                </button>
                                <button onClick={handleToggleFullscreen} className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-all" title="退出全畫面">
                                    <Minimize2 size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div
                        ref={chartRef}
                        className="p-8 min-w-max select-none"
                        style={{
                            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})`,
                            transformOrigin: 'top center',
                            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
                        }}
                    >
                        <div className="flex flex-col items-center">
                            {treeData.map((rootNode) => (
                                <OrgTreeNode
                                    key={rootNode.id}
                                    node={rootNode}
                                    isRoot
                                    onNodeClick={handleNodeClick}
                                    searchQuery={searchQuery}
                                    expandedNodes={expandedNodes}
                                    onToggleExpand={handleToggleExpand}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* 列表視圖 - 使用樹狀表格 */
                <div className="glass rounded-xl border border-white/5 p-4">
                    <OrgTreeTable
                        data={treeData}
                        searchQuery={searchQuery}
                        onView={handleView}
                        onEdit={handleEdit}
                        onCreate={handleCreate}
                        onDelete={handleDelete}
                    />
                </div>
            )}

            {/* 詳情 Modal */}
            <OrgDetailModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                node={selectedNode}
            />

            {/* 編輯 Modal */}
            <OrgEditModal
                open={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                node={editNode}
                mode={editMode}
                parentNode={parentNode}
                onSave={handleSave}
            />
        </div>
    );
}
