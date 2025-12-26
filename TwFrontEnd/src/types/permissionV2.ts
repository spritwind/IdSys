/**
 * Permission V2 Types
 * UC Capital Identity Admin
 *
 * 多租戶權限控管類型定義 (新版)
 */

// =====================
// PermissionResource 權限資源
// =====================
export interface PermissionResourceDto {
    id: string;
    clientId: string;
    clientName?: string;
    code: string;
    name: string;
    description?: string;
    uri?: string;
    resourceType?: string;
    parentId?: string;
    sortOrder: number;
    isEnabled: boolean;
    children?: PermissionResourceDto[];
}

// =====================
// PermissionScope 權限範圍
// =====================
export interface PermissionScopeDto {
    id: string;
    code: string;
    name: string;
    description?: string;
}

// 預設範圍代碼
export const SCOPE_CODES = {
    READ: 'r',
    CREATE: 'c',
    UPDATE: 'u',
    DELETE: 'd',
    EXECUTE: 'e',
    ALL: 'all',
} as const;

export const SCOPE_NAMES: Record<string, string> = {
    r: '讀取',
    c: '建立',
    u: '更新',
    d: '刪除',
    e: '執行',
    all: '全部',
};

// =====================
// Permission 權限
// =====================
export interface PermissionDto {
    id: string;
    tenantId?: string;
    subjectType: string;
    subjectId: string;
    subjectName?: string;
    resourceId: string;
    resourceCode?: string;
    resourceName?: string;
    clientId?: string;
    scopes: string;
    scopeList?: string[];
    inheritToChildren: boolean;
    isEnabled: boolean;
    grantedBy?: string;
    grantedAt: string;
    expiresAt?: string;
}

// 權限主體類型
export const SUBJECT_TYPES = {
    USER: 'User',
    GROUP: 'Group',
    ORGANIZATION: 'Organization',
    ROLE: 'Role',
} as const;

export type SubjectType = typeof SUBJECT_TYPES[keyof typeof SUBJECT_TYPES];

// =====================
// Grant/Revoke DTOs
// =====================
export interface GrantPermissionDto {
    subjectType: SubjectType;
    subjectId: string;
    subjectName?: string;
    resourceId: string;
    scopes: string[];
    inheritToChildren?: boolean;
    expiresAt?: string;
}

export interface BatchGrantPermissionDto {
    subjectType: SubjectType;
    subjectId: string;
    subjectName?: string;
    resourceScopes: ResourceScopeDto[];
    inheritToChildren?: boolean;
}

export interface ResourceScopeDto {
    resourceId: string;
    scopes: string[];
}

export interface UpdatePermissionDto {
    scopes: string[];
    inheritToChildren: boolean;
    expiresAt?: string;
}

// =====================
// Effective Permissions
// =====================
export interface UserEffectivePermissionsDto {
    userId: string;
    userName?: string;
    permissions: EffectivePermissionDto[];
}

export interface EffectivePermissionDto {
    resourceId: string;
    resourceCode?: string;
    resourceName?: string;
    clientId?: string;
    scopes: string[];
    source: 'Direct' | 'Organization' | 'Group' | 'Role';
    sourceId?: string;
    sourceName?: string;
}

// =====================
// Permission Check
// =====================
export interface PermissionCheckResultDto {
    userId: string;
    resourceId?: string;
    clientId?: string;
    resourceCode?: string;
    scope: string;
    hasPermission: boolean;
}

// =====================
// Operation Result
// =====================
export interface OperationResultDto {
    success: boolean;
    message?: string;
    data?: unknown;
}

// =====================
// UI Helper Types
// =====================

/** 權限項目 (用於 UI 顯示) */
export interface PermissionItem {
    resource: PermissionResourceDto;
    scopes: string[];
    source?: 'Direct' | 'Role' | 'Organization';
    sourceName?: string;
    permissionId?: string;
    isEnabled?: boolean;
}

/** 按資源分組的權限 */
export interface PermissionsByClient {
    clientId: string;
    clientName?: string;
    resources: PermissionResourceDto[];
    permissions: PermissionDto[];
}
