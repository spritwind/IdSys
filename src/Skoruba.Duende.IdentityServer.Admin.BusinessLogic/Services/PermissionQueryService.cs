// UC Capital - Permission Query Service Implementation
// 權限查詢服務實作

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.PermissionQuery;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services
{
    /// <summary>
    /// 權限查詢服務實作
    /// </summary>
    public class PermissionQueryService : IPermissionQueryService
    {
        private readonly IAdminConfigurationDbContext _configurationDbContext;
        private readonly IPermissionQueryRepository _permissionQueryRepository;
        private readonly IJwtTokenValidator _jwtTokenValidator;
        private readonly ILogger<PermissionQueryService> _logger;

        public PermissionQueryService(
            IAdminConfigurationDbContext configurationDbContext,
            IPermissionQueryRepository permissionQueryRepository,
            IJwtTokenValidator jwtTokenValidator,
            ILogger<PermissionQueryService> logger)
        {
            _configurationDbContext = configurationDbContext;
            _permissionQueryRepository = permissionQueryRepository;
            _jwtTokenValidator = jwtTokenValidator;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<PermissionQueryResult> QueryPermissionsAsync(PermissionQueryRequest request)
        {
            try
            {
                // Step 1: 驗證必要參數
                if (string.IsNullOrEmpty(request.ClientId) ||
                    string.IsNullOrEmpty(request.ClientSecret) ||
                    string.IsNullOrEmpty(request.IdToken) ||
                    string.IsNullOrEmpty(request.AccessToken))
                {
                    return PermissionQueryResult.Failure("invalid_request", "Missing required parameters: clientId, clientSecret, idToken, accessToken");
                }

                // Step 2: 驗證 Client 憑證
                var clientValidation = await ValidateClientCredentialsAsync(request.ClientId, request.ClientSecret);
                if (!clientValidation.isValid)
                {
                    _logger.LogWarning("Client validation failed for clientId: {ClientId}", request.ClientId);
                    return PermissionQueryResult.Failure("invalid_client", "Invalid client credentials");
                }

                // Step 3: 驗證 AccessToken 並取得 sub claim
                var tokenValidation = await _jwtTokenValidator.ValidateTokenAsync(request.AccessToken);
                if (!tokenValidation.IsValid)
                {
                    _logger.LogWarning("AccessToken validation failed: {ErrorCode} - {ErrorMessage}",
                        tokenValidation.ErrorCode, tokenValidation.ErrorMessage);
                    return PermissionQueryResult.Failure(
                        tokenValidation.ErrorCode ?? "invalid_token",
                        tokenValidation.ErrorMessage ?? "Token validation failed");
                }

                var subjectId = tokenValidation.SubjectId;
                if (string.IsNullOrEmpty(subjectId))
                {
                    _logger.LogWarning("Could not extract subject from validated token");
                    return PermissionQueryResult.Failure("invalid_token", "Could not extract user identity from token");
                }

                _logger.LogDebug("Querying permissions for subject: {SubjectId}", subjectId);

                // Step 4: 檢查使用者是否存在於 Users 表
                var userExists = await _permissionQueryRepository.SubjectIdExistsAsync(subjectId);
                if (!userExists)
                {
                    _logger.LogWarning("User not found in Users table for subject: {SubjectId}", subjectId);
                    return PermissionQueryResult.Failure("user_not_found", "User not found in system");
                }

                // Step 5: 查詢權限資料
                var permissions = await _permissionQueryRepository.GetPermissionsBySubjectIdAndSystemAsync(
                    subjectId, request.SystemId);

                // Step 6: 組合回應
                var response = BuildPermissionResponse(subjectId, permissions);

                _logger.LogInformation("Permission query successful for subject: {SubjectId}, systems: {SystemCount}",
                    subjectId, response.Permissions.Count);

                return PermissionQueryResult.Success(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error querying permissions");
                return PermissionQueryResult.Failure("server_error", "An internal error occurred");
            }
        }

        /// <inheritdoc/>
        public async Task<PermissionCheckResult> CheckPermissionAsync(PermissionCheckRequest request, string? ipAddress = null, string? userAgent = null)
        {
            var stopwatch = Stopwatch.StartNew();

            // 決定要檢查的 scopes：若為 null 或空白，檢查所有標準權限
            var scopesToCheck = string.IsNullOrWhiteSpace(request.Scopes)
                ? PermissionCheckResult.AllStandardScopes.ToList()
                : ParseScopesWithPrefix(request.Scopes);

            var log = new PermissionCheckLog
            {
                Id = Guid.NewGuid(),
                CheckedAt = DateTime.UtcNow,
                ClientId = request.ClientId,
                Resource = request.Resource,
                RequestedScopes = string.Join("", scopesToCheck),
                IpAddress = ipAddress,
                UserAgent = userAgent
            };

            try
            {
                // Step 1: 驗證必要參數 (scopes 允許 null/空白)
                if (string.IsNullOrEmpty(request.ClientId) ||
                    string.IsNullOrEmpty(request.ClientSecret) ||
                    string.IsNullOrEmpty(request.IdToken) ||
                    string.IsNullOrEmpty(request.AccessToken) ||
                    string.IsNullOrEmpty(request.Resource))
                {
                    var result = PermissionCheckResult.Failure("invalid_request", "Missing required parameters: clientId, clientSecret, idToken, accessToken, resource");
                    await SaveLogAsync(log, result, scopesToCheck, stopwatch);
                    return result;
                }

                // Step 2: 驗證 Client 憑證
                var clientValidation = await ValidateClientCredentialsAsync(request.ClientId, request.ClientSecret);
                if (!clientValidation.isValid)
                {
                    _logger.LogWarning("Client validation failed for clientId: {ClientId}", request.ClientId);
                    var result = PermissionCheckResult.Failure("invalid_client", "Invalid client credentials");
                    await SaveLogAsync(log, result, scopesToCheck, stopwatch);
                    return result;
                }

                // Step 3: 驗證 AccessToken 並取得 sub claim
                var tokenValidation = await _jwtTokenValidator.ValidateTokenAsync(request.AccessToken);
                if (!tokenValidation.IsValid)
                {
                    _logger.LogWarning("AccessToken validation failed: {ErrorCode} - {ErrorMessage}",
                        tokenValidation.ErrorCode, tokenValidation.ErrorMessage);
                    var result = PermissionCheckResult.Failure(
                        tokenValidation.ErrorCode ?? "invalid_token",
                        tokenValidation.ErrorMessage ?? "Token validation failed");
                    await SaveLogAsync(log, result, scopesToCheck, stopwatch);
                    return result;
                }

                var subjectId = tokenValidation.SubjectId;
                if (string.IsNullOrEmpty(subjectId))
                {
                    _logger.LogWarning("Could not extract subject from validated token");
                    var result = PermissionCheckResult.Failure("invalid_token", "Could not extract user identity from token");
                    await SaveLogAsync(log, result, scopesToCheck, stopwatch);
                    return result;
                }

                log.SubjectId = subjectId;

                // Step 4: 檢查使用者是否存在於 Users 表
                var userExists = await _permissionQueryRepository.SubjectIdExistsAsync(subjectId);
                if (!userExists)
                {
                    _logger.LogWarning("User not found in Users table for subject: {SubjectId}", subjectId);
                    var result = PermissionCheckResult.Failure("user_not_found", "User not found in system");
                    await SaveLogAsync(log, result, scopesToCheck, stopwatch);
                    return result;
                }

                // Step 5: 查詢該資源的權限 (使用 ClientId 過濾系統)
                var permissions = await _permissionQueryRepository.GetPermissionsBySubjectIdResourceAndSystemAsync(
                    subjectId, request.Resource, request.ClientId);

                var permissionList = permissions.ToList();

                // 取得使用者名稱
                var userName = permissionList.FirstOrDefault()?.UserName_Display
                    ?? permissionList.FirstOrDefault()?.UserName;
                log.UserName = userName;

                // Step 6: 取得使用者對該資源擁有的所有權限代碼
                var grantedScopeCodes = permissionList
                    .Select(p => p.PermissionCode?.ToLowerInvariant())
                    .Where(p => !string.IsNullOrEmpty(p))
                    .Distinct()
                    .ToList();

                // 組合成 @r@e 格式 (用於 log)
                var grantedScopes = grantedScopeCodes.Any()
                    ? "@" + string.Join("@", grantedScopeCodes.OrderBy(s => s))
                    : null;
                log.GrantedScopes = grantedScopes;

                // Step 7: 逐一檢查每個 scope 的權限
                var scopeResults = new Dictionary<string, bool>();
                var hasAllPermission = grantedScopeCodes.Contains("all");

                foreach (var scope in scopesToCheck)
                {
                    // 取得 scope 代碼 (去除 @ 前綴)
                    var scopeCode = scope.TrimStart('@').ToLowerInvariant();
                    var isAllowed = hasAllPermission || grantedScopeCodes.Contains(scopeCode);
                    scopeResults[scope] = isAllowed;
                }

                _logger.LogInformation(
                    "Permission check for subject: {SubjectId}, resource: {Resource}, scopes: {RequestedScopes}, granted: {GrantedScopes}, results: {Results}",
                    subjectId, request.Resource, string.Join("", scopesToCheck), grantedScopes,
                    string.Join(", ", scopeResults.Select(kv => $"{kv.Key}={kv.Value}")));

                var successResult = PermissionCheckResult.Success(subjectId, userName, scopeResults);
                await SaveLogAsync(log, successResult, scopesToCheck, stopwatch);
                return successResult;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking permission");
                var result = PermissionCheckResult.Failure("server_error", "An internal error occurred");
                await SaveLogAsync(log, result, scopesToCheck, stopwatch);
                return result;
            }
        }

        /// <summary>
        /// 解析權限範圍字串並保留 @ 前綴 (如: @r@e@c -> [@r, @e, @c])
        /// </summary>
        private static List<string> ParseScopesWithPrefix(string scopes)
        {
            if (string.IsNullOrEmpty(scopes))
                return new List<string>();

            return scopes
                .Split('@', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => "@" + s.Trim().ToLowerInvariant())
                .Where(s => s.Length > 1) // 確保不只是 "@"
                .Distinct()
                .ToList();
        }

        /// <summary>
        /// 解析權限範圍字串 (如: @r@e@c -> [r, e, c])
        /// </summary>
        private static List<string> ParseScopes(string scopes)
        {
            if (string.IsNullOrEmpty(scopes))
                return new List<string>();

            return scopes
                .Split('@', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim().ToLowerInvariant())
                .Where(s => !string.IsNullOrEmpty(s))
                .Distinct()
                .ToList();
        }

        /// <summary>
        /// 儲存權限檢查記錄
        /// </summary>
        private async Task SaveLogAsync(PermissionCheckLog log, PermissionCheckResult result, List<string> checkedScopes, Stopwatch stopwatch)
        {
            stopwatch.Stop();
            log.ProcessingTimeMs = (int)stopwatch.ElapsedMilliseconds;
            log.IsSuccess = result.IsSuccess;

            // 計算 Allowed: 若是成功檢查，則所有 scope 都 allowed 才是 true
            // 若是錯誤，則 Allowed = false
            if (result.IsSuccess && result.ScopeResults.Any())
            {
                log.Allowed = result.ScopeResults.All(kv => kv.Value);
            }
            else
            {
                log.Allowed = false;
            }

            log.ErrorCode = result.ErrorCode;
            log.ErrorMessage = result.ErrorDescription;

            try
            {
                await _permissionQueryRepository.SavePermissionCheckLogAsync(log);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save permission check log");
            }
        }

        /// <summary>
        /// 驗證 Client 憑證
        /// </summary>
        private async Task<(bool isValid, string? clientName)> ValidateClientCredentialsAsync(string clientId, string clientSecret)
        {
            // 查詢 Client
            var client = await _configurationDbContext.Clients
                .Include(c => c.ClientSecrets)
                .FirstOrDefaultAsync(c => c.ClientId == clientId);

            if (client == null)
            {
                _logger.LogDebug("Client not found: {ClientId}", clientId);
                return (false, null);
            }

            // 驗證 Secret
            // Duende IdentityServer 預設使用 SHA256 或 SHA512 hash 儲存 secret
            var secretHash256 = ComputeSha256Hash(clientSecret);
            var secretHash512 = ComputeSha512Hash(clientSecret);

            var isValidSecret = client.ClientSecrets.Any(s =>
                s.Value == secretHash256 ||
                s.Value == secretHash512 ||
                s.Value == clientSecret); // 也支援明文比對 (開發環境)

            if (!isValidSecret)
            {
                _logger.LogDebug("Invalid secret for client: {ClientId}", clientId);
                return (false, null);
            }

            return (true, client.ClientName);
        }

        /// <summary>
        /// 從 JWT Token 中提取 Subject (sub claim)
        /// </summary>
        private string? ExtractSubjectFromToken(string token)
        {
            try
            {
                var handler = new JwtSecurityTokenHandler();

                // 不驗證 Token，只解析 (驗證應該在呼叫此 API 之前完成)
                if (handler.CanReadToken(token))
                {
                    var jwtToken = handler.ReadJwtToken(token);
                    return jwtToken.Subject ?? jwtToken.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to parse JWT token");
            }

            return null;
        }

        /// <summary>
        /// 組合權限回應
        /// </summary>
        private PermissionQueryResponse BuildPermissionResponse(
            string subjectId,
            IEnumerable<EntityFramework.Entities.UserPermissionView> permissions)
        {
            var permissionList = permissions.ToList();

            // 取得使用者資訊 (從第一筆權限記錄)
            var firstPermission = permissionList.FirstOrDefault();

            var response = new PermissionQueryResponse
            {
                UserId = subjectId,
                // 新架構: UserName_Display 為中文名，UserEnglishName 為英文名
                UserName = firstPermission?.UserName_Display ?? firstPermission?.UserName,
                UserEnglishName = firstPermission?.UserEnglishName,
                Permissions = new List<SystemPermissionDto>()
            };

            // 依系統分組
            var systemGroups = permissionList
                .GroupBy(p => new { p.SystemId, p.SystemName })
                .OrderBy(g => g.Key.SystemId);

            foreach (var systemGroup in systemGroups)
            {
                var systemPermission = new SystemPermissionDto
                {
                    SystemId = systemGroup.Key.SystemId,
                    SystemName = systemGroup.Key.SystemName,
                    Resources = new List<ResourcePermissionDto>()
                };

                // 依資源分組 (新架構 ResourceId 是 GUID，按 ResourceCode 排序)
                var resourceGroups = systemGroup
                    .GroupBy(p => new { p.ResourceId, p.ResourceCode, p.ResourceName })
                    .OrderBy(g => g.Key.ResourceCode);

                foreach (var resourceGroup in resourceGroups)
                {
                    var resourcePermission = new ResourcePermissionDto
                    {
                        // ResourceId 暫設為 0 (新架構為 GUID，DTO 需要調整)
                        ResourceId = 0,
                        ResourceCode = resourceGroup.Key.ResourceCode,
                        Scopes = resourceGroup
                            .Select(p => new ScopeDto
                            {
                                Code = p.PermissionCode,
                                Name = p.PermissionName
                            })
                            .DistinctBy(s => s.Code)
                            .OrderBy(s => s.Code)
                            .ToList()
                    };

                    systemPermission.Resources.Add(resourcePermission);
                }

                response.Permissions.Add(systemPermission);
            }

            return response;
        }

        /// <summary>
        /// 計算 SHA256 Hash
        /// </summary>
        private static string ComputeSha256Hash(string input)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
            return Convert.ToBase64String(bytes);
        }

        /// <summary>
        /// 計算 SHA512 Hash
        /// </summary>
        private static string ComputeSha512Hash(string input)
        {
            using var sha512 = SHA512.Create();
            var bytes = sha512.ComputeHash(Encoding.UTF8.GetBytes(input));
            return Convert.ToBase64String(bytes);
        }
    }
}
