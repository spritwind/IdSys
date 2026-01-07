// Identity Server Configuration Types

// ============ API Resource ============
export interface ApiResourceApiDto {
    id: number;
    name: string;
    displayName?: string;
    description?: string;
    enabled: boolean;
    showInDiscoveryDocument: boolean;
    requireResourceIndicator: boolean;
    userClaims: string[];
    allowedAccessTokenSigningAlgorithms: string[];
    scopes: string[];
}

export interface ApiResourcesApiDto {
    apiResources: ApiResourceApiDto[];
    totalCount: number;
    pageSize: number;
}

export interface ApiResourcePropertyApiDto {
    id: number;
    key: string;
    value: string;
    apiResourceId: number;
}

export interface ApiResourcePropertiesApiDto {
    apiResourceProperties: ApiResourcePropertyApiDto[];
    totalCount: number;
    pageSize: number;
    apiResourceId: number;
}

export interface ApiSecretApiDto {
    id: number;
    description?: string;
    value: string;
    expiration?: string;
    type: string;
    apiResourceId: number;
}

export interface ApiSecretsApiDto {
    apiSecrets: ApiSecretApiDto[];
    totalCount: number;
    pageSize: number;
    apiResourceId: number;
}

// ============ API Scope ============
export interface ApiScopeApiDto {
    id: number;
    name: string;
    displayName?: string;
    description?: string;
    enabled: boolean;
    showInDiscoveryDocument: boolean;
    required: boolean;
    emphasize: boolean;
    userClaims: string[];
    apiScopeProperties?: ApiScopePropertyApiDto[];
}

export interface ApiScopesApiDto {
    scopes: ApiScopeApiDto[];
    totalCount: number;
    pageSize: number;
}

export interface ApiScopePropertyApiDto {
    id: number;
    key: string;
    value: string;
    scopeId: number;
}

export interface ApiScopePropertiesApiDto {
    apiScopeProperties: ApiScopePropertyApiDto[];
    totalCount: number;
    pageSize: number;
    apiScopeId: number;
}

// ============ Identity Resource ============
export interface IdentityResourceApiDto {
    id: number;
    name: string;
    displayName?: string;
    description?: string;
    enabled: boolean;
    showInDiscoveryDocument: boolean;
    required: boolean;
    emphasize: boolean;
    userClaims: string[];
}

export interface IdentityResourcesApiDto {
    identityResources: IdentityResourceApiDto[];
    totalCount: number;
    pageSize: number;
}

export interface IdentityResourcePropertyApiDto {
    id: number;
    key: string;
    value: string;
    identityResourceId: number;
}

export interface IdentityResourcePropertiesApiDto {
    identityResourceProperties: IdentityResourcePropertyApiDto[];
    totalCount: number;
    pageSize: number;
    identityResourceId: number;
}

// ============ Default Values for Create Forms ============
export const defaultApiResource: Omit<ApiResourceApiDto, 'id'> = {
    name: '',
    displayName: '',
    description: '',
    enabled: true,
    showInDiscoveryDocument: true,
    requireResourceIndicator: false,
    userClaims: [],
    allowedAccessTokenSigningAlgorithms: [],
    scopes: [],
};

export const defaultApiScope: Omit<ApiScopeApiDto, 'id'> = {
    name: '',
    displayName: '',
    description: '',
    enabled: true,
    showInDiscoveryDocument: true,
    required: false,
    emphasize: false,
    userClaims: [],
};

export const defaultIdentityResource: Omit<IdentityResourceApiDto, 'id'> = {
    name: '',
    displayName: '',
    description: '',
    enabled: true,
    showInDiscoveryDocument: true,
    required: false,
    emphasize: false,
    userClaims: [],
};
