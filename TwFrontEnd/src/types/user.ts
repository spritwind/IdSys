/**
 * User Management Types
 * UC Capital Identity Admin
 *
 * 使用者管理類型定義
 */

// =====================
// User 使用者
// =====================
export interface UserDto {
    id: string;
    userName: string;
    email?: string;
    emailConfirmed: boolean;
    phoneNumber?: string;
    phoneNumberConfirmed: boolean;
    twoFactorEnabled: boolean;
    lockoutEnabled: boolean;
    lockoutEnd?: string;
    accessFailedCount: number;
    // 擴展欄位
    firstName?: string;
    lastName?: string;
    displayName?: string;
    primaryOrganizationId?: string;
    primaryOrganizationName?: string;
    tenantId?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    // 關聯資料
    roles?: RoleDto[];
    claims?: UserClaimDto[];
}

export interface UserListDto {
    id: string;
    userName: string;
    email?: string;
    displayName?: string;
    isActive: boolean;
    emailConfirmed: boolean;
    lockoutEnd?: string;
    createdAt: string;
    roles: string[];
}

export interface CreateUserDto {
    userName: string;
    email: string;
    password: string;
    confirmPassword: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phoneNumber?: string;
    primaryOrganizationId?: string;
    tenantId?: string;
    isActive?: boolean;
    emailConfirmed?: boolean;
    roles?: string[];
}

export interface UpdateUserDto {
    id: string;
    userName: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phoneNumber?: string;
    primaryOrganizationId?: string;
    isActive: boolean;
    emailConfirmed: boolean;
    lockoutEnabled: boolean;
    twoFactorEnabled: boolean;
}

export interface ChangePasswordDto {
    userId: string;
    currentPassword?: string;
    newPassword: string;
    confirmPassword: string;
}

export interface ResetPasswordDto {
    userId: string;
    newPassword: string;
    confirmPassword: string;
}

// =====================
// Role 角色
// =====================
export interface RoleDto {
    id: string;
    name: string;
    normalizedName?: string;
    description?: string;
    userCount?: number;
}

export interface CreateRoleDto {
    name: string;
    description?: string;
}

export interface UpdateRoleDto {
    id: string;
    name: string;
    description?: string;
}

export interface UserRoleDto {
    userId: string;
    roleId: string;
    roleName: string;
}

// =====================
// UserClaim 使用者宣告
// =====================
export interface UserClaimDto {
    id: number;
    userId: string;
    claimType: string;
    claimValue: string;
}

export interface CreateUserClaimDto {
    userId: string;
    claimType: string;
    claimValue: string;
}

export interface UpdateUserClaimDto {
    id: number;
    userId: string;
    claimType: string;
    claimValue: string;
}

// =====================
// RoleClaim 角色宣告
// =====================
export interface RoleClaimDto {
    id: number;
    roleId: string;
    claimType: string;
    claimValue: string;
}

// =====================
// Pagination 分頁
// =====================
export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
}

export interface UserSearchParams {
    search?: string;
    isActive?: boolean;
    emailConfirmed?: boolean;
    roleId?: string;
    organizationId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
}

// =====================
// Statistics 統計
// =====================
export interface UserStatsDto {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    lockedUsers: number;
    unconfirmedUsers: number;
    recentRegistrations: number; // 最近7天
    roleDistribution: RoleDistributionDto[];
}

export interface RoleDistributionDto {
    roleId: string;
    roleName: string;
    userCount: number;
    percentage: number;
}

// =====================
// Bulk Operations 批量操作
// =====================
export interface BulkUserOperationDto {
    userIds: string[];
    operation: 'activate' | 'deactivate' | 'lock' | 'unlock' | 'delete' | 'assignRole' | 'removeRole';
    roleId?: string;
}

export interface BulkOperationResultDto {
    success: boolean;
    processedCount: number;
    failedCount: number;
    errors: string[];
}

// =====================
// User Session 使用者工作階段
// =====================
export interface UserSessionDto {
    id: string;
    userId: string;
    clientId: string;
    clientName?: string;
    ipAddress: string;
    userAgent: string;
    createdAt: string;
    expiresAt: string;
    isActive: boolean;
}
