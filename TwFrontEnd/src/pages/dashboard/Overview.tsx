import { motion } from 'framer-motion';
import {
    ArrowUpRight,
    ArrowDownRight,
    Users,
    Globe,
    Shield,
    Key,
    Activity,
    Clock,
    TrendingUp,
    AlertCircle,
} from 'lucide-react';

interface StatCard {
    label: string;
    value: string;
    trend: string;
    trendUp: boolean;
    icon: React.ElementType;
    color: string;
    bg: string;
}

const stats: StatCard[] = [
    {
        label: '註冊使用者',
        value: '12,345',
        trend: '+12.5%',
        trendUp: true,
        icon: Users,
        color: 'text-blue-400',
        bg: 'bg-blue-400/10',
    },
    {
        label: '客戶端應用',
        value: '24',
        trend: '+3',
        trendUp: true,
        icon: Globe,
        color: 'text-purple-400',
        bg: 'bg-purple-400/10',
    },
    {
        label: 'API 資源',
        value: '8',
        trend: '穩定',
        trendUp: true,
        icon: Shield,
        color: 'text-green-400',
        bg: 'bg-green-400/10',
    },
    {
        label: '活躍授權',
        value: '1,892',
        trend: '+5.2%',
        trendUp: true,
        icon: Key,
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
    },
];

const recentActivities = [
    {
        type: 'login',
        user: 'admin@uccapital.com',
        action: '登入系統',
        time: '2 分鐘前',
        icon: Activity,
        color: 'text-green-400',
    },
    {
        type: 'client',
        user: '系統管理員',
        action: '建立客戶端 "mobile-app"',
        time: '15 分鐘前',
        icon: Globe,
        color: 'text-purple-400',
    },
    {
        type: 'user',
        user: '系統管理員',
        action: '新增使用者 "john.doe"',
        time: '1 小時前',
        icon: Users,
        color: 'text-blue-400',
    },
    {
        type: 'security',
        user: '系統',
        action: '自動清理過期授權',
        time: '3 小時前',
        icon: Shield,
        color: 'text-amber-400',
    },
    {
        type: 'error',
        user: '系統',
        action: '偵測到異常登入嘗試',
        time: '5 小時前',
        icon: AlertCircle,
        color: 'text-red-400',
    },
];

const quickActions = [
    { label: '新增客戶端', path: '/clients/new', icon: Globe },
    { label: '新增使用者', path: '/users/new', icon: Users },
    { label: '檢視日誌', path: '/logs/audit', icon: Clock },
    { label: '安全報告', path: '/logs/errors', icon: Shield },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function Overview() {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            {/* Header */}
            <motion.div variants={itemVariants}>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[var(--color-text-secondary)]">
                    系統總覽
                </h1>
                <p className="text-[var(--color-text-secondary)] mt-2">
                    歡迎回來！以下是您的 Identity Server 運行狀態。
                </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                variants={itemVariants}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
            >
                {stats.map((stat, index) => (
                    <motion.div
                        key={index}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="glass p-6 rounded-2xl flex items-start justify-between group cursor-pointer hover:border-[rgba(255,255,255,0.15)] transition-all"
                    >
                        <div>
                            <p className="text-[var(--color-text-secondary)] text-sm font-medium mb-1">
                                {stat.label}
                            </p>
                            <h3 className="text-3xl font-bold text-white tracking-tight">
                                {stat.value}
                            </h3>
                            <div
                                className={`flex items-center gap-1.5 mt-3 text-sm w-fit px-2 py-1 rounded-lg ${
                                    stat.trendUp
                                        ? 'text-green-400 bg-green-400/10'
                                        : 'text-red-400 bg-red-400/10'
                                }`}
                            >
                                {stat.trendUp ? (
                                    <ArrowUpRight size={14} />
                                ) : (
                                    <ArrowDownRight size={14} />
                                )}
                                <span>{stat.trend}</span>
                            </div>
                        </div>
                        <div
                            className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}
                        >
                            <stat.icon size={24} />
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Main Content Grid */}
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
                                    href={action.path}
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

                {/* Recent Activity */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <div className="glass rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white">最近活動</h2>
                            <a
                                href={`${import.meta.env.BASE_URL}logs/audit`}
                                className="text-sm text-[var(--color-accent-primary)] hover:underline"
                            >
                                查看全部
                            </a>
                        </div>
                        <div className="space-y-4">
                            {recentActivities.map((activity, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                                >
                                    <div
                                        className={`p-2 rounded-lg ${activity.color} bg-current/10`}
                                        style={{
                                            backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)`,
                                        }}
                                    >
                                        <activity.icon size={18} className={activity.color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">
                                            {activity.action}
                                        </p>
                                        <p className="text-xs text-[var(--color-text-muted)]">
                                            {activity.user}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                                        <Clock size={12} />
                                        <span>{activity.time}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* System Status */}
            <motion.div variants={itemVariants}>
                <div className="glass rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white">系統狀態</h2>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="text-sm text-green-400">運行中</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                                IdentityServer 版本
                            </p>
                            <p className="text-xl font-semibold text-white">
                                Duende v7.0
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                                資料庫連線
                            </p>
                            <p className="text-xl font-semibold text-green-400">正常</p>
                        </div>
                        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                                上次備份
                            </p>
                            <p className="text-xl font-semibold text-white">今天 03:00</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
