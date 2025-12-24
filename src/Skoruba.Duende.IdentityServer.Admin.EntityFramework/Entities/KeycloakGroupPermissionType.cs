// UC Capital - Group Permission Type Entity
// 群組權限類型實體

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 群組權限類型（定義權限的類型、邏輯和決策策略）
    /// </summary>
    [Table("KeycloakGroupPermissionType")]
    public class KeycloakGroupPermissionType
    {
        /// <summary>
        /// 權限類型 ID
        /// </summary>
        [Key]
        [Column("id")]
        [StringLength(50)]
        public string Id { get; set; }

        /// <summary>
        /// 權限名稱
        /// </summary>
        [Column("name")]
        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        /// <summary>
        /// 描述
        /// </summary>
        [Column("description")]
        [StringLength(500)]
        public string Description { get; set; }

        /// <summary>
        /// 類型（resource, scope）
        /// </summary>
        [Column("type")]
        [StringLength(50)]
        public string Type { get; set; }

        /// <summary>
        /// 邏輯（POSITIVE, NEGATIVE）
        /// </summary>
        [Column("logic")]
        [StringLength(50)]
        public string Logic { get; set; }

        /// <summary>
        /// 決策策略（AFFIRMATIVE, UNANIMOUS, CONSENSUS）
        /// </summary>
        [Column("decisionStrategy")]
        [StringLength(50)]
        public string DecisionStrategy { get; set; }

        /// <summary>
        /// 資源類型
        /// </summary>
        [Column("resourceType")]
        [StringLength(200)]
        public string ResourceType { get; set; }

        /// <summary>
        /// 是否啟用
        /// </summary>
        [Column("ENABLED")]
        public bool? Enabled { get; set; } = true;

        /// <summary>
        /// 建立時間
        /// </summary>
        [Column("INSDATE")]
        public DateTime? InsDate { get; set; }

        /// <summary>
        /// 更新時間
        /// </summary>
        [Column("UPDDATE")]
        public DateTime? UpdDate { get; set; }
    }
}
