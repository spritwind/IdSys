// UC Capital Identity System
// Deputy (Acting/Proxy) entity

using System;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 職務代理人實體
    /// </summary>
    public class Deputy
    {
        public Guid Id { get; set; }

        /// <summary>
        /// 租戶 ID
        /// </summary>
        public Guid TenantId { get; set; }

        /// <summary>
        /// 被代理人 (主管/原職位持有者) UserId
        /// </summary>
        public string PrincipalUserId { get; set; }

        /// <summary>
        /// 代理人 UserId
        /// </summary>
        public string DeputyUserId { get; set; }

        /// <summary>
        /// 代理類型 (Full=完全代理, Partial=部分代理)
        /// </summary>
        public string DeputyType { get; set; } = "Full";

        /// <summary>
        /// 代理原因
        /// </summary>
        public string Reason { get; set; }

        /// <summary>
        /// 代理開始時間
        /// </summary>
        public DateTime StartDate { get; set; }

        /// <summary>
        /// 代理結束時間 (NULL=無限期)
        /// </summary>
        public DateTime? EndDate { get; set; }

        /// <summary>
        /// 是否繼承被代理人的權限
        /// </summary>
        public bool InheritPermissions { get; set; } = true;

        /// <summary>
        /// 特定權限 (當 DeputyType=Partial 時使用, JSON)
        /// </summary>
        public string SpecificPermissions { get; set; }

        /// <summary>
        /// 是否啟用
        /// </summary>
        public bool IsEnabled { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// 建立者 UserId
        /// </summary>
        public string CreatedBy { get; set; }

        // Navigation
        public virtual Tenant Tenant { get; set; }
    }
}
