/**
 * 組織架構 API 服務
 * UC Capital Identity Admin
 *
 * 呼叫後端 OrganizationController API 取得組織資料
 * 支援完整 CRUD 操作
 */

import { api } from './api';
import type {
    OrganizationGroup,
    OrganizationTreeNode,
    OrganizationStats,
    CreateOrganizationGroupRequest,
    UpdateOrganizationGroupRequest,
    DeleteConfirmation,
    DeleteResult,
    OrganizationMember,
} from '../types/organization';

// API 基礎路徑
// 使用 Admin.Api 的 RESTful 端點: /api/organization
const API_BASE = '/api/organization';

// API 服務
export const organizationApi = {
    // ========================================
    // 查詢方法
    // ========================================

    /**
     * 獲取組織樹狀結構
     */
    getOrganizationTree: async (): Promise<OrganizationTreeNode[]> => {
        const response = await api.get<OrganizationTreeNode[]>(`${API_BASE}/tree`);
        return response.data;
    },

    /**
     * 獲取所有組織（扁平列表）
     */
    getAllGroups: async (): Promise<OrganizationGroup[]> => {
        const response = await api.get<OrganizationGroup[]>(API_BASE);
        return response.data;
    },

    /**
     * 獲取單一組織詳情
     */
    getGroupById: async (id: string): Promise<OrganizationGroup | null> => {
        try {
            const response = await api.get<OrganizationGroup>(`${API_BASE}/${encodeURIComponent(id)}`);
            return response.data;
        } catch (error) {
            // 如果找不到返回 null
            if (error instanceof Error && error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    },

    /**
     * 獲取組織統計
     */
    getStats: async (): Promise<OrganizationStats> => {
        const response = await api.get<OrganizationStats>(`${API_BASE}/stats`);
        return response.data;
    },

    /**
     * 檢查群組名稱是否可用
     */
    checkNameAvailable: async (
        name: string,
        parentId: string | null,
        excludeId?: string
    ): Promise<boolean> => {
        const params = new URLSearchParams({ name });
        if (parentId) params.append('parentId', parentId);
        if (excludeId) params.append('excludeId', excludeId);

        const response = await api.get<boolean>(`${API_BASE}/check-name?${params.toString()}`);
        return response.data;
    },

    /**
     * 獲取刪除確認資訊（包含待刪除的子群組列表）
     */
    getDeleteConfirmation: async (id: string): Promise<DeleteConfirmation | null> => {
        try {
            const response = await api.get<DeleteConfirmation>(
                `${API_BASE}/${encodeURIComponent(id)}/delete-confirmation`
            );
            return response.data;
        } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    },

    // ========================================
    // 新增/修改/刪除方法
    // ========================================

    /**
     * 新增組織群組
     */
    createGroup: async (data: CreateOrganizationGroupRequest): Promise<OrganizationGroup> => {
        const response = await api.post<OrganizationGroup>(API_BASE, data);
        return response.data;
    },

    /**
     * 更新組織群組
     */
    updateGroup: async (id: string, data: UpdateOrganizationGroupRequest): Promise<OrganizationGroup> => {
        const response = await api.put<OrganizationGroup>(`${API_BASE}/${encodeURIComponent(id)}`, data);
        return response.data;
    },

    /**
     * 刪除組織群組（含所有子群組）
     */
    deleteGroup: async (id: string): Promise<DeleteResult> => {
        const response = await api.delete<DeleteResult>(`${API_BASE}/${encodeURIComponent(id)}`);
        return response.data;
    },

    // ========================================
    // 組織成員方法
    // ========================================

    /**
     * 獲取組織成員列表
     * 使用 V1 API: /api/organization/{id}/members
     */
    getMembers: async (groupId: string): Promise<OrganizationMember[]> => {
        const response = await api.get<OrganizationMember[]>(
            `${API_BASE}/${encodeURIComponent(groupId)}/members`
        );
        return response.data;
    },
};

export default organizationApi;
