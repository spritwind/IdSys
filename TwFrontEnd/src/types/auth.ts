/**
 * Authentication Types
 * UC Capital Identity Admin
 *
 * 認證相關類型定義
 */

import type { User } from 'oidc-client-ts';

/**
 * 使用者資訊
 */
export interface UserInfo {
    id: string;
    username: string;
    email: string;
    emailVerified: boolean;
    name: string;
    givenName?: string;
    familyName?: string;
    picture?: string;
    roles: string[];
    isAdmin: boolean;
}

/**
 * 認證狀態
 */
export type AuthStatus =
    | 'loading'      // 載入中
    | 'authenticated' // 已認證
    | 'unauthenticated' // 未認證
    | 'error';       // 錯誤

/**
 * 認證上下文
 */
export interface AuthContextType {
    // 狀態
    status: AuthStatus;
    user: UserInfo | null;
    accessToken: string | null;
    error: Error | null;

    // 原始 OIDC User
    oidcUser: User | null;

    // 方法
    login: () => Promise<void>;
    logout: () => Promise<void>;
    silentRenew: () => Promise<void>;

    // 工具
    isAuthenticated: boolean;
    isLoading: boolean;
    hasRole: (role: string) => boolean;
}

/**
 * 從 OIDC User 提取使用者資訊
 */
export function extractUserInfo(user: User | null): UserInfo | null {
    if (!user?.profile) {
        return null;
    }

    const profile = user.profile;

    // 提取角色
    let roles: string[] = [];
    if (profile.role) {
        roles = Array.isArray(profile.role) ? profile.role : [profile.role];
    }

    // 判斷是否為管理員
    const isAdmin = roles.some(
        (r) =>
            r === 'UCCapitalAdministrator' ||
            r === 'SkorubaIdentityAdminAdministrator' ||
            r === 'admin' ||
            r === 'Administrator'
    );

    return {
        id: profile.sub || '',
        username: profile.preferred_username || profile.name || '',
        email: profile.email || '',
        emailVerified: profile.email_verified === true,
        name: profile.name || profile.preferred_username || '',
        givenName: profile.given_name,
        familyName: profile.family_name,
        picture: profile.picture,
        roles,
        isAdmin,
    };
}

/**
 * 認證錯誤類型
 */
export class AuthError extends Error {
    code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = 'AuthError';
        this.code = code;
    }
}

/**
 * 常見認證錯誤碼
 */
export const AUTH_ERROR_CODES = {
    LOGIN_REQUIRED: 'login_required',
    TOKEN_EXPIRED: 'token_expired',
    INVALID_TOKEN: 'invalid_token',
    NETWORK_ERROR: 'network_error',
    UNAUTHORIZED: 'unauthorized',
    FORBIDDEN: 'forbidden',
} as const;
