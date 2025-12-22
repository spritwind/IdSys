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
    }
}
