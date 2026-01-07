// UC Capital - Organization Repository
// 組織架構資料存取實作
// 重構：從 Keycloak 表遷移至 Organizations 表

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
    public class OrganizationRepository : IOrganizationRepository
    {
        protected readonly OrganizationDbContext DbContext;

        public OrganizationRepository(OrganizationDbContext dbContext)
        {
            DbContext = dbContext;
        }

        #region 輔助方法

        /// <summary>
        /// 將 string 格式的 ID 轉換為 Guid
        /// </summary>
        private static bool TryParseGuid(string id, out Guid guid)
        {
            return Guid.TryParse(id, out guid);
        }

        /// <summary>
        /// 將 string 格式的 ID 轉換為 Guid（可為 null）
        /// </summary>
        private static Guid? ParseNullableGuid(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            return Guid.TryParse(id, out var guid) ? guid : null;
        }

        #endregion

        #region 查詢方法

        public async Task<List<Organization>> GetAllGroupsAsync(CancellationToken cancellationToken = default)
        {
            return await DbContext.Organizations
                .Where(o => o.IsEnabled)
                .OrderBy(o => o.Path)
                .ToListAsync(cancellationToken);
        }

        public async Task<Organization> GetGroupByIdAsync(string id, CancellationToken cancellationToken = default)
        {
            if (!TryParseGuid(id, out var guid))
            {
                return null;
            }

            return await DbContext.Organizations
                .FirstOrDefaultAsync(o => o.Id == guid && o.IsEnabled, cancellationToken);
        }

        public async Task<List<Organization>> GetRootGroupsAsync(CancellationToken cancellationToken = default)
        {
            return await DbContext.Organizations
                .Where(o => o.IsEnabled && o.ParentId == null)
                .OrderBy(o => o.SortOrder)
                .ThenBy(o => o.Name)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<Organization>> GetChildGroupsAsync(string parentId, CancellationToken cancellationToken = default)
        {
            if (!TryParseGuid(parentId, out var parentGuid))
            {
                return new List<Organization>();
            }

            return await DbContext.Organizations
                .Where(o => o.IsEnabled && o.ParentId == parentGuid)
                .OrderBy(o => o.SortOrder)
                .ThenBy(o => o.Name)
                .ToListAsync(cancellationToken);
        }

        public async Task<(int totalGroups, int rootGroups, int maxDepth, int withManagers)> GetOrganizationStatsAsync(CancellationToken cancellationToken = default)
        {
            var organizations = await DbContext.Organizations
                .Where(o => o.IsEnabled)
                .ToListAsync(cancellationToken);

            var totalGroups = organizations.Count;
            var rootGroups = organizations.Count(o => o.ParentId == null);
            var maxDepth = organizations.Any() ? organizations.Max(o => o.Depth) : 0;
            var withManagers = organizations.Count(o => !string.IsNullOrEmpty(o.ManagerUserId));

            return (totalGroups, rootGroups, maxDepth, withManagers);
        }

        public async Task<List<Organization>> GetAllDescendantsAsync(string parentId, CancellationToken cancellationToken = default)
        {
            if (!TryParseGuid(parentId, out var parentGuid))
            {
                return new List<Organization>();
            }

            var descendants = new List<Organization>();
            await CollectDescendantsAsync(parentGuid, descendants, cancellationToken);
            return descendants;
        }

        private async Task CollectDescendantsAsync(Guid parentId, List<Organization> descendants, CancellationToken cancellationToken)
        {
            var children = await DbContext.Organizations
                .Where(o => o.IsEnabled && o.ParentId == parentId)
                .ToListAsync(cancellationToken);

            foreach (var child in children)
            {
                descendants.Add(child);
                await CollectDescendantsAsync(child.Id, descendants, cancellationToken);
            }
        }

        public async Task<bool> ExistsAsync(string name, string parentId, string excludeId = null, CancellationToken cancellationToken = default)
        {
            var parentGuid = ParseNullableGuid(parentId);
            var excludeGuid = ParseNullableGuid(excludeId);

            var query = DbContext.Organizations
                .Where(o => o.IsEnabled && o.Name == name);

            // 檢查同一層級
            if (parentGuid == null)
            {
                query = query.Where(o => o.ParentId == null);
            }
            else
            {
                query = query.Where(o => o.ParentId == parentGuid);
            }

            // 排除自身（用於更新時）
            if (excludeGuid != null)
            {
                query = query.Where(o => o.Id != excludeGuid);
            }

            return await query.AnyAsync(cancellationToken);
        }

        public async Task<List<OrganizationMemberWithUser>> GetGroupMembersAsync(string groupId, CancellationToken cancellationToken = default)
        {
            if (!TryParseGuid(groupId, out var orgGuid))
            {
                return new List<OrganizationMemberWithUser>();
            }

            // JOIN OrganizationMembers 與 Users 表取得完整資訊
            var members = await (
                from m in DbContext.OrganizationMembers
                join u in DbContext.Users on m.UserId equals u.Id
                join o in DbContext.Organizations on m.OrganizationId equals o.Id
                where m.OrganizationId == orgGuid
                orderby u.DisplayName ?? u.UserName
                select new OrganizationMemberWithUser
                {
                    OrganizationId = m.OrganizationId.ToString(),
                    UserId = m.UserId,
                    UserName = u.UserName,
                    DisplayName = u.DisplayName ?? u.UserName,
                    Email = u.Email,
                    OrganizationName = o.Name,
                    OrganizationPath = o.Path,
                    MemberRole = m.MemberRole,
                    JoinedAt = m.JoinedAt
                }
            ).ToListAsync(cancellationToken);

            return members;
        }

        public async Task<List<string>> GetAllDescendantMemberUserIdsAsync(string groupId, CancellationToken cancellationToken = default)
        {
            if (!TryParseGuid(groupId, out var orgGuid))
            {
                return new List<string>();
            }

            // 取得該組織及所有子孫組織的 ID
            var orgIds = new List<Guid> { orgGuid };
            var descendants = await GetAllDescendantsAsync(groupId, cancellationToken);
            orgIds.AddRange(descendants.Select(d => d.Id));

            // 從 OrganizationMembers 表取得所有成員 UserId（去重）
            var memberUserIds = await DbContext.OrganizationMembers
                .Where(m => orgIds.Contains(m.OrganizationId))
                .Select(m => m.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);

            return memberUserIds;
        }

        public async Task<int> GetMemberCountAsync(string groupId, CancellationToken cancellationToken = default)
        {
            if (!TryParseGuid(groupId, out var orgGuid))
            {
                return 0;
            }

            return await DbContext.OrganizationMembers
                .CountAsync(m => m.OrganizationId == orgGuid, cancellationToken);
        }

        public async Task<Dictionary<Guid, int>> GetAllMemberCountsAsync(CancellationToken cancellationToken = default)
        {
            // 先嘗試從 OrganizationMembers 表取得成員數量
            var memberCounts = await DbContext.OrganizationMembers
                .GroupBy(m => m.OrganizationId)
                .Select(g => new { OrganizationId = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            // 如果 OrganizationMembers 表有資料，直接返回
            if (memberCounts.Any())
            {
                return memberCounts.ToDictionary(x => x.OrganizationId, x => x.Count);
            }

            // 否則從舊的 KeycloakGroupMember 表取得成員數量（向下相容）
            // 使用 Path 匹配組織和群組成員
            var organizations = await DbContext.Organizations
                .Where(o => o.IsEnabled)
                .Select(o => new { o.Id, o.Path })
                .ToListAsync(cancellationToken);

            var keycloakMembers = await DbContext.KeycloakGroupMembers
                .GroupBy(m => m.GroupPath)
                .Select(g => new { GroupPath = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var result = new Dictionary<Guid, int>();
            foreach (var org in organizations)
            {
                // 匹配 Path（KeycloakGroupMember.GroupPath 與 Organization.Path）
                var matchingMember = keycloakMembers.FirstOrDefault(m =>
                    m.GroupPath != null && (
                        m.GroupPath.Equals(org.Path, StringComparison.OrdinalIgnoreCase) ||
                        m.GroupPath.TrimStart('/').Equals(org.Path.TrimStart('/'), StringComparison.OrdinalIgnoreCase)
                    ));

                if (matchingMember != null)
                {
                    result[org.Id] = matchingMember.Count;
                }
            }

            return result;
        }

        public async Task<int> GetTotalMemberCountAsync(string groupId, CancellationToken cancellationToken = default)
        {
            if (!TryParseGuid(groupId, out var orgGuid))
            {
                return 0;
            }

            // 取得該組織及所有子孫組織的 ID
            var orgIds = new List<Guid> { orgGuid };
            var descendants = await GetAllDescendantsAsync(groupId, cancellationToken);
            orgIds.AddRange(descendants.Select(d => d.Id));

            // 計算所有成員數（去重）
            return await DbContext.OrganizationMembers
                .Where(m => orgIds.Contains(m.OrganizationId))
                .Select(m => m.UserId)
                .Distinct()
                .CountAsync(cancellationToken);
        }

        #endregion

        #region 新增/修改/刪除方法

        public async Task<Organization> CreateAsync(Organization organization, CancellationToken cancellationToken = default)
        {
            // 產生新 ID（使用 GUID）
            if (organization.Id == Guid.Empty)
            {
                organization.Id = Guid.NewGuid();
            }

            // 設定時間戳記
            organization.CreatedAt = DateTime.UtcNow;
            organization.UpdatedAt = DateTime.UtcNow;
            organization.IsEnabled = true;

            // 計算 Path 和 Depth
            if (organization.ParentId != null)
            {
                var parent = await DbContext.Organizations
                    .FirstOrDefaultAsync(o => o.Id == organization.ParentId, cancellationToken);

                if (parent != null)
                {
                    organization.Path = $"{parent.Path}/{organization.Name}";
                    organization.Depth = parent.Depth + 1;
                }
                else
                {
                    organization.Path = $"/{organization.Name}";
                    organization.Depth = 0;
                }
            }
            else
            {
                organization.Path = $"/{organization.Name}";
                organization.Depth = 0;
            }

            // 設定排序（同層級最後）
            var maxSortOrder = await DbContext.Organizations
                .Where(o => o.ParentId == organization.ParentId && o.IsEnabled)
                .MaxAsync(o => (int?)o.SortOrder, cancellationToken) ?? 0;
            organization.SortOrder = maxSortOrder + 1;

            await DbContext.Organizations.AddAsync(organization, cancellationToken);
            await DbContext.SaveChangesAsync(cancellationToken);

            return organization;
        }

        public async Task<Organization> UpdateAsync(Organization organization, CancellationToken cancellationToken = default)
        {
            var existingOrg = await DbContext.Organizations
                .FirstOrDefaultAsync(o => o.Id == organization.Id, cancellationToken);

            if (existingOrg == null)
            {
                throw new InvalidOperationException($"找不到 ID 為 {organization.Id} 的組織群組");
            }

            var oldParentId = existingOrg.ParentId;
            var nameChanged = existingOrg.Name != organization.Name;
            var parentChanged = existingOrg.ParentId != organization.ParentId;

            // 更新欄位
            existingOrg.Name = organization.Name;
            existingOrg.Code = organization.Code;
            existingOrg.ChineseName = organization.ChineseName;
            existingOrg.EnglishName = organization.EnglishName;
            existingOrg.ManagerUserId = organization.ManagerUserId;
            existingOrg.Description = organization.Description;
            existingOrg.ParentId = organization.ParentId;
            existingOrg.UpdatedAt = DateTime.UtcNow;

            // 如果名稱或父層變更，需要更新 Path 和 Depth
            if (nameChanged || parentChanged)
            {
                if (existingOrg.ParentId != null)
                {
                    var parent = await DbContext.Organizations
                        .FirstOrDefaultAsync(o => o.Id == existingOrg.ParentId, cancellationToken);

                    if (parent != null)
                    {
                        existingOrg.Path = $"{parent.Path}/{existingOrg.Name}";
                        existingOrg.Depth = parent.Depth + 1;
                    }
                }
                else
                {
                    existingOrg.Path = $"/{existingOrg.Name}";
                    existingOrg.Depth = 0;
                }

                // 如果有子群組，需要遞迴更新子群組的 Path
                await UpdateDescendantsPathAsync(existingOrg, cancellationToken);
            }

            await DbContext.SaveChangesAsync(cancellationToken);

            return existingOrg;
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

            await DbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
        {
            if (!TryParseGuid(id, out var guid))
            {
                return false;
            }

            var organization = await DbContext.Organizations
                .FirstOrDefaultAsync(o => o.Id == guid, cancellationToken);

            if (organization == null)
            {
                return false;
            }

            // 軟刪除
            organization.IsEnabled = false;
            organization.UpdatedAt = DateTime.UtcNow;

            await DbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        public async Task<int> DeleteWithDescendantsAsync(string id, CancellationToken cancellationToken = default)
        {
            if (!TryParseGuid(id, out var guid))
            {
                return 0;
            }

            var organization = await DbContext.Organizations
                .FirstOrDefaultAsync(o => o.Id == guid && o.IsEnabled, cancellationToken);

            if (organization == null)
            {
                return 0;
            }

            var deletedCount = 0;

            // 遞迴軟刪除所有子孫
            var descendants = await GetAllDescendantsAsync(id, cancellationToken);
            foreach (var descendant in descendants)
            {
                descendant.IsEnabled = false;
                descendant.UpdatedAt = DateTime.UtcNow;
                deletedCount++;
            }

            // 刪除自身
            organization.IsEnabled = false;
            organization.UpdatedAt = DateTime.UtcNow;
            deletedCount++;

            await DbContext.SaveChangesAsync(cancellationToken);

            return deletedCount;
        }

        #endregion
    }
}
