// UC Capital - Multi-Tenant Organization Service
// 多租戶組織服務實作

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
    public class MultiTenantOrganizationService : IMultiTenantOrganizationService
    {
        private readonly IMultiTenantOrganizationRepository _repository;

        public MultiTenantOrganizationService(IMultiTenantOrganizationRepository repository)
        {
            _repository = repository;
        }

        #region Organization

        public async Task<List<OrganizationDto>> GetAllOrganizationsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default)
        {
            var organizations = await _repository.GetAllAsync(tenantId, cancellationToken);
            return organizations.Select(MapToDto).ToList();
        }

        public async Task<List<OrganizationTreeNodeDto>> GetOrganizationTreeAsync(Guid? tenantId = null, CancellationToken cancellationToken = default)
        {
            var organizations = await _repository.GetOrganizationTreeAsync(tenantId, cancellationToken);
            var lookup = organizations.ToLookup(o => o.ParentId);

            return BuildTree(lookup, null);
        }

        private List<OrganizationTreeNodeDto> BuildTree(ILookup<Guid?, Organization> lookup, Guid? parentId)
        {
            return lookup[parentId]
                .OrderBy(o => o.SortOrder)
                .ThenBy(o => o.Name)
                .Select(o => new OrganizationTreeNodeDto
                {
                    Id = o.Id,
                    Name = o.Name,
                    EnglishName = o.EnglishName,
                    Code = o.Code,
                    ParentId = o.ParentId,
                    Depth = o.Depth,
                    ManagerName = null, // 需要 join Users 表取得
                    MemberCount = o.Members?.Count ?? 0,
                    Children = BuildTree(lookup, o.Id)
                })
                .ToList();
        }

        public async Task<OrganizationDto> GetOrganizationByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var organization = await _repository.GetByIdAsync(id, cancellationToken);
            return organization == null ? null : MapToDto(organization);
        }

        public async Task<List<OrganizationDto>> GetChildOrganizationsAsync(Guid parentId, CancellationToken cancellationToken = default)
        {
            var children = await _repository.GetChildrenAsync(parentId, cancellationToken);
            return children.Select(MapToDto).ToList();
        }

        public async Task<OrganizationDto> CreateOrganizationAsync(CreateOrganizationDto dto, Guid tenantId, CancellationToken cancellationToken = default)
        {
            // 驗證名稱不重複
            if (await _repository.NameExistsAsync(dto.Name, dto.ParentId, tenantId, null, cancellationToken))
            {
                throw new InvalidOperationException($"同一層級已存在名為 '{dto.Name}' 的組織");
            }

            var organization = new Organization
            {
                TenantId = tenantId,
                Name = dto.Name,
                EnglishName = dto.EnglishName,
                Code = dto.Code,
                ParentId = dto.ParentId,
                ManagerUserId = dto.ManagerUserId,
                Description = dto.Description,
                SortOrder = dto.SortOrder,
                InheritParentPermissions = dto.InheritParentPermissions
            };

            var created = await _repository.CreateAsync(organization, cancellationToken);
            return MapToDto(created);
        }

        public async Task<OrganizationDto> UpdateOrganizationAsync(Guid id, UpdateOrganizationDto dto, CancellationToken cancellationToken = default)
        {
            var existing = await _repository.GetByIdAsync(id, cancellationToken);
            if (existing == null)
            {
                throw new InvalidOperationException($"找不到 ID 為 {id} 的組織");
            }

            // 驗證名稱不重複（排除自己）
            if (await _repository.NameExistsAsync(dto.Name, dto.ParentId, existing.TenantId, id, cancellationToken))
            {
                throw new InvalidOperationException($"同一層級已存在名為 '{dto.Name}' 的組織");
            }

            existing.Name = dto.Name;
            existing.EnglishName = dto.EnglishName;
            existing.Code = dto.Code;
            existing.ParentId = dto.ParentId;
            existing.ManagerUserId = dto.ManagerUserId;
            existing.Description = dto.Description;
            existing.SortOrder = dto.SortOrder;
            existing.InheritParentPermissions = dto.InheritParentPermissions;

            var updated = await _repository.UpdateAsync(existing, cancellationToken);
            return MapToDto(updated);
        }

        public async Task<OperationResultDto> DeleteOrganizationAsync(Guid id, bool includeDescendants = false, CancellationToken cancellationToken = default)
        {
            int count;
            if (includeDescendants)
            {
                count = await _repository.DeleteWithDescendantsAsync(id, cancellationToken);
            }
            else
            {
                var success = await _repository.DeleteAsync(id, cancellationToken);
                count = success ? 1 : 0;
            }

            return new OperationResultDto
            {
                Success = count > 0,
                Message = count > 0 ? $"成功刪除 {count} 個組織" : "刪除失敗",
                Data = new { DeletedCount = count }
            };
        }

        public async Task<OrganizationStatsDto> GetOrganizationStatsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default)
        {
            var stats = await _repository.GetStatsAsync(tenantId, cancellationToken);
            return new OrganizationStatsDto
            {
                TotalOrganizations = stats.totalOrganizations,
                TotalMembers = stats.totalMembers,
                MaxDepth = stats.maxDepth
            };
        }

        #endregion

        #region OrganizationMember

        public async Task<List<OrganizationMemberDto>> GetOrganizationMembersAsync(Guid organizationId, CancellationToken cancellationToken = default)
        {
            var members = await _repository.GetMembersAsync(organizationId, cancellationToken);
            return members.Select(MapMemberToDto).ToList();
        }

        public async Task<List<OrganizationMemberDto>> GetUserOrganizationsAsync(string userId, CancellationToken cancellationToken = default)
        {
            var members = await _repository.GetUserOrganizationsAsync(userId, cancellationToken);
            return members.Select(MapMemberToDto).ToList();
        }

        public async Task<OrganizationMemberDto> AddMemberAsync(AddOrganizationMemberDto dto, CancellationToken cancellationToken = default)
        {
            var member = new OrganizationMember
            {
                OrganizationId = dto.OrganizationId,
                UserId = dto.UserId,
                PositionId = dto.PositionId,
                MemberRole = dto.MemberRole,
                IsPrimary = dto.IsPrimary
            };

            var created = await _repository.AddMemberAsync(member, cancellationToken);
            return MapMemberToDto(created);
        }

        public async Task<OperationResultDto> RemoveMemberAsync(Guid organizationId, string userId, CancellationToken cancellationToken = default)
        {
            var success = await _repository.RemoveMemberAsync(organizationId, userId, cancellationToken);
            return new OperationResultDto
            {
                Success = success,
                Message = success ? "成功移除成員" : "移除失敗"
            };
        }

        public async Task<OrganizationMemberDto> UpdateMemberAsync(Guid memberId, Guid? positionId, string memberRole, bool isPrimary, CancellationToken cancellationToken = default)
        {
            var member = new OrganizationMember
            {
                Id = memberId,
                PositionId = positionId,
                MemberRole = memberRole,
                IsPrimary = isPrimary
            };

            var updated = await _repository.UpdateMemberAsync(member, cancellationToken);
            return MapMemberToDto(updated);
        }

        #endregion

        #region Position

        public async Task<List<PositionDto>> GetPositionsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default)
        {
            var positions = await _repository.GetPositionsAsync(tenantId, cancellationToken);
            return positions.Select(p => new PositionDto
            {
                Id = p.Id,
                Code = p.Code,
                Name = p.Name,
                Level = p.Level,
                Permissions = p.Permissions,
                IsEnabled = p.IsEnabled
            }).ToList();
        }

        #endregion

        #region Mapping

        private OrganizationDto MapToDto(Organization entity)
        {
            return new OrganizationDto
            {
                Id = entity.Id,
                TenantId = entity.TenantId,
                Code = entity.Code,
                Name = entity.Name,
                EnglishName = entity.EnglishName,
                ParentId = entity.ParentId,
                Path = entity.Path,
                Depth = entity.Depth,
                SortOrder = entity.SortOrder,
                ManagerUserId = entity.ManagerUserId,
                Description = entity.Description,
                InheritParentPermissions = entity.InheritParentPermissions,
                IsEnabled = entity.IsEnabled,
                MemberCount = entity.Members?.Count ?? 0,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            };
        }

        private OrganizationMemberDto MapMemberToDto(OrganizationMember entity)
        {
            return new OrganizationMemberDto
            {
                Id = entity.Id,
                OrganizationId = entity.OrganizationId,
                OrganizationName = entity.Organization?.Name,
                UserId = entity.UserId,
                PositionId = entity.PositionId,
                PositionName = entity.Position?.Name,
                MemberRole = entity.MemberRole,
                IsPrimary = entity.IsPrimary,
                JoinedAt = entity.JoinedAt
            };
        }

        #endregion
    }
}
