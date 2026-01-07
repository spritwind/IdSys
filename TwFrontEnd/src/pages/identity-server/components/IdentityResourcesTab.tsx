/**
 * Identity Resources Tab Component
 * UC Capital Identity Admin
 *
 * 身份資源管理標籤頁 - 定義使用者身份資訊的資源
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, RefreshCw, Edit2, Trash2, CheckCircle, XCircle, Users } from 'lucide-react';
import { GlassTable } from '@/components/common/GlassTable';
import { identityResourceService } from '@/services/identityResourceService';
import type { IdentityResourceApiDto } from '@/types/identityServer';

const PAGE_SIZE = 10;

export function IdentityResourcesTab() {
    const navigate = useNavigate();
    const [resources, setResources] = useState<IdentityResourceApiDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

    const loadResources = useCallback(async () => {
        try {
            setLoading(true);
            const data = await identityResourceService.getIdentityResources(searchTerm, currentPage, PAGE_SIZE);
            setResources(data.identityResources);
            setTotalCount(data.totalCount);
        } catch (error) {
            console.error('Failed to load identity resources:', error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, currentPage]);

    useEffect(() => {
        loadResources();
    }, [loadResources]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm('確定要刪除此身份資源嗎？此操作無法復原。')) return;

        try {
            setDeleteLoading(id);
            await identityResourceService.deleteIdentityResource(id);
            await loadResources();
        } catch (error) {
            console.error('Failed to delete identity resource:', error);
            alert('刪除失敗，請稍後再試。');
        } finally {
            setDeleteLoading(null);
        }
    };

    const handleEdit = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        navigate(`/identity-server/identity-resources/${id}/edit`);
    };

    const columns = [
        {
            header: '資源名稱',
            accessor: (item: IdentityResourceApiDto) => (
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-violet-400" />
                    <span className="font-mono text-violet-400">{item.name}</span>
                </div>
            ),
        },
        {
            header: '顯示名稱',
            accessor: (item: IdentityResourceApiDto) => (
                <span className="text-white font-medium">{item.displayName || '-'}</span>
            ),
        },
        {
            header: '描述',
            accessor: (item: IdentityResourceApiDto) => (
                <span className="text-[var(--color-text-secondary)] max-w-[200px] truncate block">
                    {item.description || '-'}
                </span>
            ),
        },
        {
            header: '使用者聲明',
            accessor: (item: IdentityResourceApiDto) => (
                <div className="flex flex-wrap gap-1">
                    {item.userClaims?.slice(0, 2).map((claim, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-xs bg-violet-500/20 text-violet-300 rounded-full">
                            {claim}
                        </span>
                    ))}
                    {item.userClaims?.length > 2 && (
                        <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-300 rounded-full">
                            +{item.userClaims.length - 2}
                        </span>
                    )}
                    {(!item.userClaims || item.userClaims.length === 0) && (
                        <span className="text-[var(--color-text-secondary)]">-</span>
                    )}
                </div>
            ),
        },
        {
            header: '必要',
            accessor: (item: IdentityResourceApiDto) => (
                item.required ? (
                    <span className="inline-flex items-center gap-1 text-amber-400">
                        <CheckCircle size={14} />
                        是
                    </span>
                ) : (
                    <span className="text-[var(--color-text-secondary)]">否</span>
                )
            ),
        },
        {
            header: '狀態',
            accessor: (item: IdentityResourceApiDto) => (
                item.enabled ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle size={14} />
                        啟用
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-red-400">
                        <XCircle size={14} />
                        停用
                    </span>
                )
            ),
        },
        {
            header: '操作',
            accessor: (item: IdentityResourceApiDto) => (
                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleEdit(e, item.id)}
                        className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-[var(--color-text-secondary)] hover:text-cyan-400 transition-colors"
                        title="編輯"
                    >
                        <Edit2 size={16} />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleDelete(e, item.id)}
                        disabled={deleteLoading === item.id}
                        className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-[var(--color-text-secondary)] hover:text-red-400 transition-colors disabled:opacity-50"
                        title="刪除"
                    >
                        {deleteLoading === item.id ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : (
                            <Trash2 size={16} />
                        )}
                    </motion.button>
                </div>
            ),
        },
    ];

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-[var(--color-text-secondary)] group-focus-within:text-[var(--color-accent-primary)] transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="搜尋身份資源..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 pl-10 pr-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)] transition-all"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={loadResources}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl text-[var(--color-text-secondary)] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        <span>重新整理</span>
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/identity-server/identity-resources/new')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl text-white font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
                    >
                        <Plus size={18} />
                        <span>新增身份資源</span>
                    </motion.button>
                </div>
            </div>

            {/* Table */}
            <GlassTable
                data={resources}
                columns={columns}
                isLoading={loading}
                onRowClick={(item) => navigate(`/identity-server/identity-resources/${item.id}/edit`)}
                pagination={{
                    currentPage,
                    totalPages,
                    onPageChange: setCurrentPage,
                }}
            />
        </div>
    );
}
