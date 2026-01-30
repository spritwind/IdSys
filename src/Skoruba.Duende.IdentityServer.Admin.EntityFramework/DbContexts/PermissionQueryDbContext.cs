// UC Capital - Permission Query DbContext
// 權限查詢資料庫上下文
// 用於查詢 vw_user_permission_scopes View (新架構)

using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts
{
    /// <summary>
    /// 權限查詢資料庫上下文
    /// 用於查詢 PRS 權限資料
    /// </summary>
    public class PermissionQueryDbContext : DbContext
    {
        public PermissionQueryDbContext(DbContextOptions<PermissionQueryDbContext> options) : base(options)
        {
        }

        /// <summary>
        /// 使用者權限 View (唯讀)
        /// </summary>
        public DbSet<UserPermissionView> UserPermissions { get; set; }

        /// <summary>
        /// Users 資料表 (用於檢查使用者是否存在)
        /// </summary>
        public DbSet<PermissionQueryUser> Users { get; set; }

        /// <summary>
        /// 權限檢查記錄表
        /// </summary>
        public DbSet<PermissionCheckLog> PermissionCheckLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // 設定 Users 資料表 (只用於查詢)
            builder.Entity<PermissionQueryUser>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(450);
                entity.Property(e => e.UserName).HasMaxLength(256);
                entity.Property(e => e.DisplayName).HasMaxLength(256);
                entity.Property(e => e.FirstName).HasMaxLength(100);
                entity.Property(e => e.Email).HasMaxLength(256);
            });

            // 設定 vw_user_permission_scopes View (唯讀)
            // 新架構: Users -> Permissions -> PermissionResources -> PermissionScopes
            builder.Entity<UserPermissionView>(entity =>
            {
                entity.ToView("vw_user_permission_scopes");
                entity.HasNoKey(); // View 沒有主鍵

                entity.Property(e => e.SubjectId).HasColumnName("SubjectId");
                entity.Property(e => e.UserName).HasColumnName("UserName");
                entity.Property(e => e.UserName_Display).HasColumnName("UserName_Display");
                entity.Property(e => e.UserEnglishName).HasColumnName("UserEnglishName");
                entity.Property(e => e.Email).HasColumnName("Email");
                entity.Property(e => e.SystemId).HasColumnName("SystemId");
                entity.Property(e => e.SystemName).HasColumnName("SystemName");
                entity.Property(e => e.ResourceId).HasColumnName("ResourceId");
                entity.Property(e => e.ResourceCode).HasColumnName("ResourceCode");
                entity.Property(e => e.ResourceName).HasColumnName("ResourceName");
                entity.Property(e => e.ResourceType).HasColumnName("ResourceType");
                entity.Property(e => e.PermissionId).HasColumnName("PermissionId");
                entity.Property(e => e.Scopes).HasColumnName("Scopes");
                entity.Property(e => e.PermissionCode).HasColumnName("PermissionCode");
                entity.Property(e => e.PermissionName).HasColumnName("PermissionName");
                entity.Property(e => e.IsEnabled).HasColumnName("IsEnabled");
                entity.Property(e => e.GrantedAt).HasColumnName("GrantedAt");
                entity.Property(e => e.ExpiresAt).HasColumnName("ExpiresAt");
            });

            // 設定 PermissionCheckLogs 資料表
            builder.Entity<PermissionCheckLog>(entity =>
            {
                entity.ToTable("PermissionCheckLogs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ClientId).IsRequired().HasMaxLength(200);
                entity.Property(e => e.SubjectId).HasMaxLength(450);
                entity.Property(e => e.UserName).HasMaxLength(256);
                entity.Property(e => e.Resource).IsRequired().HasMaxLength(500);
                entity.Property(e => e.RequestedScopes).IsRequired().HasMaxLength(200);
                entity.Property(e => e.GrantedScopes).HasMaxLength(200);
                entity.Property(e => e.ErrorCode).HasMaxLength(100);
                entity.Property(e => e.ErrorMessage).HasMaxLength(1000);
                entity.Property(e => e.IpAddress).HasMaxLength(50);
                entity.Property(e => e.UserAgent).HasMaxLength(500);

                // 索引
                entity.HasIndex(e => e.CheckedAt);
                entity.HasIndex(e => e.SubjectId);
                entity.HasIndex(e => e.ClientId);
                entity.HasIndex(e => new { e.SubjectId, e.Resource });
            });
        }
    }

    /// <summary>
    /// 簡化的 User 實體 (僅供權限查詢使用)
    /// </summary>
    public class PermissionQueryUser
    {
        public string Id { get; set; } = string.Empty;
        public string? UserName { get; set; }
        public string? DisplayName { get; set; }
        public string? FirstName { get; set; }
        public string? Email { get; set; }
    }
}
