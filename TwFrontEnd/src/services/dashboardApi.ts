/**
 * Dashboard API Service
 * UC Capital Identity Admin
 *
 * 系統總覽 API 服務
 */

import { api } from './api';

// ============ Types ============

export interface DashboardAuditLogDto {
    created: string;
    total: number;
}

export interface DashboardDto {
    clientsTotal: number;
    apiResourcesTotal: number;
    apiScopesTotal: number;
    identityResourcesTotal: number;
    identityProvidersTotal: number;
    auditLogsAvg: number;
    auditLogsPerDaysTotal: DashboardAuditLogDto[];
}

export interface DashboardIdentityDto {
    usersTotal: number;
    rolesTotal: number;
}

// ============ API ============

const BASE_URL = '/api/dashboard';

export async function getDashboardIdentityServer(auditLogsLastNumberOfDays = 7): Promise<DashboardDto> {
    const response = await api.get<DashboardDto>(
        `${BASE_URL}/GetDashboardIdentityServer`,
        { params: { auditLogsLastNumberOfDays } }
    );
    return response.data;
}

export async function getDashboardIdentity(): Promise<DashboardIdentityDto> {
    const response = await api.get<DashboardIdentityDto>(
        `${BASE_URL}/GetDashboardIdentity`
    );
    return response.data;
}
