import { api } from './api';
import type {
    ApiScopeApiDto,
    ApiScopesApiDto,
    ApiScopePropertyApiDto,
    ApiScopePropertiesApiDto,
} from '@/types/identityServer';

const BASE_URL = '/api/ApiScopes';

export const apiScopeService = {
    // ============ API Scopes CRUD ============
    async getApiScopes(search: string = '', page: number = 1, pageSize: number = 100): Promise<ApiScopesApiDto> {
        const response = await api.get<ApiScopesApiDto>(BASE_URL, {
            params: { search, page, pageSize }
        });
        return response.data;
    },

    async getApiScope(id: number): Promise<ApiScopeApiDto> {
        const response = await api.get<ApiScopeApiDto>(`${BASE_URL}/${id}`);
        return response.data;
    },

    async createApiScope(scope: Omit<ApiScopeApiDto, 'id'>): Promise<ApiScopeApiDto> {
        const response = await api.post<ApiScopeApiDto>(BASE_URL, { ...scope, id: 0 });
        return response.data;
    },

    async updateApiScope(scope: ApiScopeApiDto): Promise<void> {
        await api.put(BASE_URL, scope);
    },

    async deleteApiScope(id: number): Promise<void> {
        await api.delete(`${BASE_URL}/${id}`);
    },

    async canInsertApiScope(id: number, name: string): Promise<boolean> {
        const response = await api.get<boolean>(`${BASE_URL}/CanInsertApiScope`, {
            params: { id, name }
        });
        return response.data;
    },

    // ============ API Scope Properties ============
    async getProperties(apiScopeId: number, page: number = 1, pageSize: number = 100): Promise<ApiScopePropertiesApiDto> {
        const response = await api.get<ApiScopePropertiesApiDto>(`${BASE_URL}/${apiScopeId}/Properties`, {
            params: { page, pageSize }
        });
        return response.data;
    },

    async getProperty(propertyId: number): Promise<ApiScopePropertyApiDto> {
        const response = await api.get<ApiScopePropertyApiDto>(`${BASE_URL}/Properties/${propertyId}`);
        return response.data;
    },

    async createProperty(apiScopeId: number, property: Omit<ApiScopePropertyApiDto, 'id' | 'scopeId'>): Promise<ApiScopePropertyApiDto> {
        const response = await api.post<ApiScopePropertyApiDto>(`${BASE_URL}/${apiScopeId}/Properties`, {
            ...property,
            id: 0,
            scopeId: apiScopeId
        });
        return response.data;
    },

    async deleteProperty(propertyId: number): Promise<void> {
        await api.delete(`${BASE_URL}/Properties/${propertyId}`);
    },

    async canInsertProperty(id: number, key: string): Promise<boolean> {
        const response = await api.get<boolean>(`${BASE_URL}/CanInsertApiScopeProperty`, {
            params: { id, key }
        });
        return response.data;
    },
};
