// UC Capital - Permission Service Implementation
// 權限控管服務實作

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.Permission;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services
{
    public class PermissionService : IPermissionService
    {
        private readonly IPermissionRepository _repository;

        public PermissionService(IPermissionRepository repository)
        {
            _repository = repository;
        }

        #region Scope 權限範圍

        public async Task<List<ScopeDto>> GetAllScopesAsync(string clientId = null, CancellationToken cancellationToken = default)
        {
            var scopes = await _repository.GetAllScopesAsync(clientId, cancellationToken);
            return scopes.Select(MapToScopeDto).ToList();
        }

        public async Task<ScopeDto> GetScopeByIdAsync(string id, string clientId, CancellationToken cancellationToken = default)
        {
            var scope = await _repository.GetScopeByIdAsync(id, clientId, cancellationToken);
            return scope != null ? MapToScopeDto(scope) : null;
        }

        public async Task<ScopeDto> CreateScopeAsync(CreateScopeDto dto, CancellationToken cancellationToken = default)
        {
            var canInsert = await CanInsertScopeAsync(dto.Name, dto.ClientId, null, cancellationToken);
            if (!canInsert)
            {
                throw new InvalidOperationException($"同一客戶端下已存在名稱為「{dto.Name}」的權限範圍");
            }

            var entity = new KeycloakScope
            {
                ClientId = dto.ClientId,
                ClientName = dto.ClientName,
                Name = dto.Name,
                DisplayName = dto.DisplayName,
                IconUri = dto.IconUri
            };

            var created = await _repository.CreateScopeAsync(entity, cancellationToken);
            return MapToScopeDto(created);
        }

        public async Task<ScopeDto> UpdateScopeAsync(UpdateScopeDto dto, CancellationToken cancellationToken = default)
        {
            var canInsert = await CanInsertScopeAsync(dto.Name, dto.ClientId, dto.Id, cancellationToken);
            if (!canInsert)
            {
                throw new InvalidOperationException($"同一客戶端下已存在名稱為「{dto.Name}」的權限範圍");
            }

            var entity = new KeycloakScope
            {
                Id = dto.Id,
                ClientId = dto.ClientId,
                Name = dto.Name,
                DisplayName = dto.DisplayName,
                IconUri = dto.IconUri
            };

            var updated = await _repository.UpdateScopeAsync(entity, cancellationToken);
            return updated != null ? MapToScopeDto(updated) : null;
        }

        public async Task<bool> DeleteScopeAsync(string id, string clientId, CancellationToken cancellationToken = default)
        {
            return await _repository.DeleteScopeAsync(id, clientId, cancellationToken);
        }

        public async Task<bool> CanInsertScopeAsync(string name, string clientId, string excludeId = null, CancellationToken cancellationToken = default)
        {
            var exists = await _repository.ScopeExistsAsync(name, clientId, excludeId, cancellationToken);
            return !exists;
        }

        #endregion

        #region Resource 資源

        public async Task<List<ResourceDto>> GetAllResourcesAsync(string clientId = null, string type = null, CancellationToken cancellationToken = default)
        {
            var resources = await _repository.GetAllResourcesAsync(clientId, type, cancellationToken);
            var result = new List<ResourceDto>();

            foreach (var resource in resources)
            {
                var dto = MapToResourceDto(resource);
                var scopes = await _repository.GetResourceScopesAsync(resource.Id, resource.ClientId, cancellationToken);
                dto.Scopes = scopes.Select(s => s.ScopeName).ToList();
                result.Add(dto);
            }

            return result;
        }

        public async Task<ResourceDto> GetResourceByIdAsync(string id, string clientId, CancellationToken cancellationToken = default)
        {
            var resource = await _repository.GetResourceByIdAsync(id, clientId, cancellationToken);
            if (resource == null) return null;

            var dto = MapToResourceDto(resource);
            var scopes = await _repository.GetResourceScopesAsync(id, clientId, cancellationToken);
            dto.Scopes = scopes.Select(s => s.ScopeName).ToList();

            return dto;
        }

        public async Task<ResourceDto> CreateResourceAsync(CreateResourceDto dto, CancellationToken cancellationToken = default)
        {
            var canInsert = await CanInsertResourceAsync(dto.Name, dto.ClientId, null, cancellationToken);
            if (!canInsert)
            {
                throw new InvalidOperationException($"同一客戶端下已存在名稱為「{dto.Name}」的資源");
            }

            var entity = new KeycloakResource
            {
                ClientId = dto.ClientId,
                ClientName = dto.ClientName,
                Name = dto.Name,
                DisplayName = dto.DisplayName,
                Type = dto.Type,
                Uri = dto.Uri
            };

            var created = await _repository.CreateResourceAsync(entity, cancellationToken);

            // 設定資源範圍
            if (dto.ScopeIds?.Any() == true)
            {
                await _repository.SetResourceScopesAsync(created.Id, created.ClientId, dto.ScopeIds, cancellationToken);
            }

            return await GetResourceByIdAsync(created.Id, created.ClientId, cancellationToken);
        }

        public async Task<ResourceDto> UpdateResourceAsync(UpdateResourceDto dto, CancellationToken cancellationToken = default)
        {
            var canInsert = await CanInsertResourceAsync(dto.Name, dto.ClientId, dto.Id, cancellationToken);
            if (!canInsert)
            {
                throw new InvalidOperationException($"同一客戶端下已存在名稱為「{dto.Name}」的資源");
            }

            var entity = new KeycloakResource
            {
                Id = dto.Id,
                ClientId = dto.ClientId,
                Name = dto.Name,
                DisplayName = dto.DisplayName,
                Type = dto.Type,
                Uri = dto.Uri
            };

            var updated = await _repository.UpdateResourceAsync(entity, cancellationToken);
            if (updated == null) return null;

            // 更新資源範圍
            if (dto.ScopeIds != null)
            {
                await _repository.SetResourceScopesAsync(dto.Id, dto.ClientId, dto.ScopeIds, cancellationToken);
            }

            return await GetResourceByIdAsync(dto.Id, dto.ClientId, cancellationToken);
        }

        public async Task<bool> DeleteResourceAsync(string id, string clientId, CancellationToken cancellationToken = default)
        {
            return await _repository.DeleteResourceAsync(id, clientId, cancellationToken);
        }

        public async Task<bool> CanInsertResourceAsync(string name, string clientId, string excludeId = null, CancellationToken cancellationToken = default)
        {
            var exists = await _repository.ResourceExistsAsync(name, clientId, excludeId, cancellationToken);
            return !exists;
        }

        #endregion

        #region ResourceScope 資源-範圍關聯

        public async Task<List<ResourceScopeDto>> GetResourceScopesAsync(string resourceId, string clientId, CancellationToken cancellationToken = default)
        {
            var scopes = await _repository.GetResourceScopesAsync(resourceId, clientId, cancellationToken);
            return scopes.Select(s => new ResourceScopeDto
            {
                ResourceId = s.ResourceId,
                ResourceName = s.ResourceName,
                ScopeId = s.ScopeId,
                ScopeName = s.ScopeName,
                ClientId = s.ClientId,
                InsDate = s.InsDate
            }).ToList();
        }

        public async Task<int> SetResourceScopesAsync(string resourceId, string clientId, List<string> scopeIds, CancellationToken cancellationToken = default)
        {
            return await _repository.SetResourceScopesAsync(resourceId, clientId, scopeIds, cancellationToken);
        }

        #endregion

        #region UserPermission 使用者權限

        public async Task<List<UserPermissionDto>> GetUserPermissionsAsync(string userId, string clientId = null, CancellationToken cancellationToken = default)
        {
            var permissions = await _repository.GetUserPermissionsAsync(userId, clientId, cancellationToken);
            return permissions.Select(MapToUserPermissionDto).ToList();
        }

        public async Task<List<UserPermissionDto>> GetResourceUserPermissionsAsync(string resourceId, string clientId, CancellationToken cancellationToken = default)
        {
            var permissions = await _repository.GetResourceUserPermissionsAsync(resourceId, clientId, cancellationToken);
            return permissions.Select(MapToUserPermissionDto).ToList();
        }

        public async Task<UserPermissionDto> SetUserPermissionAsync(SetUserPermissionDto dto, CancellationToken cancellationToken = default)
        {
            var entity = new KeycloakUserPermission
            {
                UserId = dto.UserId,
                Username = dto.Username,
                ClientId = dto.ClientId,
                ClientName = dto.ClientName,
                ResourceId = dto.ResourceId,
                ResourceName = dto.ResourceName,
                Scopes = string.Join(",", dto.Scopes)
            };

            var result = await _repository.SetUserPermissionAsync(entity, cancellationToken);
            return MapToUserPermissionDto(result);
        }

        public async Task<bool> RemoveUserPermissionAsync(string userId, string clientId, string resourceId, CancellationToken cancellationToken = default)
        {
            return await _repository.RemoveUserPermissionAsync(userId, clientId, resourceId, cancellationToken);
        }

        #endregion

        #region GroupPermission 群組權限

        public async Task<List<GroupPermissionDto>> GetGroupPermissionsAsync(string groupId, string clientId = null, CancellationToken cancellationToken = default)
        {
            var permissions = await _repository.GetGroupPermissionsAsync(groupId, clientId, cancellationToken);
            return permissions.Select(MapToGroupPermissionDto).ToList();
        }

        public async Task<List<GroupPermissionDto>> GetResourceGroupPermissionsAsync(string resourceId, string clientId, CancellationToken cancellationToken = default)
        {
            var permissions = await _repository.GetResourceGroupPermissionsAsync(resourceId, clientId, cancellationToken);
            return permissions.Select(MapToGroupPermissionDto).ToList();
        }

        public async Task<GroupPermissionDto> SetGroupPermissionAsync(SetGroupPermissionDto dto, CancellationToken cancellationToken = default)
        {
            var entity = new KeycloakGroupPermission
            {
                GroupId = dto.GroupId,
                GroupName = dto.GroupName,
                GroupPath = dto.GroupPath,
                ClientId = dto.ClientId,
                ClientName = dto.ClientName,
                ResourceId = dto.ResourceId,
                ResourceName = dto.ResourceName,
                Scopes = string.Join(",", dto.Scopes),
                InheritToChildren = dto.InheritToChildren
            };

            var result = await _repository.SetGroupPermissionAsync(entity, cancellationToken);
            return MapToGroupPermissionDto(result);
        }

        public async Task<bool> RemoveGroupPermissionAsync(string groupId, string clientId, string resourceId, CancellationToken cancellationToken = default)
        {
            return await _repository.RemoveGroupPermissionAsync(groupId, clientId, resourceId, cancellationToken);
        }

        #endregion

        #region 有效權限

        public async Task<List<EffectivePermissionDto>> GetUserEffectivePermissionsAsync(string userId, string clientId = null, CancellationToken cancellationToken = default)
        {
            var permissions = await _repository.GetUserEffectivePermissionsAsync(userId, clientId, cancellationToken);
            return permissions.Select(p => new EffectivePermissionDto
            {
                ResourceId = p.ResourceId,
                ResourceName = p.ResourceName,
                ClientId = p.ClientId,
                ClientName = p.ClientName,
                Scopes = p.Scopes,
                Source = p.Source,
                IsFromGroup = p.IsFromGroup,
                SourceGroupId = p.SourceGroupId,
                SourceGroupName = p.SourceGroupName
            }).ToList();
        }

        public async Task<bool> HasPermissionAsync(string userId, string clientId, string resourceId, string scope, CancellationToken cancellationToken = default)
        {
            return await _repository.HasPermissionAsync(userId, clientId, resourceId, scope, cancellationToken);
        }

        #endregion

        #region 查詢輔助

        public async Task<List<UserBriefDto>> SearchUsersAsync(string search = null, CancellationToken cancellationToken = default)
        {
            var users = await _repository.GetAllUsersAsync(search, cancellationToken);
            return users.Select(u => new UserBriefDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                FullName = $"{u.FirstName} {u.LastName}".Trim()
            }).ToList();
        }

        public Task<List<GroupBriefDto>> GetAllGroupsAsync(CancellationToken cancellationToken = default)
        {
            // TODO: 使用 OrganizationRepository 取得群組清單
            // 這裡簡化處理，實際應透過 Repository
            return Task.FromResult(new List<GroupBriefDto>());
        }

        public async Task<List<string>> GetDistinctClientIdsAsync(CancellationToken cancellationToken = default)
        {
            return await _repository.GetDistinctClientIdsAsync(cancellationToken);
        }

        public async Task<PermissionStatsDto> GetPermissionStatsAsync(CancellationToken cancellationToken = default)
        {
            var scopes = await _repository.GetAllScopesAsync(null, cancellationToken);
            var resources = await _repository.GetAllResourcesAsync(null, null, cancellationToken);
            var clientIds = await _repository.GetDistinctClientIdsAsync(cancellationToken);

            var stats = new PermissionStatsDto
            {
                TotalScopes = scopes.Count,
                TotalResources = resources.Count,
                TotalClients = clientIds.Count
            };

            // 按客戶端統計
            foreach (var clientId in clientIds)
            {
                var clientScopes = scopes.Where(s => s.ClientId == clientId).ToList();
                var clientResources = resources.Where(r => r.ClientId == clientId).ToList();

                stats.ClientStats.Add(new ClientStatsDto
                {
                    ClientId = clientId,
                    ClientName = clientScopes.FirstOrDefault()?.ClientName ?? clientResources.FirstOrDefault()?.ClientName,
                    ScopeCount = clientScopes.Count,
                    ResourceCount = clientResources.Count
                });
            }

            return stats;
        }

        #endregion

        #region Private Mapping Methods

        private static ScopeDto MapToScopeDto(KeycloakScope entity)
        {
            return new ScopeDto
            {
                Id = entity.Id,
                ClientId = entity.ClientId,
                ClientName = entity.ClientName,
                Name = entity.Name,
                DisplayName = entity.DisplayName,
                IconUri = entity.IconUri,
                Enabled = entity.Enabled ?? true,
                InsDate = entity.InsDate,
                UpdDate = entity.UpdDate
            };
        }

        private static ResourceDto MapToResourceDto(KeycloakResource entity)
        {
            return new ResourceDto
            {
                Id = entity.Id,
                ClientId = entity.ClientId,
                ClientName = entity.ClientName,
                Name = entity.Name,
                DisplayName = entity.DisplayName,
                Type = entity.Type,
                Uri = entity.Uri,
                Enabled = entity.Enabled ?? true,
                InsDate = entity.InsDate,
                UpdDate = entity.UpdDate
            };
        }

        private static UserPermissionDto MapToUserPermissionDto(KeycloakUserPermission entity)
        {
            return new UserPermissionDto
            {
                UserId = entity.UserId,
                Username = entity.Username,
                ClientId = entity.ClientId,
                ClientName = entity.ClientName,
                ResourceId = entity.ResourceId,
                ResourceName = entity.ResourceName,
                Scopes = entity.Scopes?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
                Enabled = entity.Enabled ?? true,
                InsDate = entity.InsDate,
                UpdDate = entity.UpdDate
            };
        }

        private static GroupPermissionDto MapToGroupPermissionDto(KeycloakGroupPermission entity)
        {
            return new GroupPermissionDto
            {
                GroupId = entity.GroupId,
                GroupName = entity.GroupName,
                GroupPath = entity.GroupPath,
                ClientId = entity.ClientId,
                ClientName = entity.ClientName,
                ResourceId = entity.ResourceId,
                ResourceName = entity.ResourceName,
                Scopes = entity.Scopes?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
                InheritToChildren = entity.InheritToChildren ?? true,
                Enabled = entity.Enabled ?? true,
                InsDate = entity.InsDate,
                UpdDate = entity.UpdDate
            };
        }

        #endregion
    }
}
