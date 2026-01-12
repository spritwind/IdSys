// UC Capital - Token Management API Controller
// Token 管理 API 控制器

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.TokenManagement;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Configuration.Constants;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.ExceptionHandling;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Controllers
{
    /// <summary>
    /// Token 管理 API
    /// 提供 JWT Token 的撤銷與管理功能
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [TypeFilter(typeof(ControllerExceptionFilterAttribute))]
    [Produces("application/json", "application/problem+json")]
    [Authorize(Policy = AuthorizationConsts.AdministrationPolicy)]
    public class TokenManagementController : ControllerBase
    {
        private readonly ITokenManagementService _tokenManagementService;

        public TokenManagementController(ITokenManagementService tokenManagementService)
        {
            _tokenManagementService = tokenManagementService;
        }

        #region 查詢端點

        /// <summary>
        /// 取得所有活躍 Token（分頁）
        /// </summary>
        /// <param name="page">頁碼（從 1 開始）</param>
        /// <param name="pageSize">每頁筆數</param>
        /// <param name="search">搜尋關鍵字</param>
        [HttpGet("active")]
        [ProducesResponseType(typeof(TokenListResponse<ActiveTokenDto>), 200)]
        public async Task<ActionResult<TokenListResponse<ActiveTokenDto>>> GetActiveTokens(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null)
        {
            var result = await _tokenManagementService.GetActiveTokensAsync(page, pageSize, search);
            return Ok(result);
        }

        /// <summary>
        /// 取得使用者的活躍 Token
        /// </summary>
        /// <param name="subjectId">使用者 ID</param>
        /// <param name="page">頁碼</param>
        /// <param name="pageSize">每頁筆數</param>
        [HttpGet("active/user/{subjectId}")]
        [ProducesResponseType(typeof(TokenListResponse<ActiveTokenDto>), 200)]
        public async Task<ActionResult<TokenListResponse<ActiveTokenDto>>> GetUserActiveTokens(
            string subjectId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _tokenManagementService.GetUserActiveTokensAsync(subjectId, page, pageSize);
            return Ok(result);
        }

        /// <summary>
        /// 取得客戶端的活躍 Token
        /// </summary>
        /// <param name="clientId">客戶端 ID</param>
        /// <param name="page">頁碼</param>
        /// <param name="pageSize">每頁筆數</param>
        [HttpGet("active/client/{clientId}")]
        [ProducesResponseType(typeof(TokenListResponse<ActiveTokenDto>), 200)]
        public async Task<ActionResult<TokenListResponse<ActiveTokenDto>>> GetClientActiveTokens(
            string clientId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _tokenManagementService.GetClientActiveTokensAsync(clientId, page, pageSize);
            return Ok(result);
        }

        /// <summary>
        /// 取得所有撤銷的 Token（分頁）
        /// </summary>
        /// <param name="page">頁碼</param>
        /// <param name="pageSize">每頁筆數</param>
        [HttpGet("revoked")]
        [ProducesResponseType(typeof(TokenListResponse<RevokedTokenDto>), 200)]
        public async Task<ActionResult<TokenListResponse<RevokedTokenDto>>> GetRevokedTokens(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _tokenManagementService.GetRevokedTokensAsync(page, pageSize);
            return Ok(result);
        }

        /// <summary>
        /// 取得 Token 統計資訊
        /// </summary>
        [HttpGet("statistics")]
        [ProducesResponseType(typeof(TokenStatistics), 200)]
        public async Task<ActionResult<TokenStatistics>> GetStatistics()
        {
            var result = await _tokenManagementService.GetStatisticsAsync();
            return Ok(result);
        }

        /// <summary>
        /// 檢查 Token 是否已撤銷
        /// </summary>
        /// <param name="jti">JWT Token ID</param>
        [HttpGet("check/{jti}")]
        [ProducesResponseType(typeof(TokenCheckResponse), 200)]
        public async Task<ActionResult<TokenCheckResponse>> CheckTokenRevoked(string jti)
        {
            var isRevoked = await _tokenManagementService.IsTokenRevokedAsync(jti);
            return Ok(new TokenCheckResponse { Jti = jti, IsRevoked = isRevoked });
        }

        #endregion

        #region 撤銷端點

        /// <summary>
        /// 撤銷 Token（依 JTI）
        /// </summary>
        /// <param name="request">撤銷請求</param>
        [HttpPost("revoke")]
        [ProducesResponseType(typeof(RevokedTokenDto), 200)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<RevokedTokenDto>> RevokeToken([FromBody] RevokeTokenRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Jti))
            {
                return BadRequest("JTI is required");
            }

            var revokedBy = User.Identity?.Name ?? "System";
            var result = await _tokenManagementService.RevokeTokenAsync(request, revokedBy);
            return Ok(result);
        }

        /// <summary>
        /// 撤銷 Token（依 Grant Key）
        /// </summary>
        /// <param name="grantKey">Grant Key</param>
        /// <param name="reason">撤銷原因</param>
        [HttpPost("revoke/grant/{grantKey}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> RevokeByGrantKey(string grantKey, [FromQuery] string? reason = null)
        {
            var revokedBy = User.Identity?.Name ?? "System";
            var success = await _tokenManagementService.RevokeByGrantKeyAsync(grantKey, reason, revokedBy);

            if (!success)
            {
                return NotFound("Grant not found");
            }

            return Ok(new { Success = true, Message = "Token revoked successfully" });
        }

        /// <summary>
        /// 撤銷使用者的所有 Token
        /// </summary>
        /// <param name="subjectId">使用者 ID</param>
        /// <param name="reason">撤銷原因</param>
        [HttpPost("revoke/user/{subjectId}")]
        [ProducesResponseType(typeof(RevokeAllResponse), 200)]
        public async Task<ActionResult<RevokeAllResponse>> RevokeUserTokens(string subjectId, [FromQuery] string? reason = null)
        {
            var revokedBy = User.Identity?.Name ?? "System";
            var count = await _tokenManagementService.RevokeUserTokensAsync(subjectId, reason, revokedBy);

            return Ok(new RevokeAllResponse
            {
                Success = true,
                Message = $"Successfully revoked {count} tokens for user {subjectId}",
                RevokedCount = count
            });
        }

        /// <summary>
        /// 撤銷客戶端的所有 Token
        /// </summary>
        /// <param name="clientId">客戶端 ID</param>
        /// <param name="reason">撤銷原因</param>
        [HttpPost("revoke/client/{clientId}")]
        [ProducesResponseType(typeof(RevokeAllResponse), 200)]
        public async Task<ActionResult<RevokeAllResponse>> RevokeClientTokens(string clientId, [FromQuery] string? reason = null)
        {
            var revokedBy = User.Identity?.Name ?? "System";
            var count = await _tokenManagementService.RevokeClientTokensAsync(clientId, reason, revokedBy);

            return Ok(new RevokeAllResponse
            {
                Success = true,
                Message = $"Successfully revoked {count} tokens for client {clientId}",
                RevokedCount = count
            });
        }

        /// <summary>
        /// 取消撤銷
        /// </summary>
        /// <param name="jti">JWT Token ID</param>
        [HttpDelete("revoke/{jti}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UnrevokeToken(string jti)
        {
            var success = await _tokenManagementService.UnrevokeTokenAsync(jti);

            if (!success)
            {
                return NotFound("Revoked token not found");
            }

            return Ok(new { Success = true, Message = "Token unrevoked successfully" });
        }

        #endregion

        #region 維護端點

        /// <summary>
        /// 清理過期的撤銷記錄
        /// </summary>
        [HttpPost("cleanup")]
        [ProducesResponseType(typeof(CleanupResponse), 200)]
        public async Task<ActionResult<CleanupResponse>> CleanupExpired()
        {
            var count = await _tokenManagementService.CleanupExpiredRevokedTokensAsync();

            return Ok(new CleanupResponse
            {
                Success = true,
                Message = $"Successfully cleaned up {count} expired revocation records",
                CleanedCount = count
            });
        }

        #endregion
    }

    #region Response DTOs

    /// <summary>
    /// Token 檢查響應
    /// </summary>
    public class TokenCheckResponse
    {
        public string Jti { get; set; } = string.Empty;
        public bool IsRevoked { get; set; }
    }

    /// <summary>
    /// 批量撤銷響應
    /// </summary>
    public class RevokeAllResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int RevokedCount { get; set; }
    }

    /// <summary>
    /// 清理響應
    /// </summary>
    public class CleanupResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int CleanedCount { get; set; }
    }

    #endregion
}
