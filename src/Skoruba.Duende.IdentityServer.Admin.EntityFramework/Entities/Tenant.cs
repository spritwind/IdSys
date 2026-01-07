// UC Capital Identity System
// Multi-tenant support entity

using System;
using System.Collections.Generic;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 租戶實體
    /// </summary>
    public class Tenant
    {
        public Guid Id { get; set; }

        /// <summary>
        /// 租戶代碼 (唯一)
        /// </summary>
        public string Code { get; set; }

        /// <summary>
        /// 租戶名稱
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// 網域
        /// </summary>
        public string Domain { get; set; }

        /// <summary>
        /// Logo URL
        /// </summary>
        public string LogoUrl { get; set; }

        /// <summary>
        /// 設定 (JSON)
        /// </summary>
        public string Settings { get; set; }

        /// <summary>
        /// 是否啟用
        /// </summary>
        public bool IsEnabled { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public virtual ICollection<Organization> Organizations { get; set; }
        public virtual ICollection<Group> Groups { get; set; }
    }
}
