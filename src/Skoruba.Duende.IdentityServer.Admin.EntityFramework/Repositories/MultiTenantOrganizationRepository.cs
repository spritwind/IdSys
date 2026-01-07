// UC Capital - Multi-Tenant Organization Repository
// 多租戶組織架構資料存取實作

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
    public class MultiTenantOrganizationRepository : IMultiTenantOrganizationRepository
    {
        protected readonly MultiTenantDbContext DbContext;

        public MultiTenantOrganizationRepository(MultiTenantDbContext dbContext)
        {
            DbContext = dbContext;
        }

        #region Organization 查詢

        public async Task<List<Organization>> GetAllAsync(Guid? tenantId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.Organizations.Where(o => o.IsEnabled);

            if (tenantId.HasValue)
            {
                query = query.Where(o => o.TenantId == tenantId.Value);
            }

            return await query
                .OrderBy(o => o.Path)
                .ToListAsync(cancellationToken);
        }

        public async Task<Organization> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await DbContext.Organizations
                .Include(o => o.Members)
                .FirstOrDefaultAsync(o => o.Id == id && o.IsEnabled, cancellationToken);
        }

        public async Task<List<Organization>> GetRootOrganizationsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.Organizations
                .Where(o => o.IsEnabled && o.ParentId == null);

            if (tenantId.HasValue)
            {
                query = query.Where(o => o.TenantId == tenantId.Value);
            }

            return await query
                .OrderBy(o => o.SortOrder)
                .ThenBy(o => o.Name)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<Organization>> GetChildrenAsync(Guid parentId, CancellationToken cancellationToken = default)
        {
            return await DbContext.Organizations
                .Where(o => o.IsEnabled && o.ParentId == parentId)
                .OrderBy(o => o.SortOrder)
                .ThenBy(o => o.Name)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<Organization>> GetOrganizationTreeAsync(Guid? tenantId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.Organizations
                .Where(o => o.IsEnabled);

            if (tenantId.HasValue)
            {
                query = query.Where(o => o.TenantId == tenantId.Value);
            }

            return await query
                .OrderBy(o => o.Path)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<Organization>> GetDescendantsAsync(Guid parentId, CancellationToken cancellationToken = default)
        {
            var parent = await GetByIdAsync(parentId, cancellationToken);
            if (parent == null) return new List<Organization>();

            // 使用 Path 前綴匹配找出所有子孫
            return await DbContext.Organizations
                .Where(o => o.IsEnabled && o.Path.StartsWith(parent.Path + "/"))
                .OrderBy(o => o.Path)
                .ToListAsync(cancellationToken);
        }

        public async Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await DbContext.Organizations
                .AnyAsync(o => o.Id == id && o.IsEnabled, cancellationToken);
        }

        public async Task<bool> NameExistsAsync(string name, Guid? parentId, Guid? tenantId, Guid? excludeId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.Organizations
                .Where(o => o.IsEnabled && o.Name == name);

            if (parentId.HasValue)
            {
                query = query.Where(o => o.ParentId == parentId.Value);
            }
            else
            {
                query = query.Where(o => o.ParentId == null);
            }

            if (tenantId.HasValue)
            {
                query = query.Where(o => o.TenantId == tenantId.Value);
            }

            if (excludeId.HasValue)
            {
                query = query.Where(o => o.Id != excludeId.Value);
            }

            return await query.AnyAsync(cancellationToken);
        }

        #endregion

        #region Organization CRUD

        public async Task<Organization> CreateAsync(Organization organization, CancellationToken cancellationToken = default)
        {
            if (organization.Id == Guid.Empty)
            {
                organization.Id = Guid.NewGuid();
            }

            organization.CreatedAt = DateTime.UtcNow;
            organization.IsEnabled = true;

            // 計算 Path 和 Depth
            if (organization.ParentId.HasValue)
            {
                var parent = await GetByIdAsync(organization.ParentId.Value, cancellationToken);
                if (parent != null)
                {
                    organization.Path = $"{parent.Path}/{organization.Name}";
                    organization.Depth = parent.Depth + 1;
                    organization.TenantId = parent.TenantId;
                }
            }
            else
            {
                organization.Path = $"/{organization.Name}";
                organization.Depth = 0;
            }

            await DbContext.Organizations.AddAsync(organization, cancellationToken);
            await DbContext.SaveChangesAsync(cancellationToken);

            return organization;
        }

        public async Task<Organization> UpdateAsync(Organization organization, CancellationToken cancellationToken = default)
        {
            var existing = await DbContext.Organizations
                .FirstOrDefaultAsync(o => o.Id == organization.Id, cancellationToken);

            if (existing == null)
            {
                throw new InvalidOperationException($"找不到 ID 為 {organization.Id} 的組織");
            }

            var nameChanged = existing.Name != organization.Name;
            var parentChanged = existing.ParentId != organization.ParentId;

            // 更新欄位
            existing.Name = organization.Name;
            existing.EnglishName = organization.EnglishName;
            existing.Code = organization.Code;
            existing.Description = organization.Description;
            existing.ManagerUserId = organization.ManagerUserId;
            existing.SortOrder = organization.SortOrder;
            existing.InheritParentPermissions = organization.InheritParentPermissions;
            existing.UpdatedAt = DateTime.UtcNow;

            // 如果名稱或父層變更，需要更新 Path
            if (nameChanged || parentChanged)
            {
                existing.ParentId = organization.ParentId;

                if (existing.ParentId.HasValue)
                {
                    var parent = await GetByIdAsync(existing.ParentId.Value, cancellationToken);
                    if (parent != null)
                    {
                        existing.Path = $"{parent.Path}/{existing.Name}";
                        existing.Depth = parent.Depth + 1;
                    }
                }
                else
                {
                    existing.Path = $"/{existing.Name}";
                    existing.Depth = 0;
                }

                // 更新子組織的 Path
                await UpdateDescendantsPathAsync(existing, cancellationToken);
            }

            await DbContext.SaveChangesAsync(cancellationToken);
            return existing;
        }

        private async Task UpdateDescendantsPathAsync(Organization parent, CancellationToken cancellationToken)
        {
            var children = await DbContext.Organizations
                .Where(o => o.IsEnabled && o.ParentId == parent.Id)
                .ToListAsync(cancellationToken);

            foreach (var child in children)
            {
                child.Path = $"{parent.Path}/{child.Name}";
                child.Depth = parent.Depth + 1;
                child.UpdatedAt = DateTime.UtcNow;

                await UpdateDescendantsPathAsync(child, cancellationToken);
            }
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var organization = await DbContext.Organizations
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

            if (organization == null) return false;

            organization.IsEnabled = false;
            organization.UpdatedAt = DateTime.UtcNow;

            await DbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        public async Task<int> DeleteWithDescendantsAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var organization = await GetByIdAsync(id, cancellationToken);
            if (organization == null) return 0;

            var descendants = await GetDescendantsAsync(id, cancellationToken);
            var count = 0;

            foreach (var descendant in descendants)
            {
                descendant.IsEnabled = false;
                descendant.UpdatedAt = DateTime.UtcNow;
                count++;
            }

            organization.IsEnabled = false;
            organization.UpdatedAt = DateTime.UtcNow;
            count++;

            await DbContext.SaveChangesAsync(cancellationToken);
            return count;
        }

        #endregion

        #region OrganizationMember

        public async Task<List<OrganizationMember>> GetMembersAsync(Guid organizationId, CancellationToken cancellationToken = default)
        {
            return await DbContext.OrganizationMembers
                .Include(m => m.Position)
                .Where(m => m.OrganizationId == organizationId)
                .OrderBy(m => m.JoinedAt)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<OrganizationMember>> GetUserOrganizationsAsync(string userId, CancellationToken cancellationToken = default)
        {
            return await DbContext.OrganizationMembers
                .Include(m => m.Organization)
                .Include(m => m.Position)
                .Where(m => m.UserId == userId)
                .OrderByDescending(m => m.IsPrimary)
                .ThenBy(m => m.JoinedAt)
                .ToListAsync(cancellationToken);
        }

        public async Task<OrganizationMember> AddMemberAsync(OrganizationMember member, CancellationToken cancellationToken = default)
        {
            if (member.Id == Guid.Empty)
            {
                member.Id = Guid.NewGuid();
            }

            member.JoinedAt = DateTime.UtcNow;

            await DbContext.OrganizationMembers.AddAsync(member, cancellationToken);
            await DbContext.SaveChangesAsync(cancellationToken);

            return member;
        }

        public async Task<bool> RemoveMemberAsync(Guid organizationId, string userId, CancellationToken cancellationToken = default)
        {
            var member = await DbContext.OrganizationMembers
                .FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId, cancellationToken);

            if (member == null) return false;

            DbContext.OrganizationMembers.Remove(member);
            await DbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        public async Task<OrganizationMember> UpdateMemberAsync(OrganizationMember member, CancellationToken cancellationToken = default)
        {
            var existing = await DbContext.OrganizationMembers
                .FirstOrDefaultAsync(m => m.Id == member.Id, cancellationToken);

            if (existing == null)
            {
                throw new InvalidOperationException($"找不到成員記錄");
            }

            existing.PositionId = member.PositionId;
            existing.MemberRole = member.MemberRole;
            existing.IsPrimary = member.IsPrimary;

            await DbContext.SaveChangesAsync(cancellationToken);
            return existing;
        }

        #endregion

        #region Position

        public async Task<List<Position>> GetPositionsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.Positions.Where(p => p.IsEnabled);

            if (tenantId.HasValue)
            {
                query = query.Where(p => p.TenantId == tenantId.Value || p.TenantId == null);
            }

            return await query
                .OrderBy(p => p.Level)
                .ToListAsync(cancellationToken);
        }

        public async Task<Position> GetPositionByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await DbContext.Positions
                .FirstOrDefaultAsync(p => p.Id == id && p.IsEnabled, cancellationToken);
        }

        #endregion

        #region Statistics

        public async Task<(int totalOrganizations, int totalMembers, int maxDepth)> GetStatsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.Organizations.Where(o => o.IsEnabled);

            if (tenantId.HasValue)
            {
                query = query.Where(o => o.TenantId == tenantId.Value);
            }

            var organizations = await query.ToListAsync(cancellationToken);
            var totalOrganizations = organizations.Count;
            var maxDepth = organizations.Any() ? organizations.Max(o => o.Depth) : 0;

            var memberQuery = DbContext.OrganizationMembers.AsQueryable();
            if (tenantId.HasValue)
            {
                var orgIds = organizations.Select(o => o.Id).ToList();
                memberQuery = memberQuery.Where(m => orgIds.Contains(m.OrganizationId));
            }
            var totalMembers = await memberQuery.CountAsync(cancellationToken);

            return (totalOrganizations, totalMembers, maxDepth);
        }

        #endregion
    }
}
