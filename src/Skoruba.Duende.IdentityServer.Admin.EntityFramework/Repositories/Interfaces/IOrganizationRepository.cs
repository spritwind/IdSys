// UC Capital - Organization Repository Interface
// 組織架構資料存取介面

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces
{
    public interface IOrganizationRepository
    {
        /// <summary>
        /// 取得所有啟用的組織群組
        /// </summary>
        Task<List<KeycloakGroup>> GetAllGroupsAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// 根據 ID 取得組織群組
        /// </summary>
        Task<KeycloakGroup> GetGroupByIdAsync(string id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得根層級的組織群組
        /// </summary>
        Task<List<KeycloakGroup>> GetRootGroupsAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得指定父層的子群組
        /// </summary>
        Task<List<KeycloakGroup>> GetChildGroupsAsync(string parentId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得組織統計資料
        /// </summary>
        Task<(int totalGroups, int rootGroups, int maxDepth, int withManagers)> GetOrganizationStatsAsync(CancellationToken cancellationToken = default);
    }
}
