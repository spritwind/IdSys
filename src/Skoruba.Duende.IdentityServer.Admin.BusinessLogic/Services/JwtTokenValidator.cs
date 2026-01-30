// UC Capital - JWT Token Validator
// 本地 JWT Token 驗證服務 (使用 JWKS 公鑰驗證)

using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services
{
    /// <summary>
    /// JWT Token 驗證設定
    /// </summary>
    public class JwtTokenValidatorOptions
    {
        /// <summary>
        /// STS Authority URL (例如: https://localhost:44310)
        /// </summary>
        public string Authority { get; set; } = string.Empty;

        /// <summary>
        /// 有效的 Audience 清單 (可選，不設定則不驗證 audience)
        /// </summary>
        public string[]? ValidAudiences { get; set; }

        /// <summary>
        /// 是否驗證 Audience (預設: false)
        /// </summary>
        public bool ValidateAudience { get; set; } = false;

        /// <summary>
        /// 是否檢查撤銷狀態 (預設: true)
        /// </summary>
        public bool CheckRevocation { get; set; } = true;

        /// <summary>
        /// JWKS 快取時間 (分鐘，預設: 60)
        /// </summary>
        public int JwksCacheMinutes { get; set; } = 60;
    }

    /// <summary>
    /// JWT Token 驗證結果
    /// </summary>
    public class TokenValidationResultDto
    {
        public bool IsValid { get; set; }
        public string? SubjectId { get; set; }
        public string? ClientId { get; set; }
        public string? Jti { get; set; }
        public DateTime? Expiration { get; set; }
        public string? ErrorCode { get; set; }
        public string? ErrorMessage { get; set; }
        public ClaimsPrincipal? Principal { get; set; }

        public static TokenValidationResultDto Success(ClaimsPrincipal principal, string? jti, DateTime? expiration) => new()
        {
            IsValid = true,
            SubjectId = principal.FindFirst("sub")?.Value ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            ClientId = principal.FindFirst("client_id")?.Value,
            Jti = jti,
            Expiration = expiration,
            Principal = principal
        };

        public static TokenValidationResultDto Failure(string errorCode, string errorMessage) => new()
        {
            IsValid = false,
            ErrorCode = errorCode,
            ErrorMessage = errorMessage
        };
    }

    /// <summary>
    /// JWT Token 驗證器介面
    /// </summary>
    public interface IJwtTokenValidator
    {
        Task<TokenValidationResultDto> ValidateTokenAsync(string token, CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// JWT Token 驗證器實作
    /// 使用 OIDC Discovery 取得 JWKS 公鑰進行本地驗證
    /// </summary>
    public class JwtTokenValidator : IJwtTokenValidator
    {
        private readonly JwtTokenValidatorOptions _options;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;
        private readonly IRevokedTokenRepository? _revokedTokenRepository;
        private readonly ILogger<JwtTokenValidator> _logger;

        private const string ConfigurationCacheKey = "JwtValidator_OidcConfiguration";

        public JwtTokenValidator(
            IOptions<JwtTokenValidatorOptions> options,
            IHttpClientFactory httpClientFactory,
            IMemoryCache cache,
            ILogger<JwtTokenValidator> logger,
            IRevokedTokenRepository? revokedTokenRepository = null)
        {
            _options = options.Value;
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _logger = logger;
            _revokedTokenRepository = revokedTokenRepository;
        }

        /// <inheritdoc/>
        public async Task<TokenValidationResultDto> ValidateTokenAsync(string token, CancellationToken cancellationToken = default)
        {
            try
            {
                // Step 1: 取得 OIDC Configuration (含 JWKS)
                var configuration = await GetOpenIdConfigurationAsync(cancellationToken);
                if (configuration == null)
                {
                    _logger.LogError("Failed to retrieve OIDC configuration from {Authority}", _options.Authority);
                    return TokenValidationResultDto.Failure("configuration_error", "Failed to retrieve OIDC configuration");
                }

                // Step 2: 設定驗證參數
                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = configuration.Issuer,
                    ValidateAudience = _options.ValidateAudience,
                    ValidAudiences = _options.ValidAudiences,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = configuration.SigningKeys,
                    ClockSkew = TimeSpan.Zero // 精準驗證，與 Introspect 一致
                };

                // Step 3: 驗證 Token
                var handler = new JwtSecurityTokenHandler();
                ClaimsPrincipal principal;
                SecurityToken validatedToken;

                try
                {
                    principal = handler.ValidateToken(token, validationParameters, out validatedToken);
                }
                catch (SecurityTokenExpiredException)
                {
                    _logger.LogDebug("Token has expired");
                    return TokenValidationResultDto.Failure("token_expired", "The token has expired");
                }
                catch (SecurityTokenInvalidSignatureException)
                {
                    _logger.LogWarning("Token signature validation failed");
                    return TokenValidationResultDto.Failure("invalid_signature", "Token signature is invalid");
                }
                catch (SecurityTokenInvalidIssuerException)
                {
                    _logger.LogWarning("Token issuer validation failed");
                    return TokenValidationResultDto.Failure("invalid_issuer", "Token issuer is invalid");
                }
                catch (SecurityTokenInvalidAudienceException)
                {
                    _logger.LogWarning("Token audience validation failed");
                    return TokenValidationResultDto.Failure("invalid_audience", "Token audience is invalid");
                }
                catch (SecurityTokenException ex)
                {
                    _logger.LogWarning(ex, "Token validation failed");
                    return TokenValidationResultDto.Failure("invalid_token", ex.Message);
                }

                var jwtToken = validatedToken as JwtSecurityToken;
                var jti = jwtToken?.Id ?? principal.FindFirst("jti")?.Value;
                var expiration = jwtToken?.ValidTo;

                // Step 4: 檢查撤銷狀態 (可選)
                if (_options.CheckRevocation && _revokedTokenRepository != null && !string.IsNullOrEmpty(jti))
                {
                    var isRevoked = await _revokedTokenRepository.IsRevokedAsync(jti);
                    if (isRevoked)
                    {
                        _logger.LogInformation("Token with JTI {Jti} has been revoked", jti);
                        return TokenValidationResultDto.Failure("token_revoked", "The token has been revoked");
                    }
                }

                _logger.LogDebug("Token validated successfully for subject: {Subject}",
                    principal.FindFirst("sub")?.Value);

                return TokenValidationResultDto.Success(principal, jti, expiration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during token validation");
                return TokenValidationResultDto.Failure("validation_error", "An error occurred during token validation");
            }
        }

        /// <summary>
        /// 取得 OpenID Connect Configuration (含快取)
        /// </summary>
        private async Task<OpenIdConnectConfiguration?> GetOpenIdConfigurationAsync(CancellationToken cancellationToken)
        {
            // 檢查快取
            if (_cache.TryGetValue(ConfigurationCacheKey, out OpenIdConnectConfiguration? cachedConfig))
            {
                return cachedConfig;
            }

            try
            {
                var metadataAddress = $"{_options.Authority.TrimEnd('/')}/.well-known/openid-configuration";
                var httpClient = _httpClientFactory.CreateClient("JwtValidator");

                var configurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                    metadataAddress,
                    new OpenIdConnectConfigurationRetriever(),
                    new HttpDocumentRetriever(httpClient) { RequireHttps = !_options.Authority.Contains("localhost") });

                var configuration = await configurationManager.GetConfigurationAsync(cancellationToken);

                // 快取設定
                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(_options.JwksCacheMinutes));

                _cache.Set(ConfigurationCacheKey, configuration, cacheOptions);

                _logger.LogDebug("OIDC configuration retrieved and cached from {Authority}", _options.Authority);

                return configuration;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve OIDC configuration from {Authority}", _options.Authority);
                return null;
            }
        }
    }
}
