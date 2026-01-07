import { api } from './api';
import type {
    IdentityResourceApiDto,
    IdentityResourcesApiDto,
    IdentityResourcePropertyApiDto,
    IdentityResourcePropertiesApiDto,
} from '@/types/identityServer';

const BASE_URL = '/api/IdentityResources';

export const identityResourceService = {
    // ============ Identity Resources CRUD ============
    async getIdentityResources(search: string = '', page: number = 1, pageSize: number = 10): Promise<IdentityResourcesApiDto> {
        const response = await api.get<IdentityResourcesApiDto>(BASE_URL, {
            params: { searchText: search, page, pageSize }
        });
        return response.data;
    },

    async getIdentityResource(id: number): Promise<IdentityResourceApiDto> {
        const response = await api.get<IdentityResourceApiDto>(`${BASE_URL}/${id}`);
        return response.data;
    },

    async createIdentityResource(resource: Omit<IdentityResourceApiDto, 'id'>): Promise<IdentityResourceApiDto> {
        const response = await api.post<IdentityResourceApiDto>(BASE_URL, { ...resource, id: 0 });
        return response.data;
    },

    async updateIdentityResource(resource: IdentityResourceApiDto): Promise<void> {
        await api.put(BASE_URL, resource);
    },

    async deleteIdentityResource(id: number): Promise<void> {
        await api.delete(`${BASE_URL}/${id}`);
    },

    async canInsertIdentityResource(id: number, name: string): Promise<boolean> {
        const response = await api.get<boolean>(`${BASE_URL}/CanInsertIdentityResource`, {
            params: { id, name }
        });
        return response.data;
    },

    // ============ Identity Resource Properties ============
    async getProperties(identityResourceId: number, page: number = 1, pageSize: number = 10): Promise<IdentityResourcePropertiesApiDto> {
        const response = await api.get<IdentityResourcePropertiesApiDto>(`${BASE_URL}/${identityResourceId}/Properties`, {
            params: { page, pageSize }
        });
        return response.data;
    },

    async getProperty(propertyId: number): Promise<IdentityResourcePropertyApiDto> {
        const response = await api.get<IdentityResourcePropertyApiDto>(`${BASE_URL}/Properties/${propertyId}`);
        return response.data;
    },

    async createProperty(identityResourceId: number, property: Omit<IdentityResourcePropertyApiDto, 'id' | 'identityResourceId'>): Promise<IdentityResourcePropertyApiDto> {
        const response = await api.post<IdentityResourcePropertyApiDto>(`${BASE_URL}/${identityResourceId}/Properties`, {
            ...property,
            id: 0,
            identityResourceId
        });
        return response.data;
    },

    async deleteProperty(propertyId: number): Promise<void> {
        await api.delete(`${BASE_URL}/Properties/${propertyId}`);
    },

    async canInsertProperty(id: number, key: string): Promise<boolean> {
        const response = await api.get<boolean>(`${BASE_URL}/CanInsertIdentityResourceProperty`, {
            params: { id, key }
        });
        return response.data;
    },
};
