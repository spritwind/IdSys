// UC Capital - Google Workspace Sync DTOs
// Google Workspace 同步資料傳輸物件

using System;
using System.Collections.Generic;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.GoogleSync
{
    /// <summary>
    /// Google 員工資料 DTO
    /// </summary>
    public class GoogleEmployeeDto
    {
        public string GoogleUserId { get; set; } = string.Empty;
        public string CompanyEmail { get; set; } = string.Empty;
        public string ChineseName { get; set; } = string.Empty;
        public string EnglishName { get; set; } = string.Empty;
        public string ETag { get; set; } = string.Empty;
        public string OrgPath { get; set; } = string.Empty;
        public string OrgParentPath { get; set; } = string.Empty;
        public string OrgUnitId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Hierarchy { get; set; } = string.Empty;
        public int AccountStatus { get; set; }
        public int EmployeeStatus { get; set; }
        public string LastChangeReason { get; set; } = string.Empty;
        public string EffectiveDate { get; set; } = string.Empty;
        public string UpdatedBy { get; set; } = string.Empty;
        public string UpdateTime { get; set; } = string.Empty;
        public string CreationTime { get; set; } = string.Empty;
        public Dictionary<string, string> CustomFields { get; set; } = new();
    }

    /// <summary>
    /// Google 組織單位詳情
    /// </summary>
    public class GoogleOrgDetailDto
    {
        public string OrgUnitId { get; set; } = string.Empty;
        public string OrgPath { get; set; } = string.Empty;
        public string? ParentPath { get; set; }
        public string? ParentOrgUnitId { get; set; }
        public string? Description { get; set; }
        public bool InheritParentPermissions { get; set; }
        public string? ETag { get; set; }
    }

    /// <summary>
    /// 同步用組織實體
    /// </summary>
    public class SyncOrganizationDto
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Id_104 { get; set; } = string.Empty;
        public Guid TenantId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? EnglishName { get; set; }
        public string? ChineseName { get; set; }
        public Guid? ParentId { get; set; }
        public string? ParentId_104 { get; set; }
        public string Path { get; set; } = string.Empty;
        public int Depth { get; set; }
        public int SortOrder { get; set; }
        public string? ManagerUserId { get; set; }
        public string? Description { get; set; }
        public bool InheritParentPermissions { get; set; } = true;
        public bool IsEnabled { get; set; } = true;
        public string? GroupType { get; set; }
        public string CreatedAt { get; set; } = string.Empty;
        public string UpdatedAt { get; set; } = string.Empty;
    }

    /// <summary>
    /// 同步用組織成員實體
    /// </summary>
    public class SyncOrganizationMemberDto
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string OrganizationId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public Guid? PositionId { get; set; }
        public string? TempPositionName { get; set; }
        public string MemberRole { get; set; } = "Member";
        public bool IsPrimary { get; set; }
        public string JoinedAt { get; set; } = string.Empty;
    }

    /// <summary>
    /// Google 同步資料包
    /// </summary>
    public class GoogleSyncDataBundle
    {
        public List<SyncOrganizationDto> Organizations { get; set; } = new();
        public List<SyncOrganizationMemberDto> Members { get; set; } = new();
        public List<SyncOrganizationMemberDto> MembersMissingOrg { get; set; } = new();
    }

    /// <summary>
    /// 同步預覽結果
    /// </summary>
    public class GoogleSyncPreviewDto
    {
        public int OrganizationsFromGoogle { get; set; }
        public int MembersFromGoogle { get; set; }
        public int MembersWithMissingOrg { get; set; }
        public int ExistingOrganizations { get; set; }
        public int ExistingMembers { get; set; }
        public List<string> OrganizationPaths { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
        public DateTime PreviewedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// 同步執行結果
    /// </summary>
    public class GoogleSyncResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int OrganizationsCreated { get; set; }
        public int OrganizationsUpdated { get; set; }
        public int OrganizationsDisabled { get; set; }
        public int MembersSynced { get; set; }
        public int MembersFailed { get; set; }
        public List<string> FailedEmails { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
        public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
        public long DurationMs { get; set; }
    }

    /// <summary>
    /// 同步請求參數
    /// </summary>
    public class GoogleSyncRequestDto
    {
        /// <summary>
        /// 目標租戶 ID（可選，預設使用設定值）
        /// </summary>
        public Guid? TenantId { get; set; }

        /// <summary>
        /// 指定同步的 Email 清單（可選，null = 全量同步）
        /// </summary>
        public List<string>? TargetEmails { get; set; }

        /// <summary>
        /// 是否同步組織架構
        /// </summary>
        public bool SyncOrganizations { get; set; } = true;

        /// <summary>
        /// 是否同步人員對應
        /// </summary>
        public bool SyncMembers { get; set; } = true;

        /// <summary>
        /// 是否為試執行（不寫入資料庫）
        /// </summary>
        public bool DryRun { get; set; } = false;
    }

    /// <summary>
    /// Google Workspace 設定
    /// </summary>
    public class GoogleWorkspaceSettings
    {
        /// <summary>
        /// Service Account 金鑰 JSON 檔案路徑
        /// </summary>
        public string ServiceAccountKeyPath { get; set; } = string.Empty;

        /// <summary>
        /// Service Account 金鑰 JSON 內容（優先使用）
        /// </summary>
        public string? ServiceAccountKeyJson { get; set; }

        /// <summary>
        /// 管理員 Email（用於 Domain-Wide Delegation）
        /// </summary>
        public string AdminEmail { get; set; } = string.Empty;

        /// <summary>
        /// 預設租戶 ID
        /// </summary>
        public Guid DefaultTenantId { get; set; }
    }
}
