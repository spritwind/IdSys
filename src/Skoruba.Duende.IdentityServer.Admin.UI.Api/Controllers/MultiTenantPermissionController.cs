// UC Capital - Multi-Tenant Permission API Controller
// 多租戶權限管理 API 控制器

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.MultiTenant;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Configuration.Constants;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.ExceptionHandling;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Controllers
{
    /// <summary>
    /// 多租戶權限管理 API
    /// </summary>
    [Route("api/v2/permissions")]
    [ApiController]
    [TypeFilter(typeof(ControllerExceptionFilterAttribute))]
    [Produces("application/json", "application/problem+json")]
    [Authorize(Policy = AuthorizationConsts.AdministrationPolicy)]
    public class MultiTenantPermissionController : ControllerBase
    {
        private readonly IMultiTenantPermissionService _permissionService;
        private readonly ILogger<MultiTenantPermissionController> _logger;

        public MultiTenantPermissionController(
            IMultiTenantPermissionService permissionService,
            ILogger<MultiTenantPermissionController> logger)
        {
            _permissionService = permissionService;
            _logger = logger;
        }

        #region PermissionResource

        /// <summary>
        /// 取得所有資源
        /// </summary>
        [HttpGet("resources")]
        [ProducesResponseType(typeof(List<PermissionResourceDto>), 200)]
        public async Task<ActionResult<List<PermissionResourceDto>>> GetResources([FromQuery] string clientId = null)
        {
            var resources = await _permissionService.GetResourcesAsync(clientId);
            return Ok(resources);
        }

        /// <summary>
        /// 取得資源樹狀結構
        /// </summary>
        [HttpGet("resources/tree")]
        [ProducesResponseType(typeof(List<PermissionResourceDto>), 200)]
        public async Task<ActionResult<List<PermissionResourceDto>>> GetResourceTree([FromQuery] string clientId)
        {
            if (string.IsNullOrEmpty(clientId))
            {
                return BadRequest(new { message = "clientId 為必填參數" });
            }

            var tree = await _permissionService.GetResourceTreeAsync(clientId);
            return Ok(tree);
        }

        /// <summary>
        /// 根據 ID 取得資源
        /// </summary>
        [HttpGet("resources/{id:guid}")]
        [ProducesResponseType(typeof(PermissionResourceDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<PermissionResourceDto>> GetResourceById(Guid id)
        {
            var resource = await _permissionService.GetResourceByIdAsync(id);
            if (resource == null)
            {
                return NotFound();
            }
            return Ok(resource);
        }

        #endregion

        #region PermissionScope

        /// <summary>
        /// 取得所有權限範圍
        /// </summary>
        [HttpGet("scopes")]
        [ProducesResponseType(typeof(List<PermissionScopeDto>), 200)]
        public async Task<ActionResult<List<PermissionScopeDto>>> GetScopes()
        {
            var scopes = await _permissionService.GetScopesAsync();
            return Ok(scopes);
        }

        #endregion

        #region User Permissions

        /// <summary>
        /// 取得使用者的直接權限
        /// </summary>
        [HttpGet("users/{userId}")]
        [ProducesResponseType(typeof(List<PermissionDto>), 200)]
        public async Task<ActionResult<List<PermissionDto>>> GetUserPermissions(string userId)
        {
            var permissions = await _permissionService.GetUserPermissionsAsync(userId);
            return Ok(permissions);
        }

        /// <summary>
        /// 取得使用者的有效權限（包含繼承）
        /// </summary>
        [HttpGet("users/{userId}/effective")]
        [ProducesResponseType(typeof(UserEffectivePermissionsDto), 200)]
        public async Task<ActionResult<UserEffectivePermissionsDto>> GetUserEffectivePermissions(string userId)
        {
            var permissions = await _permissionService.GetUserEffectivePermissionsAsync(userId);
            return Ok(permissions);
        }

        /// <summary>
        /// 檢查使用者是否有特定權限
        /// </summary>
        [HttpGet("users/{userId}/check")]
        [ProducesResponseType(typeof(PermissionCheckResultDto), 200)]
        public async Task<ActionResult<PermissionCheckResultDto>> CheckUserPermission(
            string userId,
            [FromQuery] Guid? resourceId,
            [FromQuery] string clientId,
            [FromQuery] string resourceCode,
            [FromQuery] string scope)
        {
            bool hasPermission;

            if (resourceId.HasValue)
            {
                hasPermission = await _permissionService.HasPermissionAsync(userId, resourceId.Value, scope);
            }
            else if (!string.IsNullOrEmpty(clientId) && !string.IsNullOrEmpty(resourceCode))
            {
                hasPermission = await _permissionService.HasPermissionByCodeAsync(userId, clientId, resourceCode, scope);
            }
            else
            {
                return BadRequest(new { message = "請提供 resourceId 或 (clientId + resourceCode)" });
            }

            return Ok(new PermissionCheckResultDto
            {
                UserId = userId,
                ResourceId = resourceId,
                ClientId = clientId,
                ResourceCode = resourceCode,
                Scope = scope,
                HasPermission = hasPermission
            });
        }

        #endregion

        #region Organization Permissions

        /// <summary>
        /// 取得組織的權限
        /// </summary>
        [HttpGet("organizations/{organizationId:guid}")]
        [ProducesResponseType(typeof(List<PermissionDto>), 200)]
        public async Task<ActionResult<List<PermissionDto>>> GetOrganizationPermissions(Guid organizationId)
        {
            var permissions = await _permissionService.GetOrganizationPermissionsAsync(organizationId);
            return Ok(permissions);
        }

        #endregion

        #region Group Permissions

        /// <summary>
        /// 取得群組的權限
        /// </summary>
        [HttpGet("groups/{groupId:guid}")]
        [ProducesResponseType(typeof(List<PermissionDto>), 200)]
        public async Task<ActionResult<List<PermissionDto>>> GetGroupPermissions(Guid groupId)
        {
            var permissions = await _permissionService.GetGroupPermissionsAsync(groupId);
            return Ok(permissions);
        }

        #endregion

        #region Resource Permissions

        /// <summary>
        /// 取得資源的權限
        /// </summary>
        [HttpGet("resources/{resourceId:guid}/permissions")]
        [ProducesResponseType(typeof(List<PermissionDto>), 200)]
        public async Task<ActionResult<List<PermissionDto>>> GetResourcePermissions(Guid resourceId)
        {
            var permissions = await _permissionService.GetResourcePermissionsAsync(resourceId);
            return Ok(permissions);
        }

        #endregion

        #region Permission CRUD

        /// <summary>
        /// 授予權限
        /// </summary>
        [HttpPost("grant")]
        [ProducesResponseType(typeof(PermissionDto), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> GrantPermission([FromBody] GrantPermissionDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // 取得當前使用者 ID
            var grantedBy = User.FindFirst("sub")?.Value ?? User.Identity?.Name ?? "system";

            var permission = await _permissionService.GrantPermissionAsync(dto, grantedBy);
            return CreatedAtAction(nameof(GetUserPermissions), new { userId = dto.SubjectId }, permission);
        }

        /// <summary>
        /// 批次授予權限
        /// </summary>
        [HttpPost("grant/batch")]
        [ProducesResponseType(typeof(List<PermissionDto>), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> BatchGrantPermissions([FromBody] BatchGrantPermissionDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var grantedBy = User.FindFirst("sub")?.Value ?? User.Identity?.Name ?? "system";

                _logger.LogInformation("BatchGrantPermissions called for subject {SubjectType}/{SubjectId} with {Count} resource scopes",
                    dto.SubjectType, dto.SubjectId, dto.ResourceScopes?.Count ?? 0);

                var permissions = await _permissionService.BatchGrantPermissionsAsync(dto, grantedBy);
                return CreatedAtAction(nameof(GetUserPermissions), new { userId = dto.SubjectId }, permissions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BatchGrantPermissions failed for subject {SubjectType}/{SubjectId}",
                    dto.SubjectType, dto.SubjectId);
                return StatusCode(500, new OperationResultDto
                {
                    Success = false,
                    Message = $"授予失敗: {ex.Message}",
                    Data = new { detail = ex.InnerException?.Message, stackTrace = ex.StackTrace }
                });
            }
        }

        /// <summary>
        /// 撤銷權限
        /// </summary>
        [HttpDelete("{id:guid}")]
        [ProducesResponseType(typeof(OperationResultDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> RevokePermission(Guid id)
        {
            var result = await _permissionService.RevokePermissionAsync(id);
            if (!result.Success)
            {
                return NotFound();
            }
            return Ok(result);
        }

        /// <summary>
        /// 批次撤銷權限
        /// </summary>
        [HttpPost("revoke/batch")]
        [ProducesResponseType(typeof(OperationResultDto), 200)]
        public async Task<IActionResult> BatchRevokePermissions([FromBody] List<Guid> permissionIds)
        {
            if (permissionIds == null || permissionIds.Count == 0)
            {
                return BadRequest(new { message = "請提供要撤銷的權限 ID" });
            }

            try
            {
                _logger.LogInformation("BatchRevokePermissions called with {Count} IDs: {Ids}",
                    permissionIds.Count, string.Join(", ", permissionIds));

                var result = await _permissionService.BatchRevokePermissionsAsync(permissionIds);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BatchRevokePermissions failed for IDs: {Ids}",
                    string.Join(", ", permissionIds));
                return StatusCode(500, new OperationResultDto
                {
                    Success = false,
                    Message = $"撤銷失敗: {ex.Message}",
                    Data = new { detail = ex.InnerException?.Message, stackTrace = ex.StackTrace }
                });
            }
        }

        /// <summary>
        /// 更新權限
        /// </summary>
        [HttpPut("{id:guid}")]
        [ProducesResponseType(typeof(PermissionDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdatePermission(Guid id, [FromBody] UpdatePermissionDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var updated = await _permissionService.UpdatePermissionAsync(
                    id,
                    dto.Scopes,
                    dto.InheritToChildren,
                    dto.ExpiresAt);
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        #endregion
    }

    /// <summary>
    /// 權限檢查結果 DTO
    /// </summary>
    public class PermissionCheckResultDto
    {
        public string UserId { get; set; }
        public Guid? ResourceId { get; set; }
        public string ClientId { get; set; }
        public string ResourceCode { get; set; }
        public string Scope { get; set; }
        public bool HasPermission { get; set; }
    }

    /// <summary>
    /// 更新權限 DTO
    /// </summary>
    public class UpdatePermissionDto
    {
        public List<string> Scopes { get; set; }
        public bool InheritToChildren { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
