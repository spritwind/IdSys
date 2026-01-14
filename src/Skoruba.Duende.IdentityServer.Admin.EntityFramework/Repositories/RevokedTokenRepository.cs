// UC Capital - Revoked Token Repository Implementation
// 撤銷 Token Repository 實作

using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories
{
    /// <summary>
    /// 撤銷 Token Repository 實作
    /// </summary>
    public class RevokedTokenRepository : IRevokedTokenRepository
    {
        private readonly TokenManagementDbContext _context;

        public RevokedTokenRepository(TokenManagementDbContext context)
        {
            _context = context;
        }

        /// <inheritdoc/>
        public async Task<bool> IsRevokedAsync(string jti)
        {
            if (string.IsNullOrWhiteSpace(jti))
                return false;

            var jtiHash = ComputeHash(jti);
            return await _context.RevokedTokens
                .AnyAsync(x => x.Jti == jti || x.JtiHash == jtiHash);
        }

        /// <inheritdoc/>
        public async Task<RevokedToken> RevokeAsync(RevokedToken revokedToken)
        {
            if (string.IsNullOrWhiteSpace(revokedToken.Jti))
                throw new ArgumentException("JTI is required", nameof(revokedToken));

            // 檢查是否已撤銷
            var existing = await GetByJtiAsync(revokedToken.Jti);
            if (existing != null)
                return existing;

            // 計算 JTI Hash
            revokedToken.JtiHash = ComputeHash(revokedToken.Jti);
            revokedToken.RevokedAt = DateTime.UtcNow;

            await _context.RevokedTokens.AddAsync(revokedToken);
            await _context.SaveChangesAsync();

            return revokedToken;
        }

        /// <inheritdoc/>
        public async Task<RevokedToken?> GetByJtiAsync(string jti)
        {
            if (string.IsNullOrWhiteSpace(jti))
                return null;

            return await _context.RevokedTokens
                .FirstOrDefaultAsync(x => x.Jti == jti);
        }

        /// <inheritdoc/>
        public async Task<(IEnumerable<RevokedToken> Items, int TotalCount)> GetAllAsync(int page = 1, int pageSize = 20)
        {
            var query = _context.RevokedTokens.AsQueryable();

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.RevokedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        /// <inheritdoc/>
        public async Task<(IEnumerable<RevokedToken> Items, int TotalCount)> GetByClientIdAsync(string clientId, int page = 1, int pageSize = 20)
        {
            var query = _context.RevokedTokens
                .Where(x => x.ClientId == clientId);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.RevokedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        /// <inheritdoc/>
        public async Task<(IEnumerable<RevokedToken> Items, int TotalCount)> GetBySubjectIdAsync(string subjectId, int page = 1, int pageSize = 20)
        {
            var query = _context.RevokedTokens
                .Where(x => x.SubjectId == subjectId);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.RevokedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        /// <inheritdoc/>
        public async Task<int> CleanupExpiredAsync(DateTime before)
        {
            var expiredTokens = await _context.RevokedTokens
                .Where(x => x.ExpirationTime.HasValue && x.ExpirationTime < before)
                .ToListAsync();

            if (expiredTokens.Count == 0)
                return 0;

            _context.RevokedTokens.RemoveRange(expiredTokens);
            return await _context.SaveChangesAsync();
        }

        /// <inheritdoc/>
        public async Task<bool> UnrevokeAsync(string jti)
        {
            var token = await GetByJtiAsync(jti);
            if (token == null)
                return false;

            _context.RevokedTokens.Remove(token);
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// 計算 JTI 的 SHA256 Hash
        /// </summary>
        private static string ComputeHash(string input)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }
    }
}
