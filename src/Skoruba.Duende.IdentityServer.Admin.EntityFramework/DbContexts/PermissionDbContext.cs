// UC Capital - Permission DbContext
// 權限控管資料庫上下文

using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts
{
    public class PermissionDbContext : DbContext
    {
        public PermissionDbContext(DbContextOptions<PermissionDbContext> options) : base(options)
        {
        }

        // 權限範圍
        public DbSet<KeycloakScope> KeycloakScopes { get; set; }

        // 資源
        public DbSet<KeycloakResource> KeycloakResources { get; set; }

        // 資源-範圍關聯
        public DbSet<KeycloakResourceScope> KeycloakResourceScopes { get; set; }

        // 使用者權限
        public DbSet<KeycloakUserPermission> KeycloakUserPermissions { get; set; }

        // 群組權限
        public DbSet<KeycloakGroupPermission> KeycloakGroupPermissions { get; set; }

        // 群組權限類型
        public DbSet<KeycloakGroupPermissionType> KeycloakGroupPermissionTypes { get; set; }

        // 使用者（用於查詢關聯）
        public DbSet<KeycloakUser> KeycloakUsers { get; set; }

        // 群組（用於查詢關聯）
        public DbSet<KeycloakGroup> KeycloakGroups { get; set; }

        // 使用者-群組關聯（用於查詢繼承權限）
        public DbSet<KeycloakUserGroup> KeycloakUserGroups { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // KeycloakScope 設定（複合主鍵）
            builder.Entity<KeycloakScope>(entity =>
            {
                entity.ToTable("KeycloakScope");
                entity.HasKey(e => new { e.Id, e.ClientId });
                entity.HasIndex(e => e.ClientId);
                entity.HasIndex(e => e.Name);
            });

            // KeycloakResource 設定（複合主鍵）
            builder.Entity<KeycloakResource>(entity =>
            {
                entity.ToTable("KeycloakResource");
                entity.HasKey(e => new { e.Id, e.ClientId });
                entity.HasIndex(e => e.ClientId);
                entity.HasIndex(e => e.Type);
            });

            // KeycloakResourceScope 設定（複合主鍵）
            builder.Entity<KeycloakResourceScope>(entity =>
            {
                entity.ToTable("KeycloakResourceScope");
                entity.HasKey(e => new { e.ResourceId, e.ScopeId, e.ClientId });
                entity.HasIndex(e => e.ResourceId);
                entity.HasIndex(e => e.ScopeId);
                entity.HasIndex(e => e.ClientId);
            });

            // KeycloakUserPermission 設定（複合主鍵）
            builder.Entity<KeycloakUserPermission>(entity =>
            {
                entity.ToTable("KeycloakUserPermission");
                entity.HasKey(e => new { e.UserId, e.ClientId, e.ResourceId });
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.ClientId);
                entity.HasIndex(e => e.ResourceId);
            });

            // KeycloakGroupPermission 設定（複合主鍵）
            builder.Entity<KeycloakGroupPermission>(entity =>
            {
                entity.ToTable("KeycloakGroupPermission");
                entity.HasKey(e => new { e.GroupId, e.ClientId, e.ResourceId });
                entity.HasIndex(e => e.GroupId);
                entity.HasIndex(e => e.ClientId);
                entity.HasIndex(e => e.ResourceId);
            });

            // KeycloakGroupPermissionType 設定
            builder.Entity<KeycloakGroupPermissionType>(entity =>
            {
                entity.ToTable("KeycloakGroupPermissionType");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Name);
                entity.HasIndex(e => e.Type);
            });

            // KeycloakUser 設定
            builder.Entity<KeycloakUser>(entity =>
            {
                entity.ToTable("KeycloakUser");
                entity.HasKey(e => e.Id);
            });

            // KeycloakGroup 設定
            builder.Entity<KeycloakGroup>(entity =>
            {
                entity.ToTable("KeycloakGroup");
                entity.HasKey(e => e.Id);
            });

            // KeycloakUserGroup 設定（複合主鍵）
            builder.Entity<KeycloakUserGroup>(entity =>
            {
                entity.ToTable("KeycloakUserGroup");
                entity.HasKey(e => new { e.UserId, e.GroupId });
            });
        }
    }
}
