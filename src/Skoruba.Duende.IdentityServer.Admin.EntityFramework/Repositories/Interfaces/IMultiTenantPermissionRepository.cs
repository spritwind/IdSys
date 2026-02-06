// UC Capital - Multi-Tenant Permission Repository Interface
// 多租戶權限資料存取介面

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces
{
    public interface IMultiTenantPermissionRepository
    {
        #region PermissionResource 查詢

        /// <summary>
        /// 取得所有資源
        /// </summary>
        Task<List<PermissionResource>> GetResourcesAsync(string clientId = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// 根據 ID 取得資源
        /// </summary>
        Task<PermissionResource> GetResourceByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 根據 Code 取得資源
        /// </summary>
        Task<PermissionResource> GetResourceByCodeAsync(string clientId, string code, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得資源樹狀結構
        /// </summary>
        Task<List<PermissionResource>> GetResourceTreeAsync(string clientId, CancellationToken cancellationToken = default);

        #endregion

        #region PermissionScope 查詢

        /// <summary>
        /// 取得所有權限範圍
        /// </summary>
        Task<List<PermissionScope>> GetScopesAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// 根據 Code 取得權限範圍
        /// </summary>
        Task<PermissionScope> GetScopeByCodeAsync(string code, CancellationToken cancellationToken = default);

        #endregion

        #region Permission 查詢

        /// <summary>
        /// 取得使用者的直接權限
        /// </summary>
        Task<List<Permission>> GetUserPermissionsAsync(string userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得使用者的有效權限（包含組織/群組繼承）
        /// </summary>
        Task<List<Permission>> GetUserEffectivePermissionsAsync(string userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得組織的權限
        /// </summary>
        Task<List<Permission>> GetOrganizationPermissionsAsync(Guid organizationId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得群組的權限
        /// </summary>
        Task<List<Permission>> GetGroupPermissionsAsync(Guid groupId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 取得資源的權限列表
        /// </summary>
        Task<List<Permission>> GetResourcePermissionsAsync(Guid resourceId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 檢查使用者是否有特定權限
        /// </summary>
        Task<bool> HasPermissionAsync(string userId, Guid resourceId, string scope, CancellationToken cancellationToken = default);

        /// <summary>
        /// 檢查使用者是否有特定資源碼的權限
        /// </summary>
        Task<bool> HasPermissionByCodeAsync(string userId, string clientId, string resourceCode, string scope, CancellationToken cancellationToken = default);

        #endregion

        #region Permission CRUD

        /// <summary>
        /// 授予權限
        /// </summary>
        Task<Permission> GrantPermissionAsync(Permission permission, CancellationToken cancellationToken = default);

        /// <summary>
        /// 撤銷權限
        /// </summary>
        Task<bool> RevokePermissionAsync(Guid permissionId, CancellationToken cancellationToken = default);

        /// <summary>
        /// 批次授予權限
        /// </summary>
        Task<List<Permission>> GrantPermissionsAsync(List<Permission> permissions, CancellationToken cancellationToken = default);

        /// <summary>
        /// 批次撤銷權限
        /// </summary>
        Task<int> RevokePermissionsAsync(List<Guid> permissionIds, CancellationToken cancellationToken = default);

        /// <summary>
        /// 更新權限
        /// </summary>
        Task<Permission> UpdatePermissionAsync(Permission permission, CancellationToken cancellationToken = default);

        #endregion

        #region PermissionResource CRUD

        /// <summary>
        /// 新增資源
        /// </summary>
        Task<PermissionResource> CreateResourceAsync(PermissionResource resource, CancellationToken cancellationToken = default);

        /// <summary>
        /// 更新資源
        /// </summary>
        Task<PermissionResource> UpdateResourceAsync(PermissionResource resource, CancellationToken cancellationToken = default);

        /// <summary>
        /// 刪除資源
        /// </summary>
        Task<bool> DeleteResourceAsync(Guid id, CancellationToken cancellationToken = default);

        #endregion
    }
}
