/**
 * User Management API Service
 * UC Capital Identity Admin
 *
 * 使用者管理 API 服務
 */

import api from './api';
import type {
    UserDto,
    UserListDto,
    CreateUserDto,
    UpdateUserDto,
    ChangePasswordDto,
    ResetPasswordDto,
    RoleDto,
    CreateRoleDto,
    UpdateRoleDto,
    UserClaimDto,
    CreateUserClaimDto,
    UpdateUserClaimDto,
    PagedResult,
    UserSearchParams,
    UserStatsDto,
    BulkUserOperationDto,
    BulkOperationResultDto,
    UserRoleDto,
    RoleClaimDto,
} from '../types/user';

const BASE_URL = '/api/user-management';
const ROLES_URL = '/api/role-management';

// =====================
// User CRUD
// =====================

/**
 * 取得使用者列表（分頁）
 */
export async function getUsers(params: UserSearchParams = {}): Promise<PagedResult<UserListDto>> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
    if (params.emailConfirmed !== undefined) queryParams.append('emailConfirmed', String(params.emailConfirmed));
    if (params.roleId) queryParams.append('roleId', params.roleId);
    if (params.organizationId) queryParams.append('organizationId', params.organizationId);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.pageSize) queryParams.append('pageSize', String(params.pageSize));
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await api.get<PagedResult<UserListDto>>(`${BASE_URL}?${queryParams.toString()}`);
    const data = response.data;

    // 防禦性驗證：確保回應是預期的分頁格式（非 HTML 重導向等）
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
        console.error('Unexpected API response format for getUsers:', typeof data);
        return { items: [], totalCount: 0, pageNumber: 1, pageSize: params.pageSize || 100, totalPages: 0 };
    }

    // 確保每個 user 的 roles 是陣列
    data.items = data.items.map(user => ({
        ...user,
        roles: Array.isArray(user.roles) ? user.roles : [],
    }));

    return data;
}

/**
 * 取得單一使用者詳情
 */
export async function getUserById(id: string): Promise<UserDto> {
    const response = await api.get<UserDto>(`${BASE_URL}/${id}`);
    return response.data;
}

/**
 * 建立使用者
 */
export async function createUser(dto: CreateUserDto): Promise<UserDto> {
    const response = await api.post<UserDto>(BASE_URL, dto);
    return response.data;
}

/**
 * 更新使用者
 */
export async function updateUser(id: string, dto: UpdateUserDto): Promise<UserDto> {
    const response = await api.put<UserDto>(`${BASE_URL}/${id}`, dto);
    return response.data;
}

/**
 * 刪除使用者
 */
export async function deleteUser(id: string): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`);
}

/**
 * 變更密碼
 */
export async function changePassword(dto: ChangePasswordDto): Promise<void> {
    await api.post(`${BASE_URL}/${dto.userId}/change-password`, dto);
}

/**
 * 重設密碼（管理員）
 */
export async function resetPassword(dto: ResetPasswordDto): Promise<void> {
    await api.post(`${BASE_URL}/${dto.userId}/reset-password`, dto);
}

/**
 * 啟用使用者
 */
export async function activateUser(id: string): Promise<void> {
    await api.post(`${BASE_URL}/${id}/activate`);
}

/**
 * 停用使用者
 */
export async function deactivateUser(id: string): Promise<void> {
    await api.post(`${BASE_URL}/${id}/deactivate`);
}

/**
 * 解鎖使用者
 */
export async function unlockUser(id: string): Promise<void> {
    await api.post(`${BASE_URL}/${id}/unlock`);
}

// =====================
// User Roles
// =====================

/**
 * 取得使用者的角色
 */
export async function getUserRoles(userId: string): Promise<UserRoleDto[]> {
    const response = await api.get<UserRoleDto[]>(`${BASE_URL}/${userId}/roles`);
    return response.data;
}

/**
 * 指派角色給使用者
 */
export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await api.post(`${BASE_URL}/${userId}/roles/${roleId}`);
}

/**
 * 移除使用者的角色
 */
export async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await api.delete(`${BASE_URL}/${userId}/roles/${roleId}`);
}

/**
 * 批量設定使用者角色
 */
export async function setUserRoles(userId: string, roleIds: string[]): Promise<void> {
    await api.put(`${BASE_URL}/${userId}/roles`, { roleIds });
}

// =====================
// User Claims
// =====================

/**
 * 取得使用者的宣告
 */
export async function getUserClaims(userId: string): Promise<UserClaimDto[]> {
    const response = await api.get<UserClaimDto[]>(`${BASE_URL}/${userId}/claims`);
    return response.data;
}

/**
 * 新增使用者宣告
 */
export async function addUserClaim(dto: CreateUserClaimDto): Promise<UserClaimDto> {
    const response = await api.post<UserClaimDto>(`${BASE_URL}/${dto.userId}/claims`, dto);
    return response.data;
}

/**
 * 更新使用者宣告
 */
export async function updateUserClaim(dto: UpdateUserClaimDto): Promise<UserClaimDto> {
    const response = await api.put<UserClaimDto>(`${BASE_URL}/${dto.userId}/claims/${dto.id}`, dto);
    return response.data;
}

/**
 * 刪除使用者宣告
 */
export async function deleteUserClaim(userId: string, claimId: number): Promise<void> {
    await api.delete(`${BASE_URL}/${userId}/claims/${claimId}`);
}

// =====================
// Roles CRUD
// =====================

/**
 * 取得所有角色
 */
export async function getRoles(): Promise<RoleDto[]> {
    const response = await api.get<RoleDto[]>(ROLES_URL);
    return response.data;
}

/**
 * 取得單一角色
 */
export async function getRoleById(id: string): Promise<RoleDto> {
    const response = await api.get<RoleDto>(`${ROLES_URL}/${id}`);
    return response.data;
}

/**
 * 建立角色
 */
export async function createRole(dto: CreateRoleDto): Promise<RoleDto> {
    const response = await api.post<RoleDto>(ROLES_URL, dto);
    return response.data;
}

/**
 * 更新角色
 */
export async function updateRole(id: string, dto: UpdateRoleDto): Promise<RoleDto> {
    const response = await api.put<RoleDto>(`${ROLES_URL}/${id}`, dto);
    return response.data;
}

/**
 * 刪除角色
 */
export async function deleteRole(id: string): Promise<void> {
    await api.delete(`${ROLES_URL}/${id}`);
}

/**
 * 取得角色的使用者
 */
export async function getRoleUsers(roleId: string): Promise<UserListDto[]> {
    const response = await api.get<UserListDto[]>(`${ROLES_URL}/${roleId}/users`);
    return response.data;
}

/**
 * 取得角色的宣告
 */
export async function getRoleClaims(roleId: string): Promise<RoleClaimDto[]> {
    const response = await api.get<RoleClaimDto[]>(`${ROLES_URL}/${roleId}/claims`);
    return response.data;
}

// =====================
// Statistics
// =====================

/**
 * 取得使用者統計
 */
export async function getUserStats(): Promise<UserStatsDto> {
    const response = await api.get<UserStatsDto>(`${BASE_URL}/stats`);
    return response.data;
}

// =====================
// Bulk Operations
// =====================

/**
 * 批量操作使用者
 */
export async function bulkUserOperation(dto: BulkUserOperationDto): Promise<BulkOperationResultDto> {
    const response = await api.post<BulkOperationResultDto>(`${BASE_URL}/bulk`, dto);
    return response.data;
}

// =====================
// Search & Validation
// =====================

/**
 * 搜尋使用者（輕量版，用於選擇器）
 */
export async function searchUsers(search: string, limit: number = 20): Promise<UserListDto[]> {
    const response = await api.get<UserListDto[]>(`${BASE_URL}/search?search=${encodeURIComponent(search)}&limit=${limit}`);
    return response.data;
}

/**
 * 檢查使用者名稱是否可用
 */
export async function checkUsernameAvailable(username: string, excludeId?: string): Promise<boolean> {
    const params = new URLSearchParams({ username });
    if (excludeId) params.append('excludeId', excludeId);
    const response = await api.get<{ available: boolean }>(`${BASE_URL}/check-username?${params.toString()}`);
    return response.data.available;
}

/**
 * 檢查 Email 是否可用
 */
export async function checkEmailAvailable(email: string, excludeId?: string): Promise<boolean> {
    const params = new URLSearchParams({ email });
    if (excludeId) params.append('excludeId', excludeId);
    const response = await api.get<{ available: boolean }>(`${BASE_URL}/check-email?${params.toString()}`);
    return response.data.available;
}

export default {
    // Users
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
    resetPassword,
    activateUser,
    deactivateUser,
    unlockUser,
    // User Roles
    getUserRoles,
    assignRoleToUser,
    removeRoleFromUser,
    setUserRoles,
    // User Claims
    getUserClaims,
    addUserClaim,
    updateUserClaim,
    deleteUserClaim,
    // Roles
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    getRoleUsers,
    getRoleClaims,
    // Stats
    getUserStats,
    // Bulk
    bulkUserOperation,
    // Search
    searchUsers,
    checkUsernameAvailable,
    checkEmailAvailable,
};
