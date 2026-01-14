// UC Capital - Custom Token Revocation Response Generator
// 自訂 Token 撤銷回應產生器
// 攔截 /connect/revocation 端點，將撤銷的 JWT Token 記錄到 RevokedTokens 表

using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Threading.Tasks;
using Duende.IdentityServer.ResponseHandling;
using Duende.IdentityServer.Validation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.STS.Identity.Services
{
    /// <summary>
    /// 自訂 Token 撤銷回應產生器
    /// 在 IdentityServer 處理撤銷請求後，將 JWT Token 記錄到 RevokedTokens 表
    /// </summary>
    public class CustomTokenRevocationResponseGenerator : ITokenRevocationResponseGenerator
    {
        private readonly ITokenRevocationResponseGenerator _inner;
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<CustomTokenRevocationResponseGenerator> _logger;

        public CustomTokenRevocationResponseGenerator(
            ITokenRevocationResponseGenerator inner,
            IServiceProvider serviceProvider,
            ILogger<CustomTokenRevocationResponseGenerator> logger)
        {
            _inner = inner;
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public async Task<TokenRevocationResponse> ProcessAsync(TokenRevocationRequestValidationResult validationResult)
        {
            // 在處理撤銷之前，嘗試提取並儲存 JWT Token 資訊
            if (validationResult != null && !validationResult.IsError && !string.IsNullOrWhiteSpace(validationResult.Token))
            {
                await TryRecordJwtRevocationAsync(validationResult);
            }

            // 執行原本的撤銷邏輯
            return await _inner.ProcessAsync(validationResult);
        }

        /// <summary>
        /// 嘗試記錄 JWT Token 撤銷
        /// </summary>
        private async Task TryRecordJwtRevocationAsync(TokenRevocationRequestValidationResult validationResult)
        {
            try
            {
                var token = validationResult.Token;

                // 嘗試解析為 JWT
                var handler = new JwtSecurityTokenHandler();

                if (!handler.CanReadToken(token))
                {
                    _logger.LogDebug("Token is not a JWT, skipping revocation recording");
                    return;
                }

                var jwt = handler.ReadJwtToken(token);
                var jti = jwt.Claims.FirstOrDefault(c => c.Type == "jti")?.Value;

                if (string.IsNullOrWhiteSpace(jti))
                {
                    _logger.LogWarning("JWT Token does not have a JTI claim, cannot record revocation");
                    return;
                }

                // 提取其他資訊
                var sub = jwt.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
                var clientId = jwt.Claims.FirstOrDefault(c => c.Type == "client_id")?.Value
                    ?? validationResult.Client?.ClientId;
                var exp = jwt.ValidTo;

                // 使用 scope 來取得 DbContext
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetService<TokenManagementDbContext>();

                if (dbContext == null)
                {
                    _logger.LogWarning("TokenManagementDbContext not available, cannot record revocation");
                    return;
                }

                // 檢查是否已存在
                var exists = dbContext.RevokedTokens.Any(x => x.Jti == jti);
                if (exists)
                {
                    _logger.LogDebug("Token with JTI {Jti} already revoked", jti);
                    return;
                }

                // 記錄撤銷
                var revokedToken = new RevokedToken
                {
                    Jti = jti,
                    JtiHash = ComputeHash(jti),
                    SubjectId = sub,
                    ClientId = clientId,
                    TokenType = validationResult.TokenTypeHint ?? "access_token",
                    ExpirationTime = exp != DateTime.MinValue ? exp : null,
                    RevokedAt = DateTime.UtcNow,
                    Reason = "Revoked via /connect/revocation endpoint",
                    RevokedBy = "IdentityServer"
                };

                await dbContext.RevokedTokens.AddAsync(revokedToken);
                await dbContext.SaveChangesAsync();

                _logger.LogInformation(
                    "Recorded JWT revocation: JTI={Jti}, SubjectId={SubjectId}, ClientId={ClientId}",
                    jti, sub, clientId);
            }
            catch (Exception ex)
            {
                // 記錄失敗不應該阻止撤銷流程
                _logger.LogError(ex, "Failed to record JWT revocation, but proceeding with revocation");
            }
        }

        /// <summary>
        /// 計算 JTI 的 SHA256 Hash
        /// </summary>
        private static string ComputeHash(string input)
        {
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            var bytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }
    }
}
