// Copyright (c) Jan Škoruba. All Rights Reserved.
// Licensed under the Apache License, Version 2.0.

using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NSwag;
using NSwag.AspNetCore;
using NSwag.Generation.Processors.Security;
using Skoruba.AuditLogging.EntityFramework.Entities;
using Skoruba.Duende.IdentityServer.Admin.Api.Configuration;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Extensions;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Identity.Extensions;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.DbContexts;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.Entities.Identity;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.Extensions;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Configuration;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Configuration.Authorization;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.ExceptionHandling;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Helpers;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Mappers;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Resources;
using Skoruba.Duende.IdentityServer.Shared.Configuration.Helpers;
using Skoruba.Duende.IdentityServer.Shared.Dtos;
using Skoruba.Duende.IdentityServer.Shared.Dtos.Identity;
using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Configuration.Configuration;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Interfaces;
using PermissionQueryDbContext = Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts.PermissionQueryDbContext;

namespace Skoruba.Duende.IdentityServer.Admin.Api
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
            var adminApiConfiguration = Configuration.GetSection(nameof(AdminApiConfiguration)).Get<AdminApiConfiguration>();
            services.AddSingleton(adminApiConfiguration);
            
            // Add DbContexts
            RegisterDbContexts(services);
            
            // Add email senders which is currently setup for SendGrid and SMTP
            services.AddEmailSenders(Configuration);
   
            // Add authentication services
            RegisterAuthentication(services);

            // Add authorization services
            RegisterAuthorization(services);
            
            services.AddIdentityServerAdminApi<AdminIdentityDbContext, IdentityServerConfigurationDbContext, IdentityServerPersistedGrantDbContext, IdentityServerDataProtectionDbContext,AdminLogDbContext, AdminAuditLogDbContext, AuditLog,
                IdentityUserDto, IdentityRoleDto, UserIdentity, UserIdentityRole, string, UserIdentityUserClaim, UserIdentityUserRole,
                UserIdentityUserLogin, UserIdentityRoleClaim, UserIdentityUserToken,
                IdentityUsersDto, IdentityRolesDto, IdentityUserRolesDto,
                IdentityUserClaimsDto, IdentityUserProviderDto, IdentityUserProvidersDto, IdentityUserChangePasswordDto,
                IdentityRoleClaimsDto, IdentityUserClaimDto, IdentityRoleClaimDto>(Configuration, adminApiConfiguration);

            // UC Capital - 組織架構服務 (Keycloak 舊表)
            var connectionString = Configuration.GetConnectionString("ConfigurationDbConnection");
            services.AddOrganizationServices(connectionString);

            // UC Capital - 權限控管服務 (Keycloak 舊表)
            services.AddPermissionServices(connectionString);

            // UC Capital - 多租戶服務 (新架構)
            services.AddMultiTenantServices(connectionString);

            // UC Capital - Token 管理服務 (JWT 撤銷)
            RegisterTokenManagementServices(services);

            // UC Capital - PRS 權限查詢服務
            RegisterPermissionQueryServices(services);

            // UC Capital - HttpClient for OIDC API
            services.AddHttpClient();

            services.AddSwaggerServices(adminApiConfiguration);
            
            services.AddIdSHealthChecks<IdentityServerConfigurationDbContext, IdentityServerPersistedGrantDbContext, AdminIdentityDbContext, AdminLogDbContext, AdminAuditLogDbContext, IdentityServerDataProtectionDbContext>(Configuration, adminApiConfiguration);
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, AdminApiConfiguration adminApiConfiguration)
        {
            app.AddForwardHeaders();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseOpenApi();
            app.UseSwaggerUi(settings =>
            {
                settings.OAuth2Client = new OAuth2ClientSettings
                {
                    ClientId = adminApiConfiguration.OidcSwaggerUIClientId,
                    AppName = adminApiConfiguration.ApiName,
                    UsePkceWithAuthorizationCodeGrant = true,
                    ClientSecret = null
                };
            });

            app.UseRouting();
            UseAuthentication(app);
            app.UseCors();
            app.UseAuthorization();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();

                endpoints.MapHealthChecks("/health", new HealthCheckOptions
                {
                    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
                });
            });
        }

        public virtual void RegisterDbContexts(IServiceCollection services)
        {
            services.AddDbContexts<AdminIdentityDbContext, IdentityServerConfigurationDbContext, IdentityServerPersistedGrantDbContext, AdminLogDbContext, AdminAuditLogDbContext, IdentityServerDataProtectionDbContext, AuditLog>(Configuration);
        }

        public virtual void RegisterAuthentication(IServiceCollection services)
        {
            services.AddApiAuthentication<AdminIdentityDbContext, UserIdentity, UserIdentityRole>(Configuration);
        }

        public virtual void RegisterAuthorization(IServiceCollection services)
        {
            services.AddAuthorizationPolicies();
        }

        public virtual void UseAuthentication(IApplicationBuilder app)
        {
            app.UseAuthentication();
        }

        /// <summary>
        /// 註冊 Token 管理服務
        /// </summary>
        public virtual void RegisterTokenManagementServices(IServiceCollection services)
        {
            var databaseProvider = Configuration.GetSection(nameof(DatabaseProviderConfiguration)).Get<DatabaseProviderConfiguration>();
            var connectionString = Configuration.GetConnectionString("ConfigurationDbConnection");

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

            // 註冊 Repository
            services.AddScoped<IRevokedTokenRepository, RevokedTokenRepository>();

            // 註冊 Service
            services.AddScoped<ITokenManagementService, TokenManagementService>();
        }

        /// <summary>
        /// 註冊 PRS 權限查詢服務
        /// </summary>
        public virtual void RegisterPermissionQueryServices(IServiceCollection services)
        {
            var databaseProvider = Configuration.GetSection(nameof(DatabaseProviderConfiguration)).Get<DatabaseProviderConfiguration>();
            var connectionString = Configuration.GetConnectionString("IdentitySysDbConnection")
                ?? Configuration.GetConnectionString("ConfigurationDbConnection");

            // 註冊 PermissionQueryDbContext
            switch (databaseProvider?.ProviderType)
            {
                case DatabaseProviderType.SqlServer:
                default:
                    services.AddDbContext<PermissionQueryDbContext>(options =>
                        options.UseSqlServer(connectionString));
                    break;
                case DatabaseProviderType.PostgreSQL:
                    services.AddDbContext<PermissionQueryDbContext>(options =>
                        options.UseNpgsql(connectionString));
                    break;
                case DatabaseProviderType.MySql:
                    services.AddDbContext<PermissionQueryDbContext>(options =>
                        options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));
                    break;
            }

            // 註冊 IAdminConfigurationDbContext (用於驗證 Client 憑證)
            services.AddScoped<IAdminConfigurationDbContext>(provider =>
                provider.GetRequiredService<IdentityServerConfigurationDbContext>());

            // 註冊 JWT Token 驗證器
            services.AddMemoryCache();
            services.Configure<JwtTokenValidatorOptions>(options =>
            {
                // 從設定檔讀取 STS Authority URL
                var adminApiConfig = Configuration.GetSection(nameof(AdminApiConfiguration)).Get<AdminApiConfiguration>();
                options.Authority = adminApiConfig?.IdentityServerBaseUrl ?? "https://localhost:44310";
                options.ValidateAudience = false; // 不強制驗證 audience
                options.CheckRevocation = true;   // 檢查撤銷狀態
                options.JwksCacheMinutes = 60;    // JWKS 快取 60 分鐘
            });
            services.AddScoped<IJwtTokenValidator, JwtTokenValidator>();

            // 註冊 Repository
            services.AddScoped<IPermissionQueryRepository, PermissionQueryRepository>();

            // 註冊 Service
            services.AddScoped<IPermissionQueryService, PermissionQueryService>();
        }
    }
}
