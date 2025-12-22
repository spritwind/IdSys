export interface ClientApiDto {
    id: number;
    clientId: string;
    clientName: string;
    description?: string;
    enabled: boolean;
    clientUri?: string;
    logoUri?: string;
    requireConsent: boolean;
    allowRememberConsent: boolean;
    allowOfflineAccess: boolean;
    allowedGrantTypes: string[];
    redirectUris: string[];
    postLogoutRedirectUris: string[];
    allowedScopes: string[];
    protocolType: string;
    requireClientSecret: boolean;
    requirePkce: boolean;
    allowPlainTextPkce: boolean;
    allowAccessTokensViaBrowser: boolean;
    frontChannelLogoutUri?: string;
    frontChannelLogoutSessionRequired: boolean;
    backChannelLogoutUri?: string;
    backChannelLogoutSessionRequired: boolean;
    identityTokenLifetime: number; // seconds
    accessTokenLifetime: number; // seconds
    authorizationCodeLifetime: number; // seconds
    absoluteRefreshTokenLifetime: number; // seconds
    slidingRefreshTokenLifetime: number; // seconds
    consentLifetime?: number; // seconds
    refreshTokenUsage: number;
    updateAccessTokenClaimsOnRefresh: boolean;
    refreshTokenExpiration: number;
    accessTokenType: number;
    enableLocalLogin: boolean;
    identityProviderRestrictions: string[];
    includeJwtId: boolean;
    claims: ClientClaimApiDto[];
    properties: ClientPropertyApiDto[];
    created?: string;
    updated?: string;
    lastAccessed?: string;
    userSsoLifetime?: number;
    userCodeType?: string;
    deviceCodeLifetime: number;
    nonEditable: boolean;
}

export interface ClientClaimApiDto {
    id: number;
    type: string;
    value: string;
    clientId: number;
}

export interface ClientPropertyApiDto {
    id: number;
    key: string;
    value: string;
    clientId: number;
}

export interface ClientsApiDto {
    clients: ClientApiDto[];
    totalCount: number;
    pageSize: number;
    page: number; // Add page to match common paging patterns, though backend might just send total/size
}

export interface ClientSecretApiDto {
    id: number;
    description?: string;
    value: string;
    expiration?: string;
    type: string;
    clientId: number;
}
