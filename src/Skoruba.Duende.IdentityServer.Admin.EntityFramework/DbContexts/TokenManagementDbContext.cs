// UC Capital - Token Management DbContext
// Token 管理資料庫上下文
// 用於 JWT Token 撤銷清單管理

using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts
{
    /// <summary>
    /// Token 管理資料庫上下文
    /// 用於管理 JWT Token 撤銷清單
    /// </summary>
    public class TokenManagementDbContext : DbContext
    {
        public TokenManagementDbContext(DbContextOptions<TokenManagementDbContext> options) : base(options)
        {
        }

        /// <summary>
        /// 撤銷的 Token 清單
        /// </summary>
        public DbSet<RevokedToken> RevokedTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<RevokedToken>(entity =>
            {
                entity.ToTable("RevokedTokens");
                entity.HasKey(e => e.Id);

                // JTI 索引（用於快速查詢撤銷狀態）
                entity.HasIndex(e => e.Jti).IsUnique();
                entity.HasIndex(e => e.JtiHash);

                // 過期時間索引（用於清理過期記錄）
                entity.HasIndex(e => e.ExpirationTime);

                // ClientId 索引（用於查詢特定客戶端的撤銷記錄）
                entity.HasIndex(e => e.ClientId);

                // SubjectId 索引（用於查詢特定使用者的撤銷記錄）
                entity.HasIndex(e => e.SubjectId);
            });
        }
    }
}
