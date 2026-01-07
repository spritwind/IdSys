// UC Capital - Multi-Tenant Permission Service Interface
// 多租戶權限服務介面

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.MultiTenant;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces
{
    public interface IMultiTenantPermissionService
    {
        #region PermissionResource

        /// <summary>
        /// 取得所有資源
        /// </summary>
        Task<List<PermissionResourceDto>> GetResourcesAsync(string clientId = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得資源樹狀結構
        /// </summary>
        Task<List<PermissionResourceDto>> GetResourceTreeAsync(string clientId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 根據 ID 取得資源
        /// </summary>
        Task<PermissionResourceDto> GetResourceByIdAsync(Guid id, CancellationToken cancellationToken = default);

        #endregion

        #region PermissionScope

        /// <summary>
        /// 取得所有權限範圍
        /// </summary>
        Task<List<PermissionScopeDto>> GetScopesAsync(CancellationToken cancellationToken = default);

        #endregion

        #region Permission 查詢

        /// <summary>
        /// 取得使用者直接權限
        /// </summary>
        Task<List<PermissionDto>> GetUserPermissionsAsync(string userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得使用者有效權限（含繼承）
        /// </summary>
        Task<UserEffectivePermissionsDto> GetUserEffectivePermissionsAsync(string userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得組織權限
        /// </summary>
        Task<List<PermissionDto>> GetOrganizationPermissionsAsync(Guid organizationId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得資源的權限列表
        /// </summary>
        Task<List<PermissionDto>> GetResourcePermissionsAsync(Guid resourceId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 檢查使用者是否有權限
        /// </summary>
        Task<bool> HasPermissionAsync(string userId, Guid resourceId, string scope, CancellationToken cancellationToken = default);

        /// <summary>
        /// 檢查使用者是否有權限（按資源碼）
        /// </summary>
        Task<bool> HasPermissionByCodeAsync(string userId, string clientId, string resourceCode, string scope, CancellationToken cancellationToken = default);

        #endregion

        #region Permission 操作

        /// <summary>
        /// 授予權限
        /// </summary>
        Task<PermissionDto> GrantPermissionAsync(GrantPermissionDto dto, string grantedBy, CancellationToken cancellationToken = default);

        /// <summary>
        /// 批次授予權限
        /// </summary>
        Task<List<PermissionDto>> BatchGrantPermissionsAsync(BatchGrantPermissionDto dto, string grantedBy, CancellationToken cancellationToken = default);

        /// <summary>
        /// 撤銷權限
        /// </summary>
        Task<OperationResultDto> RevokePermissionAsync(Guid permissionId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 批次撤銷權限
        /// </summary>
        Task<OperationResultDto> BatchRevokePermissionsAsync(List<Guid> permissionIds, CancellationToken cancellationToken = default);

        /// <summary>
        /// 更新權限
        /// </summary>
        Task<PermissionDto> UpdatePermissionAsync(Guid id, List<string> scopes, bool inheritToChildren, DateTime? expiresAt, CancellationToken cancellationToken = default);

        #endregion
    }
}
