// UC Capital - User Permission View Entity
// 對應 vw_user_permission_scopes View (新架構)

using System;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 使用者權限 View 實體
    /// 對應 vw_user_permission_scopes View
    /// 關聯 Users -> Permissions -> PermissionResources -> PermissionScopes
    /// </summary>
    public class UserPermissionView
    {
        /// <summary>
        /// 使用者 Subject ID (Users.Id)
        /// </summary>
        public string SubjectId { get; set; } = string.Empty;

        /// <summary>
        /// 使用者帳號 (Email)
        /// </summary>
        public string? UserName { get; set; }

        /// <summary>
        /// 使用者顯示名稱 (中文名)
        /// </summary>
        public string? UserName_Display { get; set; }

        /// <summary>
        /// 使用者英文姓名
        /// </summary>
        public string? UserEnglishName { get; set; }

        /// <summary>
        /// 使用者 Email
        /// </summary>
        public string? Email { get; set; }

        /// <summary>
        /// 系統 ID (ClientId)
        /// </summary>
        public string? SystemId { get; set; }

        /// <summary>
        /// 系統名稱 (ClientName)
        /// </summary>
        public string? SystemName { get; set; }

        /// <summary>
        /// 資源 ID (GUID)
        /// </summary>
        public Guid ResourceId { get; set; }

        /// <summary>
        /// 資源代碼
        /// </summary>
        public string ResourceCode { get; set; } = string.Empty;

        /// <summary>
        /// 資源名稱
        /// </summary>
        public string? ResourceName { get; set; }

        /// <summary>
        /// 資源類型 (Module, API, Page, Function)
        /// </summary>
        public string? ResourceType { get; set; }

        /// <summary>
        /// 權限 ID
        /// </summary>
        public Guid PermissionId { get; set; }

        /// <summary>
        /// 權限範圍原始值 (如: @r@e@c)
        /// </summary>
        public string? Scopes { get; set; }

        /// <summary>
        /// 權限代碼 (r, c, u, d, e, all)
        /// </summary>
        public string PermissionCode { get; set; } = string.Empty;

        /// <summary>
        /// 權限名稱
        /// </summary>
        public string? PermissionName { get; set; }

        /// <summary>
        /// 是否啟用
        /// </summary>
        public bool IsEnabled { get; set; }

        /// <summary>
        /// 授權時間
        /// </summary>
        public DateTime? GrantedAt { get; set; }

        /// <summary>
        /// 過期時間
        /// </summary>
        public DateTime? ExpiresAt { get; set; }
    }
}
