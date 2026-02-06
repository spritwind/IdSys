// UC Capital - Multi-Tenant Permission Service
// 多租戶權限服務實作

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.MultiTenant;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services
{
    public class MultiTenantPermissionService : IMultiTenantPermissionService
    {
        private readonly IMultiTenantPermissionRepository _repository;

        public MultiTenantPermissionService(IMultiTenantPermissionRepository repository)
        {
            _repository = repository;
        }

        #region PermissionResource

        public async Task<List<PermissionResourceDto>> GetResourcesAsync(string clientId = null, CancellationToken cancellationToken = default)
        {
            var resources = await _repository.GetResourcesAsync(clientId, cancellationToken);
            return resources.Select(MapResourceToDto).ToList();
        }

        public async Task<List<PermissionResourceDto>> GetResourceTreeAsync(string clientId, CancellationToken cancellationToken = default)
        {
            var resources = await _repository.GetResourceTreeAsync(clientId, cancellationToken);
            var lookup = resources.ToLookup(r => r.ParentId);

            return BuildResourceTree(lookup, null);
        }

        private List<PermissionResourceDto> BuildResourceTree(ILookup<Guid?, PermissionResource> lookup, Guid? parentId)
        {
            return lookup[parentId]
                .OrderBy(r => r.SortOrder)
                .ThenBy(r => r.Name)
                .Select(r => new PermissionResourceDto
                {
                    Id = r.Id,
                    ClientId = r.ClientId,
                    ClientName = r.ClientName,
                    Code = r.Code,
                    Name = r.Name,
                    Description = r.Description,
                    Uri = r.Uri,
                    ResourceType = r.ResourceType,
                    ParentId = r.ParentId,
                    SortOrder = r.SortOrder,
                    IsEnabled = r.IsEnabled,
                    Children = BuildResourceTree(lookup, r.Id)
                })
                .ToList();
        }

        public async Task<PermissionResourceDto> GetResourceByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var resource = await _repository.GetResourceByIdAsync(id, cancellationToken);
            return resource == null ? null : MapResourceToDto(resource);
        }

        #endregion

        #region PermissionScope

        public async Task<List<PermissionScopeDto>> GetScopesAsync(CancellationToken cancellationToken = default)
        {
            var scopes = await _repository.GetScopesAsync(cancellationToken);
            return scopes.Select(s => new PermissionScopeDto
            {
                Id = s.Id,
                Code = s.Code,
                Name = s.Name,
                Description = s.Description
            }).ToList();
        }

        #endregion

        #region Permission 查詢

        public async Task<List<PermissionDto>> GetUserPermissionsAsync(string userId, CancellationToken cancellationToken = default)
        {
            var permissions = await _repository.GetUserPermissionsAsync(userId, cancellationToken);
            return permissions.Select(MapPermissionToDto).ToList();
        }

        public async Task<UserEffectivePermissionsDto> GetUserEffectivePermissionsAsync(string userId, CancellationToken cancellationToken = default)
        {
            var permissions = await _repository.GetUserEffectivePermissionsAsync(userId, cancellationToken);

            // 將每筆 Permission 轉為 EffectivePermissionDto，保留原始來源
            var rawEffective = permissions.Select(p => new EffectivePermissionDto
            {
                ResourceId = p.ResourceId,
                ResourceCode = p.Resource?.Code,
                ResourceName = p.Resource?.Name,
                ClientId = p.Resource?.ClientId,
                Scopes = ParseScopes(p.Scopes),
                Source = p.SubjectType == PermissionSubjectType.User && p.SubjectId == userId
                    ? "Direct"
                    : p.SubjectType,
                SourceId = p.SubjectId,
                SourceName = p.SubjectName
            }).ToList();

            // 按 ResourceId + Source 合併 scopes（同一資源同一來源的 scopes 聯集）
            var effectivePermissions = rawEffective
                .GroupBy(p => new { p.ResourceId, p.Source, p.SourceId })
                .Select(g =>
                {
                    var first = g.First();
                    return new EffectivePermissionDto
                    {
                        ResourceId = first.ResourceId,
                        ResourceCode = first.ResourceCode,
                        ResourceName = first.ResourceName,
                        ClientId = first.ClientId,
                        Scopes = g.SelectMany(p => p.Scopes).Distinct().ToList(),
                        Source = first.Source,
                        SourceId = first.SourceId,
                        SourceName = first.SourceName
                    };
                })
                .ToList();

            return new UserEffectivePermissionsDto
            {
                UserId = userId,
                Permissions = effectivePermissions
            };
        }

        public async Task<List<PermissionDto>> GetOrganizationPermissionsAsync(Guid organizationId, CancellationToken cancellationToken = default)
        {
            var permissions = await _repository.GetOrganizationPermissionsAsync(organizationId, cancellationToken);
            return permissions.Select(MapPermissionToDto).ToList();
        }

        public async Task<List<PermissionDto>> GetGroupPermissionsAsync(Guid groupId, CancellationToken cancellationToken = default)
        {
            var permissions = await _repository.GetGroupPermissionsAsync(groupId, cancellationToken);
            return permissions.Select(MapPermissionToDto).ToList();
        }

        public async Task<List<PermissionDto>> GetResourcePermissionsAsync(Guid resourceId, CancellationToken cancellationToken = default)
        {
            var permissions = await _repository.GetResourcePermissionsAsync(resourceId, cancellationToken);
            return permissions.Select(MapPermissionToDto).ToList();
        }

        public async Task<bool> HasPermissionAsync(string userId, Guid resourceId, string scope, CancellationToken cancellationToken = default)
        {
            return await _repository.HasPermissionAsync(userId, resourceId, scope, cancellationToken);
        }

        public async Task<bool> HasPermissionByCodeAsync(string userId, string clientId, string resourceCode, string scope, CancellationToken cancellationToken = default)
        {
            return await _repository.HasPermissionByCodeAsync(userId, clientId, resourceCode, scope, cancellationToken);
        }

        #endregion

        #region Permission 操作

        public async Task<PermissionDto> GrantPermissionAsync(GrantPermissionDto dto, string grantedBy, CancellationToken cancellationToken = default)
        {
            var permission = new Permission
            {
                SubjectType = dto.SubjectType,
                SubjectId = dto.SubjectId,
                SubjectName = dto.SubjectName,
                ResourceId = dto.ResourceId,
                Scopes = FormatScopes(dto.Scopes),
                InheritToChildren = dto.InheritToChildren,
                ExpiresAt = dto.ExpiresAt,
                GrantedBy = grantedBy
            };

            var created = await _repository.GrantPermissionAsync(permission, cancellationToken);
            return MapPermissionToDto(created);
        }

        public async Task<List<PermissionDto>> BatchGrantPermissionsAsync(BatchGrantPermissionDto dto, string grantedBy, CancellationToken cancellationToken = default)
        {
            var permissions = dto.ResourceScopes.Select(rs => new Permission
            {
                SubjectType = dto.SubjectType,
                SubjectId = dto.SubjectId,
                SubjectName = dto.SubjectName,
                ResourceId = rs.ResourceId,
                Scopes = FormatScopes(rs.Scopes),
                InheritToChildren = dto.InheritToChildren,
                GrantedBy = grantedBy
            }).ToList();

            var created = await _repository.GrantPermissionsAsync(permissions, cancellationToken);
            return created.Select(MapPermissionToDto).ToList();
        }

        public async Task<OperationResultDto> RevokePermissionAsync(Guid permissionId, CancellationToken cancellationToken = default)
        {
            var success = await _repository.RevokePermissionAsync(permissionId, cancellationToken);
            return new OperationResultDto
            {
                Success = success,
                Message = success ? "權限已撤銷" : "撤銷失敗"
            };
        }

        public async Task<OperationResultDto> BatchRevokePermissionsAsync(List<Guid> permissionIds, CancellationToken cancellationToken = default)
        {
            var count = await _repository.RevokePermissionsAsync(permissionIds, cancellationToken);
            return new OperationResultDto
            {
                Success = count > 0,
                Message = $"已撤銷 {count} 個權限",
                Data = new { RevokedCount = count }
            };
        }

        public async Task<PermissionDto> UpdatePermissionAsync(Guid id, List<string> scopes, bool inheritToChildren, DateTime? expiresAt, CancellationToken cancellationToken = default)
        {
            var permission = new Permission
            {
                Id = id,
                Scopes = FormatScopes(scopes),
                InheritToChildren = inheritToChildren,
                ExpiresAt = expiresAt
            };

            var updated = await _repository.UpdatePermissionAsync(permission, cancellationToken);
            return MapPermissionToDto(updated);
        }

        #endregion

        #region Helpers

        /// <summary>
        /// 格式化 Scopes 為 @r@e 格式
        /// </summary>
        private string FormatScopes(List<string> scopes)
        {
            if (scopes == null || !scopes.Any())
                return string.Empty;

            return string.Join("", scopes.Select(s => $"@{s}"));
        }

        /// <summary>
        /// 解析 @r@e 格式為 List
        /// </summary>
        private List<string> ParseScopes(string scopes)
        {
            if (string.IsNullOrEmpty(scopes))
                return new List<string>();

            return scopes.Split('@', StringSplitOptions.RemoveEmptyEntries).ToList();
        }

        #endregion

        #region Mapping

        private PermissionResourceDto MapResourceToDto(PermissionResource entity)
        {
            return new PermissionResourceDto
            {
                Id = entity.Id,
                ClientId = entity.ClientId,
                ClientName = entity.ClientName,
                Code = entity.Code,
                Name = entity.Name,
                Description = entity.Description,
                Uri = entity.Uri,
                ResourceType = entity.ResourceType,
                ParentId = entity.ParentId,
                SortOrder = entity.SortOrder,
                IsEnabled = entity.IsEnabled
            };
        }

        private PermissionDto MapPermissionToDto(Permission entity)
        {
            return new PermissionDto
            {
                Id = entity.Id,
                TenantId = entity.TenantId,
                SubjectType = entity.SubjectType,
                SubjectId = entity.SubjectId,
                SubjectName = entity.SubjectName,
                ResourceId = entity.ResourceId,
                ResourceCode = entity.Resource?.Code,
                ResourceName = entity.Resource?.Name,
                ClientId = entity.Resource?.ClientId,
                Scopes = entity.Scopes,
                ScopeList = ParseScopes(entity.Scopes),
                InheritToChildren = entity.InheritToChildren,
                IsEnabled = entity.IsEnabled,
                GrantedBy = entity.GrantedBy,
                GrantedAt = entity.GrantedAt,
                ExpiresAt = entity.ExpiresAt
            };
        }

        #endregion
    }
}
