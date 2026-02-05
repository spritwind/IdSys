// UC Capital - Token Management Service Implementation
// Token 管理服務實作

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Duende.IdentityServer.EntityFramework.Entities;
using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.TokenManagement;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.DbContexts;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services
{
    /// <summary>
    /// Token 管理服務實作
    /// </summary>
    public class TokenManagementService : ITokenManagementService
    {
        private readonly IAdminPersistedGrantDbContext _persistedGrantDbContext;
        private readonly IRevokedTokenRepository _revokedTokenRepository;
        private readonly IAdminConfigurationDbContext _configurationDbContext;
        private readonly AdminIdentityDbContext _identityDbContext;

        public TokenManagementService(
            IAdminPersistedGrantDbContext persistedGrantDbContext,
            IRevokedTokenRepository revokedTokenRepository,
            IAdminConfigurationDbContext configurationDbContext,
            AdminIdentityDbContext identityDbContext)
        {
            _persistedGrantDbContext = persistedGrantDbContext;
            _revokedTokenRepository = revokedTokenRepository;
            _configurationDbContext = configurationDbContext;
            _identityDbContext = identityDbContext;
        }

        /// <inheritdoc/>
        public async Task<TokenListResponse<ActiveTokenDto>> GetActiveTokensAsync(int page = 1, int pageSize = 20, string? search = null)
        {
            var query = _persistedGrantDbContext.PersistedGrants.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                // 先查詢符合搜尋條件的使用者 ID（支援以名稱/Email 搜尋）
                var matchingUserIds = await _identityDbContext.Users
                    .Where(u => u.UserName!.Contains(search) || u.Email!.Contains(search))
                    .Select(u => u.Id)
                    .ToListAsync();

                query = query.Where(x =>
                    x.SubjectId!.Contains(search) ||
                    x.ClientId.Contains(search) ||
                    x.Type.Contains(search) ||
                    matchingUserIds.Contains(x.SubjectId!));
            }

            var totalCount = await query.CountAsync();
            var grants = await query
                .OrderByDescending(x => x.CreationTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = new List<ActiveTokenDto>();
            var now = DateTime.UtcNow;

            // 批次查詢使用者資訊
            var subjectIds = grants.Select(g => g.SubjectId).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
            var userLookup = await GetUserInfoByIdsAsync(subjectIds!);

            foreach (var grant in grants)
            {
                var dto = await MapToActiveTokenDto(grant, now);
                if (!string.IsNullOrEmpty(grant.SubjectId) && userLookup.TryGetValue(grant.SubjectId, out var userInfo))
                {
                    dto.UserName = userInfo.UserName;
                    dto.Email = userInfo.Email;
                }
                items.Add(dto);
            }

            return new TokenListResponse<ActiveTokenDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        /// <inheritdoc/>
        public async Task<TokenListResponse<ActiveTokenDto>> GetUserActiveTokensAsync(string subjectId, int page = 1, int pageSize = 20)
        {
            var query = _persistedGrantDbContext.PersistedGrants
                .Where(x => x.SubjectId == subjectId);

            var totalCount = await query.CountAsync();
            var grants = await query
                .OrderByDescending(x => x.CreationTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = new List<ActiveTokenDto>();
            var now = DateTime.UtcNow;

            var userLookup = await GetUserInfoByIdsAsync(new[] { subjectId });

            foreach (var grant in grants)
            {
                var dto = await MapToActiveTokenDto(grant, now);
                if (userLookup.TryGetValue(subjectId, out var userInfo))
                {
                    dto.UserName = userInfo.UserName;
                    dto.Email = userInfo.Email;
                }
                items.Add(dto);
            }

            return new TokenListResponse<ActiveTokenDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        /// <inheritdoc/>
        public async Task<TokenListResponse<ActiveTokenDto>> GetClientActiveTokensAsync(string clientId, int page = 1, int pageSize = 20)
        {
            var query = _persistedGrantDbContext.PersistedGrants
                .Where(x => x.ClientId == clientId);

            var totalCount = await query.CountAsync();
            var grants = await query
                .OrderByDescending(x => x.CreationTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = new List<ActiveTokenDto>();
            var now = DateTime.UtcNow;

            var subjectIds = grants.Select(g => g.SubjectId).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
            var userLookup = await GetUserInfoByIdsAsync(subjectIds!);

            foreach (var grant in grants)
            {
                var dto = await MapToActiveTokenDto(grant, now);
                if (!string.IsNullOrEmpty(grant.SubjectId) && userLookup.TryGetValue(grant.SubjectId, out var userInfo))
                {
                    dto.UserName = userInfo.UserName;
                    dto.Email = userInfo.Email;
                }
                items.Add(dto);
            }

            return new TokenListResponse<ActiveTokenDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        /// <inheritdoc/>
        public async Task<TokenListResponse<RevokedTokenDto>> GetRevokedTokensAsync(int page = 1, int pageSize = 20)
        {
            var (items, totalCount) = await _revokedTokenRepository.GetAllAsync(page, pageSize);

            // 批次查詢使用者與客戶端資訊
            var subjectIds = items.Select(x => x.SubjectId).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
            var userLookup = await GetUserInfoByIdsAsync(subjectIds!);

            var clientIds = items.Select(x => x.ClientId).Distinct().ToList();
            var clientLookup = await _configurationDbContext.Clients
                .Where(c => clientIds.Contains(c.ClientId))
                .ToDictionaryAsync(c => c.ClientId, c => c.ClientName ?? c.ClientId);

            var dtos = items.Select(x =>
            {
                var dto = new RevokedTokenDto
                {
                    Id = x.Id,
                    Jti = x.Jti,
                    SubjectId = x.SubjectId,
                    ClientId = x.ClientId,
                    TokenType = x.TokenType,
                    ExpirationTime = x.ExpirationTime,
                    RevokedAt = x.RevokedAt,
                    Reason = x.Reason,
                    RevokedBy = x.RevokedBy
                };

                if (!string.IsNullOrEmpty(x.SubjectId) && userLookup.TryGetValue(x.SubjectId, out var userInfo))
                {
                    dto.UserName = userInfo.UserName;
                    dto.Email = userInfo.Email;
                }

                if (clientLookup.TryGetValue(x.ClientId, out var clientName))
                {
                    dto.ClientName = clientName;
                }

                return dto;
            });

            return new TokenListResponse<RevokedTokenDto>
            {
                Items = dtos,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        /// <inheritdoc/>
        public async Task<RevokedTokenDto> RevokeTokenAsync(RevokeTokenRequest request, string revokedBy)
        {
            var revokedToken = new RevokedToken
            {
                Jti = request.Jti,
                SubjectId = request.SubjectId,
                ClientId = request.ClientId,
                TokenType = request.TokenType,
                ExpirationTime = request.ExpirationTime,
                Reason = request.Reason,
                RevokedBy = revokedBy
            };

            var result = await _revokedTokenRepository.RevokeAsync(revokedToken);

            return new RevokedTokenDto
            {
                Id = result.Id,
                Jti = result.Jti,
                SubjectId = result.SubjectId,
                ClientId = result.ClientId,
                TokenType = result.TokenType,
                ExpirationTime = result.ExpirationTime,
                RevokedAt = result.RevokedAt,
                Reason = result.Reason,
                RevokedBy = result.RevokedBy
            };
        }

        /// <inheritdoc/>
        public async Task<bool> RevokeByGrantKeyAsync(string grantKey, string? reason, string revokedBy)
        {
            var grant = await _persistedGrantDbContext.PersistedGrants
                .FirstOrDefaultAsync(x => x.Key == grantKey);

            if (grant == null)
                return false;

            // 解析 Token 資料以取得 JTI
            var jti = ExtractJtiFromGrant(grant);
            if (string.IsNullOrEmpty(jti))
            {
                // 使用 Grant Key 作為 JTI
                jti = grantKey;
            }

            var revokedToken = new RevokedToken
            {
                Jti = jti,
                SubjectId = grant.SubjectId,
                ClientId = grant.ClientId,
                TokenType = grant.Type,
                ExpirationTime = grant.Expiration,
                Reason = reason,
                RevokedBy = revokedBy
            };

            await _revokedTokenRepository.RevokeAsync(revokedToken);

            // 同時從 PersistedGrants 中刪除
            _persistedGrantDbContext.PersistedGrants.Remove(grant);
            await _persistedGrantDbContext.SaveChangesAsync();

            return true;
        }

        /// <inheritdoc/>
        public async Task<int> RevokeUserTokensAsync(string subjectId, string? reason, string revokedBy)
        {
            var grants = await _persistedGrantDbContext.PersistedGrants
                .Where(x => x.SubjectId == subjectId)
                .ToListAsync();

            var count = 0;
            foreach (var grant in grants)
            {
                var jti = ExtractJtiFromGrant(grant) ?? grant.Key;

                var revokedToken = new RevokedToken
                {
                    Jti = jti,
                    SubjectId = grant.SubjectId,
                    ClientId = grant.ClientId,
                    TokenType = grant.Type,
                    ExpirationTime = grant.Expiration,
                    Reason = reason ?? "批量撤銷使用者 Token",
                    RevokedBy = revokedBy
                };

                await _revokedTokenRepository.RevokeAsync(revokedToken);
                count++;
            }

            // 從 PersistedGrants 中刪除
            _persistedGrantDbContext.PersistedGrants.RemoveRange(grants);
            await _persistedGrantDbContext.SaveChangesAsync();

            return count;
        }

        /// <inheritdoc/>
        public async Task<int> RevokeClientTokensAsync(string clientId, string? reason, string revokedBy)
        {
            var grants = await _persistedGrantDbContext.PersistedGrants
                .Where(x => x.ClientId == clientId)
                .ToListAsync();

            var count = 0;
            foreach (var grant in grants)
            {
                var jti = ExtractJtiFromGrant(grant) ?? grant.Key;

                var revokedToken = new RevokedToken
                {
                    Jti = jti,
                    SubjectId = grant.SubjectId,
                    ClientId = grant.ClientId,
                    TokenType = grant.Type,
                    ExpirationTime = grant.Expiration,
                    Reason = reason ?? "批量撤銷客戶端 Token",
                    RevokedBy = revokedBy
                };

                await _revokedTokenRepository.RevokeAsync(revokedToken);
                count++;
            }

            // 從 PersistedGrants 中刪除
            _persistedGrantDbContext.PersistedGrants.RemoveRange(grants);
            await _persistedGrantDbContext.SaveChangesAsync();

            return count;
        }

        /// <inheritdoc/>
        public async Task<bool> IsTokenRevokedAsync(string jti)
        {
            return await _revokedTokenRepository.IsRevokedAsync(jti);
        }

        /// <inheritdoc/>
        public async Task<bool> UnrevokeTokenAsync(string jti)
        {
            return await _revokedTokenRepository.UnrevokeAsync(jti);
        }

        /// <inheritdoc/>
        public async Task<TokenStatistics> GetStatisticsAsync()
        {
            var now = DateTime.UtcNow;
            var tomorrow = now.AddHours(24);

            var activeTokens = await _persistedGrantDbContext.PersistedGrants.CountAsync();
            var expiringSoon = await _persistedGrantDbContext.PersistedGrants
                .CountAsync(x => x.Expiration.HasValue && x.Expiration > now && x.Expiration <= tomorrow);
            var expiredTokens = await _persistedGrantDbContext.PersistedGrants
                .CountAsync(x => x.Expiration.HasValue && x.Expiration <= now);

            var (_, revokedCount) = await _revokedTokenRepository.GetAllAsync(1, 1);

            var activeUsers = await _persistedGrantDbContext.PersistedGrants
                .Where(x => x.SubjectId != null)
                .Select(x => x.SubjectId)
                .Distinct()
                .CountAsync();

            var activeClients = await _persistedGrantDbContext.PersistedGrants
                .Select(x => x.ClientId)
                .Distinct()
                .CountAsync();

            return new TokenStatistics
            {
                ActiveTokens = activeTokens,
                RevokedTokens = revokedCount,
                ExpiringSoon = expiringSoon,
                ExpiredTokens = expiredTokens,
                ActiveUsers = activeUsers,
                ActiveClients = activeClients
            };
        }

        /// <inheritdoc/>
        public async Task<int> CleanupExpiredRevokedTokensAsync()
        {
            // 清理 7 天前過期的撤銷記錄
            var before = DateTime.UtcNow.AddDays(-7);
            return await _revokedTokenRepository.CleanupExpiredAsync(before);
        }

        #region Private Methods

        /// <summary>
        /// 批次查詢使用者資訊（UserName, Email）
        /// </summary>
        private async Task<Dictionary<string, (string? UserName, string? Email)>> GetUserInfoByIdsAsync(IEnumerable<string> userIds)
        {
            var idList = userIds.ToList();
            if (idList.Count == 0)
                return new Dictionary<string, (string?, string?)>();

            return await _identityDbContext.Users
                .Where(u => idList.Contains(u.Id))
                .ToDictionaryAsync(
                    u => u.Id,
                    u => (u.UserName, u.Email));
        }

        private async Task<ActiveTokenDto> MapToActiveTokenDto(PersistedGrant grant, DateTime now)
        {
            var jti = ExtractJtiFromGrant(grant) ?? grant.Key;
            var isRevoked = await _revokedTokenRepository.IsRevokedAsync(jti);
            var revokedToken = isRevoked ? await _revokedTokenRepository.GetByJtiAsync(jti) : null;

            var isExpired = grant.Expiration.HasValue && grant.Expiration <= now;
            int? remainingSeconds = null;
            string? remainingFormatted = null;

            if (grant.Expiration.HasValue && !isExpired)
            {
                var remaining = grant.Expiration.Value - now;
                remainingSeconds = (int)remaining.TotalSeconds;
                remainingFormatted = FormatTimeSpan(remaining);
            }

            // 嘗試取得客戶端名稱
            var clientName = await GetClientNameAsync(grant.ClientId);

            // 解析授權範圍和身分提供者
            var (scopes, idp) = ExtractScopesAndIdp(grant);

            return new ActiveTokenDto
            {
                Key = grant.Key,
                Type = grant.Type,
                SubjectId = grant.SubjectId,
                SessionId = grant.SessionId,
                ClientId = grant.ClientId,
                ClientName = clientName,
                CreationTime = grant.CreationTime,
                Expiration = grant.Expiration,
                RemainingSeconds = remainingSeconds,
                RemainingTimeFormatted = remainingFormatted,
                IsExpired = isExpired,
                IsRevoked = isRevoked,
                RevokedAt = revokedToken?.RevokedAt,
                Scopes = scopes,
                IdentityProvider = idp
            };
        }

        private async Task<string?> GetClientNameAsync(string clientId)
        {
            var client = await _configurationDbContext.Clients
                .FirstOrDefaultAsync(x => x.ClientId == clientId);
            return client?.ClientName ?? clientId;
        }

        private static string? ExtractJtiFromGrant(PersistedGrant grant)
        {
            if (string.IsNullOrWhiteSpace(grant.Data))
                return null;

            try
            {
                using var doc = JsonDocument.Parse(grant.Data);
                if (doc.RootElement.TryGetProperty("jti", out var jtiElement))
                {
                    return jtiElement.GetString();
                }
            }
            catch
            {
                // 無法解析，忽略
            }

            return null;
        }

        private static (string? scopes, string? idp) ExtractScopesAndIdp(PersistedGrant grant)
        {
            if (string.IsNullOrWhiteSpace(grant.Data))
                return (null, null);

            try
            {
                using var doc = JsonDocument.Parse(grant.Data);

                string? scopes = null;
                string? idp = null;

                if (doc.RootElement.TryGetProperty("Scopes", out var scopesElement))
                {
                    scopes = string.Join(" ", scopesElement.EnumerateArray().Select(x => x.GetString()));
                }

                if (doc.RootElement.TryGetProperty("idp", out var idpElement))
                {
                    idp = idpElement.GetString();
                }

                return (scopes, idp);
            }
            catch
            {
                return (null, null);
            }
        }

        private static string FormatTimeSpan(TimeSpan timeSpan)
        {
            if (timeSpan.TotalDays >= 1)
            {
                return $"{(int)timeSpan.TotalDays} 天 {timeSpan.Hours} 小時";
            }
            if (timeSpan.TotalHours >= 1)
            {
                return $"{(int)timeSpan.TotalHours} 小時 {timeSpan.Minutes} 分";
            }
            if (timeSpan.TotalMinutes >= 1)
            {
                return $"{(int)timeSpan.TotalMinutes} 分 {timeSpan.Seconds} 秒";
            }
            return $"{timeSpan.Seconds} 秒";
        }

        #endregion
    }
}
