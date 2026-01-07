// UC Capital Identity System
// Position entity (Team Lead, Manager, Director, etc.)

using System;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 職位實體 (組長、經理、部長等)
    /// </summary>
    public class Position
    {
        public Guid Id { get; set; }

        /// <summary>
        /// 租戶 ID
        /// </summary>
        public Guid? TenantId { get; set; }

        /// <summary>
        /// 職位代碼
        /// </summary>
        public string Code { get; set; }

        /// <summary>
        /// 職位名稱
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// 職位等級 (數字越大權限越高)
        /// </summary>
        public int Level { get; set; }

        /// <summary>
        /// 描述
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// 職位預設權限 (JSON)
        /// </summary>
        public string Permissions { get; set; }

        /// <summary>
        /// 是否啟用
        /// </summary>
        public bool IsEnabled { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public virtual Tenant Tenant { get; set; }
    }
}
