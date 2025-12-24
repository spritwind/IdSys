import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    Shield,
    Key,
    Globe,
    FileText,
    AlertCircle,
    Building2,
    ChevronDown,
    LogOut,
    Settings,
    Layers,
    Lock,
    KeyRound,
    UserCog,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { logRoute } from '../../utils/debugLogger';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    path?: string;
    children?: MenuItem[];
}

const menuItems: MenuItem[] = [
    {
        icon: LayoutDashboard,
        label: '儀表板',
        path: '/dashboard',
    },
    {
        icon: Settings,
        label: 'IdentityServer 設定',
        children: [
            { icon: Globe, label: '客戶端', path: '/clients' },
            { icon: Layers, label: 'API 資源', path: '/api-resources' },
            { icon: Lock, label: 'API 範圍', path: '/api-scopes' },
            { icon: Shield, label: '身份資源', path: '/identity-resources' },
        ],
    },
    {
        icon: Users,
        label: '身份管理',
        children: [
            { icon: UserCog, label: '使用者', path: '/users' },
            { icon: Shield, label: '角色', path: '/roles' },
            { icon: Lock, label: '舊權限控管', path: '/permissions' },
        ],
    },
    {
        icon: Key,
        label: '安全性',
        children: [
            { icon: Globe, label: '外部提供者', path: '/identity-providers' },
            { icon: KeyRound, label: '持久化授權', path: '/grants' },
            { icon: Key, label: '加密金鑰', path: '/keys' },
        ],
    },
    {
        icon: FileText,
        label: '日誌',
        children: [
            { icon: FileText, label: '稽核日誌', path: '/logs/audit' },
            { icon: AlertCircle, label: '錯誤日誌', path: '/logs/errors' },
        ],
    },
    {
        icon: Building2,
        label: '組織架構',
        path: '/organization',
    },
];

export function Sidebar() {
    const location = useLocation();
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['IdentityServer 設定', '身份管理']);

    const toggleGroup = (label: string) => {
        setExpandedGroups((prev) =>
            prev.includes(label)
                ? prev.filter((g) => g !== label)
                : [...prev, label]
        );
    };

    const isGroupActive = (children: MenuItem[]) =>
        children.some((child) => child.path && location.pathname.startsWith(child.path));

    // 記錄導航事件
    const handleNavClick = useCallback((path: string, label: string) => {
        logRoute('Navigation clicked', { from: location.pathname, to: path, label });
    }, [location.pathname]);

    return (
        <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-64 h-screen fixed left-0 top-0 z-50 flex flex-col border-r border-[rgba(255,255,255,0.08)] bg-[rgba(10,10,15,0.6)] backdrop-blur-xl"
        >
            {/* Logo Section */}
            <div className="h-20 flex items-center px-4 border-b border-[rgba(255,255,255,0.05)]">
                <a href="/dashboard" className="flex items-center gap-3 group">
                    <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-white/10 group-hover:ring-[var(--color-accent-primary)]/30 transition-all">
                        <img
                            src="/images/uc-capital-logo.png"
                            alt="UC Capital Logo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <span className="font-bold text-base tracking-wide text-white block">
                            優式資本
                        </span>
                        <p className="text-[10px] text-[var(--color-text-muted)] tracking-wider">
                            UC CAPITAL
                        </p>
                    </div>
                </a>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto no-scrollbar">
                {menuItems.map((item) => (
                    <div key={item.label}>
                        {item.children ? (
                            // Group with children
                            <div className="mb-1">
                                <button
                                    onClick={() => toggleGroup(item.label)}
                                    className={clsx(
                                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200',
                                        'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5',
                                        isGroupActive(item.children) && 'text-white'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={18} />
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </div>
                                    <ChevronDown
                                        size={16}
                                        className={clsx(
                                            'transition-transform duration-200',
                                            expandedGroups.includes(item.label) && 'rotate-180'
                                        )}
                                    />
                                </button>

                                <AnimatePresence>
                                    {expandedGroups.includes(item.label) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="ml-4 pl-3 border-l border-white/10 space-y-1 py-1">
                                                {item.children.map((child) => (
                                                    <NavLink
                                                        key={child.path}
                                                        to={child.path!}
                                                        onClick={() => handleNavClick(child.path!, child.label)}
                                                        className={({ isActive }) => clsx(
                                                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                                                            isActive
                                                                ? 'text-white bg-[var(--color-accent-primary)]/15 border-l-2 border-[var(--color-accent-primary)] -ml-[1px]'
                                                                : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
                                                        )}
                                                    >
                                                        <child.icon size={16} />
                                                        <span>{child.label}</span>
                                                    </NavLink>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            // Single item
                            <NavLink
                                to={item.path!}
                                onClick={() => handleNavClick(item.path!, item.label)}
                                className={({ isActive }) => clsx(
                                    'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group',
                                    isActive
                                        ? 'text-white'
                                        : 'text-[var(--color-text-secondary)] hover:text-white'
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute inset-0 bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.2)] rounded-xl"
                                                initial={false}
                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                        <item.icon
                                            size={18}
                                            className={clsx(
                                                'relative z-10 transition-colors duration-300',
                                                isActive ? 'text-[var(--color-accent-primary)]' : 'group-hover:text-white'
                                            )}
                                        />
                                        <span className="relative z-10 text-sm font-medium">
                                            {item.label}
                                        </span>
                                        {!isActive && (
                                            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[rgba(255,255,255,0.03)]" />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        )}
                    </div>
                ))}
            </nav>

            {/* User Footer */}
            <div className="p-3 border-t border-[rgba(255,255,255,0.05)]">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--color-text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.03)] transition-all group">
                    <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
                    <span className="text-sm font-medium">登出</span>
                </button>
            </div>
        </motion.aside>
    );
}
