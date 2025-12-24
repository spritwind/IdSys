// UC Capital - Permission Repository Implementation
// 權限控管 Repository 實作

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
    public class PermissionRepository : IPermissionRepository
    {
        protected readonly PermissionDbContext DbContext;

        public PermissionRepository(PermissionDbContext dbContext)
        {
            DbContext = dbContext;
        }

        #region Scope 權限範圍

        public async Task<List<KeycloakScope>> GetAllScopesAsync(string clientId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.KeycloakScopes.Where(s => s.Enabled == true);

            if (!string.IsNullOrEmpty(clientId))
            {
                query = query.Where(s => s.ClientId == clientId);
            }

            return await query.OrderBy(s => s.ClientId).ThenBy(s => s.Name).ToListAsync(cancellationToken);
        }

        public async Task<KeycloakScope> GetScopeByIdAsync(string id, string clientId, CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakScopes
                .FirstOrDefaultAsync(s => s.Id == id && s.ClientId == clientId, cancellationToken);
        }

        public async Task<KeycloakScope> CreateScopeAsync(KeycloakScope scope, CancellationToken cancellationToken = default)
        {
            scope.Id = string.IsNullOrEmpty(scope.Id) ? Guid.NewGuid().ToString() : scope.Id;
            scope.InsDate = DateTime.Now;
            scope.Enabled = true;

            DbContext.KeycloakScopes.Add(scope);
            await DbContext.SaveChangesAsync(cancellationToken);

            return scope;
        }

        public async Task<KeycloakScope> UpdateScopeAsync(KeycloakScope scope, CancellationToken cancellationToken = default)
        {
            var existing = await GetScopeByIdAsync(scope.Id, scope.ClientId, cancellationToken);
            if (existing == null) return null;

            existing.Name = scope.Name;
            existing.DisplayName = scope.DisplayName;
            existing.IconUri = scope.IconUri;
            existing.UpdDate = DateTime.Now;

            await DbContext.SaveChangesAsync(cancellationToken);
            return existing;
        }

        public async Task<bool> DeleteScopeAsync(string id, string clientId, CancellationToken cancellationToken = default)
        {
            var scope = await GetScopeByIdAsync(id, clientId, cancellationToken);
            if (scope == null) return false;

            // 軟刪除
            scope.Enabled = false;
            scope.UpdDate = DateTime.Now;

            await DbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        public async Task<bool> ScopeExistsAsync(string name, string clientId, string excludeId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.KeycloakScopes
                .Where(s => s.Name == name && s.ClientId == clientId && s.Enabled == true);

            if (!string.IsNullOrEmpty(excludeId))
            {
                query = query.Where(s => s.Id != excludeId);
            }

            return await query.AnyAsync(cancellationToken);
        }

        #endregion

        #region Resource 資源

        public async Task<List<KeycloakResource>> GetAllResourcesAsync(string clientId = null, string type = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.KeycloakResources.Where(r => r.Enabled == true);

            if (!string.IsNullOrEmpty(clientId))
            {
                query = query.Where(r => r.ClientId == clientId);
            }

            if (!string.IsNullOrEmpty(type))
            {
                query = query.Where(r => r.Type == type);
            }

            return await query.OrderBy(r => r.ClientId).ThenBy(r => r.Type).ThenBy(r => r.Name).ToListAsync(cancellationToken);
        }

        public async Task<KeycloakResource> GetResourceByIdAsync(string id, string clientId, CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakResources
                .FirstOrDefaultAsync(r => r.Id == id && r.ClientId == clientId, cancellationToken);
        }

        public async Task<KeycloakResource> CreateResourceAsync(KeycloakResource resource, CancellationToken cancellationToken = default)
        {
            resource.Id = string.IsNullOrEmpty(resource.Id) ? Guid.NewGuid().ToString() : resource.Id;
            resource.InsDate = DateTime.Now;
            resource.Enabled = true;

            DbContext.KeycloakResources.Add(resource);
            await DbContext.SaveChangesAsync(cancellationToken);

            return resource;
        }

        public async Task<KeycloakResource> UpdateResourceAsync(KeycloakResource resource, CancellationToken cancellationToken = default)
        {
            var existing = await GetResourceByIdAsync(resource.Id, resource.ClientId, cancellationToken);
            if (existing == null) return null;

            existing.Name = resource.Name;
            existing.DisplayName = resource.DisplayName;
            existing.Type = resource.Type;
            existing.Uri = resource.Uri;
            existing.UpdDate = DateTime.Now;

            await DbContext.SaveChangesAsync(cancellationToken);
            return existing;
        }

        public async Task<bool> DeleteResourceAsync(string id, string clientId, CancellationToken cancellationToken = default)
        {
            var resource = await GetResourceByIdAsync(id, clientId, cancellationToken);
            if (resource == null) return false;

            resource.Enabled = false;
            resource.UpdDate = DateTime.Now;

            await DbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        public async Task<bool> ResourceExistsAsync(string name, string clientId, string excludeId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.KeycloakResources
                .Where(r => r.Name == name && r.ClientId == clientId && r.Enabled == true);

            if (!string.IsNullOrEmpty(excludeId))
            {
                query = query.Where(r => r.Id != excludeId);
            }

            return await query.AnyAsync(cancellationToken);
        }

        #endregion

        #region ResourceScope 資源-範圍關聯

        public async Task<List<KeycloakResourceScope>> GetResourceScopesAsync(string resourceId, string clientId, CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakResourceScopes
                .Where(rs => rs.ResourceId == resourceId && rs.ClientId == clientId)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<KeycloakResourceScope>> GetScopeResourcesAsync(string scopeId, string clientId, CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakResourceScopes
                .Where(rs => rs.ScopeId == scopeId && rs.ClientId == clientId)
                .ToListAsync(cancellationToken);
        }

        public async Task<KeycloakResourceScope> AddResourceScopeAsync(KeycloakResourceScope resourceScope, CancellationToken cancellationToken = default)
        {
            var existing = await DbContext.KeycloakResourceScopes
                .FirstOrDefaultAsync(rs =>
                    rs.ResourceId == resourceScope.ResourceId &&
                    rs.ScopeId == resourceScope.ScopeId &&
                    rs.ClientId == resourceScope.ClientId, cancellationToken);

            if (existing != null) return existing;

            resourceScope.InsDate = DateTime.Now;
            DbContext.KeycloakResourceScopes.Add(resourceScope);
            await DbContext.SaveChangesAsync(cancellationToken);

            return resourceScope;
        }

        public async Task<bool> RemoveResourceScopeAsync(string resourceId, string scopeId, string clientId, CancellationToken cancellationToken = default)
        {
            var resourceScope = await DbContext.KeycloakResourceScopes
                .FirstOrDefaultAsync(rs =>
                    rs.ResourceId == resourceId &&
                    rs.ScopeId == scopeId &&
                    rs.ClientId == clientId, cancellationToken);

            if (resourceScope == null) return false;

            DbContext.KeycloakResourceScopes.Remove(resourceScope);
            await DbContext.SaveChangesAsync(cancellationToken);

            return true;
        }

        public async Task<int> SetResourceScopesAsync(string resourceId, string clientId, List<string> scopeIds, CancellationToken cancellationToken = default)
        {
            // 取得資源資訊
            var resource = await GetResourceByIdAsync(resourceId, clientId, cancellationToken);
            if (resource == null) return 0;

            // 移除現有關聯
            var existingScopes = await GetResourceScopesAsync(resourceId, clientId, cancellationToken);
            DbContext.KeycloakResourceScopes.RemoveRange(existingScopes);

            // 新增新關聯
            var scopes = await DbContext.KeycloakScopes
                .Where(s => scopeIds.Contains(s.Id) && s.ClientId == clientId)
                .ToListAsync(cancellationToken);

            foreach (var scope in scopes)
            {
                DbContext.KeycloakResourceScopes.Add(new KeycloakResourceScope
                {
                    ResourceId = resourceId,
                    ScopeId = scope.Id,
                    ClientId = clientId,
                    ResourceName = resource.Name,
                    ScopeName = scope.Name,
                    InsDate = DateTime.Now
                });
            }

            await DbContext.SaveChangesAsync(cancellationToken);
            return scopes.Count;
        }

        #endregion

        #region UserPermission 使用者權限

        public async Task<List<KeycloakUserPermission>> GetUserPermissionsAsync(string userId, string clientId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.KeycloakUserPermissions
                .Where(p => p.UserId == userId && p.Enabled == true);

            if (!string.IsNullOrEmpty(clientId))
            {
                query = query.Where(p => p.ClientId == clientId);
            }

            return await query.ToListAsync(cancellationToken);
        }

        public async Task<List<KeycloakUserPermission>> GetResourceUserPermissionsAsync(string resourceId, string clientId, CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakUserPermissions
                .Where(p => p.ResourceId == resourceId && p.ClientId == clientId && p.Enabled == true)
                .ToListAsync(cancellationToken);
        }

        public async Task<KeycloakUserPermission> GetUserPermissionAsync(string userId, string clientId, string resourceId, CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakUserPermissions
                .FirstOrDefaultAsync(p =>
                    p.UserId == userId &&
                    p.ClientId == clientId &&
                    p.ResourceId == resourceId, cancellationToken);
        }

        public async Task<KeycloakUserPermission> SetUserPermissionAsync(KeycloakUserPermission permission, CancellationToken cancellationToken = default)
        {
            var existing = await GetUserPermissionAsync(permission.UserId, permission.ClientId, permission.ResourceId, cancellationToken);

            if (existing != null)
            {
                existing.Scopes = permission.Scopes;
                existing.Enabled = true;
                existing.UpdDate = DateTime.Now;
            }
            else
            {
                permission.InsDate = DateTime.Now;
                permission.Enabled = true;
                DbContext.KeycloakUserPermissions.Add(permission);
                existing = permission;
            }

            await DbContext.SaveChangesAsync(cancellationToken);
            return existing;
        }

        public async Task<bool> RemoveUserPermissionAsync(string userId, string clientId, string resourceId, CancellationToken cancellationToken = default)
        {
            var permission = await GetUserPermissionAsync(userId, clientId, resourceId, cancellationToken);
            if (permission == null) return false;

            permission.Enabled = false;
            permission.UpdDate = DateTime.Now;

            await DbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        public async Task<int> RemoveAllUserPermissionsAsync(string userId, string clientId = null, CancellationToken cancellationToken = default)
        {
            var permissions = await GetUserPermissionsAsync(userId, clientId, cancellationToken);

            foreach (var p in permissions)
            {
                p.Enabled = false;
                p.UpdDate = DateTime.Now;
            }

            await DbContext.SaveChangesAsync(cancellationToken);
            return permissions.Count;
        }

        #endregion

        #region GroupPermission 群組權限

        public async Task<List<KeycloakGroupPermission>> GetGroupPermissionsAsync(string groupId, string clientId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.KeycloakGroupPermissions
                .Where(p => p.GroupId == groupId && p.Enabled == true);

            if (!string.IsNullOrEmpty(clientId))
            {
                query = query.Where(p => p.ClientId == clientId);
            }

            return await query.ToListAsync(cancellationToken);
        }

        public async Task<List<KeycloakGroupPermission>> GetResourceGroupPermissionsAsync(string resourceId, string clientId, CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakGroupPermissions
                .Where(p => p.ResourceId == resourceId && p.ClientId == clientId && p.Enabled == true)
                .ToListAsync(cancellationToken);
        }

        public async Task<KeycloakGroupPermission> GetGroupPermissionAsync(string groupId, string clientId, string resourceId, CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakGroupPermissions
                .FirstOrDefaultAsync(p =>
                    p.GroupId == groupId &&
                    p.ClientId == clientId &&
                    p.ResourceId == resourceId, cancellationToken);
        }

        public async Task<KeycloakGroupPermission> SetGroupPermissionAsync(KeycloakGroupPermission permission, CancellationToken cancellationToken = default)
        {
            var existing = await GetGroupPermissionAsync(permission.GroupId, permission.ClientId, permission.ResourceId, cancellationToken);

            if (existing != null)
            {
                existing.Scopes = permission.Scopes;
                existing.InheritToChildren = permission.InheritToChildren;
                existing.Enabled = true;
                existing.UpdDate = DateTime.Now;
            }
            else
            {
                permission.InsDate = DateTime.Now;
                permission.Enabled = true;
                DbContext.KeycloakGroupPermissions.Add(permission);
                existing = permission;
            }

            await DbContext.SaveChangesAsync(cancellationToken);
            return existing;
        }

        public async Task<bool> RemoveGroupPermissionAsync(string groupId, string clientId, string resourceId, CancellationToken cancellationToken = default)
        {
            var permission = await GetGroupPermissionAsync(groupId, clientId, resourceId, cancellationToken);
            if (permission == null) return false;

            permission.Enabled = false;
            permission.UpdDate = DateTime.Now;

            await DbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        public async Task<int> RemoveAllGroupPermissionsAsync(string groupId, string clientId = null, CancellationToken cancellationToken = default)
        {
            var permissions = await GetGroupPermissionsAsync(groupId, clientId, cancellationToken);

            foreach (var p in permissions)
            {
                p.Enabled = false;
                p.UpdDate = DateTime.Now;
            }

            await DbContext.SaveChangesAsync(cancellationToken);
            return permissions.Count;
        }

        #endregion

        #region 使用者有效權限

        public async Task<List<EffectivePermission>> GetUserEffectivePermissionsAsync(string userId, string clientId = null, CancellationToken cancellationToken = default)
        {
            var result = new Dictionary<string, EffectivePermission>();

            // 1. 取得使用者直接授權
            var directPermissions = await GetUserPermissionsAsync(userId, clientId, cancellationToken);
            foreach (var p in directPermissions)
            {
                var key = $"{p.ClientId}:{p.ResourceId}";
                var scopes = p.Scopes?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>();

                result[key] = new EffectivePermission
                {
                    ResourceId = p.ResourceId,
                    ResourceName = p.ResourceName,
                    ClientId = p.ClientId,
                    ClientName = p.ClientName,
                    Scopes = scopes,
                    Source = "Direct",
                    IsFromGroup = false
                };
            }

            // 2. 取得使用者所屬群組
            var userGroups = await GetUserGroupsAsync(userId, cancellationToken);

            // 3. 取得每個群組的權限並合併
            foreach (var group in userGroups)
            {
                var groupPermissions = await GetGroupPermissionsAsync(group.Id, clientId, cancellationToken);

                foreach (var gp in groupPermissions)
                {
                    var key = $"{gp.ClientId}:{gp.ResourceId}";
                    var scopes = gp.Scopes?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>();

                    if (result.TryGetValue(key, out var existing))
                    {
                        // 合併範圍（聯集）
                        existing.Scopes = existing.Scopes.Union(scopes).ToList();
                        if (existing.IsFromGroup)
                        {
                            existing.Source += $", {group.Name}";
                        }
                    }
                    else
                    {
                        result[key] = new EffectivePermission
                        {
                            ResourceId = gp.ResourceId,
                            ResourceName = gp.ResourceName,
                            ClientId = gp.ClientId,
                            ClientName = gp.ClientName,
                            Scopes = scopes,
                            Source = $"Group:{group.Name}",
                            IsFromGroup = true,
                            SourceGroupId = group.Id,
                            SourceGroupName = group.Name
                        };
                    }
                }
            }

            return result.Values.ToList();
        }

        public async Task<bool> HasPermissionAsync(string userId, string clientId, string resourceId, string scope, CancellationToken cancellationToken = default)
        {
            // 先檢查直接授權
            var directPermission = await GetUserPermissionAsync(userId, clientId, resourceId, cancellationToken);
            if (directPermission != null && directPermission.Enabled == true)
            {
                var scopes = directPermission.Scopes?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();
                if (scopes.Contains(scope)) return true;
            }

            // 檢查群組繼承權限
            var userGroups = await GetUserGroupsAsync(userId, cancellationToken);
            foreach (var group in userGroups)
            {
                var groupPermission = await GetGroupPermissionAsync(group.Id, clientId, resourceId, cancellationToken);
                if (groupPermission != null && groupPermission.Enabled == true)
                {
                    var scopes = groupPermission.Scopes?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();
                    if (scopes.Contains(scope)) return true;
                }
            }

            return false;
        }

        #endregion

        #region 查詢輔助

        public async Task<List<KeycloakUser>> GetAllUsersAsync(string search = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.KeycloakUsers.Where(u => u.Enabled == true);

            if (!string.IsNullOrEmpty(search))
            {
                search = search.ToLower();
                query = query.Where(u =>
                    u.Username.ToLower().Contains(search) ||
                    u.Email.ToLower().Contains(search) ||
                    u.FirstName.ToLower().Contains(search) ||
                    u.LastName.ToLower().Contains(search));
            }

            return await query.OrderBy(u => u.Username).Take(100).ToListAsync(cancellationToken);
        }

        public async Task<KeycloakUser> GetUserByIdAsync(string userId, CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakUsers.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        }

        public async Task<List<KeycloakGroup>> GetUserGroupsAsync(string userId, CancellationToken cancellationToken = default)
        {
            var groupIds = await DbContext.KeycloakUserGroups
                .Where(ug => ug.UserId == userId)
                .Select(ug => ug.GroupId)
                .ToListAsync(cancellationToken);

            return await DbContext.KeycloakGroups
                .Where(g => groupIds.Contains(g.Id) && g.Enabled == true)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<string>> GetDistinctClientIdsAsync(CancellationToken cancellationToken = default)
        {
            var fromScopes = await DbContext.KeycloakScopes.Select(s => s.ClientId).Distinct().ToListAsync(cancellationToken);
            var fromResources = await DbContext.KeycloakResources.Select(r => r.ClientId).Distinct().ToListAsync(cancellationToken);

            return fromScopes.Union(fromResources).Distinct().OrderBy(c => c).ToList();
        }

        #endregion
    }
}
