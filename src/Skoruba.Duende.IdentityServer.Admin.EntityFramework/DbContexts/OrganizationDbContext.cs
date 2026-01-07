// UC Capital - Organization DbContext
// 組織架構資料庫上下文
// 重構：從 Keycloak 表遷移至 Organizations 表

using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts
{
    public class OrganizationDbContext : DbContext
    {
        public OrganizationDbContext(DbContextOptions<OrganizationDbContext> options) : base(options)
        {
        }

        #region 新架構實體（Organizations 表）

        /// <summary>
        /// 組織架構（新架構）
        /// </summary>
        public DbSet<Organization> Organizations { get; set; }

        /// <summary>
        /// 組織成員（新架構）
        /// </summary>
        public DbSet<OrganizationMember> OrganizationMembers { get; set; }

        /// <summary>
        /// 使用者資訊（唯讀，用於 JOIN 查詢）
        /// </summary>
        public DbSet<UserInfo> Users { get; set; }

        #endregion

        #region 舊架構實體（Keycloak 表 - 已棄用，保留供相容性）

        // 群組（組織架構）- 已棄用
        public DbSet<KeycloakGroup> KeycloakGroups { get; set; }

        // 使用者 - 已棄用
        public DbSet<KeycloakUser> KeycloakUsers { get; set; }

        // 使用者與群組關聯（從使用者角度）- 已棄用
        public DbSet<KeycloakUserGroup> KeycloakUserGroups { get; set; }

        // 群組成員（從群組角度）- 已棄用
        public DbSet<KeycloakGroupMember> KeycloakGroupMembers { get; set; }

        #endregion

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            #region 新架構配置（Organizations）

            // Organization 設定
            builder.Entity<Organization>(entity =>
            {
                entity.ToTable("Organizations");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Code).HasMaxLength(50);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.EnglishName).HasMaxLength(200);
                entity.Property(e => e.ChineseName).HasMaxLength(200);
                entity.Property(e => e.Path).IsRequired().HasMaxLength(500);
                entity.Property(e => e.ManagerUserId).HasMaxLength(450);
                entity.Property(e => e.Description).HasMaxLength(500);

                // 索引
                entity.HasIndex(e => e.TenantId);
                entity.HasIndex(e => e.ParentId);
                entity.HasIndex(e => e.Path);
                entity.HasIndex(e => e.IsEnabled);

                // 自我參照關聯（階層結構）
                entity.HasOne(e => e.Parent)
                    .WithMany(e => e.Children)
                    .HasForeignKey(e => e.ParentId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // OrganizationMember 設定
            builder.Entity<OrganizationMember>(entity =>
            {
                entity.ToTable("OrganizationMembers");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.UserId).IsRequired().HasMaxLength(450);
                entity.Property(e => e.MemberRole).IsRequired().HasMaxLength(50);

                // 索引
                entity.HasIndex(e => e.OrganizationId);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => new { e.OrganizationId, e.UserId }).IsUnique();

                // 關聯
                entity.HasOne(e => e.Organization)
                    .WithMany(e => e.Members)
                    .HasForeignKey(e => e.OrganizationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // UserInfo 設定（唯讀，用於 JOIN）
            builder.Entity<UserInfo>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.UserName).HasMaxLength(256);
                entity.Property(e => e.Email).HasMaxLength(256);
                entity.Property(e => e.DisplayName).HasMaxLength(200);
                entity.Property(e => e.FirstName).HasMaxLength(100);
                entity.Property(e => e.LastName).HasMaxLength(100);
            });

            #endregion

            #region 舊架構配置（Keycloak - 保留供相容性）

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

            #endregion
        }
    }
}
