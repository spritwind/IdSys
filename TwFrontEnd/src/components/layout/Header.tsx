/**
 * Header Component
 * UC Capital Identity Admin
 *
 * 頂部導航列 - 整合認證系統
 */

import { Bell, Search, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
    const { user, logout } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // 點擊外部關閉選單
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 使用者頭像 initials
    const initials = user?.name
        ? user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : 'U';

    const handleLogout = () => {
        setShowUserMenu(false);
        logout();
    };

    return (
        <header className="h-20 fixed top-0 right-0 left-64 z-40 px-8 flex items-center justify-between bg-[rgba(10,10,15,0.4)] backdrop-blur-md border-b border-[rgba(255,255,255,0.05)]">
            {/* Search Bar */}
            <div className="flex items-center gap-3 w-96 px-4 py-2.5 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] focus-within:border-[rgba(255,255,255,0.2)] focus-within:bg-[rgba(255,255,255,0.05)] transition-all">
                <Search size={18} className="text-[var(--color-text-secondary)]" />
                <input
                    type="text"
                    placeholder="搜尋資源..."
                    className="bg-transparent border-none outline-none text-sm text-white placeholder-[var(--color-text-secondary)] w-full"
                />
                <kbd className="hidden md:flex items-center gap-1 px-2 py-0.5 text-xs text-[var(--color-text-muted)] bg-[rgba(255,255,255,0.05)] rounded border border-[rgba(255,255,255,0.1)]">
                    ⌘K
                </kbd>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-6">
                {/* Notifications */}
                <button className="relative p-2 rounded-full hover:bg-[rgba(255,255,255,0.05)] transition-colors group">
                    <Bell
                        size={20}
                        className="text-[var(--color-text-secondary)] group-hover:text-white transition-colors"
                    />
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] border-2 border-[var(--color-bg-primary)]"></span>
                </button>

                {/* User Menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-3 pl-6 border-l border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)] rounded-lg py-1.5 pr-2 transition-colors"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-white">
                                {user?.name || '使用者'}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                                {user?.email || ''}
                            </p>
                        </div>
                        <div className="rounded-full ring-2 ring-[rgba(255,255,255,0.1)] overflow-hidden">
                            {user?.picture ? (
                                <img
                                    src={user.picture}
                                    alt={user.name}
                                    className="w-9 h-9 object-cover"
                                />
                            ) : (
                                <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                                    {initials}
                                </div>
                            )}
                        </div>
                        <ChevronDown
                            size={16}
                            className={`text-[var(--color-text-secondary)] transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
                        />
                    </button>

                    <AnimatePresence>
                        {showUserMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[var(--color-bg-tertiary)] border border-[rgba(255,255,255,0.1)] shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                            >
                                {/* User Info Section */}
                                <div className="p-4 border-b border-[rgba(255,255,255,0.05)] bg-gradient-to-br from-[rgba(255,255,255,0.02)] to-transparent">
                                    <div className="flex items-center gap-3">
                                        {user?.picture ? (
                                            <img
                                                src={user.picture}
                                                alt={user.name}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                                                {initials}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">
                                                {user?.name || '使用者'}
                                            </p>
                                            <p className="text-xs text-[var(--color-text-secondary)] truncate">
                                                {user?.email || ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Role Tags */}
                                    {user?.roles && user.roles.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {user.roles.slice(0, 3).map((role) => (
                                                <span
                                                    key={role}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                                >
                                                    {role}
                                                </span>
                                            ))}
                                            {user.roles.length > 3 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[rgba(255,255,255,0.1)] text-[var(--color-text-secondary)]">
                                                    +{user.roles.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Menu Items */}
                                <div className="py-1">
                                    <MenuItem icon={User} label="個人資料" onClick={() => setShowUserMenu(false)} />
                                    <MenuItem
                                        icon={Settings}
                                        label="偏好設定"
                                        onClick={() => setShowUserMenu(false)}
                                    />
                                </div>

                                {/* Logout */}
                                <div className="border-t border-[rgba(255,255,255,0.05)] py-1">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut size={18} />
                                        登出
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}

/**
 * Menu Item Component
 */
function MenuItem({
    icon: Icon,
    label,
    onClick,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[var(--color-text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
        >
            <Icon size={18} />
            {label}
        </button>
    );
}
