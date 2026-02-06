// Copyright (c) Jan Škoruba. All Rights Reserved.
// Licensed under the Apache License, Version 2.0.

using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Resources;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Extensions
{
    public static class AdminServicesExtensions
    {
        public static IServiceCollection AddAdminServices<TAdminDbContext>(
            this IServiceCollection services)
            where TAdminDbContext : DbContext, IAdminPersistedGrantDbContext, IAdminConfigurationDbContext, IAdminLogDbContext
        {

            return services.AddAdminServices<TAdminDbContext, TAdminDbContext, TAdminDbContext>();
        }

        public static IServiceCollection AddAdminServices<TConfigurationDbContext, TPersistedGrantDbContext, TLogDbContext>(this IServiceCollection services)
            where TPersistedGrantDbContext : DbContext, IAdminPersistedGrantDbContext
            where TConfigurationDbContext : DbContext, IAdminConfigurationDbContext
            where TLogDbContext : DbContext, IAdminLogDbContext
        {
            //Repositories
            services.AddTransient<IClientRepository, ClientRepository<TConfigurationDbContext>>();
            services.AddTransient<IIdentityResourceRepository, IdentityResourceRepository<TConfigurationDbContext>>();
            services.AddTransient<IApiResourceRepository, ApiResourceRepository<TConfigurationDbContext>>();
            services.AddTransient<IApiScopeRepository, ApiScopeRepository<TConfigurationDbContext>>();
            services.AddTransient<IPersistedGrantRepository, PersistedGrantRepository<TPersistedGrantDbContext>>();
            services.AddTransient<IIdentityProviderRepository, IdentityProviderRepository<TConfigurationDbContext>>();
            services.AddTransient<IKeyRepository, KeyRepository<TPersistedGrantDbContext>>();
            services.AddTransient<ILogRepository, LogRepository<TLogDbContext>>();
            services.AddTransient<IDashboardRepository, DashboardRepository<TConfigurationDbContext>>();
            services.AddTransient<IConfigurationIssuesRepository, ConfigurationIssuesRepository<TConfigurationDbContext>>();

            //Services
            services.AddTransient<IClientService, ClientService>();
            services.AddTransient<IApiResourceService, ApiResourceService>();
            services.AddTransient<IApiScopeService, ApiScopeService>();
            services.AddTransient<IIdentityResourceService, IdentityResourceService>();
            services.AddTransient<IIdentityProviderService, IdentityProviderService>();
            services.AddTransient<IPersistedGrantService, PersistedGrantService>();
            services.AddTransient<IKeyService, KeyService>();
            services.AddTransient<ILogService, LogService>();
            services.AddTransient<IDashboardService, DashboardService>();
            services.AddTransient<IConfigurationIssuesService, ConfigurationIssuesService>();

            //Resources
            services.AddScoped<IApiResourceServiceResources, ApiResourceServiceResources>();
            services.AddScoped<IApiScopeServiceResources, ApiScopeServiceResources>();
            services.AddScoped<IClientServiceResources, ClientServiceResources>();
            services.AddScoped<IIdentityResourceServiceResources, IdentityResourceServiceResources>();
            services.AddScoped<IIdentityProviderServiceResources, IdentityProviderServiceResources>();
            services.AddScoped<IPersistedGrantServiceResources, PersistedGrantServiceResources>();
            services.AddScoped<IKeyServiceResources, KeyServiceResources>();

            return services;
        }

        /// <summary>
        /// 註冊組織架構管理服務 (UC Capital)
        /// </summary>
        public static IServiceCollection AddOrganizationServices(this IServiceCollection services, string connectionString)
        {
            // DbContext
            services.AddDbContext<OrganizationDbContext>(options =>
                options.UseSqlServer(connectionString));

            // Repository
            services.AddTransient<IOrganizationRepository, OrganizationRepository>();

            // Service
            services.AddTransient<IOrganizationService, OrganizationService>();

            return services;
        }

        /// <summary>
        /// 註冊權限控管服務 (UC Capital)
        /// </summary>
        public static IServiceCollection AddPermissionServices(this IServiceCollection services, string connectionString)
        {
            // DbContext
            services.AddDbContext<PermissionDbContext>(options =>
                options.UseSqlServer(connectionString));

            // Repository
            services.AddTransient<IPermissionRepository, PermissionRepository>();

            // Service
            services.AddTransient<IPermissionService, PermissionService>();

            return services;
        }

        /// <summary>
        /// 註冊多租戶服務 (UC Capital - 新架構)
        /// 包含 Tenants, Organizations, Groups, Positions, Deputies, Permissions
        /// </summary>
        public static IServiceCollection AddMultiTenantServices(this IServiceCollection services, string connectionString)
        {
            // DbContext
            services.AddDbContext<MultiTenantDbContext>(options =>
                options.UseSqlServer(connectionString));

            // Repositories
            services.AddTransient<IMultiTenantOrganizationRepository, MultiTenantOrganizationRepository>();
            services.AddTransient<IMultiTenantPermissionRepository, MultiTenantPermissionRepository>();
            services.AddTransient<IGroupRepository, GroupRepository>();

            // Services
            services.AddTransient<IMultiTenantOrganizationService, MultiTenantOrganizationService>();
            services.AddTransient<IMultiTenantPermissionService, MultiTenantPermissionService>();
            services.AddTransient<IGroupService, GroupService>();

            return services;
        }
    }
}
