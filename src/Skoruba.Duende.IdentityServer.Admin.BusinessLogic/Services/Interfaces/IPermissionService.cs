// UC Capital - Permission Service Interface
// 權限控管服務介面

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.Permission;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces
{
    public interface IPermissionService
    {
        #region Scope 權限範圍

        Task<List<ScopeDto>> GetAllScopesAsync(string clientId = null, CancellationToken cancellationToken = default);
        Task<ScopeDto> GetScopeByIdAsync(string id, string clientId, CancellationToken cancellationToken = default);
        Task<ScopeDto> CreateScopeAsync(CreateScopeDto dto, CancellationToken cancellationToken = default);
        Task<ScopeDto> UpdateScopeAsync(UpdateScopeDto dto, CancellationToken cancellationToken = default);
        Task<bool> DeleteScopeAsync(string id, string clientId, CancellationToken cancellationToken = default);
        Task<bool> CanInsertScopeAsync(string name, string clientId, string excludeId = null, CancellationToken cancellationToken = default);

        #endregion

        #region Resource 資源

        Task<List<ResourceDto>> GetAllResourcesAsync(string clientId = null, string type = null, CancellationToken cancellationToken = default);
        Task<ResourceDto> GetResourceByIdAsync(string id, string clientId, CancellationToken cancellationToken = default);
        Task<ResourceDto> CreateResourceAsync(CreateResourceDto dto, CancellationToken cancellationToken = default);
        Task<ResourceDto> UpdateResourceAsync(UpdateResourceDto dto, CancellationToken cancellationToken = default);
        Task<bool> DeleteResourceAsync(string id, string clientId, CancellationToken cancellationToken = default);
        Task<bool> CanInsertResourceAsync(string name, string clientId, string excludeId = null, CancellationToken cancellationToken = default);

        #endregion

        #region ResourceScope 資源-範圍關聯

        Task<List<ResourceScopeDto>> GetResourceScopesAsync(string resourceId, string clientId, CancellationToken cancellationToken = default);
        Task<int> SetResourceScopesAsync(string resourceId, string clientId, List<string> scopeIds, CancellationToken cancellationToken = default);

        #endregion

        #region UserPermission 使用者權限

        Task<List<UserPermissionDto>> GetUserPermissionsAsync(string userId, string clientId = null, CancellationToken cancellationToken = default);
        Task<List<UserPermissionDto>> GetResourceUserPermissionsAsync(string resourceId, string clientId, CancellationToken cancellationToken = default);
        Task<UserPermissionDto> SetUserPermissionAsync(SetUserPermissionDto dto, CancellationToken cancellationToken = default);
        Task<bool> RemoveUserPermissionAsync(string userId, string clientId, string resourceId, CancellationToken cancellationToken = default);

        #endregion

        #region GroupPermission 群組權限

        Task<List<GroupPermissionDto>> GetGroupPermissionsAsync(string groupId, string clientId = null, CancellationToken cancellationToken = default);
        Task<List<GroupPermissionDto>> GetResourceGroupPermissionsAsync(string resourceId, string clientId, CancellationToken cancellationToken = default);
        Task<GroupPermissionDto> SetGroupPermissionAsync(SetGroupPermissionDto dto, CancellationToken cancellationToken = default);
        Task<bool> RemoveGroupPermissionAsync(string groupId, string clientId, string resourceId, CancellationToken cancellationToken = default);

        #endregion

        #region 有效權限

        /// <summary>
        /// 取得使用者的所有有效權限（包含直接授權和群組繼承）
        /// </summary>
        Task<List<EffectivePermissionDto>> GetUserEffectivePermissionsAsync(string userId, string clientId = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// 檢查使用者是否有指定資源的指定範圍權限
        /// </summary>
        Task<bool> HasPermissionAsync(string userId, string clientId, string resourceId, string scope, CancellationToken cancellationToken = default);

        #endregion

        #region 查詢輔助

        Task<List<UserBriefDto>> SearchUsersAsync(string search = null, CancellationToken cancellationToken = default);
        Task<List<GroupBriefDto>> GetAllGroupsAsync(CancellationToken cancellationToken = default);
        Task<List<string>> GetDistinctClientIdsAsync(CancellationToken cancellationToken = default);
        Task<PermissionStatsDto> GetPermissionStatsAsync(CancellationToken cancellationToken = default);

        #endregion
    }
}
