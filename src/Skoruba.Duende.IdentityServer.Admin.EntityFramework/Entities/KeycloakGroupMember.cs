// UC Capital - Keycloak Group Member Entity
// 群組成員實體

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 群組成員表
    /// 記錄群組的成員（從群組角度）
    /// </summary>
    [Table("KeycloakGroupMember")]
    public class KeycloakGroupMember
    {
        [Column("groupId")]
        [StringLength(50)]
        public string GroupId { get; set; }

        [Column("userId")]
        [StringLength(50)]
        public string UserId { get; set; }

        [Column("username")]
        [StringLength(200)]
        public string Username { get; set; }

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
