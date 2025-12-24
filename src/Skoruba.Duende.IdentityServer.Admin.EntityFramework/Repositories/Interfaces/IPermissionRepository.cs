// UC Capital - Permission Repository Interface
// 權限控管 Repository 介面

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces
{
    public interface IPermissionRepository
    {
        #region Scope 權限範圍

        Task<List<KeycloakScope>> GetAllScopesAsync(string clientId = null, CancellationToken cancellationToken = default);
        Task<KeycloakScope> GetScopeByIdAsync(string id, string clientId, CancellationToken cancellationToken = default);
        Task<KeycloakScope> CreateScopeAsync(KeycloakScope scope, CancellationToken cancellationToken = default);
        Task<KeycloakScope> UpdateScopeAsync(KeycloakScope scope, CancellationToken cancellationToken = default);
        Task<bool> DeleteScopeAsync(string id, string clientId, CancellationToken cancellationToken = default);
        Task<bool> ScopeExistsAsync(string name, string clientId, string excludeId = null, CancellationToken cancellationToken = default);

        #endregion

        #region Resource 資源

        Task<List<KeycloakResource>> GetAllResourcesAsync(string clientId = null, string type = null, CancellationToken cancellationToken = default);
        Task<KeycloakResource> GetResourceByIdAsync(string id, string clientId, CancellationToken cancellationToken = default);
        Task<KeycloakResource> CreateResourceAsync(KeycloakResource resource, CancellationToken cancellationToken = default);
        Task<KeycloakResource> UpdateResourceAsync(KeycloakResource resource, CancellationToken cancellationToken = default);
        Task<bool> DeleteResourceAsync(string id, string clientId, CancellationToken cancellationToken = default);
        Task<bool> ResourceExistsAsync(string name, string clientId, string excludeId = null, CancellationToken cancellationToken = default);

        #endregion

        #region ResourceScope 資源-範圍關聯

        Task<List<KeycloakResourceScope>> GetResourceScopesAsync(string resourceId, string clientId, CancellationToken cancellationToken = default);
        Task<List<KeycloakResourceScope>> GetScopeResourcesAsync(string scopeId, string clientId, CancellationToken cancellationToken = default);
        Task<KeycloakResourceScope> AddResourceScopeAsync(KeycloakResourceScope resourceScope, CancellationToken cancellationToken = default);
        Task<bool> RemoveResourceScopeAsync(string resourceId, string scopeId, string clientId, CancellationToken cancellationToken = default);
        Task<int> SetResourceScopesAsync(string resourceId, string clientId, List<string> scopeIds, CancellationToken cancellationToken = default);

        #endregion

        #region UserPermission 使用者權限

        Task<List<KeycloakUserPermission>> GetUserPermissionsAsync(string userId, string clientId = null, CancellationToken cancellationToken = default);
        Task<List<KeycloakUserPermission>> GetResourceUserPermissionsAsync(string resourceId, string clientId, CancellationToken cancellationToken = default);
        Task<KeycloakUserPermission> GetUserPermissionAsync(string userId, string clientId, string resourceId, CancellationToken cancellationToken = default);
        Task<KeycloakUserPermission> SetUserPermissionAsync(KeycloakUserPermission permission, CancellationToken cancellationToken = default);
        Task<bool> RemoveUserPermissionAsync(string userId, string clientId, string resourceId, CancellationToken cancellationToken = default);
        Task<int> RemoveAllUserPermissionsAsync(string userId, string clientId = null, CancellationToken cancellationToken = default);

        #endregion

        #region GroupPermission 群組權限

        Task<List<KeycloakGroupPermission>> GetGroupPermissionsAsync(string groupId, string clientId = null, CancellationToken cancellationToken = default);
        Task<List<KeycloakGroupPermission>> GetResourceGroupPermissionsAsync(string resourceId, string clientId, CancellationToken cancellationToken = default);
        Task<KeycloakGroupPermission> GetGroupPermissionAsync(string groupId, string clientId, string resourceId, CancellationToken cancellationToken = default);
        Task<KeycloakGroupPermission> SetGroupPermissionAsync(KeycloakGroupPermission permission, CancellationToken cancellationToken = default);
        Task<bool> RemoveGroupPermissionAsync(string groupId, string clientId, string resourceId, CancellationToken cancellationToken = default);
        Task<int> RemoveAllGroupPermissionsAsync(string groupId, string clientId = null, CancellationToken cancellationToken = default);

        #endregion

        #region 使用者有效權限（結合直接授權 + 群組繼承）

        /// <summary>
        /// 取得使用者的所有有效權限（包含直接授權和群組繼承）
        /// </summary>
        Task<List<EffectivePermission>> GetUserEffectivePermissionsAsync(string userId, string clientId = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// 檢查使用者是否有指定資源的指定範圍權限
        /// </summary>
        Task<bool> HasPermissionAsync(string userId, string clientId, string resourceId, string scope, CancellationToken cancellationToken = default);

        #endregion

        #region 查詢輔助

        Task<List<KeycloakUser>> GetAllUsersAsync(string search = null, CancellationToken cancellationToken = default);
        Task<KeycloakUser> GetUserByIdAsync(string userId, CancellationToken cancellationToken = default);
        Task<List<KeycloakGroup>> GetUserGroupsAsync(string userId, CancellationToken cancellationToken = default);
        Task<List<string>> GetDistinctClientIdsAsync(CancellationToken cancellationToken = default);

        #endregion
    }

    /// <summary>
    /// 有效權限（合併直接授權和群組繼承後的結果）
    /// </summary>
    public class EffectivePermission
    {
        public string ResourceId { get; set; }
        public string ResourceName { get; set; }
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public List<string> Scopes { get; set; } = new List<string>();
        public string Source { get; set; } // "Direct" 或 "Group:{GroupName}"
        public bool IsFromGroup { get; set; }
        public string SourceGroupId { get; set; }
        public string SourceGroupName { get; set; }
    }
}
