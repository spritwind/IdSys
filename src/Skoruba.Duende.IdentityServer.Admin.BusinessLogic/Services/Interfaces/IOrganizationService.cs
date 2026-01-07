// UC Capital - Organization Service Interface
// 組織架構服務介面

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.Organization;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces
{
    public interface IOrganizationService
    {
        #region 查詢方法

        /// <summary>
        /// 取得所有組織群組（扁平列表）
        /// </summary>
        Task<List<OrganizationGroupDto>> GetAllGroupsAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得組織樹狀結構（用於前端渲染）
        /// </summary>
        Task<List<OrganizationTreeDto>> GetOrganizationTreeAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// 根據 ID 取得組織群組
        /// </summary>
        Task<OrganizationGroupDto> GetGroupByIdAsync(string id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得組織統計資料
        /// </summary>
        Task<OrganizationStatsDto> GetOrganizationStatsAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得待刪除群組及其所有子群組資訊（用於刪除確認）
        /// </summary>
        Task<DeleteConfirmationDto> GetDeleteConfirmationAsync(string id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 檢查群組名稱是否已存在
        /// </summary>
        Task<bool> CanInsertGroupAsync(string name, string parentId, string excludeId = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得群組成員列表
        /// </summary>
        Task<List<GroupMemberDto>> GetGroupMembersAsync(string groupId, CancellationToken cancellationToken = default);

        #endregion

        #region 新增/修改/刪除方法

        /// <summary>
        /// 新增組織群組
        /// </summary>
        Task<OrganizationGroupDto> CreateGroupAsync(CreateOrganizationGroupDto dto, CancellationToken cancellationToken = default);

        /// <summary>
        /// 更新組織群組
        /// </summary>
        Task<OrganizationGroupDto> UpdateGroupAsync(string id, UpdateOrganizationGroupDto dto, CancellationToken cancellationToken = default);

        /// <summary>
        /// 刪除組織群組（含所有子群組）
        /// </summary>
        Task<DeleteResultDto> DeleteGroupAsync(string id, CancellationToken cancellationToken = default);

        #endregion
    }
}
