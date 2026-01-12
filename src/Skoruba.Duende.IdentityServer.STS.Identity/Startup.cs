using System;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
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

            // 註冊 Token 管理服務（JWT 撤銷驗證）
            RegisterTokenManagementServices(services);
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
            app.UseCookiePolicy();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseHsts();
            }

            app.UsePathBase(Configuration.GetValue<string>("BasePath"));

            // 啟用 CORS - 必須在 UseRouting 之前
            app.UseCors("IdentityServerCors");

            app.UseStaticFiles();
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
