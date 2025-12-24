// UC Capital - Resource Scope Association Entity
// 資源與權限範圍關聯實體

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 資源與權限範圍的對應關係
    /// </summary>
    [Table("KeycloakResourceScope")]
    public class KeycloakResourceScope
    {
        /// <summary>
        /// 資源 ID
        /// </summary>
        [Key]
        [Column("resourceId", Order = 0)]
        [StringLength(50)]
        public string ResourceId { get; set; }

        /// <summary>
        /// 範圍 ID
        /// </summary>
        [Key]
        [Column("scopeId", Order = 1)]
        [StringLength(50)]
        public string ScopeId { get; set; }

        /// <summary>
        /// 客戶端 ID
        /// </summary>
        [Key]
        [Column("clientId", Order = 2)]
        [StringLength(50)]
        public string ClientId { get; set; }

        /// <summary>
        /// 資源名稱（冗餘欄位）
        /// </summary>
        [Column("resourceName")]
        [StringLength(200)]
        public string ResourceName { get; set; }

        /// <summary>
        /// 範圍名稱（冗餘欄位）
        /// </summary>
        [Column("scopeName")]
        [StringLength(100)]
        public string ScopeName { get; set; }

        /// <summary>
        /// 建立時間
        /// </summary>
        [Column("INSDATE")]
        public DateTime? InsDate { get; set; }
    }
}
