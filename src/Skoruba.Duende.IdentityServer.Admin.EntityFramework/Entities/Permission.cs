// UC Capital Identity System
// Permission entity (supports User, Group, Organization, Role)

using System;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 權限實體 (支援 User/Group/Organization/Role)
    /// </summary>
    public class Permission
    {
        public Guid Id { get; set; }

        /// <summary>
        /// 租戶 ID
        /// </summary>
        public Guid? TenantId { get; set; }

        /// <summary>
        /// 主體類型 (User, Group, Organization, Role)
        /// </summary>
        public string SubjectType { get; set; }

        /// <summary>
        /// 主體 ID (UserId / GroupId / OrganizationId / RoleId)
        /// </summary>
        public string SubjectId { get; set; }

        /// <summary>
        /// 主體名稱 (使用者名稱 / 組織名稱，方便查詢識別)
        /// </summary>
        public string SubjectName { get; set; }

        /// <summary>
        /// 資源 ID
        /// </summary>
        public Guid ResourceId { get; set; }

        /// <summary>
        /// 權限範圍 (格式: @r@e 或 JSON array)
        /// </summary>
        public string Scopes { get; set; }

        /// <summary>
        /// 是否繼承給子組織/群組
        /// </summary>
        public bool InheritToChildren { get; set; }

        /// <summary>
        /// 是否啟用
        /// </summary>
        public bool IsEnabled { get; set; } = true;

        /// <summary>
        /// 授權者 UserId
        /// </summary>
        public string GrantedBy { get; set; }

        /// <summary>
        /// 授權時間
        /// </summary>
        public DateTime GrantedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// 過期時間 (NULL = 永久)
        /// </summary>
        public DateTime? ExpiresAt { get; set; }

        // Navigation
        public virtual Tenant Tenant { get; set; }
        public virtual PermissionResource Resource { get; set; }
    }

    /// <summary>
    /// 權限主體類型
    /// </summary>
    public static class PermissionSubjectType
    {
        public const string User = "User";
        public const string Group = "Group";
        public const string Organization = "Organization";
        public const string Role = "Role";
    }
}
