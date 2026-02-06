// UC Capital Identity System
// Group Service Interface

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.MultiTenant;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces
{
    public interface IGroupService
    {
        // Group CRUD
        Task<List<GroupDto>> GetAllGroupsAsync(Guid? tenantId = null, string groupType = null, CancellationToken cancellationToken = default);
        Task<GroupDto> GetGroupByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<GroupDto> CreateGroupAsync(CreateGroupDto dto, Guid tenantId, CancellationToken cancellationToken = default);
        Task<GroupDto> UpdateGroupAsync(Guid id, UpdateGroupDto dto, CancellationToken cancellationToken = default);
        Task<OperationResultDto> DeleteGroupAsync(Guid id, CancellationToken cancellationToken = default);

        // GroupMember
        Task<List<GroupMemberDetailDto>> GetGroupMembersAsync(Guid groupId, CancellationToken cancellationToken = default);
        Task<GroupMemberDetailDto> AddGroupMemberAsync(Guid groupId, AddGroupMemberDto dto, CancellationToken cancellationToken = default);
        Task<OperationResultDto> RemoveGroupMemberAsync(Guid groupId, string userId, CancellationToken cancellationToken = default);

        // Organization ↔ Group sync
        Task SyncOrganizationGroupAsync(Guid organizationId, string code, string name, Guid tenantId, CancellationToken cancellationToken = default);
        Task RemoveOrganizationGroupAsync(Guid organizationId, CancellationToken cancellationToken = default);

        // Stats
        Task<GroupStatsDto> GetGroupStatsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default);
    }
}
