/**
 * API Service Base
 * UC Capital Identity Admin
 *
 * API 請求基礎服務 - 使用 Axios 搭配認證 Token
 */

import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { getUserManager } from '../contexts/AuthContext';
import { logApi, logError } from '../utils/debugLogger';

/**
 * 取得 API 基礎 URL
 * 開發環境：使用相對路徑讓 Vite proxy 可以正確轉發請求
 * 正式環境：使用 VITE_ADMIN_API_URL 環境變數
 */
const getBaseUrl = (): string => {
    // 正式環境使用環境變數
    const adminApiUrl = import.meta.env.VITE_ADMIN_API_URL;
    if (adminApiUrl) {
        return adminApiUrl;
    }
    // 開發環境使用相對路徑（Vite proxy）
    return '';
};

/**
 * 建立 Axios 實例
 */
export const api: AxiosInstance = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

/**
 * 取得 Access Token
 */
async function getAccessToken(): Promise<string | null> {
    try {
        const userManager = getUserManager();
        const user = await userManager.getUser();
        logApi('getAccessToken', { hasUser: !!user, expired: user?.expired });

        if (user && !user.expired) {
            return user.access_token;
        }

        // 嘗試靜默更新
        try {
            logApi('Attempting silent renew for token');
            const renewedUser = await userManager.signinSilent();
            logApi('Silent renew result', { success: !!renewedUser });
            return renewedUser?.access_token || null;
        } catch (err) {
            logError('API', 'Silent renew failed in getAccessToken', err);
            return null;
        }
    } catch (err) {
        logError('API', 'getAccessToken failed', err);
        return null;
    }
}

/**
 * 請求攔截器 - 添加認證 Token
 */
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await getAccessToken();

        logApi(`Request: ${config.method?.toUpperCase()} ${config.url}`, { hasToken: !!token });

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        logError('API', 'Request interceptor error', error);
        return Promise.reject(error);
    }
);

/**
 * 回應攔截器 - 處理錯誤和認證
 */
api.interceptors.response.use(
    (response) => {
        logApi(`Response: ${response.status} ${response.statusText}`, {
            url: response.config.url,
        });
        return response;
    },
    async (error: AxiosError) => {
        logError('API', 'API Error', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            message: error.message,
        });

        // 處理 401 未授權
        if (error.response?.status === 401) {
            logApi('Received 401, triggering login');
            try {
                const userManager = getUserManager();
                await userManager.signinRedirect();
            } catch (redirectError) {
                logError('API', 'Failed to redirect to login', redirectError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
