// UC Capital Identity System
// Group entity (independent from organization)

using System;
using System.Collections.Generic;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 群組實體 (獨立於組織架構)
    /// </summary>
    public class Group
    {
        public Guid Id { get; set; }

        /// <summary>
        /// 租戶 ID
        /// </summary>
        public Guid TenantId { get; set; }

        /// <summary>
        /// 群組代碼
        /// </summary>
        public string Code { get; set; }

        /// <summary>
        /// 群組名稱
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// 描述
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// 群組類型 (Organization, Leader, DeputyLeader, Personal, Special, Project, General)
        /// </summary>
        public string GroupType { get; set; } = "General";

        /// <summary>
        /// 關聯組織 ID (弱關聯，僅 GroupType=Organization 時有值)
        /// </summary>
        public Guid? OrganizationId { get; set; }

        /// <summary>
        /// 來源 prs_group.Id (資料遷移追蹤用)
        /// </summary>
        public int? SourceId { get; set; }

        /// <summary>
        /// 群組擁有者 UserId
        /// </summary>
        public string OwnerUserId { get; set; }

        /// <summary>
        /// 是否啟用
        /// </summary>
        public bool IsEnabled { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public virtual Tenant Tenant { get; set; }
        public virtual ICollection<GroupMember> Members { get; set; }
    }
}
