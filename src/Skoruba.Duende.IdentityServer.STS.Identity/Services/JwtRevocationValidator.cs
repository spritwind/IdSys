// UC Capital - JWT Revocation Validator
// JWT 撤銷驗證器
// 攔截 Introspection 請求，檢查 JWT Token 是否在撤銷清單中

using Duende.IdentityServer.Validation;
using Microsoft.EntityFrameworkCore;
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
    /// 攔截 Introspection 請求，在回傳結果前檢查撤銷清單
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

            // 檢查 JTI 是否在撤銷清單中
            var jti = result.Claims?.FirstOrDefault(c => c.Type == "jti")?.Value;

            if (!string.IsNullOrWhiteSpace(jti))
            {
                var isRevoked = await _revocationValidator.IsRevokedAsync(jti);

                if (isRevoked)
                {
                    _logger.LogInformation("Token introspection: JTI {Jti} is revoked, marking as inactive", jti);

                    // 標記為非活躍
                    return new IntrospectionRequestValidationResult
                    {
                        IsActive = false,
                        IsError = false,
                        Api = result.Api,
                        Parameters = result.Parameters,
                        Token = result.Token
                    };
                }
            }

            return result;
        }
    }
}
