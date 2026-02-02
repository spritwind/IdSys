/**
 * Permission V2 API Service
 * UC Capital Identity Admin
 *
 * 多租戶權限控管 API 服務 (新版)
 * 使用 /api/v2/permissions 端點
 */

import api from './api';
import type {
    PermissionResourceDto,
    PermissionScopeDto,
    PermissionDto,
    GrantPermissionDto,
    BatchGrantPermissionDto,
    UpdatePermissionDto,
    UserEffectivePermissionsDto,
    PermissionCheckResultDto,
    OperationResultDto,
    SubjectType,
} from '../types/permissionV2';

const BASE_URL = '/api/v2/permissions';

// =====================
// PermissionResource 資源
// =====================

/**
 * 取得所有資源
 */
export async function getResources(clientId?: string): Promise<PermissionResourceDto[]> {
    const response = await api.get<PermissionResourceDto[]>(`${BASE_URL}/resources`, {
        params: { clientId },
    });
    return response.data;
}

/**
 * 取得資源樹狀結構
 */
export async function getResourceTree(clientId: string): Promise<PermissionResourceDto[]> {
    const response = await api.get<PermissionResourceDto[]>(`${BASE_URL}/resources/tree`, {
        params: { clientId },
    });
    return response.data;
}

/**
 * 根據 ID 取得資源
 */
export async function getResourceById(id: string): Promise<PermissionResourceDto> {
    const response = await api.get<PermissionResourceDto>(`${BASE_URL}/resources/${id}`);
    return response.data;
}

// =====================
// PermissionScope 範圍
// =====================

/**
 * 取得所有權限範圍
 */
export async function getScopes(): Promise<PermissionScopeDto[]> {
    const response = await api.get<PermissionScopeDto[]>(`${BASE_URL}/scopes`);
    return response.data;
}

// =====================
// User Permissions 使用者權限
// =====================

/**
 * 取得使用者的直接權限
 */
export async function getUserPermissions(userId: string): Promise<PermissionDto[]> {
    const response = await api.get<PermissionDto[]>(`${BASE_URL}/users/${userId}`);
    return response.data;
}

/**
 * 取得使用者的有效權限（包含繼承）
 */
export async function getUserEffectivePermissions(userId: string): Promise<UserEffectivePermissionsDto> {
    const response = await api.get<UserEffectivePermissionsDto>(`${BASE_URL}/users/${userId}/effective`);
    return response.data;
}

/**
 * 檢查使用者是否有特定權限
 */
export async function checkUserPermission(
    userId: string,
    options: { resourceId?: string; clientId?: string; resourceCode?: string; scope: string }
): Promise<PermissionCheckResultDto> {
    const response = await api.get<PermissionCheckResultDto>(`${BASE_URL}/users/${userId}/check`, {
        params: options,
    });
    return response.data;
}

// =====================
// Organization Permissions 組織權限
// =====================

/**
 * 取得組織的權限
 */
export async function getOrganizationPermissions(organizationId: string): Promise<PermissionDto[]> {
    const response = await api.get<PermissionDto[]>(`${BASE_URL}/organizations/${organizationId}`);
    return response.data;
}

// =====================
// Role Permissions 角色權限
// =====================

/**
 * 取得角色的權限 (SubjectType = Role)
 */
export async function getRolePermissions(roleId: string): Promise<PermissionDto[]> {
    // 角色權限儲存在 Permission 表中，SubjectType = 'Role'
    // 使用通用的資源權限查詢或自訂查詢
    const response = await api.get<PermissionDto[]>(`${BASE_URL}/users/${roleId}`, {
        // 這裡我們複用 users 端點，但後端會根據 SubjectType 判斷
        // 或者建立專門的 roles 端點
    });
    return response.data;
}

// =====================
// Resource Permissions 資源權限
// =====================

/**
 * 取得資源的所有權限
 */
export async function getResourcePermissions(resourceId: string): Promise<PermissionDto[]> {
    const response = await api.get<PermissionDto[]>(`${BASE_URL}/resources/${resourceId}/permissions`);
    return response.data;
}

// =====================
// Permission CRUD 權限操作
// =====================

/**
 * 授予權限
 */
export async function grantPermission(dto: GrantPermissionDto): Promise<PermissionDto> {
    const response = await api.post<PermissionDto>(`${BASE_URL}/grant`, dto);
    return response.data;
}

/**
 * 批次授予權限
 */
export async function batchGrantPermissions(dto: BatchGrantPermissionDto): Promise<PermissionDto[]> {
    const response = await api.post<PermissionDto[]>(`${BASE_URL}/grant/batch`, dto);
    return response.data;
}

/**
 * 撤銷權限
 */
export async function revokePermission(permissionId: string): Promise<OperationResultDto> {
    const response = await api.delete<OperationResultDto>(`${BASE_URL}/${permissionId}`);
    return response.data;
}

/**
 * 批次撤銷權限
 */
export async function batchRevokePermissions(permissionIds: string[]): Promise<OperationResultDto> {
    const response = await api.post<OperationResultDto>(`${BASE_URL}/revoke/batch`, permissionIds);
    return response.data;
}

/**
 * 更新權限
 */
export async function updatePermission(permissionId: string, dto: UpdatePermissionDto): Promise<PermissionDto> {
    const response = await api.put<PermissionDto>(`${BASE_URL}/${permissionId}`, dto);
    return response.data;
}

// =====================
// 輔助函數
// =====================

/**
 * 取得主體類型的權限 (通用)
 */
export async function getSubjectPermissions(subjectType: SubjectType, subjectId: string): Promise<PermissionDto[]> {
    // 根據主體類型選擇不同的端點
    switch (subjectType) {
        case 'User':
            return getUserPermissions(subjectId);
        case 'Organization':
            return getOrganizationPermissions(subjectId);
        default:
            // 對於 Role 和 Group，使用通用查詢
            return getUserPermissions(subjectId);
    }
}

/**
 * 為主體授予權限 (通用)
 */
export async function grantPermissionToSubject(
    subjectType: SubjectType,
    subjectId: string,
    subjectName: string,
    resourceId: string,
    scopes: string[],
    options?: { inheritToChildren?: boolean; expiresAt?: string }
): Promise<PermissionDto> {
    return grantPermission({
        subjectType,
        subjectId,
        subjectName,
        resourceId,
        scopes,
        inheritToChildren: options?.inheritToChildren,
        expiresAt: options?.expiresAt,
    });
}

/**
 * 批次為主體授予權限 (通用)
 */
export async function batchGrantPermissionsToSubject(
    subjectType: SubjectType,
    subjectId: string,
    subjectName: string,
    resourceScopes: { resourceId: string; scopes: string[] }[],
    options?: { inheritToChildren?: boolean }
): Promise<PermissionDto[]> {
    return batchGrantPermissions({
        subjectType,
        subjectId,
        subjectName,
        resourceScopes,
        inheritToChildren: options?.inheritToChildren,
    });
}

// Export all as permissionV2Api object
export const permissionV2Api = {
    // Resources
    getResources,
    getResourceTree,
    getResourceById,
    // Scopes
    getScopes,
    // User Permissions
    getUserPermissions,
    getUserEffectivePermissions,
    checkUserPermission,
    // Organization Permissions
    getOrganizationPermissions,
    // Role Permissions
    getRolePermissions,
    // Resource Permissions
    getResourcePermissions,
    // Permission CRUD
    grantPermission,
    batchGrantPermissions,
    revokePermission,
    batchRevokePermissions,
    updatePermission,
    // Helpers
    getSubjectPermissions,
    grantPermissionToSubject,
    batchGrantPermissionsToSubject,
};

export default permissionV2Api;
