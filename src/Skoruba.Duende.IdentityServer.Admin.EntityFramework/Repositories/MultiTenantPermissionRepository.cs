// UC Capital - Multi-Tenant Permission Repository
// 多租戶權限資料存取實作

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories
{
    public class MultiTenantPermissionRepository : IMultiTenantPermissionRepository
    {
        protected readonly MultiTenantDbContext DbContext;

        public MultiTenantPermissionRepository(MultiTenantDbContext dbContext)
        {
            DbContext = dbContext;
        }

        #region PermissionResource 查詢

        public async Task<List<PermissionResource>> GetResourcesAsync(string clientId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.PermissionResources.Where(r => r.IsEnabled);

            if (!string.IsNullOrEmpty(clientId))
            {
                query = query.Where(r => r.ClientId == clientId);
            }

            return await query
                .OrderBy(r => r.ClientId)
                .ThenBy(r => r.SortOrder)
                .ThenBy(r => r.Name)
                .ToListAsync(cancellationToken);
        }

        public async Task<PermissionResource> GetResourceByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await DbContext.PermissionResources
                .FirstOrDefaultAsync(r => r.Id == id && r.IsEnabled, cancellationToken);
        }

        public async Task<PermissionResource> GetResourceByCodeAsync(string clientId, string code, CancellationToken cancellationToken = default)
        {
            return await DbContext.PermissionResources
                .FirstOrDefaultAsync(r => r.ClientId == clientId && r.Code == code && r.IsEnabled, cancellationToken);
        }

        public async Task<List<PermissionResource>> GetResourceTreeAsync(string clientId, CancellationToken cancellationToken = default)
        {
            return await DbContext.PermissionResources
                .Where(r => r.IsEnabled && r.ClientId == clientId)
                .OrderBy(r => r.SortOrder)
                .ThenBy(r => r.Name)
                .ToListAsync(cancellationToken);
        }

        #endregion

        #region PermissionScope 查詢

        public async Task<List<PermissionScope>> GetScopesAsync(CancellationToken cancellationToken = default)
        {
            return await DbContext.PermissionScopes
                .OrderBy(s => s.Id)
                .ToListAsync(cancellationToken);
        }

        public async Task<PermissionScope> GetScopeByCodeAsync(string code, CancellationToken cancellationToken = default)
        {
            return await DbContext.PermissionScopes
                .FirstOrDefaultAsync(s => s.Code == code, cancellationToken);
        }

        #endregion

        #region Permission 查詢

        public async Task<List<Permission>> GetUserPermissionsAsync(string userId, CancellationToken cancellationToken = default)
        {
            return await DbContext.Permissions
                .Include(p => p.Resource)
                .Where(p => p.IsEnabled &&
                           p.SubjectType == PermissionSubjectType.User &&
                           p.SubjectId == userId &&
                           (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow))
                .ToListAsync(cancellationToken);
        }

        public async Task<List<Permission>> GetUserEffectivePermissionsAsync(string userId, CancellationToken cancellationToken = default)
        {
            var permissions = new List<Permission>();

            // 1. 使用者直接權限
            var userPermissions = await GetUserPermissionsAsync(userId, cancellationToken);
            permissions.AddRange(userPermissions);

            // 2. 使用者所屬組織的權限（包含 Organization 和 Group SubjectType）
            var userOrganizations = await DbContext.OrganizationMembers
                .Include(m => m.Organization)
                .Where(m => m.UserId == userId)
                .ToListAsync(cancellationToken);

            foreach (var membership in userOrganizations)
            {
                // 組織繼承權限
                var orgPermissions = await GetOrganizationPermissionsWithInheritanceAsync(
                    membership.OrganizationId, cancellationToken);
                permissions.AddRange(orgPermissions);

                // Group SubjectType 的權限（SubjectId = OrganizationId）
                var groupPermissions = await DbContext.Permissions
                    .Include(p => p.Resource)
                    .Where(p => p.IsEnabled &&
                               p.SubjectType == PermissionSubjectType.Group &&
                               p.SubjectId == membership.OrganizationId.ToString() &&
                               (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow))
                    .ToListAsync(cancellationToken);
                permissions.AddRange(groupPermissions);
            }

            // 不做去重 — 同一 ResourceId 可能有多個來源（Direct / Organization / Group），
            // 由 Service 層決定如何呈現。只去除完全相同的紀錄（相同 Id）。
            return permissions
                .GroupBy(p => p.Id)
                .Select(g => g.First())
                .ToList();
        }

        private async Task<List<Permission>> GetOrganizationPermissionsWithInheritanceAsync(
            Guid organizationId, CancellationToken cancellationToken)
        {
            var permissions = new List<Permission>();

            // 組織本身的權限
            var orgPermissions = await DbContext.Permissions
                .Include(p => p.Resource)
                .Where(p => p.IsEnabled &&
                           p.SubjectType == PermissionSubjectType.Organization &&
                           p.SubjectId == organizationId.ToString() &&
                           (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow))
                .ToListAsync(cancellationToken);
            permissions.AddRange(orgPermissions);

            // 遞迴取得父組織的繼承權限
            var organization = await DbContext.Organizations
                .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken);

            if (organization?.ParentId != null && organization.InheritParentPermissions)
            {
                // 取得父組織中設定為 InheritToChildren = true 的權限
                var parentPermissions = await DbContext.Permissions
                    .Include(p => p.Resource)
                    .Where(p => p.IsEnabled &&
                               p.SubjectType == PermissionSubjectType.Organization &&
                               p.SubjectId == organization.ParentId.ToString() &&
                               p.InheritToChildren &&
                               (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow))
                    .ToListAsync(cancellationToken);
                permissions.AddRange(parentPermissions);

                // 繼續往上查
                var ancestorPermissions = await GetOrganizationPermissionsWithInheritanceAsync(
                    organization.ParentId.Value, cancellationToken);
                permissions.AddRange(ancestorPermissions.Where(p => p.InheritToChildren));
            }

            return permissions;
        }

        public async Task<List<Permission>> GetOrganizationPermissionsAsync(Guid organizationId, CancellationToken cancellationToken = default)
        {
            return await DbContext.Permissions
                .Include(p => p.Resource)
                .Where(p => p.IsEnabled &&
                           p.SubjectType == PermissionSubjectType.Organization &&
                           p.SubjectId == organizationId.ToString() &&
                           (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow))
                .ToListAsync(cancellationToken);
        }

        public async Task<List<Permission>> GetResourcePermissionsAsync(Guid resourceId, CancellationToken cancellationToken = default)
        {
            return await DbContext.Permissions
                .Where(p => p.IsEnabled &&
                           p.ResourceId == resourceId &&
                           (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow))
                .OrderBy(p => p.SubjectType)
                .ThenBy(p => p.SubjectId)
                .ToListAsync(cancellationToken);
        }

        public async Task<bool> HasPermissionAsync(string userId, Guid resourceId, string scope, CancellationToken cancellationToken = default)
        {
            var permissions = await GetUserEffectivePermissionsAsync(userId, cancellationToken);

            return permissions.Any(p =>
                p.ResourceId == resourceId &&
                (p.Scopes.Contains($"@{scope}") || p.Scopes.Contains("@all")));
        }

        public async Task<bool> HasPermissionByCodeAsync(string userId, string clientId, string resourceCode, string scope, CancellationToken cancellationToken = default)
        {
            var resource = await GetResourceByCodeAsync(clientId, resourceCode, cancellationToken);
            if (resource == null) return false;

            return await HasPermissionAsync(userId, resource.Id, scope, cancellationToken);
        }

        #endregion

        #region Permission CRUD

        public async Task<Permission> GrantPermissionAsync(Permission permission, CancellationToken cancellationToken = default)
        {
            if (permission.Id == Guid.Empty)
            {
                permission.Id = Guid.NewGuid();
            }

            permission.GrantedAt = DateTime.UtcNow;
            permission.IsEnabled = true;

            await DbContext.Permissions.AddAsync(permission, cancellationToken);
            await DbContext.SaveChangesAsync(cancellationToken);

            return permission;
        }

        public async Task<bool> RevokePermissionAsync(Guid permissionId, CancellationToken cancellationToken = default)
        {
            var permission = await DbContext.Permissions
                .FirstOrDefaultAsync(p => p.Id == permissionId, cancellationToken);

            if (permission == null) return false;

            permission.IsEnabled = false;
            await DbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        public async Task<List<Permission>> GrantPermissionsAsync(List<Permission> permissions, CancellationToken cancellationToken = default)
        {
            foreach (var permission in permissions)
            {
                if (permission.Id == Guid.Empty)
                {
                    permission.Id = Guid.NewGuid();
                }
                permission.GrantedAt = DateTime.UtcNow;
                permission.IsEnabled = true;
            }

            await DbContext.Permissions.AddRangeAsync(permissions, cancellationToken);
            await DbContext.SaveChangesAsync(cancellationToken);

            return permissions;
        }

        public async Task<int> RevokePermissionsAsync(List<Guid> permissionIds, CancellationToken cancellationToken = default)
        {
            var permissions = await DbContext.Permissions
                .Where(p => permissionIds.Contains(p.Id))
                .ToListAsync(cancellationToken);

            foreach (var permission in permissions)
            {
                permission.IsEnabled = false;
            }

            await DbContext.SaveChangesAsync(cancellationToken);
            return permissions.Count;
        }

        public async Task<Permission> UpdatePermissionAsync(Permission permission, CancellationToken cancellationToken = default)
        {
            var existing = await DbContext.Permissions
                .FirstOrDefaultAsync(p => p.Id == permission.Id, cancellationToken);

            if (existing == null)
            {
                throw new InvalidOperationException($"找不到權限記錄");
            }

            existing.Scopes = permission.Scopes;
            existing.InheritToChildren = permission.InheritToChildren;
            existing.ExpiresAt = permission.ExpiresAt;

            await DbContext.SaveChangesAsync(cancellationToken);
            return existing;
        }

        #endregion

        #region PermissionResource CRUD

        public async Task<PermissionResource> CreateResourceAsync(PermissionResource resource, CancellationToken cancellationToken = default)
        {
            if (resource.Id == Guid.Empty)
            {
                resource.Id = Guid.NewGuid();
            }

            resource.CreatedAt = DateTime.UtcNow;
            resource.IsEnabled = true;

            await DbContext.PermissionResources.AddAsync(resource, cancellationToken);
            await DbContext.SaveChangesAsync(cancellationToken);

            return resource;
        }

        public async Task<PermissionResource> UpdateResourceAsync(PermissionResource resource, CancellationToken cancellationToken = default)
        {
            var existing = await DbContext.PermissionResources
                .FirstOrDefaultAsync(r => r.Id == resource.Id, cancellationToken);

            if (existing == null)
            {
                throw new InvalidOperationException($"找不到資源");
            }

            existing.Name = resource.Name;
            existing.Code = resource.Code;
            existing.Description = resource.Description;
            existing.Uri = resource.Uri;
            existing.ResourceType = resource.ResourceType;
            existing.SortOrder = resource.SortOrder;
            existing.UpdatedAt = DateTime.UtcNow;

            await DbContext.SaveChangesAsync(cancellationToken);
            return existing;
        }

        public async Task<bool> DeleteResourceAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var resource = await DbContext.PermissionResources
                .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

            if (resource == null) return false;

            resource.IsEnabled = false;
            resource.UpdatedAt = DateTime.UtcNow;

            await DbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        #endregion
    }
}
