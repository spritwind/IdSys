// UC Capital - User Permission Entity
// 使用者權限實體

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 使用者對資源的直接授權
    /// </summary>
    [Table("KeycloakUserPermission")]
    public class KeycloakUserPermission
    {
        /// <summary>
        /// 使用者 ID
        /// </summary>
        [Key]
        [Column("userId", Order = 0)]
        [StringLength(50)]
        public string UserId { get; set; }

        /// <summary>
        /// 客戶端 ID（應用程式）
        /// </summary>
        [Key]
        [Column("clientId", Order = 1)]
        [StringLength(50)]
        public string ClientId { get; set; }

        /// <summary>
        /// 資源 ID
        /// </summary>
        [Key]
        [Column("resourceId", Order = 2)]
        [StringLength(200)]
        public string ResourceId { get; set; }

        /// <summary>
        /// 使用者名稱（冗餘欄位）
        /// </summary>
        [Column("username")]
        [StringLength(200)]
        public string Username { get; set; }

        /// <summary>
        /// 客戶端名稱（冗餘欄位）
        /// </summary>
        [Column("clientName")]
        [StringLength(100)]
        public string ClientName { get; set; }

        /// <summary>
        /// 資源名稱（冗餘欄位）
        /// </summary>
        [Column("resourceName")]
        [StringLength(500)]
        public string ResourceName { get; set; }

        /// <summary>
        /// 授權的範圍（以逗號分隔，如 "read,write,delete"）
        /// </summary>
        [Column("scopes")]
        [StringLength(500)]
        public string Scopes { get; set; }

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
