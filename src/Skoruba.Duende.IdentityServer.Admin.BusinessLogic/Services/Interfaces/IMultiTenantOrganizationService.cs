// UC Capital - Multi-Tenant Organization Service Interface
// 多租戶組織服務介面

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.MultiTenant;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces
{
    public interface IMultiTenantOrganizationService
    {
        #region Organization

        /// <summary>
        /// 取得所有組織
        /// </summary>
        Task<List<OrganizationDto>> GetAllOrganizationsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得組織樹狀結構
        /// </summary>
        Task<List<OrganizationTreeNodeDto>> GetOrganizationTreeAsync(Guid? tenantId = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// 根據 ID 取得組織
        /// </summary>
        Task<OrganizationDto> GetOrganizationByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得子組織
        /// </summary>
        Task<List<OrganizationDto>> GetChildOrganizationsAsync(Guid parentId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 新增組織
        /// </summary>
        Task<OrganizationDto> CreateOrganizationAsync(CreateOrganizationDto dto, Guid tenantId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 更新組織
        /// </summary>
        Task<OrganizationDto> UpdateOrganizationAsync(Guid id, UpdateOrganizationDto dto, CancellationToken cancellationToken = default);

        /// <summary>
        /// 刪除組織
        /// </summary>
        Task<OperationResultDto> DeleteOrganizationAsync(Guid id, bool includeDescendants = false, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得組織統計
        /// </summary>
        Task<OrganizationStatsDto> GetOrganizationStatsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default);

        #endregion

        #region OrganizationMember

        /// <summary>
        /// 取得組織成員
        /// </summary>
        Task<List<OrganizationMemberDto>> GetOrganizationMembersAsync(Guid organizationId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得使用者所屬組織
        /// </summary>
        Task<List<OrganizationMemberDto>> GetUserOrganizationsAsync(string userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 新增組織成員
        /// </summary>
        Task<OrganizationMemberDto> AddMemberAsync(AddOrganizationMemberDto dto, CancellationToken cancellationToken = default);

        /// <summary>
        /// 移除組織成員
        /// </summary>
        Task<OperationResultDto> RemoveMemberAsync(Guid organizationId, string userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 更新成員職位
        /// </summary>
        Task<OrganizationMemberDto> UpdateMemberAsync(Guid memberId, Guid? positionId, string memberRole, bool isPrimary, CancellationToken cancellationToken = default);

        #endregion

        #region Position

        /// <summary>
        /// 取得所有職位
        /// </summary>
        Task<List<PositionDto>> GetPositionsAsync(Guid? tenantId = null, CancellationToken cancellationToken = default);

        #endregion
    }
}
