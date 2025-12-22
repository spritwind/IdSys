// UC Capital - Organization Repository
// 組織架構資料存取實作

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
    }
}
