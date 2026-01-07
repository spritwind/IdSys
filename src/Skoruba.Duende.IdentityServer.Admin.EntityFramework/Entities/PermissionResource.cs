// UC Capital Identity System
// Permission Resource entity

using System;
using System.Collections.Generic;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 權限資源實體
    /// </summary>
    public class PermissionResource
    {
        public Guid Id { get; set; }

        /// <summary>
        /// 租戶 ID (NULL = 全域資源)
        /// </summary>
        public Guid? TenantId { get; set; }

        /// <summary>
        /// 客戶端 ID (如: pos)
        /// </summary>
        public string ClientId { get; set; }

        /// <summary>
        /// 客戶端名稱
        /// </summary>
        public string ClientName { get; set; }

        /// <summary>
        /// 資源代碼 (如: module_search_xxx)
        /// </summary>
        public string Code { get; set; }

        /// <summary>
        /// 資源名稱
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// 描述
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// API 路徑
        /// </summary>
        public string Uri { get; set; }

        /// <summary>
        /// 資源類型 (Module, API, Page, Function)
        /// </summary>
        public string ResourceType { get; set; }

        /// <summary>
        /// 父資源 ID (用於樹狀結構)
        /// </summary>
        public Guid? ParentId { get; set; }

        /// <summary>
        /// 排序
        /// </summary>
        public int SortOrder { get; set; }

        /// <summary>
        /// 是否啟用
        /// </summary>
        public bool IsEnabled { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public virtual Tenant Tenant { get; set; }
        public virtual PermissionResource Parent { get; set; }
        public virtual ICollection<PermissionResource> Children { get; set; }
        public virtual ICollection<Permission> Permissions { get; set; }
    }
}
