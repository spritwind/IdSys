// UC Capital - Google Sync Data Entities
// Repository 層使用的資料類別（避免循環依賴）

using System;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities.GoogleSync
{
    /// <summary>
    /// 組織同步資料
    /// </summary>
    public class SyncOrganization
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Id_104 { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Path { get; set; } = string.Empty;
        public int Depth { get; set; }
        public string? ParentId_104 { get; set; }
        public string? Description { get; set; }
        public bool InheritParentPermissions { get; set; } = true;
        public string? ChineseName { get; set; }
        public string? EnglishName { get; set; }
        public string? GroupType { get; set; }
        public string? CreatedAt { get; set; }
        public string? UpdatedAt { get; set; }
    }

    /// <summary>
    /// 組織成員同步資料
    /// </summary>
    public class SyncOrganizationMember
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string UserId { get; set; } = string.Empty;  // Email
        public string OrganizationId { get; set; } = string.Empty;  // Id_104
        public string? TempPositionName { get; set; }
        public string MemberRole { get; set; } = "MEMBER";
        public bool IsPrimary { get; set; }
        public string? JoinedAt { get; set; }
    }
}
