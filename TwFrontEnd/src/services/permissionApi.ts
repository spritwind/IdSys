/**
 * Permission API Service
 * UC Capital Identity Admin
 *
 * 權限控管 API 服務
 */

import { api } from './api';
import type {
    ScopeDto,
    CreateScopeDto,
    UpdateScopeDto,
    ResourceDto,
    CreateResourceDto,
    UpdateResourceDto,
    ResourceScopeDto,
    UserPermissionDto,
    SetUserPermissionDto,
    GroupPermissionDto,
    SetGroupPermissionDto,
    EffectivePermissionDto,
    UserBriefDto,
    GroupBriefDto,
    PermissionStatsDto,
} from '@/types/permission';

const BASE_URL = '/api/Permission';

// =====================
// 統計與查詢輔助
// =====================

export async function getPermissionStats(): Promise<PermissionStatsDto> {
    const response = await api.get<PermissionStatsDto>(`${BASE_URL}/stats`);
    return response.data;
}

export async function getClients(): Promise<string[]> {
    const response = await api.get<string[]>(`${BASE_URL}/clients`);
    return response.data;
}

export async function searchUsers(search?: string): Promise<UserBriefDto[]> {
    const response = await api.get<UserBriefDto[]>(`${BASE_URL}/users/search`, {
        params: { search },
    });
    return response.data;
}

export async function getGroups(): Promise<GroupBriefDto[]> {
    const response = await api.get<GroupBriefDto[]>(`${BASE_URL}/groups`);
    return response.data;
}

// =====================
// Scope 權限範圍 CRUD
// =====================

export async function getAllScopes(clientId?: string): Promise<ScopeDto[]> {
    const response = await api.get<ScopeDto[]>(`${BASE_URL}/scopes`, {
        params: { clientId },
    });
    return response.data;
}

export async function getScopeById(id: string, clientId: string): Promise<ScopeDto> {
    const response = await api.get<ScopeDto>(`${BASE_URL}/scopes/${id}`, {
        params: { clientId },
    });
    return response.data;
}

export async function createScope(dto: CreateScopeDto): Promise<ScopeDto> {
    const response = await api.post<ScopeDto>(`${BASE_URL}/scopes`, dto);
    return response.data;
}

export async function updateScope(id: string, dto: UpdateScopeDto): Promise<ScopeDto> {
    const response = await api.put<ScopeDto>(`${BASE_URL}/scopes/${id}`, dto);
    return response.data;
}

export async function deleteScope(id: string, clientId: string): Promise<void> {
    await api.delete(`${BASE_URL}/scopes/${id}`, {
        params: { clientId },
    });
}

export async function canInsertScope(name: string, clientId: string, excludeId?: string): Promise<boolean> {
    const response = await api.get<boolean>(`${BASE_URL}/scopes/check-name`, {
        params: { name, clientId, excludeId },
    });
    return response.data;
}

// =====================
// Resource 資源 CRUD
// =====================

export async function getAllResources(clientId?: string, type?: string): Promise<ResourceDto[]> {
    const response = await api.get<ResourceDto[]>(`${BASE_URL}/resources`, {
        params: { clientId, type },
    });
    return response.data;
}

export async function getResourceById(id: string, clientId: string): Promise<ResourceDto> {
    const response = await api.get<ResourceDto>(`${BASE_URL}/resources/${id}`, {
        params: { clientId },
    });
    return response.data;
}

export async function createResource(dto: CreateResourceDto): Promise<ResourceDto> {
    const response = await api.post<ResourceDto>(`${BASE_URL}/resources`, dto);
    return response.data;
}

export async function updateResource(id: string, dto: UpdateResourceDto): Promise<ResourceDto> {
    const response = await api.put<ResourceDto>(`${BASE_URL}/resources/${id}`, dto);
    return response.data;
}

export async function deleteResource(id: string, clientId: string): Promise<void> {
    await api.delete(`${BASE_URL}/resources/${id}`, {
        params: { clientId },
    });
}

export async function canInsertResource(name: string, clientId: string, excludeId?: string): Promise<boolean> {
    const response = await api.get<boolean>(`${BASE_URL}/resources/check-name`, {
        params: { name, clientId, excludeId },
    });
    return response.data;
}

// =====================
// ResourceScope 資源-範圍關聯
// =====================

export async function getResourceScopes(resourceId: string, clientId: string): Promise<ResourceScopeDto[]> {
    const response = await api.get<ResourceScopeDto[]>(`${BASE_URL}/resources/${resourceId}/scopes`, {
        params: { clientId },
    });
    return response.data;
}

export async function setResourceScopes(resourceId: string, clientId: string, scopeIds: string[]): Promise<number> {
    const response = await api.put<{ count: number }>(`${BASE_URL}/resources/${resourceId}/scopes`, scopeIds, {
        params: { clientId },
    });
    return response.data.count;
}

// =====================
// UserPermission 使用者權限
// =====================

export async function getUserPermissions(userId: string, clientId?: string): Promise<UserPermissionDto[]> {
    const response = await api.get<UserPermissionDto[]>(`${BASE_URL}/users/${userId}/permissions`, {
        params: { clientId },
    });
    return response.data;
}

export async function getResourceUserPermissions(resourceId: string, clientId: string): Promise<UserPermissionDto[]> {
    const response = await api.get<UserPermissionDto[]>(`${BASE_URL}/resources/${resourceId}/user-permissions`, {
        params: { clientId },
    });
    return response.data;
}

export async function setUserPermission(userId: string, dto: SetUserPermissionDto): Promise<UserPermissionDto> {
    const response = await api.post<UserPermissionDto>(`${BASE_URL}/users/${userId}/permissions`, dto);
    return response.data;
}

export async function removeUserPermission(userId: string, clientId: string, resourceId: string): Promise<void> {
    await api.delete(`${BASE_URL}/users/${userId}/permissions`, {
        params: { clientId, resourceId },
    });
}

export async function getUserEffectivePermissions(userId: string, clientId?: string): Promise<EffectivePermissionDto[]> {
    const response = await api.get<EffectivePermissionDto[]>(`${BASE_URL}/users/${userId}/effective-permissions`, {
        params: { clientId },
    });
    return response.data;
}

export async function hasPermission(userId: string, clientId: string, resourceId: string, scope: string): Promise<boolean> {
    const response = await api.get<boolean>(`${BASE_URL}/users/${userId}/has-permission`, {
        params: { clientId, resourceId, scope },
    });
    return response.data;
}

// =====================
// GroupPermission 群組權限
// =====================

export async function getGroupPermissions(groupId: string, clientId?: string): Promise<GroupPermissionDto[]> {
    const response = await api.get<GroupPermissionDto[]>(`${BASE_URL}/groups/${groupId}/permissions`, {
        params: { clientId },
    });
    return response.data;
}

export async function getResourceGroupPermissions(resourceId: string, clientId: string): Promise<GroupPermissionDto[]> {
    const response = await api.get<GroupPermissionDto[]>(`${BASE_URL}/resources/${resourceId}/group-permissions`, {
        params: { clientId },
    });
    return response.data;
}

export async function setGroupPermission(groupId: string, dto: SetGroupPermissionDto): Promise<GroupPermissionDto> {
    const response = await api.post<GroupPermissionDto>(`${BASE_URL}/groups/${groupId}/permissions`, dto);
    return response.data;
}

export async function removeGroupPermission(groupId: string, clientId: string, resourceId: string): Promise<void> {
    await api.delete(`${BASE_URL}/groups/${groupId}/permissions`, {
        params: { clientId, resourceId },
    });
}

// Export all as permissionApi object for convenience
export const permissionApi = {
    // Stats & Helpers
    getPermissionStats,
    getClients,
    searchUsers,
    getGroups,
    // Scopes
    getAllScopes,
    getScopeById,
    createScope,
    updateScope,
    deleteScope,
    canInsertScope,
    // Resources
    getAllResources,
    getResourceById,
    createResource,
    updateResource,
    deleteResource,
    canInsertResource,
    // ResourceScopes
    getResourceScopes,
    setResourceScopes,
    // UserPermissions
    getUserPermissions,
    getResourceUserPermissions,
    setUserPermission,
    removeUserPermission,
    getUserEffectivePermissions,
    hasPermission,
    // GroupPermissions
    getGroupPermissions,
    getResourceGroupPermissions,
    setGroupPermission,
    removeGroupPermission,
};

export default permissionApi;
