/**
 * OIDC Authentication Configuration
 * UC Capital Identity Admin
 *
 * OpenID Connect 認證配置
 */

import type { UserManagerSettings } from 'oidc-client-ts';

// 環境配置
const isDevelopment = import.meta.env.DEV;

// Identity Server 設定
export const IDENTITY_SERVER_URL = isDevelopment
    ? 'https://localhost:44310'
    : (import.meta.env.VITE_IDENTITY_SERVER_URL as string);

// Admin API 設定
export const ADMIN_API_URL = isDevelopment
    ? 'https://localhost:44303'
    : (import.meta.env.VITE_ADMIN_API_URL as string);

// React App 設定
export const APP_URL = isDevelopment
    ? 'http://localhost:5173'
    : (import.meta.env.VITE_APP_URL as string);

// 取得基礎路徑 (開發環境為 '/'，正式環境為 '/app/')
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, ''); // 移除結尾斜線

/**
 * OIDC 客戶端配置
 */
export const oidcConfig: UserManagerSettings = {
    // Identity Server 設定
    authority: IDENTITY_SERVER_URL,

    // 客戶端設定
    client_id: 'uc_capital_react_admin',

    // 回調 URL (包含基礎路徑)
    redirect_uri: `${APP_URL}${BASE_PATH}/auth/callback`,
    post_logout_redirect_uri: `${APP_URL}${BASE_PATH}/`,
    silent_redirect_uri: `${APP_URL}${BASE_PATH}/auth/silent-renew`,

    // 授權範圍
    scope: 'openid profile email roles offline_access uc_capital_admin_api',

    // 授權流程
    response_type: 'code',

    // Token 設定
    automaticSilentRenew: true,
    includeIdTokenInSilentRenew: true,

    // 載入使用者資訊
    loadUserInfo: true,

    // 監控 session
    monitorSession: true,

    // Token 存儲
    userStore: undefined, // 使用預設 sessionStorage
};

/**
 * 認證路由
 */
export const AUTH_ROUTES = {
    login: '/auth/login',
    callback: '/auth/callback',
    silentRenew: '/auth/silent-renew',
    logout: '/auth/logout',
} as const;

/**
 * 需要認證的路由前綴
 */
export const PROTECTED_ROUTES = [
    '/dashboard',
    '/organization',
    '/clients',
    '/api-resources',
    '/identity-resources',
    '/users',
    '/roles',
    '/logs',
    '/settings',
];

/**
 * 公開路由（不需要認證）
 */
export const PUBLIC_ROUTES = [
    '/',
    '/auth/login',
    '/auth/callback',
    '/auth/silent-renew',
    '/auth/logout',
];

/**
 * 檢查路由是否需要認證
 */
export function isProtectedRoute(pathname: string): boolean {
    return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * 檢查路由是否為公開路由
 */
export function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route));
}
