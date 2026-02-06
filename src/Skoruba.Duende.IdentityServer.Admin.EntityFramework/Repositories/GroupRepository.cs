// UC Capital Identity System
// Group Repository Implementation

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
    public class GroupRepository : IGroupRepository
    {
        protected readonly MultiTenantDbContext DbContext;

        public GroupRepository(MultiTenantDbContext dbContext)
        {
            DbContext = dbContext;
        }

        #region Group CRUD

        public async Task<List<Group>> GetAllAsync(Guid? tenantId = null, string groupType = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.Groups
                .Include(g => g.Members)
                .Where(g => g.IsEnabled);

            if (tenantId.HasValue)
                query = query.Where(g => g.TenantId == tenantId.Value);

            if (!string.IsNullOrEmpty(groupType))
                query = query.Where(g => g.GroupType == groupType);

            return await query
                .OrderBy(g => g.GroupType)
                .ThenBy(g => g.Name)
                .ToListAsync(cancellationToken);
        }

        public async Task<Group> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await DbContext.Groups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        }

        public async Task<Group> GetByOrganizationIdAsync(Guid organizationId, CancellationToken cancellationToken = default)
        {
            return await DbContext.Groups
                .FirstOrDefaultAsync(g => g.OrganizationId == organizationId && g.GroupType == "Organization", cancellationToken);
        }

        public async Task<bool> CodeExistsAsync(string code, Guid tenantId, Guid? excludeId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.Groups
                .Where(g => g.Code == code && g.TenantId == tenantId && g.IsEnabled);

            if (excludeId.HasValue)
                query = query.Where(g => g.Id != excludeId.Value);

            return await query.AnyAsync(cancellationToken);
        }

        public async Task<Group> CreateAsync(Group group, CancellationToken cancellationToken = default)
        {
            if (group.Id == Guid.Empty)
                group.Id = Guid.NewGuid();

            group.CreatedAt = DateTime.UtcNow;

            DbContext.Groups.Add(group);
            await DbContext.SaveChangesAsync(cancellationToken);
            return group;
        }

        public async Task<Group> UpdateAsync(Group group, CancellationToken cancellationToken = default)
        {
            group.UpdatedAt = DateTime.UtcNow;
            DbContext.Groups.Update(group);
            await DbContext.SaveChangesAsync(cancellationToken);
            return group;
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var group = await DbContext.Groups.FindAsync(new object[] { id }, cancellationToken);
            if (group == null) return false;

            // Soft delete
            group.IsEnabled = false;
            group.UpdatedAt = DateTime.UtcNow;
            await DbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        #endregion

        #region GroupMember

        public async Task<List<GroupMember>> GetMembersAsync(Guid groupId, CancellationToken cancellationToken = default)
        {
            return await DbContext.GroupMembers
                .Where(m => m.GroupId == groupId)
                .OrderBy(m => m.JoinedAt)
                .ToListAsync(cancellationToken);
        }

        public async Task<GroupMember> AddMemberAsync(GroupMember member, CancellationToken cancellationToken = default)
        {
            if (member.Id == Guid.Empty)
                member.Id = Guid.NewGuid();

            member.JoinedAt = DateTime.UtcNow;

            DbContext.GroupMembers.Add(member);
            await DbContext.SaveChangesAsync(cancellationToken);
            return member;
        }

        public async Task<bool> RemoveMemberAsync(Guid groupId, string userId, CancellationToken cancellationToken = default)
        {
            var member = await DbContext.GroupMembers
                .FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == userId, cancellationToken);

            if (member == null) return false;

            DbContext.GroupMembers.Remove(member);
            await DbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        public async Task<bool> MemberExistsAsync(Guid groupId, string userId, CancellationToken cancellationToken = default)
        {
            return await DbContext.GroupMembers
                .AnyAsync(m => m.GroupId == groupId && m.UserId == userId, cancellationToken);
        }

        #endregion

        #region Stats

        public async Task<(int totalGroups, int totalMembers, Dictionary<string, int> countByType)> GetStatsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default)
        {
            var groupQuery = DbContext.Groups.Where(g => g.IsEnabled);
            if (tenantId.HasValue)
                groupQuery = groupQuery.Where(g => g.TenantId == tenantId.Value);

            var totalGroups = await groupQuery.CountAsync(cancellationToken);

            var countByType = await groupQuery
                .GroupBy(g => g.GroupType)
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Type, x => x.Count, cancellationToken);

            var groupIds = await groupQuery.Select(g => g.Id).ToListAsync(cancellationToken);
            var totalMembers = await DbContext.GroupMembers
                .Where(m => groupIds.Contains(m.GroupId))
                .Select(m => m.UserId)
                .Distinct()
                .CountAsync(cancellationToken);

            return (totalGroups, totalMembers, countByType);
        }

        #endregion
    }
}
