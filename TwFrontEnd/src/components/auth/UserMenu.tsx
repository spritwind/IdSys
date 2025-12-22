/**
 * User Menu Component
 * UC Capital Identity Admin
 *
 * 使用者選單 - 顯示登入使用者資訊與操作
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function UserMenu() {
    const { user, isAuthenticated, login, logout, isLoading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // 點擊外部關閉選單
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 未認證狀態
    if (!isAuthenticated) {
        return (
            <button
                onClick={login}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm disabled:opacity-50"
            >
                {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                )}
                登入
            </button>
        );
    }

    // 使用者頭像
    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    return (
        <div className="relative" ref={menuRef}>
            {/* 使用者按鈕 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-100 transition-colors duration-200"
            >
                {/* 頭像 */}
                {user?.picture ? (
                    <img
                        src={user.picture}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                    />
                ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white shadow-sm">
                        {initials}
                    </div>
                )}

                {/* 使用者資訊 */}
                <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-slate-900 truncate max-w-[120px]">
                        {user?.name || 'User'}
                    </div>
                    <div className="text-xs text-slate-500 truncate max-w-[120px]">
                        {user?.email || ''}
                    </div>
                </div>

                {/* 下拉箭頭 */}
                <svg
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* 下拉選單 */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* 使用者資訊區塊 */}
                    <div className="px-4 py-3 border-b border-slate-100">
                        <div className="flex items-center space-x-3">
                            {user?.picture ? (
                                <img
                                    src={user.picture}
                                    alt={user.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                                    {initials}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-900 truncate">{user?.name}</div>
                                <div className="text-sm text-slate-500 truncate">{user?.email}</div>
                            </div>
                        </div>

                        {/* 角色標籤 */}
                        {user?.roles && user.roles.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                                {user.roles.slice(0, 3).map((role) => (
                                    <span
                                        key={role}
                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
                                    >
                                        {role}
                                    </span>
                                ))}
                                {user.roles.length > 3 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                                        +{user.roles.length - 3}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 選單項目 */}
                    <div className="py-1">
                        <MenuItem
                            icon={
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            }
                            label="個人資料"
                            onClick={() => setIsOpen(false)}
                        />
                        <MenuItem
                            icon={
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            }
                            secondaryIcon={
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            }
                            label="偏好設定"
                            onClick={() => setIsOpen(false)}
                        />
                    </div>

                    {/* 分隔線 */}
                    <div className="my-1 border-t border-slate-100" />

                    {/* 登出 */}
                    <div className="py-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                logout();
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                        >
                            <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            登出
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * 選單項目組件
 */
function MenuItem({
    icon,
    secondaryIcon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    secondaryIcon?: React.ReactNode;
    label: string;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-150"
        >
            <svg className="w-5 h-5 mr-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {icon}
                {secondaryIcon}
            </svg>
            {label}
        </button>
    );
}

export default UserMenu;
