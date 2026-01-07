// UC Capital - User Info Entity (Read-Only)
// 使用者資訊實體（唯讀，用於 JOIN 查詢）

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 使用者資訊實體（唯讀）
    /// 映射到 Users 表，僅用於 OrganizationMembers 的 JOIN 查詢
    /// 不應用於寫入操作，寫入請使用 AdminIdentityDbContext
    /// </summary>
    [Table("Users")]
    public class UserInfo
    {
        [Key]
        [Column("Id")]
        [StringLength(450)]
        public string Id { get; set; }

        [Column("UserName")]
        [StringLength(256)]
        public string UserName { get; set; }

        [Column("Email")]
        [StringLength(256)]
        public string Email { get; set; }

        [Column("DisplayName")]
        [StringLength(200)]
        public string DisplayName { get; set; }

        [Column("FirstName")]
        [StringLength(100)]
        public string FirstName { get; set; }

        [Column("LastName")]
        [StringLength(100)]
        public string LastName { get; set; }

        [Column("IsActive")]
        public bool IsActive { get; set; }
    }
}
