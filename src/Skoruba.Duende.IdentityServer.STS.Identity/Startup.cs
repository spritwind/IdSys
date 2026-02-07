using System;
using System.Collections.Generic;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Skoruba.AuditLogging.EntityFramework.DbContexts;
using Skoruba.AuditLogging.EntityFramework.Entities;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Configuration.Configuration;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.DbContexts;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.Entities.Identity;
using Skoruba.Duende.IdentityServer.Shared.Configuration.Helpers;
using Skoruba.Duende.IdentityServer.STS.Identity.Configuration;
using Skoruba.Duende.IdentityServer.STS.Identity.Configuration.Constants;
using Skoruba.Duende.IdentityServer.STS.Identity.Configuration.Interfaces;
using Skoruba.Duende.IdentityServer.STS.Identity.Helpers;
using Skoruba.Duende.IdentityServer.STS.Identity.Services;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts;
using Duende.IdentityServer.Validation;
using Duende.IdentityServer.ResponseHandling;
using Scrutor;
using NSwag;
using NSwag.Generation.Processors.Security;

namespace Skoruba.Duende.IdentityServer.STS.Identity
{
    public class Startup
    {
        public IConfiguration Configuration { get; }
        public IWebHostEnvironment Environment { get; }

        public Startup(IWebHostEnvironment environment, IConfiguration configuration)
        {
            Configuration = configuration;
            Environment = environment;
        }

        public void ConfigureServices(IServiceCollection services)
        {
            var rootConfiguration = CreateRootConfiguration();
            services.AddSingleton(rootConfiguration);

            // 設定 CORS - 允許所有已註冊的 Client Origins
            services.AddCors(options =>
            {
                options.AddPolicy("IdentityServerCors", policy =>
                {
                    policy.SetIsOriginAllowed(origin =>
                    {
                        // 允許 localhost 開發環境
                        if (origin.StartsWith("http://localhost:"))
                            return true;
                        // 允許內網 IP
                        if (origin.StartsWith("http://172.16."))
                            return true;
                        // 允許正式環境
                        if (origin.Contains("uccapital.com.tw"))
                            return true;
                        return false;
                    })
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
                });
            });

            // Register DbContexts for IdentityServer and Identity
            RegisterDbContexts(services);

            // Save data protection keys to db, using a common application name shared between Admin and STS
            services.AddDataProtection<IdentityServerDataProtectionDbContext>(Configuration);

            // Add email senders which is currently setup for SendGrid and SMTP
            services.AddEmailSenders(Configuration);

            // Add services for authentication, including Identity model and external providers
            RegisterAuthentication(services);

            // Add HSTS options
            RegisterHstsOptions(services);

            // Add all dependencies for Asp.Net Core Identity in MVC - these dependencies are injected into generic Controllers
            // Including settings for MVC and Localization
            // If you want to change primary keys or use another db model for Asp.Net Core Identity:
            services.AddMvcWithLocalization<UserIdentity, string>(Configuration);

            // Add authorization policies for MVC
            RegisterAuthorization(services);

            services.AddIdSHealthChecks<IdentityServerConfigurationDbContext, IdentityServerPersistedGrantDbContext, AdminIdentityDbContext, IdentityServerDataProtectionDbContext>(Configuration);

            // 註冊 AuditLog DbContext 用於記錄登入審計日誌
            RegisterAuditLogDbContext(services);

            // 註冊登入審計服務
            services.AddScoped<ILoginAuditService, LoginAuditService>();

            // 註冊 HttpClientFactory (用於 OIDC 文件 API)
            services.AddHttpClient();

            // 註冊 Token 管理服務（JWT 撤銷驗證）
            RegisterTokenManagementServices(services);

            // 註冊 Swagger/OpenAPI 服務
            RegisterSwaggerServices(services);
        }

        /// <summary>
        /// 註冊 Swagger/OpenAPI 服務
        /// </summary>
        public virtual void RegisterSwaggerServices(IServiceCollection services)
        {
            services.AddEndpointsApiExplorer();
            services.AddOpenApiDocument(configure =>
            {
                configure.Title = "UC Capital Identity Server (STS)";
                configure.Version = "v1";
                configure.Description = @"## Duende IdentityServer - Security Token Service

此服務提供 OAuth 2.0 / OpenID Connect 標準端點，負責身份驗證與 Token 發放。

## 標準 OIDC 端點

| 端點 | 路徑 | 說明 |
|------|------|------|
| Discovery | `/.well-known/openid-configuration` | OIDC 設定文件 |
| JWKS | `/.well-known/openid-configuration/jwks` | JSON Web Key Set (公鑰) |
| Authorize | `/connect/authorize` | 授權端點 |
| Token | `/connect/token` | Token 交換端點 |
| UserInfo | `/connect/userinfo` | 使用者資訊端點 |
| Revocation | `/connect/revocation` | Token 撤銷端點 |
| Introspection | `/connect/introspect` | Token 檢驗端點 |
| End Session | `/connect/endsession` | 登出端點 |

## 支援的 OAuth 2.0 Grant Types

- **Authorization Code + PKCE** (推薦用於 SPA/Mobile)
- **Client Credentials** (用於 Machine-to-Machine)
- **Refresh Token** (用於更新 Access Token)

## JWT Token 特性

JWT Token 是**無狀態 (Stateless)** 的：
- 本地驗證使用 JWKS 公鑰，速度快但無法偵測撤銷
- 遠端驗證使用 Introspection，可偵測撤銷但需網路請求

## 參考文件

- [Duende IdentityServer 文件](https://docs.duendesoftware.com/)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
";

                configure.UseControllerSummaryAsTagDescription = true;

                configure.AddSecurity("OAuth2", new OpenApiSecurityScheme
                {
                    Type = OpenApiSecuritySchemeType.OAuth2,
                    Flows = new OpenApiOAuthFlows
                    {
                        AuthorizationCode = new OpenApiOAuthFlow
                        {
                            AuthorizationUrl = "/connect/authorize",
                            TokenUrl = "/connect/token",
                            Scopes = new Dictionary<string, string>
                            {
                                { "openid", "OpenID Connect 身份識別" },
                                { "profile", "使用者基本資訊" },
                                { "email", "使用者 Email" },
                                { "offline_access", "Refresh Token 支援" }
                            }
                        }
                    }
                });

                configure.OperationProcessors.Add(new AspNetCoreOperationSecurityScopeProcessor("OAuth2"));
            });
        }

        /// <summary>
        /// 註冊 Token 管理服務（JWT 撤銷驗證）
        /// </summary>
        public virtual void RegisterTokenManagementServices(IServiceCollection services)
        {
            var databaseProvider = Configuration.GetSection(nameof(DatabaseProviderConfiguration)).Get<DatabaseProviderConfiguration>();
            var connectionString = Configuration.GetConnectionString(ConfigurationConsts.ConfigurationDbConnectionStringKey);

            // 註冊 TokenManagementDbContext
            switch (databaseProvider?.ProviderType)
            {
                case DatabaseProviderType.SqlServer:
                default:
                    services.AddDbContext<TokenManagementDbContext>(options =>
                        options.UseSqlServer(connectionString));
                    break;
                case DatabaseProviderType.PostgreSQL:
                    services.AddDbContext<TokenManagementDbContext>(options =>
                        options.UseNpgsql(connectionString));
                    break;
                case DatabaseProviderType.MySql:
                    services.AddDbContext<TokenManagementDbContext>(options =>
                        options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));
                    break;
            }

            // 註冊 JWT 撤銷驗證器
            services.AddSingleton<IJwtRevocationValidator, JwtRevocationValidator>();

            // 裝飾 IIntrospectionRequestValidator 以支援撤銷檢查
            services.Decorate<IIntrospectionRequestValidator, CustomIntrospectionRequestValidator>();

            // 裝飾 ITokenRevocationResponseGenerator 以記錄 JWT 撤銷
            // 這樣當呼叫標準 /connect/revocation 端點時，也會記錄到 RevokedTokens 表
            services.Decorate<ITokenRevocationResponseGenerator, CustomTokenRevocationResponseGenerator>();
        }

        /// <summary>
        /// 註冊 AuditLog DbContext
        /// </summary>
        public virtual void RegisterAuditLogDbContext(IServiceCollection services)
        {
            var databaseProvider = Configuration.GetSection(nameof(DatabaseProviderConfiguration)).Get<DatabaseProviderConfiguration>();
            var connectionString = Configuration.GetConnectionString(ConfigurationConsts.AdminAuditLogDbConnectionStringKey)
                ?? Configuration.GetConnectionString(ConfigurationConsts.ConfigurationDbConnectionStringKey);

            switch (databaseProvider?.ProviderType)
            {
                case DatabaseProviderType.SqlServer:
                default:
                    services.AddDbContext<AdminAuditLogDbContext>(options =>
                        options.UseSqlServer(connectionString));
                    break;
                case DatabaseProviderType.PostgreSQL:
                    services.AddDbContext<AdminAuditLogDbContext>(options =>
                        options.UseNpgsql(connectionString));
                    break;
                case DatabaseProviderType.MySql:
                    services.AddDbContext<AdminAuditLogDbContext>(options =>
                        options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));
                    break;
            }

            // 註冊 IAuditLoggingDbContext 接口
            services.AddScoped<IAuditLoggingDbContext<AuditLog>>(provider =>
                provider.GetRequiredService<AdminAuditLogDbContext>());
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            var logger = app.ApplicationServices.GetRequiredService<ILoggerFactory>().CreateLogger("STS.PathBase");
            var basePath = Configuration.GetValue<string>("BasePath");

            logger.LogWarning("[STS-BOOT] BasePath config = '{BasePath}', Environment = {Env}", basePath, env.EnvironmentName);

            app.UseCookiePolicy();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseHsts();
            }

            // ============================================================
            // PathBase 診斷 + 強制設定 (pipeline 第一個 middleware)
            // ============================================================
            if (!string.IsNullOrEmpty(basePath))
            {
                app.Use(async (context, next) =>
                {
                    var originalPathBase = context.Request.PathBase.Value;
                    var originalPath = context.Request.Path.Value;

                    // 強制設定 PathBase
                    var pathBase = new PathString(basePath);
                    context.Request.PathBase = pathBase;

                    // Kestrel 直接存取時，path 仍帶有 basePath 前綴，需剝掉
                    if (context.Request.Path.StartsWithSegments(pathBase, out var remaining))
                    {
                        context.Request.Path = remaining;
                    }

                    // 記錄每個 302 redirect 的 Location header（抓出誰產生了錯誤的 redirect）
                    context.Response.OnStarting(() =>
                    {
                        if (context.Response.StatusCode == 302 || context.Response.StatusCode == 301)
                        {
                            var location = context.Response.Headers["Location"].ToString();
                            logger.LogWarning(
                                "[STS-REDIRECT] {StatusCode} Location={Location} | OrigPathBase='{OrigPathBase}' OrigPath='{OrigPath}' → PathBase='{PathBase}' Path='{Path}'",
                                context.Response.StatusCode, location,
                                originalPathBase, originalPath,
                                context.Request.PathBase.Value, context.Request.Path.Value);
                        }
                        return System.Threading.Tasks.Task.CompletedTask;
                    });

                    // 對 /Account/Login 和 /connect/authorize 請求記錄詳細資訊
                    if (context.Request.Path.Value != null &&
                        (context.Request.Path.Value.Contains("/Account/Login") ||
                         context.Request.Path.Value.Contains("/connect/authorize")))
                    {
                        logger.LogWarning(
                            "[STS-REQUEST] {Method} {Scheme}://{Host}{PathBase}{Path}{Query} | OrigPathBase='{OrigPathBase}' OrigPath='{OrigPath}'",
                            context.Request.Method, context.Request.Scheme, context.Request.Host,
                            context.Request.PathBase.Value, context.Request.Path.Value, context.Request.QueryString,
                            originalPathBase, originalPath);
                    }

                    await next();
                });
            }

            // 啟用 CORS - 必須在 UseRouting 之前
            app.UseCors("IdentityServerCors");

            app.UseStaticFiles();

            // 啟用 Swagger UI
            app.UseOpenApi();
            app.UseSwaggerUi(settings =>
            {
                settings.Path = "/swagger";
                settings.DocumentPath = "/swagger/v1/swagger.json";
                settings.DocExpansion = "list";
            });

            // Force HTTPS scheme BEFORE authentication (critical for OAuth callbacks)
            app.Use(async (context, next) =>
            {
                if (context.Request.Host.Host.EndsWith("uccapital.com.tw", StringComparison.OrdinalIgnoreCase) &&
                    context.Request.Scheme == "http")
                {
                    context.Request.Scheme = "https";
                    logger.LogWarning("[HTTPS-FORCE-EARLY] Forced HTTPS for {Path}", context.Request.Path);
                }
                await next();
            });

            UseAuthentication(app);

            // Add custom security headers
            app.UseSecurityHeaders(Configuration);

            app.UseMvcLocalizationServices();

            app.UseRouting();
            app.UseAuthorization();
            app.UseEndpoints(endpoint =>
            {
                endpoint.MapDefaultControllerRoute();
                endpoint.MapHealthChecks("/health", new HealthCheckOptions
                {
                    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
                });

                // 診斷端點：確認 PathBase 是否正確
                endpoint.MapGet("/debug/pathbase", context =>
                {
                    var info = new
                    {
                        PathBase = context.Request.PathBase.Value,
                        Path = context.Request.Path.Value,
                        Host = context.Request.Host.Value,
                        Scheme = context.Request.Scheme,
                        ConfiguredBasePath = basePath,
                        FullUrl = $"{context.Request.Scheme}://{context.Request.Host}{context.Request.PathBase}{context.Request.Path}"
                    };
                    context.Response.ContentType = "application/json";
                    return context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(info));
                });
            });
        }

        public virtual void RegisterDbContexts(IServiceCollection services)
        {
            services.RegisterDbContexts<AdminIdentityDbContext, IdentityServerConfigurationDbContext, IdentityServerPersistedGrantDbContext, IdentityServerDataProtectionDbContext>(Configuration);
        }

        public virtual void RegisterAuthentication(IServiceCollection services)
        {
            services.AddAuthenticationServices<AdminIdentityDbContext, UserIdentity, UserIdentityRole>(Configuration);
            services.AddIdentityServer<IdentityServerConfigurationDbContext, IdentityServerPersistedGrantDbContext, UserIdentity>(Configuration);
        }

        public virtual void RegisterAuthorization(IServiceCollection services)
        {
            var rootConfiguration = CreateRootConfiguration();
            services.AddAuthorizationPolicies(rootConfiguration);
        }

        public virtual void UseAuthentication(IApplicationBuilder app)
        {
            app.UseIdentityServer();
        }

        public virtual void RegisterHstsOptions(IServiceCollection services)
        {
            services.AddHsts(options =>
            {
                options.Preload = true;
                options.IncludeSubDomains = true;
                options.MaxAge = TimeSpan.FromDays(365);
            });
        }

        protected IRootConfiguration CreateRootConfiguration()
        {
            var rootConfiguration = new RootConfiguration();
            Configuration.GetSection(ConfigurationConsts.AdminConfigurationKey).Bind(rootConfiguration.AdminConfiguration);
            Configuration.GetSection(ConfigurationConsts.RegisterConfigurationKey).Bind(rootConfiguration.RegisterConfiguration);
            return rootConfiguration;
        }
    }
}
