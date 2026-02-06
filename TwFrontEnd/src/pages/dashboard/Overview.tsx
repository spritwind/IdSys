import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Globe,
    Shield,
    Key,
    TrendingUp,
    BarChart3,
    Loader2,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';
import {
    getDashboardIdentityServer,
    getDashboardIdentity,
    type DashboardDto,
    type DashboardIdentityDto,
} from '../../services/dashboardApi';
import {
    getStatistics,
    type TokenStatistics,
} from '../../services/tokenManagementApi';

// ============ Types ============

interface StatsData {
    identity: DashboardIdentityDto | null;
    idServer: DashboardDto | null;
    tokenStats: TokenStatistics | null;
}

// ============ Constants ============

const quickActions = [
    { label: '新增客戶端', path: '/clients/new', icon: Globe },
    { label: '新增使用者', path: '/users/new', icon: Users },
    { label: 'Token 管理', path: '/token-management', icon: Key },
    { label: '權限管理', path: '/permission', icon: Shield },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

// ============ Helpers ============

function formatNumber(n: number): string {
    return n.toLocaleString('zh-TW');
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ============ Component ============

export default function Overview() {
    const [data, setData] = useState<StatsData>({
        identity: null,
        idServer: null,
        tokenStats: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [idServer, identity, tokenStats] = await Promise.all([
                getDashboardIdentityServer(7),
                getDashboardIdentity(),
                getStatistics(),
            ]);
            setData({ identity, idServer, tokenStats });
        } catch (err) {
            setError(err instanceof Error ? err.message : '載入失敗');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const { identity, idServer, tokenStats } = data;

    const stats = [
        {
            label: '註冊使用者',
            value: identity ? formatNumber(identity.usersTotal) : '-',
            sub: identity ? `${identity.rolesTotal} 個角色` : '',
            icon: Users,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
        },
        {
            label: '客戶端應用',
            value: idServer ? formatNumber(idServer.clientsTotal) : '-',
            sub: idServer ? `${idServer.identityProvidersTotal} 個身分提供者` : '',
            icon: Globe,
            color: 'text-purple-400',
            bg: 'bg-purple-400/10',
        },
        {
            label: 'API 資源',
            value: idServer ? formatNumber(idServer.apiResourcesTotal) : '-',
            sub: idServer ? `${idServer.apiScopesTotal} 個 Scope` : '',
            icon: Shield,
            color: 'text-green-400',
            bg: 'bg-green-400/10',
        },
        {
            label: '活躍 Token',
            value: tokenStats ? formatNumber(tokenStats.activeTokens) : '-',
            sub: tokenStats ? `${tokenStats.activeUsers} 個活躍使用者` : '',
            icon: Key,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10',
        },
    ];

    // 審計日誌趨勢（最近 7 天）
    const auditLogs = idServer?.auditLogsPerDaysTotal ?? [];
    const maxLogTotal = Math.max(...auditLogs.map((l) => l.total), 1);

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[var(--color-text-secondary)]">
                        系統總覽
                    </h1>
                    <p className="text-[var(--color-text-secondary)] mt-2">
                        Identity Server 即時運行狀態
                    </p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    <span className="text-sm">重新整理</span>
                </button>
            </motion.div>

            {/* Error */}
            {error && (
                <motion.div
                    variants={itemVariants}
                    className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"
                >
                    <AlertTriangle size={20} />
                    <span className="text-sm">{error}</span>
                    <button
                        onClick={loadData}
                        className="ml-auto text-sm underline hover:text-red-300"
                    >
                        重試
                    </button>
                </motion.div>
            )}

            {/* Loading overlay for stats */}
            {loading && !identity && (
                <motion.div
                    variants={itemVariants}
                    className="flex items-center justify-center py-20"
                >
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                </motion.div>
            )}

            {/* Stats Grid */}
            {(!loading || identity) && (
                <motion.div
                    variants={itemVariants}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
                >
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            whileHover={{ scale: 1.02, y: -2 }}
                            className="glass p-6 rounded-2xl flex items-start justify-between group cursor-default hover:border-[rgba(255,255,255,0.15)] transition-all"
                        >
                            <div>
                                <p className="text-[var(--color-text-secondary)] text-sm font-medium mb-1">
                                    {stat.label}
                                </p>
                                <h3 className="text-3xl font-bold text-white tracking-tight">
                                    {stat.value}
                                </h3>
                                {stat.sub && (
                                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                                        {stat.sub}
                                    </p>
                                )}
                            </div>
                            <div
                                className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}
                            >
                                <stat.icon size={24} />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Main Content Grid */}
            {(!loading || identity) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Quick Actions */}
                    <motion.div variants={itemVariants} className="lg:col-span-1">
                        <div className="glass rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-white">快速操作</h2>
                                <TrendingUp size={18} className="text-[var(--color-accent-primary)]" />
                            </div>
                            <div className="space-y-3">
                                {quickActions.map((action, index) => (
                                    <motion.a
                                        key={index}
                                        href={`${import.meta.env.BASE_URL}${action.path.replace(/^\//, '')}`}
                                        whileHover={{ x: 4 }}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] border border-transparent hover:border-[rgba(255,255,255,0.1)] transition-all group"
                                    >
                                        <div className="p-2 rounded-lg bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] group-hover:bg-[var(--color-accent-primary)]/20 transition-colors">
                                            <action.icon size={18} />
                                        </div>
                                        <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-white transition-colors">
                                            {action.label}
                                        </span>
                                    </motion.a>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Audit Log Trend (7 days) */}
                    <motion.div variants={itemVariants} className="lg:col-span-2">
                        <div className="glass rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-white">
                                    審計日誌趨勢
                                    <span className="text-sm font-normal text-[var(--color-text-muted)] ml-2">
                                        近 7 天
                                    </span>
                                </h2>
                                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                                    <BarChart3 size={16} />
                                    <span>
                                        日均 {idServer ? formatNumber(idServer.auditLogsAvg) : '-'} 筆
                                    </span>
                                </div>
                            </div>
                            {auditLogs.length > 0 ? (
                                <div className="flex items-end gap-2 h-40">
                                    {auditLogs.map((log, i) => {
                                        const heightPct = Math.max((log.total / maxLogTotal) * 100, 4);
                                        return (
                                            <div
                                                key={i}
                                                className="flex-1 flex flex-col items-center gap-2"
                                            >
                                                <span className="text-xs text-[var(--color-text-muted)]">
                                                    {formatNumber(log.total)}
                                                </span>
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${heightPct}%` }}
                                                    transition={{ delay: i * 0.08, duration: 0.4 }}
                                                    className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 min-h-[4px]"
                                                />
                                                <span className="text-xs text-[var(--color-text-muted)]">
                                                    {formatDate(log.created)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">
                                    {loading ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        '暫無審計日誌資料'
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* System Status */}
            {(!loading || identity) && (
                <motion.div variants={itemVariants}>
                    <div className="glass rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white">系統狀態</h2>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                <span className="text-sm text-green-400">運行中</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatusItem
                                label="Identity 資源"
                                value={idServer ? `${idServer.identityResourcesTotal} 個` : '-'}
                            />
                            <StatusItem
                                label="API Scope"
                                value={idServer ? `${idServer.apiScopesTotal} 個` : '-'}
                            />
                            <StatusItem
                                label="Token 已撤銷"
                                value={tokenStats ? formatNumber(tokenStats.revokedTokens) : '-'}
                                warn={tokenStats ? tokenStats.revokedTokens > 0 : false}
                            />
                            <StatusItem
                                label="即將到期 Token"
                                value={tokenStats ? formatNumber(tokenStats.expiringSoon) : '-'}
                                warn={tokenStats ? tokenStats.expiringSoon > 10 : false}
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

function StatusItem({
    label,
    value,
    warn = false,
}: {
    label: string;
    value: string;
    warn?: boolean;
}) {
    return (
        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">{label}</p>
            <p className={`text-xl font-semibold ${warn ? 'text-amber-400' : 'text-white'}`}>
                {value}
            </p>
        </div>
    );
}
