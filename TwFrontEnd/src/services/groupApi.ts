/**
 * 群組管理 API 服務
 * UC Capital Identity Admin
 *
 * 呼叫後端 GroupController API
 * 支援 Group CRUD + GroupMember 管理
 */

import { api } from './api';

const BASE_URL = '/api/v2/groups';

// DTO Types
export interface GroupDto {
    id: string;
    tenantId: string;
    code: string;
    name: string;
    description: string;
    groupType: string;
    organizationId: string | null;
    organizationName: string | null;
    sourceId: number | null;
    ownerUserId: string | null;
    ownerUserName: string | null;
    isEnabled: boolean;
    memberCount: number;
    createdAt: string;
    updatedAt: string | null;
}

export interface CreateGroupDto {
    code: string;
    name: string;
    description?: string;
    groupType?: string;
    organizationId?: string;
    ownerUserId?: string;
}

export interface UpdateGroupDto {
    code: string;
    name: string;
    description?: string;
    groupType: string;
    organizationId?: string;
    ownerUserId?: string;
    isEnabled: boolean;
}

export interface GroupMemberDetailDto {
    id: string;
    groupId: string;
    userId: string;
    userName: string;
    displayName: string;
    email: string;
    memberRole: string;
    inheritGroupPermissions: boolean;
    joinedAt: string;
}

export interface AddGroupMemberDto {
    userId: string;
    memberRole?: string;
    inheritGroupPermissions?: boolean;
}

export interface GroupStatsDto {
    totalGroups: number;
    countByType: Record<string, number>;
    totalMembers: number;
}

export interface OperationResultDto {
    success: boolean;
    message: string;
    data?: unknown;
}

// Group type labels
export const GROUP_TYPE_LABELS: Record<string, string> = {
    Organization: '組織',
    Leader: '組長',
    DeputyLeader: '副組長',
    Personal: '個人',
    Special: '特殊',
    Project: '專案',
    General: '一般',
};

// API functions
export async function getGroups(groupType?: string): Promise<GroupDto[]> {
    const response = await api.get<GroupDto[]>(BASE_URL, {
        params: groupType ? { groupType } : undefined,
    });
    return Array.isArray(response.data) ? response.data : [];
}

export async function getGroupById(id: string): Promise<GroupDto | null> {
    try {
        const response = await api.get<GroupDto>(`${BASE_URL}/${id}`);
        return response.data;
    } catch {
        return null;
    }
}

export async function getGroupStats(): Promise<GroupStatsDto> {
    const response = await api.get<GroupStatsDto>(`${BASE_URL}/stats`);
    return response.data;
}

export async function createGroup(data: CreateGroupDto): Promise<GroupDto> {
    const response = await api.post<GroupDto>(BASE_URL, data);
    return response.data;
}

export async function updateGroup(id: string, data: UpdateGroupDto): Promise<GroupDto> {
    const response = await api.put<GroupDto>(`${BASE_URL}/${id}`, data);
    return response.data;
}

export async function deleteGroup(id: string): Promise<OperationResultDto> {
    const response = await api.delete<OperationResultDto>(`${BASE_URL}/${id}`);
    return response.data;
}

export async function getGroupMembers(groupId: string): Promise<GroupMemberDetailDto[]> {
    const response = await api.get<GroupMemberDetailDto[]>(`${BASE_URL}/${groupId}/members`);
    return Array.isArray(response.data) ? response.data : [];
}

export async function addGroupMember(groupId: string, data: AddGroupMemberDto): Promise<GroupMemberDetailDto> {
    const response = await api.post<GroupMemberDetailDto>(`${BASE_URL}/${groupId}/members`, data);
    return response.data;
}

export async function removeGroupMember(groupId: string, userId: string): Promise<OperationResultDto> {
    const response = await api.delete<OperationResultDto>(`${BASE_URL}/${groupId}/members/${userId}`);
    return response.data;
}

export interface BatchAddOptions {
    memberRole?: string;
    inheritGroupPermissions?: boolean;
}

export interface BatchAddResult {
    total: number;
    succeeded: number;
    failed: { userId: string; error: string }[];
}

export async function batchAddGroupMembers(
    groupId: string,
    userIds: string[],
    options?: BatchAddOptions,
    onProgress?: (completed: number, total: number) => void,
): Promise<BatchAddResult> {
    const result: BatchAddResult = { total: userIds.length, succeeded: 0, failed: [] };

    for (let i = 0; i < userIds.length; i++) {
        try {
            const dto: AddGroupMemberDto = {
                userId: userIds[i],
                memberRole: options?.memberRole,
                inheritGroupPermissions: options?.inheritGroupPermissions,
            };
            await addGroupMember(groupId, dto);
            result.succeeded++;
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || '加入失敗';
            result.failed.push({ userId: userIds[i], error: msg });
        }
        onProgress?.(i + 1, userIds.length);
    }

    return result;
}

export default {
    getGroups,
    getGroupById,
    getGroupStats,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupMembers,
    addGroupMember,
    removeGroupMember,
    batchAddGroupMembers,
};
