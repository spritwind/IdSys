/**
 * Authentication Context & Provider
 * UC Capital Identity Admin
 *
 * 全域認證狀態管理
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { UserManager, User, WebStorageStateStore } from 'oidc-client-ts';
import { oidcConfig } from '../config/auth.config';
import type { AuthContextType, AuthStatus, UserInfo } from '../types/auth';
import { extractUserInfo } from '../types/auth';
import { logAuth, logError } from '../utils/debugLogger';

// 建立 UserManager
const userManager = new UserManager({
    ...oidcConfig,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
});

// 防止重複處理回調的標記
let callbackProcessing = false;
// 標記是否剛完成回調（防止導航後重新載入）
let justCompletedCallback = false;

// 建立 Context
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * 認證 Provider
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [oidcUser, setOidcUser] = useState<User | null>(null);
    const [error, setError] = useState<Error | null>(null);

    // 提取使用者資訊
    const user: UserInfo | null = useMemo(() => extractUserInfo(oidcUser), [oidcUser]);

    // Access Token
    const accessToken = oidcUser?.access_token || null;

    // 計算屬性
    const isAuthenticated = status === 'authenticated' && oidcUser !== null;
    const isLoading = status === 'loading';

    // 檢查角色
    const hasRole = useCallback(
        (role: string): boolean => {
            return user?.roles.includes(role) ?? false;
        },
        [user]
    );

    /**
     * 載入使用者
     */
    const loadUser = useCallback(async () => {
        try {
            logAuth('loadUser called', { path: window.location.pathname });
            setStatus('loading');
            const currentUser = await userManager.getUser();
            logAuth('getUser result', {
                found: !!currentUser,
                expired: currentUser?.expired,
                expiresAt: currentUser?.expires_at,
            });

            if (currentUser && !currentUser.expired) {
                setOidcUser(currentUser);
                setStatus('authenticated');
                setError(null);
                logAuth('User loaded successfully', { sub: currentUser.profile?.sub });
            } else {
                setOidcUser(null);
                setStatus('unauthenticated');
                logAuth('No valid user, setting unauthenticated');
            }
        } catch (err) {
            logError('Auth', 'Failed to load user', err);
            setError(err instanceof Error ? err : new Error('Failed to load user'));
            setStatus('error');
        }
    }, []);

    /**
     * 登入
     */
    const login = useCallback(async () => {
        try {
            logAuth('Login initiated', { returnUrl: window.location.pathname });
            setStatus('loading');
            // returnUrl 已由 ProtectedRoute 使用 React Router 的相對路徑設定
            // 此處不再重複設定，避免在 base path 非 '/' 時產生雙重前綴問題
            await userManager.signinRedirect();
        } catch (err) {
            logError('Auth', 'Login failed', err);
            setError(err instanceof Error ? err : new Error('Login failed'));
            setStatus('error');
        }
    }, []);

    /**
     * 登出
     */
    const logout = useCallback(async () => {
        try {
            logAuth('Logout initiated');
            setStatus('loading');
            await userManager.signoutRedirect();
        } catch (err) {
            logError('Auth', 'Logout failed', err);
            // 即使登出失敗，也清除本地狀態
            await userManager.removeUser();
            setOidcUser(null);
            setStatus('unauthenticated');
        }
    }, []);

    /**
     * 靜默更新 Token
     */
    const silentRenew = useCallback(async () => {
        try {
            logAuth('Silent renew initiated');
            const renewedUser = await userManager.signinSilent();
            if (renewedUser) {
                setOidcUser(renewedUser);
                setStatus('authenticated');
                logAuth('Silent renew successful');
            }
        } catch (err) {
            logError('Auth', 'Silent renew failed', err);
            // Token 更新失敗，需要重新登入
            setOidcUser(null);
            setStatus('unauthenticated');
        }
    }, []);

    /**
     * 處理回調與初始化
     */
    useEffect(() => {
        const handleCallback = async () => {
            const currentPath = window.location.pathname;
            const basePath = import.meta.env.BASE_URL.replace(/\/$/, ''); // 移除結尾斜線
            logAuth('handleCallback started', { path: currentPath, basePath, search: window.location.search });

            // 處理登入回調 - 只處理認證，導航由 CallbackPage 處理
            // 支援有或沒有基礎路徑的情況
            const isAuthCallback = currentPath === `${basePath}/auth/callback` || currentPath === '/auth/callback';
            if (isAuthCallback) {
                try {
                    // 檢查 URL 是否有授權碼
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.has('code')) {
                        // 防止重複處理（React 18 StrictMode 會執行兩次）
                        if (callbackProcessing) {
                            logAuth('Callback already processing, skipping...');
                            return;
                        }
                        callbackProcessing = true;
                        logAuth('Processing callback with authorization code');

                        try {
                            const callbackUser = await userManager.signinRedirectCallback();
                            setOidcUser(callbackUser);
                            setStatus('authenticated');
                            setError(null);
                            // 標記剛完成回調，防止導航到 dashboard 時觸發 loadUser 造成狀態重置
                            justCompletedCallback = true;
                            logAuth('Callback successful, user authenticated', {
                                sub: callbackUser.profile?.sub,
                                expiresAt: callbackUser.expires_at,
                            });

                            // 清除 URL 中的授權碼，防止重新整理時再次使用
                            window.history.replaceState({}, '', `${basePath}/auth/callback`);
                        } finally {
                            callbackProcessing = false;
                        }
                    } else {
                        logAuth('No authorization code in URL, loading existing user');
                        // 沒有授權碼，嘗試載入現有使用者
                        await loadUser();
                    }
                } catch (err) {
                    logError('Auth', 'Callback failed', err);
                    setError(err instanceof Error ? err : new Error('Callback failed'));
                    setStatus('error');
                    callbackProcessing = false;
                }
                return;
            }

            // 處理靜默更新回調
            const isSilentRenew = currentPath === `${basePath}/auth/silent-renew` || currentPath === '/auth/silent-renew';
            if (isSilentRenew) {
                try {
                    logAuth('Processing silent renew callback');
                    await userManager.signinSilentCallback();
                } catch (err) {
                    logError('Auth', 'Silent renew callback failed', err);
                }
                return;
            }

            // 一般頁面：載入使用者（從 sessionStorage 讀取已存在的 token）
            // 如果剛完成回調，跳過 loadUser 以避免狀態重置
            if (justCompletedCallback) {
                logAuth('Skipping loadUser - just completed callback');
                justCompletedCallback = false; // 重置標記，下次可正常載入
                return;
            }
            logAuth('Normal page, loading user from storage');
            await loadUser();
        };

        handleCallback();
    }, [loadUser]);

    /**
     * 監聽 Token 事件
     */
    useEffect(() => {
        // Token 過期
        const handleTokenExpired = () => {
            console.log('Token expired, attempting silent renew...');
            silentRenew();
        };

        // 使用者登出
        const handleUserSignedOut = () => {
            setOidcUser(null);
            setStatus('unauthenticated');
        };

        // 使用者載入
        const handleUserLoaded = (loadedUser: User) => {
            setOidcUser(loadedUser);
            setStatus('authenticated');
        };

        userManager.events.addAccessTokenExpired(handleTokenExpired);
        userManager.events.addUserSignedOut(handleUserSignedOut);
        userManager.events.addUserLoaded(handleUserLoaded);

        return () => {
            userManager.events.removeAccessTokenExpired(handleTokenExpired);
            userManager.events.removeUserSignedOut(handleUserSignedOut);
            userManager.events.removeUserLoaded(handleUserLoaded);
        };
    }, [silentRenew]);

    const contextValue: AuthContextType = useMemo(
        () => ({
            status,
            user,
            accessToken,
            error,
            oidcUser,
            login,
            logout,
            silentRenew,
            isAuthenticated,
            isLoading,
            hasRole,
        }),
        [status, user, accessToken, error, oidcUser, login, logout, silentRenew, isAuthenticated, isLoading, hasRole]
    );

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

/**
 * 使用認證 Hook
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

/**
 * 取得 UserManager 實例（進階用途）
 */
export function getUserManager(): UserManager {
    return userManager;
}

export default AuthProvider;
