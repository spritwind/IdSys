// UC Capital - JWT Revocation Validator
// JWT 撤銷驗證器
// 攔截 Introspection 請求，檢查 JWT Token 是否過期或在撤銷清單中

using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Duende.IdentityServer.Validation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts;

namespace Skoruba.Duende.IdentityServer.STS.Identity.Services
{
    /// <summary>
    /// JWT 撤銷驗證器介面
    /// </summary>
    public interface IJwtRevocationValidator
    {
        /// <summary>
        /// 檢查 JTI 是否已被撤銷
        /// </summary>
        Task<bool> IsRevokedAsync(string jti);
    }

    /// <summary>
    /// JWT 撤銷驗證器實作
    /// </summary>
    public class JwtRevocationValidator : IJwtRevocationValidator
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<JwtRevocationValidator> _logger;

        public JwtRevocationValidator(
            IServiceProvider serviceProvider,
            ILogger<JwtRevocationValidator> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<bool> IsRevokedAsync(string jti)
        {
            if (string.IsNullOrWhiteSpace(jti))
            {
                return false;
            }

            try
            {
                // 使用 scope 來取得 DbContext（避免 lifetime 問題）
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetService<TokenManagementDbContext>();

                if (dbContext == null)
                {
                    _logger.LogWarning("TokenManagementDbContext not available, skipping revocation check");
                    return false;
                }

                var isRevoked = await dbContext.RevokedTokens
                    .AnyAsync(x => x.Jti == jti);

                if (isRevoked)
                {
                    _logger.LogInformation("Token with JTI {Jti} has been revoked", jti);
                }

                return isRevoked;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking token revocation for JTI {Jti}", jti);
                return false; // 發生錯誤時預設為未撤銷，避免阻擋正常請求
            }
        }
    }

    /// <summary>
    /// 自訂 Introspection 請求驗證器
    /// 攔截 Introspection 請求，在回傳結果前檢查：
    /// 1. Token 是否已過期 (exp claim)
    /// 2. Token 是否已被撤銷 (查詢 RevokedTokens 表)
    /// </summary>
    public class CustomIntrospectionRequestValidator : IIntrospectionRequestValidator
    {
        private readonly IIntrospectionRequestValidator _inner;
        private readonly IJwtRevocationValidator _revocationValidator;
        private readonly ILogger<CustomIntrospectionRequestValidator> _logger;

        public CustomIntrospectionRequestValidator(
            IIntrospectionRequestValidator inner,
            IJwtRevocationValidator revocationValidator,
            ILogger<CustomIntrospectionRequestValidator> logger)
        {
            _inner = inner;
            _revocationValidator = revocationValidator;
            _logger = logger;
        }

        public async Task<IntrospectionRequestValidationResult> ValidateAsync(IntrospectionRequestValidationContext context)
        {
            // 先執行原本的驗證
            var result = await _inner.ValidateAsync(context);

            // 如果原本驗證失敗，直接回傳
            if (result.IsError || !result.IsActive)
            {
                return result;
            }

            // 嘗試從原始 token 解析
            string tokenString = result.Token;
            if (string.IsNullOrWhiteSpace(tokenString))
            {
                tokenString = context.Parameters?.Get("token");
            }

            // 解析 JWT Token 以取得 JTI 和過期時間
            JwtSecurityToken jwt = null;
            if (!string.IsNullOrWhiteSpace(tokenString))
            {
                jwt = ParseJwtToken(tokenString);
            }

            // 步驟 1: 檢查 Token 是否已過期
            if (jwt != null)
            {
                var expClaim = jwt.Claims.FirstOrDefault(c => c.Type == "exp");
                if (expClaim != null && long.TryParse(expClaim.Value, out var expUnix))
                {
                    var expTime = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
                    var now = DateTime.UtcNow;

                    if (now > expTime)
                    {
                        _logger.LogInformation("Token introspection: Token expired at {ExpTime}, current time is {Now}, marking as inactive",
                            expTime, now);

                        result.IsActive = false;
                        result.Claims = result.Claims ?? new List<Claim>();
                        return result;
                    }
                }
            }

            // 步驟 2: 檢查 Token 是否已被撤銷
            string jti = null;

            // 方法 1: 從 result.Claims 取得（某些情況下可能有）
            jti = result.Claims?.FirstOrDefault(c => c.Type == "jti")?.Value;

            // 方法 2: 從已解析的 JWT Token 取得
            if (string.IsNullOrWhiteSpace(jti) && jwt != null)
            {
                jti = jwt.Claims.FirstOrDefault(c => c.Type == "jti")?.Value;
            }

            if (!string.IsNullOrWhiteSpace(jti))
            {
                _logger.LogDebug("Checking revocation status for JTI: {Jti}", jti);
                var isRevoked = await _revocationValidator.IsRevokedAsync(jti);

                if (isRevoked)
                {
                    _logger.LogInformation("Token introspection: JTI {Jti} is revoked, marking as inactive", jti);

                    // 直接修改原始 result 的 IsActive 狀態
                    // 這樣可以保留所有必要的內部屬性（如 Caller 等）
                    result.IsActive = false;
                    result.Claims = result.Claims ?? new List<Claim>();
                    return result;
                }
            }
            else
            {
                _logger.LogDebug("Could not extract JTI from token, skipping revocation check");
            }

            return result;
        }

        /// <summary>
        /// 解析 JWT Token 字串
        /// </summary>
        private JwtSecurityToken ParseJwtToken(string token)
        {
            try
            {
                var handler = new JwtSecurityTokenHandler();
                if (handler.CanReadToken(token))
                {
                    return handler.ReadJwtToken(token);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to parse token as JWT");
            }
            return null;
        }
    }
}
