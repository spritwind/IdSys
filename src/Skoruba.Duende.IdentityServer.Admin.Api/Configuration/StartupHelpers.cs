using System.Collections.Generic;
using System.IO;
using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using NSwag;
using NSwag.Generation.Processors.Security;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Configuration;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Configuration.Authorization;

namespace Skoruba.Duende.IdentityServer.Admin.Api.Configuration;

public static class StartupHelpers
{
    public static void AddSwaggerServices(this IServiceCollection services, AdminApiConfiguration adminApiConfiguration)
    {
        services.AddEndpointsApiExplorer();
        services.AddOpenApiDocument(configure =>
        {
            configure.Title = adminApiConfiguration.ApiName;
            configure.Version = adminApiConfiguration.ApiVersion;
            configure.Description = @"## UC Capital Identity Admin API

此 API 提供 Duende IdentityServer 的管理功能，包含：
- 使用者管理 (Users)
- 角色管理 (Roles)
- Client 管理 (Clients)
- API 資源管理 (API Resources)
- Identity 資源管理 (Identity Resources)
- OAuth 2.0 / OIDC 端點包裝

## OAuth 2.0 / OIDC 端點

提供標準 OIDC 端點的包裝，方便開發者測試：
- Discovery Document
- Authorization
- Token Exchange
- Token Introspection
- Token Revocation
- UserInfo
- End Session

## JWT Token 重要說明

JWT Token 是無狀態 (Stateless) 的：
- 本地驗證 (JWKS) 速度快但無法偵測撤銷
- 遠端驗證 (Introspection) 可偵測撤銷但需網路請求
";

            // 啟用 XML 文件註解
            configure.UseControllerSummaryAsTagDescription = true;

            configure.AddSecurity("OAuth2", new OpenApiSecurityScheme
            {
                Type = OpenApiSecuritySchemeType.OAuth2,
                Flows = new OpenApiOAuthFlows
                {
                    AuthorizationCode = new OpenApiOAuthFlow
                    {
                        AuthorizationUrl = $"{adminApiConfiguration.IdentityServerBaseUrl}/connect/authorize",
                        TokenUrl = $"{adminApiConfiguration.IdentityServerBaseUrl}/connect/token",
                        Scopes = new Dictionary<string, string>
                        {
                            { adminApiConfiguration.OidcApiName, adminApiConfiguration.ApiName }
                        }
                    }
                }
            });

            configure.OperationProcessors.Add(new AspNetCoreOperationSecurityScopeProcessor("OAuth2"));
            configure.OperationProcessors.Add(new AuthorizeCheckOperationProcessor(adminApiConfiguration));
        });
    }
}