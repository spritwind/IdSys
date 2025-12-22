// UC Capital - Keycloak User Group Entity
// 使用者與群組關聯實體

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 使用者與群組的關聯表
    /// 記錄使用者所屬的群組（從使用者角度）
    /// </summary>
    [Table("KeycloakUserGroup")]
    public class KeycloakUserGroup
    {
        [Column("userId")]
        [StringLength(50)]
        public string UserId { get; set; }

        [Column("groupId")]
        [StringLength(50)]
        public string GroupId { get; set; }

        [Column("groupName")]
        [StringLength(200)]
        public string GroupName { get; set; }

        [Column("groupPath")]
        [StringLength(500)]
        public string GroupPath { get; set; }

        [Column("INSDATE")]
        public DateTime? InsDate { get; set; }
    }
}
