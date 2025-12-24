// UC Capital - Permission Resource Entity
// 權限資源實體

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 可控管的資源（頁面、API、功能）
    /// </summary>
    [Table("KeycloakResource")]
    public class KeycloakResource
    {
        /// <summary>
        /// 資源 ID
        /// </summary>
        [Key]
        [Column("id", Order = 0)]
        [StringLength(50)]
        public string Id { get; set; }

        /// <summary>
        /// 客戶端 ID（應用程式）
        /// </summary>
        [Key]
        [Column("clientId", Order = 1)]
        [StringLength(50)]
        public string ClientId { get; set; }

        /// <summary>
        /// 資源名稱
        /// </summary>
        [Column("name")]
        [StringLength(200)]
        public string Name { get; set; }

        /// <summary>
        /// 顯示名稱
        /// </summary>
        [Column("displayName")]
        [StringLength(200)]
        public string DisplayName { get; set; }

        /// <summary>
        /// 資源類型（如 page, api, feature）
        /// </summary>
        [Column("type")]
        [StringLength(200)]
        public string Type { get; set; }

        /// <summary>
        /// 資源 URI
        /// </summary>
        [Column("uri")]
        [StringLength(500)]
        public string Uri { get; set; }

        /// <summary>
        /// 客戶端名稱（冗餘欄位）
        /// </summary>
        [Column("clientName")]
        [StringLength(100)]
        public string ClientName { get; set; }

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
