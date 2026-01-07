// UC Capital Identity System
// Group Member entity

using System;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 群組成員實體
    /// </summary>
    public class GroupMember
    {
        public Guid Id { get; set; }

        /// <summary>
        /// 群組 ID
        /// </summary>
        public Guid GroupId { get; set; }

        /// <summary>
        /// 使用者 ID
        /// </summary>
        public string UserId { get; set; }

        /// <summary>
        /// 成員角色 (Member, Admin, Owner)
        /// </summary>
        public string MemberRole { get; set; } = "Member";

        /// <summary>
        /// 是否繼承群組權限
        /// </summary>
        public bool InheritGroupPermissions { get; set; } = true;

        /// <summary>
        /// 加入時間
        /// </summary>
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual Group Group { get; set; }
    }
}
