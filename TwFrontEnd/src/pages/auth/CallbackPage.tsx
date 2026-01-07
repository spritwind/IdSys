/**
 * OAuth Callback Page
 * UC Capital Identity Admin
 *
 * 處理 OAuth 2.0 / OIDC 登入回調
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function CallbackPage() {
    const { isAuthenticated, error } = useAuth();
    const navigate = useNavigate();
    const [processingMessage, setProcessingMessage] = useState('正在處理登入...');

    useEffect(() => {
        // 更新處理訊息
        const messages = [
            '正在驗證身份...',
            '正在取得授權...',
            '正在載入使用者資料...',
        ];

        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % messages.length;
            setProcessingMessage(messages[index]);
        }, 1500);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        console.log('[CallbackPage] isAuthenticated:', isAuthenticated, 'error:', error?.message);
        if (isAuthenticated) {
            const returnUrl = sessionStorage.getItem('returnUrl') || '/dashboard';
            console.log('[CallbackPage] Authenticated! Navigating to:', returnUrl);
            sessionStorage.removeItem('returnUrl');

            // 延遲一下讓使用者看到成功訊息
            setTimeout(() => {
                console.log('[CallbackPage] Executing navigate to:', returnUrl);
                navigate(returnUrl, { replace: true });
            }, 500);
        }
    }, [isAuthenticated, navigate, error]);

    // 錯誤狀態
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        {/* 錯誤圖示 */}
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 mb-2">登入失敗</h1>
                        <p className="text-slate-600 mb-6">{error.message || '發生未知錯誤，請稍後再試。'}</p>

                        <a
                            href={`${import.meta.env.BASE_URL}auth/login`}
                            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
                        >
                            重新登入
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // 成功狀態
    if (isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center">
                    {/* 成功圖示 */}
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 mb-2">登入成功</h1>
                    <p className="text-slate-600">正在跳轉到管理介面...</p>
                </div>
            </div>
        );
    }

    // 處理中狀態
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="text-center">
                {/* Logo */}
                <div className="mb-8">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25">
                        <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                </div>

                {/* 載入動畫 */}
                <div className="relative mb-8">
                    <div className="w-16 h-16 mx-auto">
                        <svg className="animate-spin w-full h-full text-blue-600" viewBox="0 0 24 24" fill="none">
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    </div>
                </div>

                <h1 className="text-xl font-semibold text-slate-900 mb-2">{processingMessage}</h1>
                <p className="text-slate-500">請稍候，這可能需要幾秒鐘...</p>

                {/* 進度指示器 */}
                <div className="mt-8 flex justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
}

export default CallbackPage;
