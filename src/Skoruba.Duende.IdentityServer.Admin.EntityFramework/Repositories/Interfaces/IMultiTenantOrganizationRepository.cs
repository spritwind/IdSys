// UC Capital - Multi-Tenant Organization Repository Interface
// 多租戶組織架構資料存取介面

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces
{
    public interface IMultiTenantOrganizationRepository
    {
        #region Organization 查詢

        /// <summary>
        /// 取得所有啟用的組織
        /// </summary>
        Task<List<Organization>> GetAllAsync(Guid? tenantId = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// 根據 ID 取得組織
        /// </summary>
        Task<Organization> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得根層級組織
        /// </summary>
        Task<List<Organization>> GetRootOrganizationsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得子組織
        /// </summary>
        Task<List<Organization>> GetChildrenAsync(Guid parentId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得組織樹狀結構
        /// </summary>
        Task<List<Organization>> GetOrganizationTreeAsync(Guid? tenantId = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得所有子孫組織
        /// </summary>
        Task<List<Organization>> GetDescendantsAsync(Guid parentId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 檢查組織是否存在
        /// </summary>
        Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 檢查組織名稱是否重複（同一層級）
        /// </summary>
        Task<bool> NameExistsAsync(string name, Guid? parentId, Guid? tenantId, Guid? excludeId = null, CancellationToken cancellationToken = default);

        #endregion

        #region Organization CRUD

        /// <summary>
        /// 新增組織
        /// </summary>
        Task<Organization> CreateAsync(Organization organization, CancellationToken cancellationToken = default);

        /// <summary>
        /// 更新組織
        /// </summary>
        Task<Organization> UpdateAsync(Organization organization, CancellationToken cancellationToken = default);

        /// <summary>
        /// 刪除組織（軟刪除）
        /// </summary>
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 刪除組織及其子組織
        /// </summary>
        Task<int> DeleteWithDescendantsAsync(Guid id, CancellationToken cancellationToken = default);

        #endregion

        #region OrganizationMember

        /// <summary>
        /// 取得組織成員
        /// </summary>
        Task<List<OrganizationMember>> GetMembersAsync(Guid organizationId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得使用者所屬的組織
        /// </summary>
        Task<List<OrganizationMember>> GetUserOrganizationsAsync(string userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 新增組織成員
        /// </summary>
        Task<OrganizationMember> AddMemberAsync(OrganizationMember member, CancellationToken cancellationToken = default);

        /// <summary>
        /// 移除組織成員
        /// </summary>
        Task<bool> RemoveMemberAsync(Guid organizationId, string userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 更新成員職位
        /// </summary>
        Task<OrganizationMember> UpdateMemberAsync(OrganizationMember member, CancellationToken cancellationToken = default);

        #endregion

        #region Position

        /// <summary>
        /// 取得所有職位
        /// </summary>
        Task<List<Position>> GetPositionsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// 根據 ID 取得職位
        /// </summary>
        Task<Position> GetPositionByIdAsync(Guid id, CancellationToken cancellationToken = default);

        #endregion

        #region Statistics

        /// <summary>
        /// 取得組織統計資料
        /// </summary>
        Task<(int totalOrganizations, int totalMembers, int maxDepth)> GetStatsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default);

        #endregion
    }
}
