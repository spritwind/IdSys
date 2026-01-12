/**
 * Token Management API Service
 * UC Capital Identity Admin
 *
 * Token 管理 API 服務
 */

import { apiClient } from './api';

// ============ Types ============

/** 活躍 Token DTO */
export interface ActiveTokenDto {
    key: string;
    type: string;
    subjectId?: string;
    userName?: string;
    sessionId?: string;
    clientId: string;
    clientName?: string;
    creationTime: string;
    expiration?: string;
    remainingSeconds?: number;
    remainingTimeFormatted?: string;
    isExpired: boolean;
    isRevoked: boolean;
    revokedAt?: string;
    scopes?: string;
    identityProvider?: string;
}

/** 撤銷 Token DTO */
export interface RevokedTokenDto {
    id: number;
    jti: string;
    subjectId?: string;
    userName?: string;
    clientId: string;
    clientName?: string;
    tokenType: string;
    expirationTime?: string;
    revokedAt: string;
    reason?: string;
    revokedBy?: string;
}

/** Token 清單響應 */
export interface TokenListResponse<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/** Token 統計資訊 */
export interface TokenStatistics {
    activeTokens: number;
    revokedTokens: number;
    expiringSoon: number;
    expiredTokens: number;
    activeUsers: number;
    activeClients: number;
}

/** 撤銷 Token 請求 */
export interface RevokeTokenRequest {
    jti: string;
    subjectId?: string;
    clientId: string;
    tokenType?: string;
    expirationTime?: string;
    reason?: string;
}

/** Token 檢查響應 */
export interface TokenCheckResponse {
    jti: string;
    isRevoked: boolean;
}

/** 批量撤銷響應 */
export interface RevokeAllResponse {
    success: boolean;
    message: string;
    revokedCount: number;
}

// ============ API Functions ============

const BASE_URL = '/api/TokenManagement';

/**
 * 取得活躍 Token 清單
 */
export async function getActiveTokens(
    page: number = 1,
    pageSize: number = 20,
    search?: string
): Promise<TokenListResponse<ActiveTokenDto>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    if (search) params.append('search', search);

    const response = await apiClient.get<TokenListResponse<ActiveTokenDto>>(
        `${BASE_URL}/active?${params.toString()}`
    );
    return response.data;
}

/**
 * 取得使用者的活躍 Token
 */
export async function getUserActiveTokens(
    subjectId: string,
    page: number = 1,
    pageSize: number = 20
): Promise<TokenListResponse<ActiveTokenDto>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    const response = await apiClient.get<TokenListResponse<ActiveTokenDto>>(
        `${BASE_URL}/active/user/${encodeURIComponent(subjectId)}?${params.toString()}`
    );
    return response.data;
}

/**
 * 取得客戶端的活躍 Token
 */
export async function getClientActiveTokens(
    clientId: string,
    page: number = 1,
    pageSize: number = 20
): Promise<TokenListResponse<ActiveTokenDto>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    const response = await apiClient.get<TokenListResponse<ActiveTokenDto>>(
        `${BASE_URL}/active/client/${encodeURIComponent(clientId)}?${params.toString()}`
    );
    return response.data;
}

/**
 * 取得撤銷的 Token 清單
 */
export async function getRevokedTokens(
    page: number = 1,
    pageSize: number = 20
): Promise<TokenListResponse<RevokedTokenDto>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    const response = await apiClient.get<TokenListResponse<RevokedTokenDto>>(
        `${BASE_URL}/revoked?${params.toString()}`
    );
    return response.data;
}

/**
 * 取得 Token 統計資訊
 */
export async function getStatistics(): Promise<TokenStatistics> {
    const response = await apiClient.get<TokenStatistics>(`${BASE_URL}/statistics`);
    return response.data;
}

/**
 * 檢查 Token 是否已撤銷
 */
export async function checkTokenRevoked(jti: string): Promise<TokenCheckResponse> {
    const response = await apiClient.get<TokenCheckResponse>(
        `${BASE_URL}/check/${encodeURIComponent(jti)}`
    );
    return response.data;
}

/**
 * 撤銷 Token（依 JTI）
 */
export async function revokeToken(request: RevokeTokenRequest): Promise<RevokedTokenDto> {
    const response = await apiClient.post<RevokedTokenDto>(`${BASE_URL}/revoke`, request);
    return response.data;
}

/**
 * 撤銷 Token（依 Grant Key）
 */
export async function revokeByGrantKey(
    grantKey: string,
    reason?: string
): Promise<{ success: boolean; message: string }> {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const response = await apiClient.post<{ success: boolean; message: string }>(
        `${BASE_URL}/revoke/grant/${encodeURIComponent(grantKey)}${params}`
    );
    return response.data;
}

/**
 * 撤銷使用者的所有 Token
 */
export async function revokeUserTokens(
    subjectId: string,
    reason?: string
): Promise<RevokeAllResponse> {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const response = await apiClient.post<RevokeAllResponse>(
        `${BASE_URL}/revoke/user/${encodeURIComponent(subjectId)}${params}`
    );
    return response.data;
}

/**
 * 撤銷客戶端的所有 Token
 */
export async function revokeClientTokens(
    clientId: string,
    reason?: string
): Promise<RevokeAllResponse> {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const response = await apiClient.post<RevokeAllResponse>(
        `${BASE_URL}/revoke/client/${encodeURIComponent(clientId)}${params}`
    );
    return response.data;
}

/**
 * 取消撤銷
 */
export async function unrevokeToken(jti: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
        `${BASE_URL}/revoke/${encodeURIComponent(jti)}`
    );
    return response.data;
}

/**
 * 清理過期的撤銷記錄
 */
export async function cleanupExpired(): Promise<{ success: boolean; message: string; cleanedCount: number }> {
    const response = await apiClient.post<{ success: boolean; message: string; cleanedCount: number }>(
        `${BASE_URL}/cleanup`
    );
    return response.data;
}
