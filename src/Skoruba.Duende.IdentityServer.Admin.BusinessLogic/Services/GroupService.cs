// UC Capital Identity System
// Group Service Implementation (includes Organization ↔ Group auto-sync)

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.MultiTenant;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services
{
    public class GroupService : IGroupService
    {
        private readonly IGroupRepository _repository;
        private readonly ILogger<GroupService> _logger;

        public GroupService(IGroupRepository repository, ILogger<GroupService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        #region Group CRUD

        public async Task<List<GroupDto>> GetAllGroupsAsync(Guid? tenantId = null, string groupType = null, CancellationToken cancellationToken = default)
        {
            var groups = await _repository.GetAllAsync(tenantId, groupType, cancellationToken);
            return groups.Select(MapToDto).ToList();
        }

        public async Task<GroupDto> GetGroupByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var group = await _repository.GetByIdAsync(id, cancellationToken);
            return group == null ? null : MapToDto(group);
        }

        public async Task<GroupDto> CreateGroupAsync(CreateGroupDto dto, Guid tenantId, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new InvalidOperationException("群組名稱不可為空");

            if (!string.IsNullOrEmpty(dto.Code) && await _repository.CodeExistsAsync(dto.Code, tenantId, null, cancellationToken))
                throw new InvalidOperationException($"群組代碼 '{dto.Code}' 已存在");

            var group = new Group
            {
                TenantId = tenantId,
                Code = dto.Code,
                Name = dto.Name,
                Description = dto.Description,
                GroupType = dto.GroupType ?? "General",
                OrganizationId = dto.OrganizationId,
                OwnerUserId = dto.OwnerUserId
            };

            var created = await _repository.CreateAsync(group, cancellationToken);
            _logger.LogInformation("Created group {GroupId} ({GroupName}, type={GroupType})", created.Id, created.Name, created.GroupType);
            return MapToDto(created);
        }

        public async Task<GroupDto> UpdateGroupAsync(Guid id, UpdateGroupDto dto, CancellationToken cancellationToken = default)
        {
            var existing = await _repository.GetByIdAsync(id, cancellationToken);
            if (existing == null)
                throw new InvalidOperationException($"找不到 ID 為 {id} 的群組");

            if (!string.IsNullOrEmpty(dto.Code) && dto.Code != existing.Code
                && await _repository.CodeExistsAsync(dto.Code, existing.TenantId, id, cancellationToken))
                throw new InvalidOperationException($"群組代碼 '{dto.Code}' 已存在");

            existing.Code = dto.Code;
            existing.Name = dto.Name;
            existing.Description = dto.Description;
            existing.GroupType = dto.GroupType;
            existing.OrganizationId = dto.OrganizationId;
            existing.OwnerUserId = dto.OwnerUserId;
            existing.IsEnabled = dto.IsEnabled;

            var updated = await _repository.UpdateAsync(existing, cancellationToken);
            return MapToDto(updated);
        }

        public async Task<OperationResultDto> DeleteGroupAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var success = await _repository.DeleteAsync(id, cancellationToken);
            return new OperationResultDto
            {
                Success = success,
                Message = success ? "群組已停用" : "找不到群組或已停用"
            };
        }

        #endregion

        #region GroupMember

        public async Task<List<GroupMemberDetailDto>> GetGroupMembersAsync(Guid groupId, CancellationToken cancellationToken = default)
        {
            var members = await _repository.GetMembersAsync(groupId, cancellationToken);
            return members.Select(MapMemberToDto).ToList();
        }

        public async Task<GroupMemberDetailDto> AddGroupMemberAsync(Guid groupId, AddGroupMemberDto dto, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(dto.UserId))
                throw new InvalidOperationException("UserId 不可為空");

            if (await _repository.MemberExistsAsync(groupId, dto.UserId, cancellationToken))
                throw new InvalidOperationException("該使用者已是此群組成員");

            var member = new GroupMember
            {
                GroupId = groupId,
                UserId = dto.UserId,
                MemberRole = dto.MemberRole ?? "Member",
                InheritGroupPermissions = dto.InheritGroupPermissions
            };

            var created = await _repository.AddMemberAsync(member, cancellationToken);
            _logger.LogInformation("Added member {UserId} to group {GroupId}", dto.UserId, groupId);
            return MapMemberToDto(created);
        }

        public async Task<OperationResultDto> RemoveGroupMemberAsync(Guid groupId, string userId, CancellationToken cancellationToken = default)
        {
            var success = await _repository.RemoveMemberAsync(groupId, userId, cancellationToken);
            return new OperationResultDto
            {
                Success = success,
                Message = success ? "成功移除成員" : "找不到該成員"
            };
        }

        #endregion

        #region Organization ↔ Group Sync

        public async Task SyncOrganizationGroupAsync(Guid organizationId, string code, string name, Guid tenantId, CancellationToken cancellationToken = default)
        {
            var existing = await _repository.GetByOrganizationIdAsync(organizationId, cancellationToken);

            if (existing != null)
            {
                // Update existing group
                existing.Code = code;
                existing.Name = name;
                await _repository.UpdateAsync(existing, cancellationToken);
                _logger.LogInformation("Synced Organization group: OrgId={OrganizationId}, Code={Code}, Name={Name}", organizationId, code, name);
            }
            else
            {
                // Create new group
                var group = new Group
                {
                    TenantId = tenantId,
                    Code = code,
                    Name = name,
                    Description = $"組織群組 (來源: {name})",
                    GroupType = "Organization",
                    OrganizationId = organizationId,
                    IsEnabled = true
                };

                await _repository.CreateAsync(group, cancellationToken);
                _logger.LogInformation("Created Organization group: OrgId={OrganizationId}, Code={Code}, Name={Name}", organizationId, code, name);
            }
        }

        public async Task RemoveOrganizationGroupAsync(Guid organizationId, CancellationToken cancellationToken = default)
        {
            var existing = await _repository.GetByOrganizationIdAsync(organizationId, cancellationToken);
            if (existing != null)
            {
                await _repository.DeleteAsync(existing.Id, cancellationToken);
                _logger.LogInformation("Disabled Organization group for OrgId={OrganizationId}", organizationId);
            }
        }

        #endregion

        #region Stats

        public async Task<GroupStatsDto> GetGroupStatsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default)
        {
            var (totalGroups, totalMembers, countByType) = await _repository.GetStatsAsync(tenantId, cancellationToken);
            return new GroupStatsDto
            {
                TotalGroups = totalGroups,
                TotalMembers = totalMembers,
                CountByType = countByType
            };
        }

        #endregion

        #region Mapping

        private GroupDto MapToDto(Group entity)
        {
            return new GroupDto
            {
                Id = entity.Id,
                TenantId = entity.TenantId,
                Code = entity.Code,
                Name = entity.Name,
                Description = entity.Description,
                GroupType = entity.GroupType,
                OrganizationId = entity.OrganizationId,
                SourceId = entity.SourceId,
                OwnerUserId = entity.OwnerUserId,
                IsEnabled = entity.IsEnabled,
                MemberCount = entity.Members?.Count ?? 0,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            };
        }

        private GroupMemberDetailDto MapMemberToDto(GroupMember entity)
        {
            return new GroupMemberDetailDto
            {
                Id = entity.Id,
                GroupId = entity.GroupId,
                UserId = entity.UserId,
                MemberRole = entity.MemberRole,
                InheritGroupPermissions = entity.InheritGroupPermissions,
                JoinedAt = entity.JoinedAt
            };
        }

        #endregion
    }
}
