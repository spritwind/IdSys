import { api } from './api';
import type {
    ApiResourceApiDto,
    ApiResourcesApiDto,
    ApiSecretApiDto,
    ApiSecretsApiDto,
    ApiResourcePropertyApiDto,
    ApiResourcePropertiesApiDto,
} from '@/types/identityServer';

const BASE_URL = '/api/ApiResources';

export const apiResourceService = {
    // ============ API Resources CRUD ============
    async getApiResources(search: string = '', page: number = 1, pageSize: number = 10): Promise<ApiResourcesApiDto> {
        const response = await api.get<ApiResourcesApiDto>(BASE_URL, {
            params: { searchText: search, page, pageSize }
        });
        return response.data;
    },

    async getApiResource(id: number): Promise<ApiResourceApiDto> {
        const response = await api.get<ApiResourceApiDto>(`${BASE_URL}/${id}`);
        return response.data;
    },

    async createApiResource(resource: Omit<ApiResourceApiDto, 'id'>): Promise<ApiResourceApiDto> {
        const response = await api.post<ApiResourceApiDto>(BASE_URL, { ...resource, id: 0 });
        return response.data;
    },

    async updateApiResource(resource: ApiResourceApiDto): Promise<void> {
        await api.put(BASE_URL, resource);
    },

    async deleteApiResource(id: number): Promise<void> {
        await api.delete(`${BASE_URL}/${id}`);
    },

    async canInsertApiResource(id: number, name: string): Promise<boolean> {
        const response = await api.get<boolean>(`${BASE_URL}/CanInsertApiResource`, {
            params: { id, name }
        });
        return response.data;
    },

    // ============ API Resource Secrets ============
    async getSecrets(apiResourceId: number, page: number = 1, pageSize: number = 10): Promise<ApiSecretsApiDto> {
        const response = await api.get<ApiSecretsApiDto>(`${BASE_URL}/${apiResourceId}/Secrets`, {
            params: { page, pageSize }
        });
        return response.data;
    },

    async getSecret(secretId: number): Promise<ApiSecretApiDto> {
        const response = await api.get<ApiSecretApiDto>(`${BASE_URL}/Secrets/${secretId}`);
        return response.data;
    },

    async createSecret(apiResourceId: number, secret: Omit<ApiSecretApiDto, 'id' | 'apiResourceId'>): Promise<ApiSecretApiDto> {
        const response = await api.post<ApiSecretApiDto>(`${BASE_URL}/${apiResourceId}/Secrets`, {
            ...secret,
            id: 0,
            apiResourceId
        });
        return response.data;
    },

    async deleteSecret(secretId: number): Promise<void> {
        await api.delete(`${BASE_URL}/Secrets/${secretId}`);
    },

    // ============ API Resource Properties ============
    async getProperties(apiResourceId: number, page: number = 1, pageSize: number = 10): Promise<ApiResourcePropertiesApiDto> {
        const response = await api.get<ApiResourcePropertiesApiDto>(`${BASE_URL}/${apiResourceId}/Properties`, {
            params: { page, pageSize }
        });
        return response.data;
    },

    async getProperty(propertyId: number): Promise<ApiResourcePropertyApiDto> {
        const response = await api.get<ApiResourcePropertyApiDto>(`${BASE_URL}/Properties/${propertyId}`);
        return response.data;
    },

    async createProperty(apiResourceId: number, property: Omit<ApiResourcePropertyApiDto, 'id' | 'apiResourceId'>): Promise<ApiResourcePropertyApiDto> {
        const response = await api.post<ApiResourcePropertyApiDto>(`${BASE_URL}/${apiResourceId}/Properties`, {
            ...property,
            id: 0,
            apiResourceId
        });
        return response.data;
    },

    async deleteProperty(propertyId: number): Promise<void> {
        await api.delete(`${BASE_URL}/Properties/${propertyId}`);
    },

    async canInsertProperty(id: number, key: string): Promise<boolean> {
        const response = await api.get<boolean>(`${BASE_URL}/CanInsertApiResourceProperty`, {
            params: { id, key }
        });
        return response.data;
    },
};
