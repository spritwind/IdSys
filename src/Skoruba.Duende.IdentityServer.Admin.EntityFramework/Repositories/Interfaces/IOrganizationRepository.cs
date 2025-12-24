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
        #region 查詢方法

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

        /// <summary>
        /// 遞迴取得所有子孫群組（用於刪除確認）
        /// </summary>
        Task<List<KeycloakGroup>> GetAllDescendantsAsync(string parentId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 檢查群組名稱是否已存在（同一層級內不可重複）
        /// </summary>
        Task<bool> ExistsAsync(string name, string parentId, string excludeId = null, CancellationToken cancellationToken = default);

        #endregion

        #region 新增/修改/刪除方法

        /// <summary>
        /// 新增組織群組
        /// </summary>
        Task<KeycloakGroup> CreateAsync(KeycloakGroup group, CancellationToken cancellationToken = default);

        /// <summary>
        /// 更新組織群組
        /// </summary>
        Task<KeycloakGroup> UpdateAsync(KeycloakGroup group, CancellationToken cancellationToken = default);

        /// <summary>
        /// 刪除組織群組（軟刪除，設定 Enabled = false）
        /// </summary>
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 遞迴刪除群組及其所有子孫群組
        /// </summary>
        Task<int> DeleteWithDescendantsAsync(string id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 更新父層的子群組數量
        /// </summary>
        Task UpdateSubGroupCountAsync(string parentId, CancellationToken cancellationToken = default);

        #endregion
    }
}
