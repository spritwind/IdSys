/**
 * Token Management Page
 * UC Capital Identity Admin
 *
 * Token 管理頁面 - JWT Token 撤銷與管理
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Key,
    Search,
    RefreshCw,
    ShieldCheck,
    ShieldX,
    Clock,
    Users,
    Laptop,
    XCircle,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    Trash2,
    Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import * as tokenApi from '../../services/tokenManagementApi';
import type {
    ActiveTokenDto,
    RevokedTokenDto,
    TokenStatistics,
} from '../../services/tokenManagementApi';

// 統計卡片組件
function StatCard({ icon: Icon, label, value, color }: {
    icon: React.ElementType;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="text-sm text-gray-400">{label}</p>
                    <p className="text-2xl font-semibold text-white">{value.toLocaleString()}</p>
                </div>
            </div>
        </motion.div>
    );
}

// 狀態徽章
function TokenStatusBadge({ isExpired, isRevoked }: { isExpired: boolean; isRevoked: boolean }) {
    if (isRevoked) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                <XCircle className="w-3 h-3" />
                已撤銷
            </span>
        );
    }
    if (isExpired) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                <Clock className="w-3 h-3" />
                已過期
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Check className="w-3 h-3" />
            有效
        </span>
    );
}

// 撤銷確認對話框
function RevokeConfirmModal({
    token,
    onConfirm,
    onCancel,
}: {
    token: ActiveTokenDto;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        await onConfirm(reason);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-full bg-red-500/20">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">撤銷 Token</h3>
                        <p className="text-sm text-gray-400">此操作無法復原</p>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="bg-white/5 rounded-lg p-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-gray-400">使用者：</span>
                                <span className="text-white ml-1">{token.subjectId || '-'}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">客戶端：</span>
                                <span className="text-white ml-1">{token.clientName || token.clientId}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">類型：</span>
                                <span className="text-white ml-1">{token.type}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">剩餘時間：</span>
                                <span className="text-white ml-1">{token.remainingTimeFormatted || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">撤銷原因（選填）</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="請輸入撤銷原因..."
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
                            rows={3}
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                            '確認撤銷'
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function TokenManagementPage() {
    // 狀態
    const [activeTab, setActiveTab] = useState<'active' | 'revoked'>('active');
    const [activeTokens, setActiveTokens] = useState<ActiveTokenDto[]>([]);
    const [revokedTokens, setRevokedTokens] = useState<RevokedTokenDto[]>([]);
    const [statistics, setStatistics] = useState<TokenStatistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // 分頁
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize] = useState(20);

    // Modal 狀態
    const [tokenToRevoke, setTokenToRevoke] = useState<ActiveTokenDto | null>(null);

    // 載入統計資料
    const loadStatistics = useCallback(async () => {
        try {
            const stats = await tokenApi.getStatistics();
            setStatistics(stats);
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    }, []);

    // 載入 Token 資料
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'active') {
                const result = await tokenApi.getActiveTokens(currentPage, pageSize, searchTerm || undefined);
                setActiveTokens(result.items);
                setTotalCount(result.totalCount);
            } else {
                const result = await tokenApi.getRevokedTokens(currentPage, pageSize);
                setRevokedTokens(result.items);
                setTotalCount(result.totalCount);
            }
        } catch (error) {
            console.error('Failed to load tokens:', error);
            toast.error('載入 Token 資料失敗');
        } finally {
            setLoading(false);
        }
    }, [activeTab, currentPage, pageSize, searchTerm]);

    // 初始載入
    useEffect(() => {
        loadStatistics();
    }, [loadStatistics]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 切換 Tab 時重置分頁
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    // 搜尋防抖
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // 撤銷 Token
    const handleRevokeToken = async (token: ActiveTokenDto, reason: string) => {
        try {
            await tokenApi.revokeByGrantKey(token.key, reason || undefined);
            toast.success('Token 已撤銷');
            setTokenToRevoke(null);
            loadData();
            loadStatistics();
        } catch (error) {
            console.error('Failed to revoke token:', error);
            toast.error('撤銷失敗');
        }
    };

    // 取消撤銷
    const handleUnrevoke = async (jti: string) => {
        try {
            await tokenApi.unrevokeToken(jti);
            toast.success('已取消撤銷');
            loadData();
            loadStatistics();
        } catch (error) {
            console.error('Failed to unrevoke token:', error);
            toast.error('操作失敗');
        }
    };

    // 清理過期記錄
    const handleCleanup = async () => {
        try {
            const result = await tokenApi.cleanupExpired();
            toast.success(`已清理 ${result.cleanedCount} 筆過期記錄`);
            loadData();
            loadStatistics();
        } catch (error) {
            console.error('Failed to cleanup:', error);
            toast.error('清理失敗');
        }
    };

    // 分頁
    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-6">
            {/* 頁面標題 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Key className="w-7 h-7 text-amber-400" />
                        Token 管理
                    </h1>
                    <p className="text-gray-400 mt-1">管理 JWT Token 的發行與撤銷</p>
                </div>
                <button
                    onClick={handleCleanup}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white font-medium rounded-lg transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    清理過期記錄
                </button>
            </div>

            {/* 統計卡片 */}
            {statistics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    <StatCard icon={ShieldCheck} label="活躍 Token" value={statistics.activeTokens} color="bg-emerald-500" />
                    <StatCard icon={ShieldX} label="已撤銷" value={statistics.revokedTokens} color="bg-red-500" />
                    <StatCard icon={Timer} label="即將過期" value={statistics.expiringSoon} color="bg-amber-500" />
                    <StatCard icon={Clock} label="已過期" value={statistics.expiredTokens} color="bg-gray-500" />
                    <StatCard icon={Users} label="活躍使用者" value={statistics.activeUsers} color="bg-blue-500" />
                    <StatCard icon={Laptop} label="活躍客戶端" value={statistics.activeClients} color="bg-purple-500" />
                </div>
            )}

            {/* Tab 切換 */}
            <div className="flex gap-2 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'active'
                            ? 'bg-amber-500 text-gray-900'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        活躍 Token
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('revoked')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'revoked'
                            ? 'bg-amber-500 text-gray-900'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <ShieldX className="w-4 h-4" />
                        已撤銷 Token
                    </div>
                </button>
            </div>

            {/* 搜尋與重新整理 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* 搜尋框 */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜尋使用者、客戶端..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50"
                        />
                    </div>

                    {/* 重新整理 */}
                    <button
                        onClick={() => {
                            loadData();
                            loadStatistics();
                        }}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        重新整理
                    </button>
                </div>
            </div>

            {/* Token 列表 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                {activeTab === 'active' ? (
                                    <>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">使用者</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">客戶端</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">類型</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">建立時間</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">剩餘時間</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">狀態</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">操作</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">JTI</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">使用者</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">客戶端</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">撤銷時間</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">撤銷者</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">原因</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">操作</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        載入中...
                                    </td>
                                </tr>
                            ) : activeTab === 'active' ? (
                                activeTokens.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                            <Key className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            沒有活躍的 Token
                                        </td>
                                    </tr>
                                ) : (
                                    activeTokens.map((token) => (
                                        <tr
                                            key={token.key}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <span className="text-white">{token.subjectId || '-'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="text-white">{token.clientName || token.clientId}</p>
                                                    {token.clientName && (
                                                        <p className="text-xs text-gray-500">{token.clientId}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                                                    {token.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-sm">
                                                {new Date(token.creationTime).toLocaleString('zh-TW')}
                                            </td>
                                            <td className="px-4 py-3">
                                                {token.isExpired ? (
                                                    <span className="text-gray-500">已過期</span>
                                                ) : (
                                                    <span className={`${
                                                        (token.remainingSeconds || 0) < 3600
                                                            ? 'text-amber-400'
                                                            : 'text-emerald-400'
                                                    }`}>
                                                        {token.remainingTimeFormatted || '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <TokenStatusBadge isExpired={token.isExpired} isRevoked={token.isRevoked} />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {!token.isRevoked && !token.isExpired && (
                                                    <button
                                                        onClick={() => setTokenToRevoke(token)}
                                                        className="px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                    >
                                                        撤銷
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )
                            ) : (
                                revokedTokens.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                            <ShieldX className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            沒有撤銷的 Token
                                        </td>
                                    </tr>
                                ) : (
                                    revokedTokens.map((token) => (
                                        <tr
                                            key={token.id}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <span className="text-white font-mono text-xs">
                                                    {token.jti.length > 20
                                                        ? `${token.jti.substring(0, 20)}...`
                                                        : token.jti}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-white">{token.subjectId || '-'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-white">{token.clientId}</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-sm">
                                                {new Date(token.revokedAt).toLocaleString('zh-TW')}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400">
                                                {token.revokedBy || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-sm">
                                                {token.reason || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleUnrevoke(token.jti)}
                                                    className="px-3 py-1 text-sm text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                                                >
                                                    取消撤銷
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 分頁 */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                        <p className="text-sm text-gray-400">
                            共 {totalCount} 筆，第 {currentPage} / {totalPages} 頁
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-400" />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const page = currentPage <= 3
                                    ? i + 1
                                    : currentPage >= totalPages - 2
                                        ? totalPages - 4 + i
                                        : currentPage - 2 + i;
                                if (page < 1 || page > totalPages) return null;
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                                            page === currentPage
                                                ? 'bg-amber-500 text-gray-900'
                                                : 'hover:bg-white/10 text-gray-400'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 撤銷確認對話框 */}
            <AnimatePresence>
                {tokenToRevoke && (
                    <RevokeConfirmModal
                        token={tokenToRevoke}
                        onConfirm={(reason) => handleRevokeToken(tokenToRevoke, reason)}
                        onCancel={() => setTokenToRevoke(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
