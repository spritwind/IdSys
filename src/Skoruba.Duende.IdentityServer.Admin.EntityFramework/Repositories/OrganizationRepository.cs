// UC Capital - Organization Repository
// 組織架構資料存取實作

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

        #region 查詢方法

        public async Task<List<KeycloakGroup>> GetAllGroupsAsync(CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakGroups
                .Where(g => g.Enabled == true)
                .OrderBy(g => g.Path)
                .ToListAsync(cancellationToken);
        }

        public async Task<KeycloakGroup> GetGroupByIdAsync(string id, CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakGroups
                .FirstOrDefaultAsync(g => g.Id == id && g.Enabled == true, cancellationToken);
        }

        public async Task<List<KeycloakGroup>> GetRootGroupsAsync(CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakGroups
                .Where(g => g.Enabled == true && string.IsNullOrEmpty(g.ParentId))
                .OrderBy(g => g.Name)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<KeycloakGroup>> GetChildGroupsAsync(string parentId, CancellationToken cancellationToken = default)
        {
            return await DbContext.KeycloakGroups
                .Where(g => g.Enabled == true && g.ParentId == parentId)
                .OrderBy(g => g.Name)
                .ToListAsync(cancellationToken);
        }

        public async Task<(int totalGroups, int rootGroups, int maxDepth, int withManagers)> GetOrganizationStatsAsync(CancellationToken cancellationToken = default)
        {
            var groups = await DbContext.KeycloakGroups
                .Where(g => g.Enabled == true)
                .ToListAsync(cancellationToken);

            var totalGroups = groups.Count;
            var rootGroups = groups.Count(g => string.IsNullOrEmpty(g.ParentId));
            var maxDepth = groups.Any() ? groups.Max(g => g.Depth ?? 0) : 0;
            var withManagers = groups.Count(g => !string.IsNullOrEmpty(g.Manager));

            return (totalGroups, rootGroups, maxDepth, withManagers);
        }

        public async Task<List<KeycloakGroup>> GetAllDescendantsAsync(string parentId, CancellationToken cancellationToken = default)
        {
            var descendants = new List<KeycloakGroup>();
            await CollectDescendantsAsync(parentId, descendants, cancellationToken);
            return descendants;
        }

        private async Task CollectDescendantsAsync(string parentId, List<KeycloakGroup> descendants, CancellationToken cancellationToken)
        {
            var children = await DbContext.KeycloakGroups
                .Where(g => g.Enabled == true && g.ParentId == parentId)
                .ToListAsync(cancellationToken);

            foreach (var child in children)
            {
                descendants.Add(child);
                await CollectDescendantsAsync(child.Id, descendants, cancellationToken);
            }
        }

        public async Task<bool> ExistsAsync(string name, string parentId, string excludeId = null, CancellationToken cancellationToken = default)
        {
            var query = DbContext.KeycloakGroups
                .Where(g => g.Enabled == true && g.Name == name);

            // 檢查同一層級
            if (string.IsNullOrEmpty(parentId))
            {
                query = query.Where(g => string.IsNullOrEmpty(g.ParentId));
            }
            else
            {
                query = query.Where(g => g.ParentId == parentId);
            }

            // 排除自身（用於更新時）
            if (!string.IsNullOrEmpty(excludeId))
            {
                query = query.Where(g => g.Id != excludeId);
            }

            return await query.AnyAsync(cancellationToken);
        }

        #endregion

        #region 新增/修改/刪除方法

        public async Task<KeycloakGroup> CreateAsync(KeycloakGroup group, CancellationToken cancellationToken = default)
        {
            // 產生新 ID（使用 GUID）
            if (string.IsNullOrEmpty(group.Id))
            {
                group.Id = Guid.NewGuid().ToString("N").Substring(0, 36);
            }

            // 設定建立時間
            group.InsDate = DateTime.Now;
            group.UpdDate = DateTime.Now;
            group.Enabled = true;

            // 計算 Path
            if (!string.IsNullOrEmpty(group.ParentId))
            {
                var parent = await GetGroupByIdAsync(group.ParentId, cancellationToken);
                if (parent != null)
                {
                    group.Path = $"{parent.Path}/{group.Name}";
                    group.Depth = (parent.Depth ?? 0) + 1;
                }
                else
                {
                    group.Path = $"/{group.Name}";
                    group.Depth = 0;
                }
            }
            else
            {
                group.Path = $"/{group.Name}";
                group.Depth = 0;
            }

            group.SubGroupCount = 0;

            await DbContext.KeycloakGroups.AddAsync(group, cancellationToken);
            await DbContext.SaveChangesAsync(cancellationToken);

            // 更新父層的子群組數量
            if (!string.IsNullOrEmpty(group.ParentId))
            {
                await UpdateSubGroupCountAsync(group.ParentId, cancellationToken);
            }

            return group;
        }

        public async Task<KeycloakGroup> UpdateAsync(KeycloakGroup group, CancellationToken cancellationToken = default)
        {
            var existingGroup = await DbContext.KeycloakGroups
                .FirstOrDefaultAsync(g => g.Id == group.Id, cancellationToken);

            if (existingGroup == null)
            {
                throw new InvalidOperationException($"找不到 ID 為 {group.Id} 的組織群組");
            }

            var oldParentId = existingGroup.ParentId;
            var nameChanged = existingGroup.Name != group.Name;
            var parentChanged = existingGroup.ParentId != group.ParentId;

            // 更新欄位
            existingGroup.Name = group.Name;
            existingGroup.DeptCode = group.DeptCode;
            existingGroup.DeptZhName = group.DeptZhName;
            existingGroup.DeptEName = group.DeptEName;
            existingGroup.Manager = group.Manager;
            existingGroup.Description = group.Description;
            existingGroup.ParentId = group.ParentId;
            existingGroup.UpdDate = DateTime.Now;

            // 如果名稱或父層變更，需要更新 Path 和 Depth
            if (nameChanged || parentChanged)
            {
                if (!string.IsNullOrEmpty(existingGroup.ParentId))
                {
                    var parent = await GetGroupByIdAsync(existingGroup.ParentId, cancellationToken);
                    if (parent != null)
                    {
                        existingGroup.Path = $"{parent.Path}/{existingGroup.Name}";
                        existingGroup.Depth = (parent.Depth ?? 0) + 1;
                    }
                }
                else
                {
                    existingGroup.Path = $"/{existingGroup.Name}";
                    existingGroup.Depth = 0;
                }

                // 如果有子群組，需要遞迴更新子群組的 Path
                await UpdateDescendantsPathAsync(existingGroup, cancellationToken);
            }

            await DbContext.SaveChangesAsync(cancellationToken);

            // 更新舊父層和新父層的子群組數量
            if (parentChanged)
            {
                if (!string.IsNullOrEmpty(oldParentId))
                {
                    await UpdateSubGroupCountAsync(oldParentId, cancellationToken);
                }
                if (!string.IsNullOrEmpty(existingGroup.ParentId))
                {
                    await UpdateSubGroupCountAsync(existingGroup.ParentId, cancellationToken);
                }
            }

            return existingGroup;
        }

        private async Task UpdateDescendantsPathAsync(KeycloakGroup parent, CancellationToken cancellationToken)
        {
            var children = await DbContext.KeycloakGroups
                .Where(g => g.Enabled == true && g.ParentId == parent.Id)
                .ToListAsync(cancellationToken);

            foreach (var child in children)
            {
                child.Path = $"{parent.Path}/{child.Name}";
                child.Depth = (parent.Depth ?? 0) + 1;
                child.UpdDate = DateTime.Now;

                await UpdateDescendantsPathAsync(child, cancellationToken);
            }

            await DbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
        {
            var group = await DbContext.KeycloakGroups
                .FirstOrDefaultAsync(g => g.Id == id, cancellationToken);

            if (group == null)
            {
                return false;
            }

            var parentId = group.ParentId;

            // 軟刪除
            group.Enabled = false;
            group.UpdDate = DateTime.Now;

            await DbContext.SaveChangesAsync(cancellationToken);

            // 更新父層的子群組數量
            if (!string.IsNullOrEmpty(parentId))
            {
                await UpdateSubGroupCountAsync(parentId, cancellationToken);
            }

            return true;
        }

        public async Task<int> DeleteWithDescendantsAsync(string id, CancellationToken cancellationToken = default)
        {
            var group = await DbContext.KeycloakGroups
                .FirstOrDefaultAsync(g => g.Id == id && g.Enabled == true, cancellationToken);

            if (group == null)
            {
                return 0;
            }

            var parentId = group.ParentId;
            var deletedCount = 0;

            // 遞迴軟刪除所有子孫
            var descendants = await GetAllDescendantsAsync(id, cancellationToken);
            foreach (var descendant in descendants)
            {
                descendant.Enabled = false;
                descendant.UpdDate = DateTime.Now;
                deletedCount++;
            }

            // 刪除自身
            group.Enabled = false;
            group.UpdDate = DateTime.Now;
            deletedCount++;

            await DbContext.SaveChangesAsync(cancellationToken);

            // 更新父層的子群組數量
            if (!string.IsNullOrEmpty(parentId))
            {
                await UpdateSubGroupCountAsync(parentId, cancellationToken);
            }

            return deletedCount;
        }

        public async Task UpdateSubGroupCountAsync(string parentId, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(parentId)) return;

            var parent = await DbContext.KeycloakGroups
                .FirstOrDefaultAsync(g => g.Id == parentId, cancellationToken);

            if (parent != null)
            {
                var count = await DbContext.KeycloakGroups
                    .CountAsync(g => g.Enabled == true && g.ParentId == parentId, cancellationToken);

                parent.SubGroupCount = count;
                parent.UpdDate = DateTime.Now;

                await DbContext.SaveChangesAsync(cancellationToken);
            }
        }

        #endregion
    }
}
