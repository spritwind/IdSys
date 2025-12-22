/**
 * Login Page
 * UC Capital Identity Admin
 *
 * 精美的登入頁面設計
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
    const { isAuthenticated, isLoading, login, error } = useAuth();
    const navigate = useNavigate();

    // 如果已認證，重定向到儀表板
    useEffect(() => {
        if (isAuthenticated) {
            const returnUrl = sessionStorage.getItem('returnUrl') || '/dashboard';
            sessionStorage.removeItem('returnUrl');
            navigate(returnUrl, { replace: true });
        }
    }, [isAuthenticated, navigate]);

    return (
        <div className="min-h-screen flex">
            {/* 左側 - 品牌區域 */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden">
                {/* 背景裝飾 */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-400/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* 網格背景 */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />

                {/* 內容 */}
                <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
                    {/* Logo */}
                    <div className="mb-12">
                        <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">UC Capital</h1>
                                <p className="text-blue-200 text-sm">Identity Admin</p>
                            </div>
                        </div>
                    </div>

                    {/* 標語 */}
                    <div className="mb-12">
                        <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
                            安全、高效的
                            <br />
                            身份管理中心
                        </h2>
                        <p className="text-xl text-blue-100 leading-relaxed max-w-md">
                            統一管理企業身份認證、授權與存取控制，打造安全可靠的數位化基礎設施。
                        </p>
                    </div>

                    {/* 功能特點 */}
                    <div className="space-y-4">
                        <Feature
                            icon={
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            }
                            title="企業級安全"
                            description="符合 OAuth 2.0 / OpenID Connect 標準"
                        />
                        <Feature
                            icon={
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            }
                            title="組織架構管理"
                            description="完整的部門與人員階層管理"
                        />
                        <Feature
                            icon={
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                            }
                            title="彈性配置"
                            description="客戶端、API 資源與範圍管理"
                        />
                    </div>
                </div>
            </div>

            {/* 右側 - 登入區域 */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="w-full max-w-md">
                    {/* 移動端 Logo */}
                    <div className="lg:hidden mb-8 text-center">
                        <div className="inline-flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <h1 className="text-xl font-bold text-slate-900">UC Capital</h1>
                                <p className="text-slate-500 text-sm">Identity Admin</p>
                            </div>
                        </div>
                    </div>

                    {/* 登入卡片 */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/25">
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">歡迎回來</h2>
                            <p className="text-slate-500">請登入以繼續使用管理介面</p>
                        </div>

                        {/* 錯誤訊息 */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                                <div className="flex items-start space-x-3">
                                    <svg
                                        className="w-5 h-5 text-red-500 mt-0.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-medium text-red-800">登入失敗</p>
                                        <p className="text-sm text-red-600 mt-1">{error.message}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 登入按鈕 */}
                        <button
                            onClick={login}
                            disabled={isLoading}
                            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg
                                        className="animate-spin h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    <span>正在跳轉...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                                        />
                                    </svg>
                                    <span>使用 SSO 登入</span>
                                </>
                            )}
                        </button>

                        {/* 分隔線 */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-slate-400">安全登入說明</span>
                            </div>
                        </div>

                        {/* 說明 */}
                        <div className="space-y-4 text-sm text-slate-500">
                            <div className="flex items-start space-x-3">
                                <svg
                                    className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span>使用企業 Single Sign-On (SSO) 進行身份驗證</span>
                            </div>
                            <div className="flex items-start space-x-3">
                                <svg
                                    className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span>支援 Google、AD、LDAP 等多種驗證方式</span>
                            </div>
                            <div className="flex items-start space-x-3">
                                <svg
                                    className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span>採用 PKCE 授權碼流程，確保傳輸安全</span>
                            </div>
                        </div>
                    </div>

                    {/* 版權 */}
                    <p className="text-center text-slate-400 text-sm mt-8">
                        &copy; {new Date().getFullYear()} UC Capital. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * 功能特點組件
 */
function Feature({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {icon}
                </svg>
            </div>
            <div>
                <h3 className="text-white font-semibold">{title}</h3>
                <p className="text-blue-200 text-sm">{description}</p>
            </div>
        </div>
    );
}

export default LoginPage;
