// Copyright (c) Jan Škoruba. All Rights Reserved.
// Licensed under the Apache License, Version 2.0.

using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Skoruba.AuditLogging.EntityFramework.Entities;
using Skoruba.Duende.IdentityServer.Admin.Configuration;
using Skoruba.Duende.IdentityServer.Admin.Configuration.Database;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.DbContexts;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.Entities.Identity;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.Extensions;
using Skoruba.Duende.IdentityServer.Admin.Helpers;
using Skoruba.Duende.IdentityServer.Admin.UI.Helpers.ApplicationBuilder;
using Skoruba.Duende.IdentityServer.Admin.UI.Helpers.DependencyInjection;
using Skoruba.Duende.IdentityServer.Shared.Configuration.Helpers;
using Skoruba.Duende.IdentityServer.Shared.Dtos;
using Skoruba.Duende.IdentityServer.Shared.Dtos.Identity;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Extensions;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.ExceptionHandling;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Resources;
using ApiStartupHelpers = Skoruba.Duende.IdentityServer.Admin.UI.Api.Helpers.StartupHelpers;

namespace Skoruba.Duende.IdentityServer.Admin
{
    public class Startup
    {
        public Startup(IWebHostEnvironment env, IConfiguration configuration)
        {
            JwtSecurityTokenHandler.DefaultMapInboundClaims = false;
            HostingEnvironment = env;
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        public IWebHostEnvironment HostingEnvironment { get; }

        public void ConfigureServices(IServiceCollection services)
        {
            // UC Capital: 讀取 React SPA API 配置
            var reactSpaConfig = Configuration.GetSection("ReactSpaApiConfiguration").Get<ReactSpaApiConfiguration>()
                ?? new ReactSpaApiConfiguration();
            services.AddSingleton(reactSpaConfig);

            // UC Capital: 添加 CORS 支持 React SPA
            if (reactSpaConfig.Enabled && reactSpaConfig.CorsOrigins?.Length > 0)
            {
                services.AddCors(options =>
                {
                    options.AddPolicy("ReactSpaPolicy", builder =>
                    {
                        builder.WithOrigins(reactSpaConfig.CorsOrigins)
                               .AllowAnyHeader()
                               .AllowAnyMethod()
                               .AllowCredentials();
                    });
                });
            }

            // Adds the Duende IdentityServer Admin UI with custom options.
            services.AddIdentityServerAdminUI<AdminIdentityDbContext, IdentityServerConfigurationDbContext, IdentityServerPersistedGrantDbContext,
            AdminLogDbContext, AdminAuditLogDbContext, AuditLog, IdentityServerDataProtectionDbContext,
                UserIdentity, UserIdentityRole, UserIdentityUserClaim, UserIdentityUserRole,
                UserIdentityUserLogin, UserIdentityRoleClaim, UserIdentityUserToken, string,
                IdentityUserDto, IdentityRoleDto, IdentityUsersDto, IdentityRolesDto, IdentityUserRolesDto,
                IdentityUserClaimsDto, IdentityUserProviderDto, IdentityUserProvidersDto, IdentityUserChangePasswordDto,
                IdentityRoleClaimsDto, IdentityUserClaimDto, IdentityRoleClaimDto>(ConfigureUIOptions);

            // Monitor changes in Admin UI views
            services.AddAdminUIRazorRuntimeCompilation(HostingEnvironment);

            // Add email senders which is currently setup for SendGrid and SMTP
            services.AddEmailSenders(Configuration);

            // UC Capital: 註冊組織架構服務 (Keycloak 舊表)
            var connectionString = Configuration.GetConnectionString("IdentityDbConnection");
            services.AddOrganizationServices(connectionString);

            // UC Capital: 註冊權限控管服務 (Keycloak 舊表)
            services.AddPermissionServices(connectionString);

            // UC Capital: 註冊多租戶服務 (新架構)
            services.AddMultiTenantServices(connectionString);

            // UC Capital: 註冊 Admin.UI.Api 控制器所需的服務
            services.AddScoped<ControllerExceptionFilterAttribute>();
            services.AddScoped<IApiErrorResources, ApiErrorResources>();

            // UC Capital: 註冊 Admin.UI.Api 控制器 (REST API)
            // 讓 MVC 能夠發現 Admin.UI.Api 程序集中的控制器
            services.AddControllers()
                .AddApplicationPart(typeof(ApiStartupHelpers).Assembly);
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, ILoggerFactory loggerFactory)
        {
            // UC Capital: 啟用 CORS 支持 React SPA
            var reactSpaConfig = app.ApplicationServices.GetService<ReactSpaApiConfiguration>();
            if (reactSpaConfig?.Enabled == true)
            {
                app.UseCors("ReactSpaPolicy");
            }

            app.UseRouting();

            app.UseIdentityServerAdminUI();

            app.UseEndpoints(endpoint =>
            {
                endpoint.MapIdentityServerAdminUI();
                endpoint.MapIdentityServerAdminUIHealthChecks();
                // UC Capital: 映射 REST API 控制器路由
                endpoint.MapControllers();
            });
        }

        public virtual void ConfigureUIOptions(IdentityServerAdminUIOptions options)
        {
            // Applies configuration from appsettings.
            options.BindConfiguration(Configuration);
            if (HostingEnvironment.IsDevelopment())
            {
                options.Security.UseDeveloperExceptionPage = true;
            }
            else
            {
                options.Security.UseHsts = true;
            }

            // Set migration assembly for application of db migrations
            var migrationsAssembly = MigrationAssemblyConfiguration.GetMigrationAssemblyByProvider(options.DatabaseProvider);
            options.DatabaseMigrations.SetMigrationsAssemblies(migrationsAssembly);

            // Use production DbContexts and auth services.
            options.Testing.IsStaging = false;

            // UC Capital: 添加 JWT Bearer 認證支持 React SPA
            var reactSpaConfig = Configuration.GetSection("ReactSpaApiConfiguration").Get<ReactSpaApiConfiguration>();
            if (reactSpaConfig?.Enabled == true)
            {
                // 添加 JWT Bearer 認證方案
                options.Security.AuthenticationBuilderAction = authBuilder =>
                {
                    authBuilder.AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, jwtOptions =>
                    {
                        jwtOptions.Authority = options.Admin.IdentityServerBaseUrl;
                        jwtOptions.RequireHttpsMetadata = reactSpaConfig.RequireHttpsMetadata;
                        jwtOptions.Audience = reactSpaConfig.ApiName;

                        // 讓 JWT Bearer 能夠處理 role claim
                        jwtOptions.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
                        {
                            NameClaimType = "name",
                            RoleClaimType = "role"
                        };

                        // 支持從 Authorization header 和 Query string 取得 token
                        jwtOptions.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
                        {
                            OnMessageReceived = context =>
                            {
                                // 支持 SignalR 從 query string 取得 token
                                var accessToken = context.Request.Query["access_token"];
                                if (!string.IsNullOrEmpty(accessToken))
                                {
                                    context.Token = accessToken;
                                }
                                return System.Threading.Tasks.Task.CompletedTask;
                            }
                        };
                    });

                    // 添加策略方案選擇器：根據請求自動選擇認證方案
                    authBuilder.AddPolicyScheme("SmartAuth", "Smart Auth Selector", policyOptions =>
                    {
                        policyOptions.ForwardDefaultSelector = context =>
                        {
                            // API 請求（有 Bearer token）：所有操作都走 JWT Bearer
                            string authorization = context.Request.Headers["Authorization"];
                            if (!string.IsNullOrEmpty(authorization) && authorization.StartsWith("Bearer ", System.StringComparison.OrdinalIgnoreCase))
                            {
                                return JwtBearerDefaults.AuthenticationScheme;
                            }

                            // 瀏覽器請求：回傳 null，讓各操作使用各自的 Forward 設定
                            return null;
                        };

                        // 瀏覽器請求的各操作 Forward 設定：
                        // 驗證已登入 session → Cookie scheme
                        policyOptions.ForwardAuthenticate = Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme;
                        // 未登入時的重導向 → OIDC scheme（導向 STS 登入頁）
                        // 不能用 Cookie scheme，因為它會 redirect 到 /Account/Login（不存在）
                        policyOptions.ForwardChallenge = Skoruba.Duende.IdentityServer.Admin.UI.Configuration.Constants.AuthenticationConsts.OidcAuthenticationScheme;
                        // 權限不足 → OIDC scheme
                        policyOptions.ForwardForbid = Skoruba.Duende.IdentityServer.Admin.UI.Configuration.Constants.AuthenticationConsts.OidcAuthenticationScheme;
                    });
                };

                // 更新授權策略以支持 Cookie 和 Bearer 雙重認證
                options.Security.AuthorizationConfigureAction = authzOptions =>
                {
                    // 使用 SmartAuth 策略方案：
                    // - 有 Bearer token 的 API 請求 → JWT Bearer（失敗返回 401/403 JSON）
                    // - 無 Bearer token 的瀏覽器請求 → Cookie（失敗重導向登入頁）
                    // 這避免了 API 請求在認證失敗時被重導向到 HTML 登入頁
                    authzOptions.AddPolicy(
                        Skoruba.Duende.IdentityServer.Admin.UI.Configuration.Constants.AuthorizationConsts.AdministrationPolicy,
                        policy =>
                        {
                            policy.RequireRole(options.Admin.AdministrationRole);
                            policy.AddAuthenticationSchemes("SmartAuth");
                        });
                };
            }
        }
    }
}