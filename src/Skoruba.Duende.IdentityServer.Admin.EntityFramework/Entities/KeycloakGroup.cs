// UC Capital - Organization Structure Entity
// 組織架構實體

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    [Table("KeycloakGroup")]
    public class KeycloakGroup
    {
        [Key]
        [Column("id")]
        [StringLength(50)]
        public string Id { get; set; }

        [Column("name")]
        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        [Column("path")]
        [Required]
        [StringLength(500)]
        public string Path { get; set; }

        [Column("parentId")]
        [StringLength(50)]
        public string ParentId { get; set; }

        [Column("description")]
        [StringLength(500)]
        public string Description { get; set; }

        [Column("subGroupCount")]
        public int? SubGroupCount { get; set; } = 0;

        [Column("depth")]
        public int? Depth { get; set; } = 0;

        [Column("dept_code")]
        [StringLength(50)]
        public string DeptCode { get; set; }

        [Column("dept_ename")]
        [StringLength(100)]
        public string DeptEName { get; set; }

        [Column("dept_zhname")]
        [StringLength(100)]
        public string DeptZhName { get; set; }

        [Column("manager")]
        [StringLength(100)]
        public string Manager { get; set; }

        [Column("ENABLED")]
        public bool? Enabled { get; set; } = true;

        [Column("INSDATE")]
        public DateTime? InsDate { get; set; }

        [Column("UPDDATE")]
        public DateTime? UpdDate { get; set; }
    }
}
