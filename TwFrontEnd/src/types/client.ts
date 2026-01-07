/**
 * Client Types
 * UC Capital Identity Admin
 *
 * OAuth 2.0 / OpenID Connect 客戶端類型定義
 */

export interface ClientApiDto {
    id: number;
    clientId: string;
    clientName: string;
    description?: string;
    enabled: boolean;
    clientUri?: string;
    logoUri?: string;
    protocolType: string;

    // Consent settings
    requireConsent: boolean;
    allowRememberConsent: boolean;
    consentLifetime?: number;

    // Authentication
    requireClientSecret: boolean;
    requirePkce: boolean;
    allowPlainTextPkce: boolean;
    enableLocalLogin: boolean;

    // Token settings
    allowOfflineAccess: boolean;
    allowAccessTokensViaBrowser: boolean;
    accessTokenType: number;
    includeJwtId: boolean;
    alwaysIncludeUserClaimsInIdToken: boolean;
    alwaysSendClientClaims: boolean;
    clientClaimsPrefix?: string;
    pairWiseSubjectSalt?: string;
    updateAccessTokenClaimsOnRefresh: boolean;

    // Token lifetimes
    identityTokenLifetime: number;
    accessTokenLifetime: number;
    authorizationCodeLifetime: number;
    absoluteRefreshTokenLifetime: number;
    slidingRefreshTokenLifetime: number;
    refreshTokenUsage: number;
    refreshTokenExpiration: number;
    userSsoLifetime?: number;
    deviceCodeLifetime: number;

    // Logout URIs
    frontChannelLogoutUri?: string;
    frontChannelLogoutSessionRequired: boolean;
    backChannelLogoutUri?: string;
    backChannelLogoutSessionRequired: boolean;

    // Grant types and scopes
    allowedGrantTypes: string[];
    allowedScopes: string[];
    redirectUris: string[];
    postLogoutRedirectUris: string[];
    allowedCorsOrigins: string[];
    identityProviderRestrictions: string[];

    // CIBA (Client Initiated Backchannel Authentication)
    cibaLifetime?: number;
    pollingInterval?: number;

    // DPoP (Demonstration of Proof of Possession)
    requireDPoP: boolean;
    dPoPValidationMode: number;
    dPoPClockSkew?: string;

    // Pushed Authorization Request
    pushedAuthorizationLifetime?: number;
    requirePushedAuthorization: boolean;
    requireRequestObject: boolean;
    initiateLoginUri?: string;

    // Coordination
    coordinateLifetimeWithUserSession: boolean;
    userCodeType?: string;

    // Signing algorithms
    allowedIdentityTokenSigningAlgorithms?: string[];

    // Sub-entities
    claims: ClientClaimApiDto[];
    properties: ClientPropertyApiDto[];

    // Metadata
    updated?: string;
    lastAccessed?: string;
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
}

export interface ClientSecretApiDto {
    id: number;
    description?: string;
    value: string;
    expiration?: string;
    type: string;
    clientId: number;
}

export interface ClientSecretsApiDto {
    clientSecrets: ClientSecretApiDto[];
    totalCount: number;
    pageSize: number;
    clientId: number;
}

// Default values for new client creation
export const defaultClient: Omit<ClientApiDto, 'id'> = {
    clientId: '',
    clientName: '',
    description: '',
    enabled: true,
    clientUri: '',
    logoUri: '',
    protocolType: 'oidc',

    requireConsent: true,
    allowRememberConsent: true,
    consentLifetime: undefined,

    requireClientSecret: true,
    requirePkce: true,
    allowPlainTextPkce: false,
    enableLocalLogin: true,

    allowOfflineAccess: false,
    allowAccessTokensViaBrowser: false,
    accessTokenType: 0,
    includeJwtId: false,
    alwaysIncludeUserClaimsInIdToken: false,
    alwaysSendClientClaims: false,
    clientClaimsPrefix: 'client_',
    pairWiseSubjectSalt: '',
    updateAccessTokenClaimsOnRefresh: false,

    identityTokenLifetime: 300,
    accessTokenLifetime: 3600,
    authorizationCodeLifetime: 300,
    absoluteRefreshTokenLifetime: 2592000,
    slidingRefreshTokenLifetime: 1296000,
    refreshTokenUsage: 1,
    refreshTokenExpiration: 1,
    userSsoLifetime: undefined,
    deviceCodeLifetime: 300,

    frontChannelLogoutUri: '',
    frontChannelLogoutSessionRequired: true,
    backChannelLogoutUri: '',
    backChannelLogoutSessionRequired: true,

    allowedGrantTypes: [],
    allowedScopes: [],
    redirectUris: [],
    postLogoutRedirectUris: [],
    allowedCorsOrigins: [],
    identityProviderRestrictions: [],

    cibaLifetime: undefined,
    pollingInterval: undefined,

    requireDPoP: false,
    dPoPValidationMode: 0,
    dPoPClockSkew: undefined,

    pushedAuthorizationLifetime: undefined,
    requirePushedAuthorization: false,
    requireRequestObject: false,
    initiateLoginUri: '',

    coordinateLifetimeWithUserSession: false,
    userCodeType: '',

    allowedIdentityTokenSigningAlgorithms: [],

    claims: [],
    properties: [],

    nonEditable: false,
};

// Grant type options for selection
export const GRANT_TYPE_OPTIONS = [
    { value: 'authorization_code', label: 'Authorization Code' },
    { value: 'client_credentials', label: 'Client Credentials' },
    { value: 'refresh_token', label: 'Refresh Token' },
    { value: 'implicit', label: 'Implicit (Deprecated)' },
    { value: 'password', label: 'Resource Owner Password (Deprecated)' },
    { value: 'urn:ietf:params:oauth:grant-type:device_code', label: 'Device Code' },
    { value: 'urn:openid:params:grant-type:ciba', label: 'CIBA' },
];

// Access token type options
export const ACCESS_TOKEN_TYPE_OPTIONS = [
    { value: 0, label: 'JWT' },
    { value: 1, label: 'Reference' },
];

// Refresh token usage options
export const REFRESH_TOKEN_USAGE_OPTIONS = [
    { value: 0, label: 'ReUse' },
    { value: 1, label: 'OneTimeOnly' },
];

// Refresh token expiration options
export const REFRESH_TOKEN_EXPIRATION_OPTIONS = [
    { value: 0, label: 'Sliding' },
    { value: 1, label: 'Absolute' },
];
