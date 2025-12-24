// UC Capital - Group Permission Entity
// 群組權限實體（新增功能：群組層級權限，成員自動繼承）

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 群組對資源的授權（群組成員自動繼承此權限）
    /// </summary>
    [Table("KeycloakGroupPermission")]
    public class KeycloakGroupPermission
    {
        /// <summary>
        /// 群組 ID
        /// </summary>
        [Key]
        [Column("groupId", Order = 0)]
        [StringLength(50)]
        public string GroupId { get; set; }

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
        /// 群組名稱（冗餘欄位）
        /// </summary>
        [Column("groupName")]
        [StringLength(200)]
        public string GroupName { get; set; }

        /// <summary>
        /// 群組路徑（冗餘欄位）
        /// </summary>
        [Column("groupPath")]
        [StringLength(500)]
        public string GroupPath { get; set; }

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
        /// 是否繼承給子群組
        /// </summary>
        [Column("inheritToChildren")]
        public bool? InheritToChildren { get; set; } = true;

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
