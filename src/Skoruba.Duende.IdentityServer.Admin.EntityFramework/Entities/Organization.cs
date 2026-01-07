// UC Capital Identity System
// Organization hierarchy entity

using System;
using System.Collections.Generic;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 組織架構實體
    /// </summary>
    public class Organization
    {
        public Guid Id { get; set; }

        /// <summary>
        /// 租戶 ID
        /// </summary>
        public Guid TenantId { get; set; }

        /// <summary>
        /// 部門代碼
        /// </summary>
        public string Code { get; set; }

        /// <summary>
        /// 部門名稱
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// 英文名稱
        /// </summary>
        public string EnglishName { get; set; }

        /// <summary>
        /// 中文名稱
        /// </summary>
        public string ChineseName { get; set; }

        /// <summary>
        /// 父組織 ID
        /// </summary>
        public Guid? ParentId { get; set; }

        /// <summary>
        /// 路徑 (如: /AD/MIS組)
        /// </summary>
        public string Path { get; set; }

        /// <summary>
        /// 層級深度
        /// </summary>
        public int Depth { get; set; }

        /// <summary>
        /// 排序
        /// </summary>
        public int SortOrder { get; set; }

        /// <summary>
        /// 主管 UserId
        /// </summary>
        public string ManagerUserId { get; set; }

        /// <summary>
        /// 描述
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// 是否繼承父組織權限
        /// </summary>
        public bool InheritParentPermissions { get; set; } = true;

        /// <summary>
        /// 是否啟用
        /// </summary>
        public bool IsEnabled { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public virtual Tenant Tenant { get; set; }
        public virtual Organization Parent { get; set; }
        public virtual ICollection<Organization> Children { get; set; }
        public virtual ICollection<OrganizationMember> Members { get; set; }
    }
}
