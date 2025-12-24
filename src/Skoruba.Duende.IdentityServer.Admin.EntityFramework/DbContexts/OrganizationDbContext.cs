// UC Capital - Organization DbContext
// 組織架構資料庫上下文

using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts
{
    public class OrganizationDbContext : DbContext
    {
        public OrganizationDbContext(DbContextOptions<OrganizationDbContext> options) : base(options)
        {
        }

        // 群組（組織架構）
        public DbSet<KeycloakGroup> KeycloakGroups { get; set; }

        // 使用者
        public DbSet<KeycloakUser> KeycloakUsers { get; set; }

        // 使用者與群組關聯（從使用者角度）
        public DbSet<KeycloakUserGroup> KeycloakUserGroups { get; set; }

        // 群組成員（從群組角度）
        public DbSet<KeycloakGroupMember> KeycloakGroupMembers { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // KeycloakGroup 設定
            builder.Entity<KeycloakGroup>(entity =>
            {
                entity.ToTable("KeycloakGroup");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(255);
                entity.Property(e => e.Path).HasMaxLength(1000);
                entity.Property(e => e.DeptCode).HasMaxLength(50);
                entity.Property(e => e.Manager).HasMaxLength(100);
            });

            // KeycloakUser 設定
            builder.Entity<KeycloakUser>(entity =>
            {
                entity.ToTable("KeycloakUser");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Username);
                entity.HasIndex(e => e.Email);
                entity.HasIndex(e => e.Enabled);
            });

            // KeycloakUserGroup 設定（複合主鍵）
            builder.Entity<KeycloakUserGroup>(entity =>
            {
                entity.ToTable("KeycloakUserGroup");
                entity.HasKey(e => new { e.UserId, e.GroupId });
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.GroupId);
            });

            // KeycloakGroupMember 設定（複合主鍵）
            builder.Entity<KeycloakGroupMember>(entity =>
            {
                entity.ToTable("KeycloakGroupMember");
                entity.HasKey(e => new { e.GroupId, e.UserId });
                entity.HasIndex(e => e.GroupId);
                entity.HasIndex(e => e.UserId);
            });
        }
    }
}
