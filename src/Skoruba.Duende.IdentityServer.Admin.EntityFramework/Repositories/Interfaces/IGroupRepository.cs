// UC Capital Identity System
// Group Repository Interface

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces
{
    public interface IGroupRepository
    {
        // Group CRUD
        Task<List<Group>> GetAllAsync(Guid? tenantId = null, string groupType = null, CancellationToken cancellationToken = default);
        Task<Group> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<Group> GetByOrganizationIdAsync(Guid organizationId, CancellationToken cancellationToken = default);
        Task<bool> CodeExistsAsync(string code, Guid tenantId, Guid? excludeId = null, CancellationToken cancellationToken = default);
        Task<Group> CreateAsync(Group group, CancellationToken cancellationToken = default);
        Task<Group> UpdateAsync(Group group, CancellationToken cancellationToken = default);
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);

        // GroupMember
        Task<List<GroupMember>> GetMembersAsync(Guid groupId, CancellationToken cancellationToken = default);
        Task<GroupMember> AddMemberAsync(GroupMember member, CancellationToken cancellationToken = default);
        Task<bool> RemoveMemberAsync(Guid groupId, string userId, CancellationToken cancellationToken = default);
        Task<bool> MemberExistsAsync(Guid groupId, string userId, CancellationToken cancellationToken = default);

        // Stats
        Task<(int totalGroups, int totalMembers, Dictionary<string, int> countByType)> GetStatsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default);
    }
}
