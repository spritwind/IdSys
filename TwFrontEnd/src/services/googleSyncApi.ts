/**
 * Google Workspace Sync API 服務
 * UC Capital Identity Admin
 *
 * 呼叫後端 GoogleWorkspaceSyncController API
 */

import { api } from './api';

// API 基礎路徑
const API_BASE = '/api/v2/google-sync';

// DTO 型別定義
export interface GoogleSyncPreviewDto {
    organizationsFromGoogle: number;
    membersFromGoogle: number;
    membersWithMissingOrg: number;
    existingOrganizations: number;
    existingMembers: number;
    organizationPaths: string[];
    warnings: string[];
    previewedAt: string;
}

export interface GoogleSyncResultDto {
    success: boolean;
    message: string;
    organizationsCreated: number;
    organizationsUpdated: number;
    organizationsDisabled: number;
    membersSynced: number;
    membersFailed: number;
    failedEmails: string[];
    warnings: string[];
    syncedAt: string;
    durationMs: number;
}

export interface GoogleSyncRequestDto {
    tenantId?: string | null;
    targetEmails?: string[] | null;
    syncOrganizations: boolean;
    syncMembers: boolean;
    dryRun: boolean;
}

export interface GoogleSyncHealthDto {
    status: 'healthy' | 'unhealthy';
    message: string;
    error?: string;
    timestamp: string;
}

// API 服務
export const googleSyncApi = {
    /**
     * 健康檢查 - 測試 Google API 連線
     */
    healthCheck: async (): Promise<GoogleSyncHealthDto> => {
        const response = await api.get<GoogleSyncHealthDto>(`${API_BASE}/health`);
        return response.data;
    },

    /**
     * 預覽同步內容（不寫入資料庫）
     */
    preview: async (tenantId?: string): Promise<GoogleSyncPreviewDto> => {
        const params = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
        const response = await api.get<GoogleSyncPreviewDto>(`${API_BASE}/preview${params}`);
        return response.data;
    },

    /**
     * 同步組織架構
     */
    syncOrganizations: async (tenantId?: string): Promise<GoogleSyncResultDto> => {
        const params = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
        const response = await api.post<GoogleSyncResultDto>(`${API_BASE}/organizations${params}`);
        return response.data;
    },

    /**
     * 同步人員對應
     */
    syncMembers: async (tenantId?: string, targetEmails?: string): Promise<GoogleSyncResultDto> => {
        const searchParams = new URLSearchParams();
        if (tenantId) searchParams.append('tenantId', tenantId);
        if (targetEmails) searchParams.append('targetEmails', targetEmails);
        const params = searchParams.toString() ? `?${searchParams.toString()}` : '';
        const response = await api.post<GoogleSyncResultDto>(`${API_BASE}/members${params}`);
        return response.data;
    },

    /**
     * 完整同步（組織架構 + 人員對應）
     */
    fullSync: async (request: GoogleSyncRequestDto): Promise<GoogleSyncResultDto> => {
        const response = await api.post<GoogleSyncResultDto>(`${API_BASE}/full`, request);
        return response.data;
    },
};

export default googleSyncApi;
