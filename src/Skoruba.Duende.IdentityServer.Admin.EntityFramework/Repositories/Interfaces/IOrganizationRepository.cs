// UC Capital - Organization Repository Interface
// 組織架構資料存取介面
// 重構：從 Keycloak 表遷移至 Organizations 表

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces
{
    /// <summary>
    /// 組織架構 Repository 介面
    /// 注意：為保持 API 相容性，ID 參數維持 string 類型，Repository 內部轉換為 Guid
    /// </summary>
    public interface IOrganizationRepository
    {
        #region 查詢方法

        /// <summary>
        /// 取得所有啟用的組織群組
        /// </summary>
        Task<List<Organization>> GetAllGroupsAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// 根據 ID 取得組織群組
        /// </summary>
        /// <param name="id">組織 ID（string 格式的 GUID）</param>
        Task<Organization> GetGroupByIdAsync(string id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得根層級的組織群組
        /// </summary>
        Task<List<Organization>> GetRootGroupsAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得指定父層的子群組
        /// </summary>
        /// <param name="parentId">父組織 ID（string 格式的 GUID）</param>
        Task<List<Organization>> GetChildGroupsAsync(string parentId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得組織統計資料
        /// </summary>
        Task<(int totalGroups, int rootGroups, int maxDepth, int withManagers)> GetOrganizationStatsAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// 遞迴取得所有子孫群組（用於刪除確認）
        /// </summary>
        /// <param name="parentId">父組織 ID（string 格式的 GUID）</param>
        Task<List<Organization>> GetAllDescendantsAsync(string parentId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 檢查群組名稱是否已存在（同一層級內不可重複）
        /// </summary>
        /// <param name="excludeId">排除的組織 ID（用於更新時排除自己）</param>
        Task<bool> ExistsAsync(string name, string parentId, string excludeId = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得群組成員列表（含使用者詳細資訊）
        /// </summary>
        /// <param name="groupId">組織 ID（string 格式的 GUID）</param>
        Task<List<OrganizationMemberWithUser>> GetGroupMembersAsync(string groupId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得群組及其所有子孫群組的成員 UserId 列表
        /// </summary>
        /// <param name="groupId">組織 ID（string 格式的 GUID）</param>
        Task<List<string>> GetAllDescendantMemberUserIdsAsync(string groupId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得群組的成員數量（僅該群組本身）
        /// </summary>
        /// <param name="groupId">組織 ID（string 格式的 GUID）</param>
        Task<int> GetMemberCountAsync(string groupId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 批次取得所有組織的成員數量（單一查詢，避免 N+1）
        /// </summary>
        Task<Dictionary<Guid, int>> GetAllMemberCountsAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得群組及其所有子孫群組的成員總數
        /// </summary>
        /// <param name="groupId">組織 ID（string 格式的 GUID）</param>
        Task<int> GetTotalMemberCountAsync(string groupId, CancellationToken cancellationToken = default);

        #endregion

        #region 新增/修改/刪除方法

        /// <summary>
        /// 新增組織群組
        /// </summary>
        Task<Organization> CreateAsync(Organization organization, CancellationToken cancellationToken = default);

        /// <summary>
        /// 更新組織群組
        /// </summary>
        Task<Organization> UpdateAsync(Organization organization, CancellationToken cancellationToken = default);

        /// <summary>
        /// 刪除組織群組（軟刪除，設定 IsEnabled = false）
        /// </summary>
        /// <param name="id">組織 ID（string 格式的 GUID）</param>
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 遞迴刪除群組及其所有子孫群組
        /// </summary>
        /// <param name="id">組織 ID（string 格式的 GUID）</param>
        Task<int> DeleteWithDescendantsAsync(string id, CancellationToken cancellationToken = default);

        #endregion
    }

    /// <summary>
    /// 組織成員（含使用者資訊）
    /// 用於查詢時 JOIN Users 表取得使用者詳細資訊
    /// </summary>
    public class OrganizationMemberWithUser
    {
        /// <summary>
        /// 組織 ID
        /// </summary>
        public string OrganizationId { get; set; }

        /// <summary>
        /// 使用者 ID
        /// </summary>
        public string UserId { get; set; }

        /// <summary>
        /// 使用者名稱
        /// </summary>
        public string UserName { get; set; }

        /// <summary>
        /// 顯示名稱
        /// </summary>
        public string DisplayName { get; set; }

        /// <summary>
        /// Email
        /// </summary>
        public string Email { get; set; }

        /// <summary>
        /// 組織名稱
        /// </summary>
        public string OrganizationName { get; set; }

        /// <summary>
        /// 組織路徑
        /// </summary>
        public string OrganizationPath { get; set; }

        /// <summary>
        /// 成員角色
        /// </summary>
        public string MemberRole { get; set; }

        /// <summary>
        /// 加入時間
        /// </summary>
        public System.DateTime JoinedAt { get; set; }
    }
}
