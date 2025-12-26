/**
 * Permission Types
 * UC Capital Identity Admin
 *
 * 權限控管類型定義
 */

// =====================
// Scope 權限範圍
// =====================
export interface ScopeDto {
    id: string;
    clientId: string;
    clientName?: string;
    name: string;
    displayName?: string;
    iconUri?: string;
    enabled: boolean;
    insDate?: string;
    updDate?: string;
}

export interface CreateScopeDto {
    clientId: string;
    clientName?: string;
    name: string;
    displayName?: string;
    iconUri?: string;
}

export interface UpdateScopeDto {
    id: string;
    clientId: string;
    name: string;
    displayName?: string;
    iconUri?: string;
}

// =====================
// Resource 資源
// =====================
export interface ResourceDto {
    id: string;
    clientId: string;
    clientName?: string;
    name: string;
    displayName?: string;
    type?: string;
    uri?: string;
    enabled: boolean;
    insDate?: string;
    updDate?: string;
    scopes: string[];
}

export interface CreateResourceDto {
    clientId: string;
    clientName?: string;
    name: string;
    displayName?: string;
    type?: string;
    uri?: string;
    scopeIds?: string[];
}

export interface UpdateResourceDto {
    id: string;
    clientId: string;
    name: string;
    displayName?: string;
    type?: string;
    uri?: string;
    scopeIds?: string[];
}

// =====================
// ResourceScope 資源-範圍關聯
// =====================
export interface ResourceScopeDto {
    resourceId: string;
    resourceName?: string;
    scopeId: string;
    scopeName?: string;
    clientId: string;
    insDate?: string;
}

// =====================
// UserPermission 使用者權限
// =====================
export interface UserPermissionDto {
    id: string; // Composite key: `${userId}_${clientId}_${resourceId}`
    userId: string;
    username?: string;
    clientId: string;
    clientName?: string;
    resourceId: string;
    resourceName?: string;
    scopes: string[];
    enabled: boolean;
    insDate?: string;
    updDate?: string;
}

export interface SetUserPermissionDto {
    userId: string;
    username?: string;
    clientId: string;
    clientName?: string;
    resourceId: string;
    resourceName?: string;
    scopes: string[];
}

// =====================
// GroupPermission 群組權限
// =====================
export interface GroupPermissionDto {
    id: string; // Composite key: `${groupId}_${clientId}_${resourceId}`
    groupId: string;
    groupName?: string;
    groupPath?: string;
    clientId: string;
    clientName?: string;
    resourceId: string;
    resourceName?: string;
    scopes: string[];
    inheritToChildren: boolean;
    enabled: boolean;
    insDate?: string;
    updDate?: string;
}

export interface SetGroupPermissionDto {
    groupId: string;
    groupName?: string;
    groupPath?: string;
    clientId: string;
    clientName?: string;
    resourceId: string;
    resourceName?: string;
    scopes: string[];
    inheritToChildren?: boolean;
}

// =====================
// EffectivePermission 有效權限
// =====================
export interface EffectivePermissionDto {
    resourceId: string;
    resourceName?: string;
    clientId: string;
    clientName?: string;
    scopes: string[];
    source: string;
    isFromGroup: boolean;
    sourceGroupId?: string;
    sourceGroupName?: string;
}

// =====================
// 查詢輔助
// =====================
export interface UserBriefDto {
    id: string;
    username: string;
    email?: string;
    fullName?: string;
}

export interface GroupBriefDto {
    id: string;
    name: string;
    path?: string;
    deptCode?: string;
    deptZhName?: string;
}

// =====================
// Statistics 統計
// =====================
export interface PermissionStatsDto {
    totalScopes: number;
    totalResources: number;
    totalUserPermissions: number;
    totalGroupPermissions: number;
    totalClients: number;
    clientStats: ClientStatsDto[];
}

export interface ClientStatsDto {
    clientId: string;
    clientName?: string;
    scopeCount: number;
    resourceCount: number;
    userPermissionCount: number;
    groupPermissionCount: number;
}
