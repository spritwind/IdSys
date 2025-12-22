// UC Capital - Keycloak User Entity
// Keycloak 使用者實體

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    [Table("KeycloakUser")]
    public class KeycloakUser
    {
        [Key]
        [Column("id")]
        [StringLength(50)]
        public string Id { get; set; }

        [Column("username")]
        [StringLength(200)]
        public string Username { get; set; }

        [Column("firstName")]
        [StringLength(100)]
        public string FirstName { get; set; }

        [Column("lastName")]
        [StringLength(100)]
        public string LastName { get; set; }

        [Column("email")]
        [StringLength(200)]
        public string Email { get; set; }

        [Column("emailVerified")]
        public bool? EmailVerified { get; set; }

        [Column("isEnabled")]
        public bool? IsEnabled { get; set; }

        [Column("createdTime")]
        public DateTime? CreatedTime { get; set; }

        [Column("origin")]
        [StringLength(100)]
        public string Origin { get; set; }

        [Column("federationLink")]
        [StringLength(100)]
        public string FederationLink { get; set; }

        [Column("LDAP_ENTRY_DN")]
        [StringLength(500)]
        public string LdapEntryDn { get; set; }

        [Column("LDAP_ID")]
        [StringLength(100)]
        public string LdapId { get; set; }

        [Column("ENABLED")]
        public bool? Enabled { get; set; } = true;

        [Column("INSDATE")]
        public DateTime? InsDate { get; set; }

        [Column("UPDDATE")]
        public DateTime? UpdDate { get; set; }
    }
}
