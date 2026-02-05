// UC Capital - Google Workspace Sync API Controller
// Google Workspace 組織架構同步 API

using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.GoogleSync;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Controllers
{
    /// <summary>
    /// Google Workspace 組織架構同步 API
    /// </summary>
    [ApiController]
    [Route("api/v2/google-sync")]
    [Authorize(Policy = "RequireAdministratorRole")]
    public class GoogleWorkspaceSyncController : ControllerBase
    {
        private readonly IGoogleWorkspaceSyncService _syncService;
        private readonly ILogger<GoogleWorkspaceSyncController> _logger;

        public GoogleWorkspaceSyncController(
            IGoogleWorkspaceSyncService syncService,
            ILogger<GoogleWorkspaceSyncController> logger)
        {
            _syncService = syncService;
            _logger = logger;
        }

        /// <summary>
        /// 預覽同步內容（不寫入資料庫）
        /// </summary>
        /// <param name="tenantId">租戶 ID（可選）</param>
        /// <param name="cancellationToken">取消 Token</param>
        /// <returns>預覽結果</returns>
        [HttpGet("preview")]
        [ProducesResponseType(typeof(GoogleSyncPreviewDto), 200)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<GoogleSyncPreviewDto>> Preview(
            [FromQuery] Guid? tenantId = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Google Workspace sync preview requested by {User}", User.Identity?.Name);
                var result = await _syncService.PreviewSyncAsync(tenantId, null, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to preview Google Workspace sync");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// 同步組織架構
        /// </summary>
        /// <param name="tenantId">租戶 ID（可選）</param>
        /// <param name="cancellationToken">取消 Token</param>
        /// <returns>同步結果</returns>
        [HttpPost("organizations")]
        [ProducesResponseType(typeof(GoogleSyncResultDto), 200)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<GoogleSyncResultDto>> SyncOrganizations(
            [FromQuery] Guid? tenantId = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Google Workspace organizations sync requested by {User}", User.Identity?.Name);
                var result = await _syncService.SyncOrganizationsAsync(tenantId, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to sync organizations from Google Workspace");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// 同步人員對應
        /// </summary>
        /// <param name="tenantId">租戶 ID（可選）</param>
        /// <param name="targetEmails">指定同步的 Email（可選，以逗號分隔）</param>
        /// <param name="cancellationToken">取消 Token</param>
        /// <returns>同步結果</returns>
        [HttpPost("members")]
        [ProducesResponseType(typeof(GoogleSyncResultDto), 200)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<GoogleSyncResultDto>> SyncMembers(
            [FromQuery] Guid? tenantId = null,
            [FromQuery] string? targetEmails = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Google Workspace members sync requested by {User}", User.Identity?.Name);

                var emails = string.IsNullOrWhiteSpace(targetEmails)
                    ? null
                    : targetEmails.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

                var result = await _syncService.SyncMembersAsync(tenantId, emails, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to sync members from Google Workspace");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// 完整同步（組織架構 + 人員對應）
        /// </summary>
        /// <param name="request">同步請求參數</param>
        /// <param name="cancellationToken">取消 Token</param>
        /// <returns>同步結果</returns>
        [HttpPost("full")]
        [ProducesResponseType(typeof(GoogleSyncResultDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<GoogleSyncResultDto>> FullSync(
            [FromBody] GoogleSyncRequestDto request,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { error = "Request body is required" });
                }

                _logger.LogInformation(
                    "Google Workspace full sync requested by {User}. DryRun={DryRun}",
                    User.Identity?.Name, request.DryRun);

                var result = await _syncService.FullSyncAsync(request, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to complete full sync from Google Workspace");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// 健康檢查（測試 Google API 連線）
        /// </summary>
        /// <param name="cancellationToken">取消 Token</param>
        /// <returns>連線狀態</returns>
        [HttpGet("health")]
        [ProducesResponseType(200)]
        [ProducesResponseType(500)]
        public async Task<ActionResult> HealthCheck(CancellationToken cancellationToken = default)
        {
            try
            {
                // 透過 preview 測試 Google API 連線
                var result = await _syncService.PreviewSyncAsync(null, null, cancellationToken);
                return Ok(new
                {
                    status = "healthy",
                    message = $"Google API 連線正常，取得 {result.OrganizationsFromGoogle} 個組織、{result.MembersFromGoogle} 個人員",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Google Workspace health check failed");
                return StatusCode(500, new
                {
                    status = "unhealthy",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }
    }
}
