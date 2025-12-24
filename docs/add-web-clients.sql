-- ============================================
-- UC Capital IdentityServer Web Client 註冊腳本
-- ============================================
-- 執行此腳本新增多個 Web 應用程式 Client
--
-- 新增的 Clients:
--   1. uc_web_68_16_3500 - http://172.16.68.16:3500/
--   2. uc_web_68_16_3168 - http://172.16.68.16:3168/
--   3. uc_web_38_11_3500 - http://172.16.38.11:3500/
--   4. uc_web_68_6_3500  - http://172.16.68.6:3500/
-- ============================================

USE [IdentitySysDB]
GO

-- ============================================
-- Client 1: http://172.16.68.16:3500/
-- ============================================
DECLARE @ClientId1 INT

INSERT INTO [Clients] (
    [Enabled], [ClientId], [ProtocolType], [RequireClientSecret],
    [ClientName], [ClientUri], [RequireConsent], [AllowRememberConsent],
    [RequirePkce], [AllowPlainTextPkce], [RequireRequestObject],
    [AllowAccessTokensViaBrowser], [RequireDPoP], [DPoPValidationMode],
    [FrontChannelLogoutSessionRequired], [BackChannelLogoutSessionRequired],
    [AllowOfflineAccess], [AlwaysIncludeUserClaimsInIdToken],
    [IdentityTokenLifetime], [AccessTokenLifetime], [AuthorizationCodeLifetime],
    [AbsoluteRefreshTokenLifetime], [SlidingRefreshTokenLifetime],
    [RefreshTokenUsage], [RefreshTokenExpiration], [UpdateAccessTokenClaimsOnRefresh],
    [AccessTokenType], [EnableLocalLogin], [IncludeJwtId],
    [AlwaysSendClientClaims], [ClientClaimsPrefix], [Created], [NonEditable]
)
VALUES (
    1, 'uc_web_68_16_3500', 'oidc', 0,
    N'UC Capital Web App (172.16.68.16:3500)', 'http://172.16.68.16:3500', 0, 1,
    1, 0, 0,
    1, 0, 0,
    1, 0,
    1, 0,
    300, 3600, 300,
    86400, 43200,
    1, 1, 0,
    0, 1, 0,
    0, 'client_', GETUTCDATE(), 0
)

SET @ClientId1 = SCOPE_IDENTITY()

INSERT INTO [ClientGrantTypes] ([GrantType], [ClientId]) VALUES ('authorization_code', @ClientId1)
INSERT INTO [ClientRedirectUris] ([RedirectUri], [ClientId]) VALUES ('http://172.16.68.16:3500/auth/callback', @ClientId1)
INSERT INTO [ClientRedirectUris] ([RedirectUri], [ClientId]) VALUES ('http://172.16.68.16:3500/auth/silent-renew', @ClientId1)
INSERT INTO [ClientPostLogoutRedirectUris] ([PostLogoutRedirectUri], [ClientId]) VALUES ('http://172.16.68.16:3500/', @ClientId1)
INSERT INTO [ClientCorsOrigins] ([Origin], [ClientId]) VALUES ('http://172.16.68.16:3500', @ClientId1)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('openid', @ClientId1)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('profile', @ClientId1)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('email', @ClientId1)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('roles', @ClientId1)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('offline_access', @ClientId1)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('uc_capital_admin_api', @ClientId1)

PRINT N'Client uc_web_68_16_3500 建立完成'

-- ============================================
-- Client 2: http://172.16.68.16:3168/
-- ============================================
DECLARE @ClientId2 INT

INSERT INTO [Clients] (
    [Enabled], [ClientId], [ProtocolType], [RequireClientSecret],
    [ClientName], [ClientUri], [RequireConsent], [AllowRememberConsent],
    [RequirePkce], [AllowPlainTextPkce], [RequireRequestObject],
    [AllowAccessTokensViaBrowser], [RequireDPoP], [DPoPValidationMode],
    [FrontChannelLogoutSessionRequired], [BackChannelLogoutSessionRequired],
    [AllowOfflineAccess], [AlwaysIncludeUserClaimsInIdToken],
    [IdentityTokenLifetime], [AccessTokenLifetime], [AuthorizationCodeLifetime],
    [AbsoluteRefreshTokenLifetime], [SlidingRefreshTokenLifetime],
    [RefreshTokenUsage], [RefreshTokenExpiration], [UpdateAccessTokenClaimsOnRefresh],
    [AccessTokenType], [EnableLocalLogin], [IncludeJwtId],
    [AlwaysSendClientClaims], [ClientClaimsPrefix], [Created], [NonEditable]
)
VALUES (
    1, 'uc_web_68_16_3168', 'oidc', 0,
    N'UC Capital Web App (172.16.68.16:3168)', 'http://172.16.68.16:3168', 0, 1,
    1, 0, 0,
    1, 0, 0,
    1, 0,
    1, 0,
    300, 3600, 300,
    86400, 43200,
    1, 1, 0,
    0, 1, 0,
    0, 'client_', GETUTCDATE(), 0
)

SET @ClientId2 = SCOPE_IDENTITY()

INSERT INTO [ClientGrantTypes] ([GrantType], [ClientId]) VALUES ('authorization_code', @ClientId2)
INSERT INTO [ClientRedirectUris] ([RedirectUri], [ClientId]) VALUES ('http://172.16.68.16:3168/auth/callback', @ClientId2)
INSERT INTO [ClientRedirectUris] ([RedirectUri], [ClientId]) VALUES ('http://172.16.68.16:3168/auth/silent-renew', @ClientId2)
INSERT INTO [ClientPostLogoutRedirectUris] ([PostLogoutRedirectUri], [ClientId]) VALUES ('http://172.16.68.16:3168/', @ClientId2)
INSERT INTO [ClientCorsOrigins] ([Origin], [ClientId]) VALUES ('http://172.16.68.16:3168', @ClientId2)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('openid', @ClientId2)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('profile', @ClientId2)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('email', @ClientId2)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('roles', @ClientId2)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('offline_access', @ClientId2)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('uc_capital_admin_api', @ClientId2)

PRINT N'Client uc_web_68_16_3168 建立完成'

-- ============================================
-- Client 3: http://172.16.38.11:3500/
-- ============================================
DECLARE @ClientId3 INT

INSERT INTO [Clients] (
    [Enabled], [ClientId], [ProtocolType], [RequireClientSecret],
    [ClientName], [ClientUri], [RequireConsent], [AllowRememberConsent],
    [RequirePkce], [AllowPlainTextPkce], [RequireRequestObject],
    [AllowAccessTokensViaBrowser], [RequireDPoP], [DPoPValidationMode],
    [FrontChannelLogoutSessionRequired], [BackChannelLogoutSessionRequired],
    [AllowOfflineAccess], [AlwaysIncludeUserClaimsInIdToken],
    [IdentityTokenLifetime], [AccessTokenLifetime], [AuthorizationCodeLifetime],
    [AbsoluteRefreshTokenLifetime], [SlidingRefreshTokenLifetime],
    [RefreshTokenUsage], [RefreshTokenExpiration], [UpdateAccessTokenClaimsOnRefresh],
    [AccessTokenType], [EnableLocalLogin], [IncludeJwtId],
    [AlwaysSendClientClaims], [ClientClaimsPrefix], [Created], [NonEditable]
)
VALUES (
    1, 'uc_web_38_11_3500', 'oidc', 0,
    N'UC Capital Web App (172.16.38.11:3500)', 'http://172.16.38.11:3500', 0, 1,
    1, 0, 0,
    1, 0, 0,
    1, 0,
    1, 0,
    300, 3600, 300,
    86400, 43200,
    1, 1, 0,
    0, 1, 0,
    0, 'client_', GETUTCDATE(), 0
)

SET @ClientId3 = SCOPE_IDENTITY()

INSERT INTO [ClientGrantTypes] ([GrantType], [ClientId]) VALUES ('authorization_code', @ClientId3)
INSERT INTO [ClientRedirectUris] ([RedirectUri], [ClientId]) VALUES ('http://172.16.38.11:3500/auth/callback', @ClientId3)
INSERT INTO [ClientRedirectUris] ([RedirectUri], [ClientId]) VALUES ('http://172.16.38.11:3500/auth/silent-renew', @ClientId3)
INSERT INTO [ClientPostLogoutRedirectUris] ([PostLogoutRedirectUri], [ClientId]) VALUES ('http://172.16.38.11:3500/', @ClientId3)
INSERT INTO [ClientCorsOrigins] ([Origin], [ClientId]) VALUES ('http://172.16.38.11:3500', @ClientId3)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('openid', @ClientId3)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('profile', @ClientId3)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('email', @ClientId3)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('roles', @ClientId3)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('offline_access', @ClientId3)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('uc_capital_admin_api', @ClientId3)

PRINT N'Client uc_web_38_11_3500 建立完成'

-- ============================================
-- Client 4: http://172.16.68.6:3500/
-- ============================================
DECLARE @ClientId4 INT

INSERT INTO [Clients] (
    [Enabled], [ClientId], [ProtocolType], [RequireClientSecret],
    [ClientName], [ClientUri], [RequireConsent], [AllowRememberConsent],
    [RequirePkce], [AllowPlainTextPkce], [RequireRequestObject],
    [AllowAccessTokensViaBrowser], [RequireDPoP], [DPoPValidationMode],
    [FrontChannelLogoutSessionRequired], [BackChannelLogoutSessionRequired],
    [AllowOfflineAccess], [AlwaysIncludeUserClaimsInIdToken],
    [IdentityTokenLifetime], [AccessTokenLifetime], [AuthorizationCodeLifetime],
    [AbsoluteRefreshTokenLifetime], [SlidingRefreshTokenLifetime],
    [RefreshTokenUsage], [RefreshTokenExpiration], [UpdateAccessTokenClaimsOnRefresh],
    [AccessTokenType], [EnableLocalLogin], [IncludeJwtId],
    [AlwaysSendClientClaims], [ClientClaimsPrefix], [Created], [NonEditable]
)
VALUES (
    1, 'uc_web_68_6_3500', 'oidc', 0,
    N'UC Capital Web App (172.16.68.6:3500)', 'http://172.16.68.6:3500', 0, 1,
    1, 0, 0,
    1, 0, 0,
    1, 0,
    1, 0,
    300, 3600, 300,
    86400, 43200,
    1, 1, 0,
    0, 1, 0,
    0, 'client_', GETUTCDATE(), 0
)

SET @ClientId4 = SCOPE_IDENTITY()

INSERT INTO [ClientGrantTypes] ([GrantType], [ClientId]) VALUES ('authorization_code', @ClientId4)
INSERT INTO [ClientRedirectUris] ([RedirectUri], [ClientId]) VALUES ('http://172.16.68.6:3500/auth/callback', @ClientId4)
INSERT INTO [ClientRedirectUris] ([RedirectUri], [ClientId]) VALUES ('http://172.16.68.6:3500/auth/silent-renew', @ClientId4)
INSERT INTO [ClientPostLogoutRedirectUris] ([PostLogoutRedirectUri], [ClientId]) VALUES ('http://172.16.68.6:3500/', @ClientId4)
INSERT INTO [ClientCorsOrigins] ([Origin], [ClientId]) VALUES ('http://172.16.68.6:3500', @ClientId4)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('openid', @ClientId4)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('profile', @ClientId4)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('email', @ClientId4)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('roles', @ClientId4)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('offline_access', @ClientId4)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('uc_capital_admin_api', @ClientId4)

PRINT N'Client uc_web_68_6_3500 建立完成'

-- ============================================
-- 驗證所有新增的 Clients
-- ============================================
PRINT N''
PRINT N'============================================'
PRINT N'驗證新增的 Clients'
PRINT N'============================================'

SELECT
    c.[ClientId],
    c.[ClientName],
    c.[ClientUri],
    c.[Enabled]
FROM [Clients] c
WHERE c.[ClientId] IN (
    'uc_web_68_16_3500',
    'uc_web_68_16_3168',
    'uc_web_38_11_3500',
    'uc_web_68_6_3500'
)

PRINT N''
PRINT N'所有 Clients 建立完成！'
