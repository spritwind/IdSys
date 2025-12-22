/**
 * Protected Route Component
 * UC Capital Identity Admin
 *
 * 路由保護組件 - 確保使用者已認證
 */

import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { logRoute } from '../../utils/debugLogger';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRoles?: string[];
}

/**
 * 路由保護組件
 *
 * @param children - 子組件
 * @param requiredRoles - 需要的角色（可選）
 */
export function ProtectedRoute({
    children,
    requiredRoles = [],
}: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user, hasRole, login } = useAuth();
    const location = useLocation();
    const loginTriggered = useRef(false);

    // 追蹤狀態變化
    const prevAuthState = useRef({ isLoading, isAuthenticated, hasUser: !!user });
    useEffect(() => {
        const current = { isLoading, isAuthenticated, hasUser: !!user };
        const prev = prevAuthState.current;

        // 只在狀態真正變化時記錄
        if (prev.isLoading !== current.isLoading ||
            prev.isAuthenticated !== current.isAuthenticated ||
            prev.hasUser !== current.hasUser) {
            logRoute('Auth state changed', {
                from: prev,
                to: current,
                path: location.pathname,
            });
            prevAuthState.current = current;
        }
    }, [isLoading, isAuthenticated, user, location.pathname]);

    // 重置登入狀態當認證成功時
    useEffect(() => {
        if (isAuthenticated) {
            loginTriggered.current = false;
            logRoute('Login triggered flag reset (authenticated)');
        }
    }, [isAuthenticated]);

    // 除錯訊息
    logRoute('ProtectedRoute render', {
        path: location.pathname,
        isLoading,
        isAuthenticated,
        hasUser: !!user,
        loginTriggered: loginTriggered.current,
    });

    // 載入中顯示載入畫面
    if (isLoading) {
        logRoute('Showing loading screen');
        return <LoadingScreen />;
    }

    // 未認證 - 重定向到登入
    if (!isAuthenticated) {
        // 防止重複觸發登入
        if (!loginTriggered.current) {
            loginTriggered.current = true;
            logRoute('Not authenticated, triggering login', { path: location.pathname });
            // 儲存當前路徑以便登入後返回
            sessionStorage.setItem('returnUrl', location.pathname + location.search);
            // 自動觸發登入
            login();
        }

        return <LoadingScreen message="正在跳轉至登入頁面..." />;
    }

    logRoute('User authenticated, rendering children', { path: location.pathname });

    // 檢查角色權限
    if (requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.some((role) => hasRole(role));

        if (!hasRequiredRole) {
            return <AccessDenied user={user} requiredRoles={requiredRoles} />;
        }
    }

    return <>{children}</>;
}

/**
 * 載入畫面
 */
function LoadingScreen({ message = '載入中...' }: { message?: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="text-center">
                {/* Logo */}
                <div className="mb-8">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <svg
                            className="w-8 h-8 text-white animate-pulse"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>
                </div>

                {/* 載入動畫 */}
                <div className="flex justify-center mb-4">
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>

                {/* 訊息 */}
                <p className="text-slate-600 font-medium">{message}</p>
            </div>
        </div>
    );
}

/**
 * 無權限畫面
 */
function AccessDenied({
    user,
    requiredRoles,
}: {
    user: { name: string; roles: string[] } | null;
    requiredRoles: string[];
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    {/* 警告圖示 */}
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 mb-2">存取被拒絕</h1>

                    <p className="text-slate-600 mb-6">
                        抱歉，您沒有權限存取此頁面。請聯繫系統管理員以取得必要的權限。
                    </p>

                    {/* 使用者資訊 */}
                    {user && (
                        <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
                            <div className="text-sm text-slate-500 mb-1">目前使用者</div>
                            <div className="font-medium text-slate-900">{user.name}</div>
                            <div className="text-sm text-slate-500 mt-2">
                                您的角色：
                                {user.roles.length > 0 ? (
                                    <span className="text-slate-700">{user.roles.join(', ')}</span>
                                ) : (
                                    <span className="text-slate-400">無</span>
                                )}
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                需要角色：<span className="text-red-600">{requiredRoles.join(' 或 ')}</span>
                            </div>
                        </div>
                    )}

                    {/* 返回按鈕 */}
                    <a
                        href="/dashboard"
                        className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
                    >
                        返回儀表板
                    </a>
                </div>
            </div>
        </div>
    );
}

export default ProtectedRoute;
