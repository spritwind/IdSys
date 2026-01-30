// UC Capital - Permission Query API Controller
// PRS 權限查詢 API 控制器

using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.PermissionQuery;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.ExceptionHandling;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Controllers
{
    /// <summary>
    /// PRS 權限查詢 API
    /// 提供 Token 持有者權限查詢功能
    /// </summary>
    /// <remarks>
    /// 此 API 使用 Client Credentials 驗證，不使用 Bearer Token 授權。
    /// 呼叫者需提供：ClientId, ClientSecret, AccessToken (及選用的 IdToken)
    /// </remarks>
    [Route("api/prs/permissions")]
    [ApiController]
    [TypeFilter(typeof(ControllerExceptionFilterAttribute))]
    [Produces("application/json", "application/problem+json")]
    public class PermissionQueryController : ControllerBase
    {
        private readonly IPermissionQueryService _permissionQueryService;

        public PermissionQueryController(IPermissionQueryService permissionQueryService)
        {
            _permissionQueryService = permissionQueryService;
        }

        /// <summary>
        /// 查詢使用者權限
        /// </summary>
        /// <remarks>
        /// 根據提供的 Token 查詢使用者在 PRS 系統中的權限。
        ///
        /// **請求範例：**
        /// ```json
        /// {
        ///   "clientId": "your-client-id",
        ///   "clientSecret": "your-client-secret",
        ///   "idToken": "eyJhbGc...",
        ///   "accessToken": "eyJhbGc...",
        ///   "systemId": "RCS"
        /// }
        /// ```
        ///
        /// **回應範例：**
        /// ```json
        /// {
        ///   "userId": "user-guid",
        ///   "userName": "王大明",
        ///   "userEnglishName": "daming.wang",
        ///   "permissions": [
        ///     {
        ///       "systemId": "RCS",
        ///       "systemName": "風控系統",
        ///       "resources": [
        ///         {
        ///           "resourceId": 101,
        ///           "resourceCode": "position_management",
        ///           "scopes": [
        ///             { "code": "R", "name": "讀取" },
        ///             { "code": "W", "name": "寫入" }
        ///           ]
        ///         }
        ///       ]
        ///     }
        ///   ]
        /// }
        /// ```
        ///
        /// **錯誤代碼說明：**
        /// - `invalid_request`: 缺少必要參數
        /// - `invalid_client`: Client 憑證驗證失敗
        /// - `invalid_token`: Token 格式錯誤或無法解析
        /// - `user_not_found`: 使用者未註冊於 PRS 權限系統
        /// - `server_error`: 伺服器內部錯誤
        /// </remarks>
        /// <param name="request">權限查詢請求</param>
        /// <returns>使用者權限清單</returns>
        /// <response code="200">查詢成功，回傳權限清單</response>
        /// <response code="400">請求參數錯誤</response>
        /// <response code="401">Client 憑證或 Token 驗證失敗</response>
        /// <response code="404">使用者未註冊於權限系統</response>
        /// <response code="500">伺服器內部錯誤</response>
        [HttpPost("query")]
        [ProducesResponseType(typeof(PermissionQueryResponse), 200)]
        [ProducesResponseType(typeof(PermissionQueryErrorResponse), 400)]
        [ProducesResponseType(typeof(PermissionQueryErrorResponse), 401)]
        [ProducesResponseType(typeof(PermissionQueryErrorResponse), 404)]
        [ProducesResponseType(typeof(PermissionQueryErrorResponse), 500)]
        public async Task<IActionResult> QueryPermissions([FromBody] PermissionQueryRequest request)
        {
            var result = await _permissionQueryService.QueryPermissionsAsync(request);

            if (result.IsSuccess)
            {
                return Ok(result.Data);
            }

            // 根據錯誤代碼回傳對應的 HTTP 狀態碼
            var errorResponse = new PermissionQueryErrorResponse
            {
                Error = result.ErrorCode ?? "unknown_error",
                ErrorDescription = result.ErrorDescription
            };

            return result.ErrorCode switch
            {
                "invalid_request" => BadRequest(errorResponse),
                "invalid_client" => Unauthorized(errorResponse),
                "invalid_token" => Unauthorized(errorResponse),
                "user_not_found" => NotFound(errorResponse),
                _ => StatusCode(500, errorResponse)
            };
        }

        /// <summary>
        /// 檢查使用者是否具有特定權限
        /// </summary>
        /// <remarks>
        /// 根據提供的 Token 和資源/權限範圍檢查使用者是否有權限。
        /// 每次檢查都會記錄到資料庫中。
        ///
        /// **請求範例：**
        /// ```json
        /// {
        ///   "clientId": "riskcontrolsystemweb",
        ///   "clientSecret": "your-client-secret",
        ///   "idToken": "eyJhbGc...",
        ///   "accessToken": "eyJhbGc...",
        ///   "resource": "module_login",
        ///   "scopes": "@r@c@u@d"
        /// }
        /// ```
        ///
        /// 若 scopes 為 null 或空白，則檢查所有標準權限 (@r@c@u@d@e)
        ///
        /// **回應範例 (成功)：**
        /// ```json
        /// {
        ///   "@r": { "allowed": true },
        ///   "@c": { "allowed": true },
        ///   "@u": { "allowed": false },
        ///   "@d": { "allowed": false }
        /// }
        /// ```
        ///
        /// **回應範例 (Token 錯誤，HTTP 401)：**
        /// ```json
        /// {
        ///   "@r": { "allowed": false, "error": "token_expired", "errorDescription": "The token has expired" },
        ///   "@c": { "allowed": false, "error": "token_expired", "errorDescription": "The token has expired" },
        ///   "@u": { "allowed": false, "error": "token_expired", "errorDescription": "The token has expired" },
        ///   "@d": { "allowed": false, "error": "token_expired", "errorDescription": "The token has expired" }
        /// }
        /// ```
        ///
        /// **權限代碼說明：**
        /// - `@r`: 讀取 (Read)
        /// - `@c`: 建立 (Create)
        /// - `@u`: 更新 (Update)
        /// - `@d`: 刪除 (Delete)
        /// - `@e`: 匯出 (Export)
        /// - `all`: 全部權限
        ///
        /// **錯誤代碼說明：**
        /// - `invalid_request`: 缺少必要參數 (HTTP 400)
        /// - `invalid_client`: Client 憑證驗證失敗 (HTTP 401)
        /// - `invalid_token`: Token 格式錯誤或無法解析 (HTTP 401)
        /// - `token_expired`: Token 已過期 (HTTP 401)
        /// - `token_revoked`: Token 已被撤銷 (HTTP 401)
        /// - `user_not_found`: 使用者未註冊於 PRS 權限系統 (HTTP 404)
        /// - `server_error`: 伺服器內部錯誤 (HTTP 500)
        /// </remarks>
        /// <param name="request">權限檢查請求</param>
        /// <returns>各權限範圍的檢查結果</returns>
        /// <response code="200">檢查成功，回傳各 scope 的權限狀態</response>
        /// <response code="400">請求參數錯誤</response>
        /// <response code="401">Client 憑證或 Token 驗證失敗</response>
        /// <response code="404">使用者未註冊於權限系統</response>
        /// <response code="500">伺服器內部錯誤</response>
        [HttpPost("check")]
        [ProducesResponseType(typeof(Dictionary<string, ScopeCheckResultDto>), 200)]
        [ProducesResponseType(typeof(Dictionary<string, ScopeCheckResultDto>), 400)]
        [ProducesResponseType(typeof(Dictionary<string, ScopeCheckResultDto>), 401)]
        [ProducesResponseType(typeof(Dictionary<string, ScopeCheckResultDto>), 404)]
        [ProducesResponseType(typeof(Dictionary<string, ScopeCheckResultDto>), 500)]
        public async Task<IActionResult> CheckPermission([FromBody] PermissionCheckRequest request)
        {
            // 取得來源 IP 和 User Agent
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
            if (userAgent?.Length > 500) userAgent = userAgent.Substring(0, 500);

            var result = await _permissionQueryService.CheckPermissionAsync(request, ipAddress, userAgent);

            // 建立 per-scope 回應
            Dictionary<string, ScopeCheckResultDto> response;

            if (result.IsSuccess)
            {
                // 成功時：只回傳 allowed (Option B)
                response = result.ScopeResults.ToDictionary(
                    kv => kv.Key,
                    kv => ScopeCheckResultDto.Success(kv.Value)
                );
                return Ok(response);
            }

            // 錯誤時：每個 scope 都回傳相同的錯誤資訊
            var scopesToReturn = result.ScopeResults.Any()
                ? result.ScopeResults.Keys.ToList()
                : PermissionCheckResult.AllStandardScopes.ToList();

            response = scopesToReturn.ToDictionary(
                scope => scope,
                _ => ScopeCheckResultDto.Failure(
                    result.ErrorCode ?? "unknown_error",
                    result.ErrorDescription ?? "An error occurred"
                )
            );

            // 根據錯誤代碼回傳對應的 HTTP 狀態碼
            return result.ErrorCode switch
            {
                "invalid_request" => BadRequest(response),
                "invalid_client" => Unauthorized(response),
                "invalid_token" => Unauthorized(response),
                "token_expired" => Unauthorized(response),
                "token_revoked" => Unauthorized(response),
                "user_not_found" => NotFound(response),
                _ => StatusCode(500, response)
            };
        }

        /// <summary>
        /// 健康檢查端點
        /// </summary>
        /// <returns>API 狀態</returns>
        [HttpGet("health")]
        [ProducesResponseType(typeof(object), 200)]
        public IActionResult Health()
        {
            return Ok(new
            {
                Status = "Healthy",
                Service = "PRS Permission Query API",
                Version = "1.0.0"
            });
        }
    }
}
