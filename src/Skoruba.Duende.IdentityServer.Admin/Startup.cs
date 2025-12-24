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

            // UC Capital: 註冊組織架構服務
            var connectionString = Configuration.GetConnectionString("IdentityDbConnection");
            services.AddOrganizationServices(connectionString);

            // UC Capital: 註冊權限控管服務
            services.AddPermissionServices(connectionString);
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
                            // 如果有 Bearer token，使用 JWT Bearer 認證
                            string authorization = context.Request.Headers["Authorization"];
                            if (!string.IsNullOrEmpty(authorization) && authorization.StartsWith("Bearer ", System.StringComparison.OrdinalIgnoreCase))
                            {
                                return JwtBearerDefaults.AuthenticationScheme;
                            }

                            // 否則使用 Cookie 認證
                            return Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme;
                        };
                    });
                };

                // 更新授權策略以支持 Cookie 和 Bearer 雙重認證
                options.Security.AuthorizationConfigureAction = authzOptions =>
                {
                    // 重新定義 AdministrationPolicy 以支持多重認證方案
                    // 注意：這會覆蓋原有的策略
                    authzOptions.AddPolicy(
                        Skoruba.Duende.IdentityServer.Admin.UI.Configuration.Constants.AuthorizationConsts.AdministrationPolicy,
                        policy =>
                        {
                            policy.RequireRole(options.Admin.AdministrationRole);
                            policy.AddAuthenticationSchemes(
                                Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme,
                                JwtBearerDefaults.AuthenticationScheme);
                        });
                };
            }
        }
    }
}