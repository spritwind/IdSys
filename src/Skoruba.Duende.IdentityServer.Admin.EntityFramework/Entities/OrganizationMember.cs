// UC Capital Identity System
// Organization Member entity

using System;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 組織成員實體
    /// </summary>
    public class OrganizationMember
    {
        public Guid Id { get; set; }

        /// <summary>
        /// 組織 ID
        /// </summary>
        public Guid OrganizationId { get; set; }

        /// <summary>
        /// 使用者 ID
        /// </summary>
        public string UserId { get; set; }

        /// <summary>
        /// 職位 ID
        /// </summary>
        public Guid? PositionId { get; set; }

        /// <summary>
        /// 成員角色 (Member, Manager, Admin)
        /// </summary>
        public string MemberRole { get; set; } = "Member";

        /// <summary>
        /// 是否為主要組織
        /// </summary>
        public bool IsPrimary { get; set; }

        /// <summary>
        /// 加入時間
        /// </summary>
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual Organization Organization { get; set; }
        public virtual Position Position { get; set; }
    }
}
