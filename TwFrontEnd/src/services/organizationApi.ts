/**
 * 組織架構 API 服務
 * UC Capital Identity Admin
 *
 * 呼叫後端 OrganizationController API 取得組織資料
 */

import { api } from './api';
import type {
    OrganizationGroup,
    OrganizationTreeNode,
    OrganizationStats,
} from '../types/organization';

// API 基礎路徑（路由為 /{controller}/{action}，不包含 Area 前綴）
const API_BASE = '/Organization';

// API 服務
export const organizationApi = {
    /**
     * 獲取組織樹狀結構
     */
    getOrganizationTree: async (): Promise<OrganizationTreeNode[]> => {
        const response = await api.get<OrganizationTreeNode[]>(`${API_BASE}/GetOrganizationTree`);
        return response.data;
    },

    /**
     * 獲取所有組織（扁平列表）
     */
    getAllGroups: async (): Promise<OrganizationGroup[]> => {
        const response = await api.get<OrganizationGroup[]>(`${API_BASE}/GetAllGroups`);
        return response.data;
    },

    /**
     * 獲取單一組織詳情
     */
    getGroupById: async (id: string): Promise<OrganizationGroup | null> => {
        try {
            const response = await api.get<OrganizationGroup>(`${API_BASE}/GetGroup?id=${encodeURIComponent(id)}`);
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
        const response = await api.get<OrganizationStats>(`${API_BASE}/GetStats`);
        return response.data;
    },
};

export default organizationApi;
