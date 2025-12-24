// UC Capital - Permission API Controller
// 權限控管 API 控制器

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.Permission;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Configuration.Constants;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.ExceptionHandling;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Controllers
{
    /// <summary>
    /// 權限控管 API - 管理 Scopes、Resources、UserPermissions、GroupPermissions
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [TypeFilter(typeof(ControllerExceptionFilterAttribute))]
    [Produces("application/json", "application/problem+json")]
    [Authorize(Policy = AuthorizationConsts.AdministrationPolicy)]
    public class PermissionController : ControllerBase
    {
        private readonly IPermissionService _permissionService;

        public PermissionController(IPermissionService permissionService)
        {
            _permissionService = permissionService;
        }

        #region 統計與查詢輔助

        /// <summary>
        /// 取得權限統計資料
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(PermissionStatsDto), 200)]
        public async Task<ActionResult<PermissionStatsDto>> GetStats(CancellationToken cancellationToken)
        {
            var stats = await _permissionService.GetPermissionStatsAsync(cancellationToken);
            return Ok(stats);
        }

        /// <summary>
        /// 取得所有客戶端 ID 列表
        /// </summary>
        [HttpGet("clients")]
        [ProducesResponseType(typeof(List<string>), 200)]
        public async Task<ActionResult<List<string>>> GetClients(CancellationToken cancellationToken)
        {
            var clients = await _permissionService.GetDistinctClientIdsAsync(cancellationToken);
            return Ok(clients);
        }

        /// <summary>
        /// 搜尋使用者（用於下拉選單）
        /// </summary>
        [HttpGet("users/search")]
        [ProducesResponseType(typeof(List<UserBriefDto>), 200)]
        public async Task<ActionResult<List<UserBriefDto>>> SearchUsers(
            [FromQuery] string search = null,
            CancellationToken cancellationToken = default)
        {
            var users = await _permissionService.SearchUsersAsync(search, cancellationToken);
            return Ok(users);
        }

        /// <summary>
        /// 取得所有群組（用於下拉選單）
        /// </summary>
        [HttpGet("groups")]
        [ProducesResponseType(typeof(List<GroupBriefDto>), 200)]
        public async Task<ActionResult<List<GroupBriefDto>>> GetGroups(CancellationToken cancellationToken)
        {
            var groups = await _permissionService.GetAllGroupsAsync(cancellationToken);
            return Ok(groups);
        }

        #endregion

        #region Scope 權限範圍 CRUD

        /// <summary>
        /// 取得所有權限範圍
        /// </summary>
        [HttpGet("scopes")]
        [ProducesResponseType(typeof(List<ScopeDto>), 200)]
        public async Task<ActionResult<List<ScopeDto>>> GetAllScopes(
            [FromQuery] string clientId = null,
            CancellationToken cancellationToken = default)
        {
            var scopes = await _permissionService.GetAllScopesAsync(clientId, cancellationToken);
            return Ok(scopes);
        }

        /// <summary>
        /// 根據 ID 取得權限範圍
        /// </summary>
        [HttpGet("scopes/{id}")]
        [ProducesResponseType(typeof(ScopeDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<ScopeDto>> GetScopeById(
            string id,
            [FromQuery] string clientId,
            CancellationToken cancellationToken)
        {
            var scope = await _permissionService.GetScopeByIdAsync(id, clientId, cancellationToken);
            if (scope == null)
            {
                return NotFound();
            }
            return Ok(scope);
        }

        /// <summary>
        /// 新增權限範圍
        /// </summary>
        [HttpPost("scopes")]
        [ProducesResponseType(typeof(ScopeDto), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> CreateScope(
            [FromBody] CreateScopeDto dto,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // 檢查名稱是否可用
            var canInsert = await _permissionService.CanInsertScopeAsync(dto.Name, dto.ClientId, null, cancellationToken);
            if (!canInsert)
            {
                return BadRequest(new { message = "權限範圍名稱已存在" });
            }

            var created = await _permissionService.CreateScopeAsync(dto, cancellationToken);
            return CreatedAtAction(nameof(GetScopeById), new { id = created.Id, clientId = created.ClientId }, created);
        }

        /// <summary>
        /// 更新權限範圍
        /// </summary>
        [HttpPut("scopes/{id}")]
        [ProducesResponseType(typeof(ScopeDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateScope(
            string id,
            [FromBody] UpdateScopeDto dto,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            dto.Id = id;

            // 確認存在
            var existing = await _permissionService.GetScopeByIdAsync(id, dto.ClientId, cancellationToken);
            if (existing == null)
            {
                return NotFound();
            }

            // 檢查名稱是否可用（排除自己）
            var canInsert = await _permissionService.CanInsertScopeAsync(dto.Name, dto.ClientId, id, cancellationToken);
            if (!canInsert)
            {
                return BadRequest(new { message = "權限範圍名稱已存在" });
            }

            var updated = await _permissionService.UpdateScopeAsync(dto, cancellationToken);
            return Ok(updated);
        }

        /// <summary>
        /// 刪除權限範圍（軟刪除）
        /// </summary>
        [HttpDelete("scopes/{id}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteScope(
            string id,
            [FromQuery] string clientId,
            CancellationToken cancellationToken)
        {
            var result = await _permissionService.DeleteScopeAsync(id, clientId, cancellationToken);
            if (!result)
            {
                return NotFound();
            }
            return Ok(new { success = true });
        }

        /// <summary>
        /// 檢查權限範圍名稱是否可用
        /// </summary>
        [HttpGet("scopes/check-name")]
        [ProducesResponseType(typeof(bool), 200)]
        public async Task<ActionResult<bool>> CanInsertScope(
            [FromQuery] string name,
            [FromQuery] string clientId,
            [FromQuery] string excludeId = null,
            CancellationToken cancellationToken = default)
        {
            var canInsert = await _permissionService.CanInsertScopeAsync(name, clientId, excludeId, cancellationToken);
            return Ok(canInsert);
        }

        #endregion

        #region Resource 資源 CRUD

        /// <summary>
        /// 取得所有資源
        /// </summary>
        [HttpGet("resources")]
        [ProducesResponseType(typeof(List<ResourceDto>), 200)]
        public async Task<ActionResult<List<ResourceDto>>> GetAllResources(
            [FromQuery] string clientId = null,
            [FromQuery] string type = null,
            CancellationToken cancellationToken = default)
        {
            var resources = await _permissionService.GetAllResourcesAsync(clientId, type, cancellationToken);
            return Ok(resources);
        }

        /// <summary>
        /// 根據 ID 取得資源
        /// </summary>
        [HttpGet("resources/{id}")]
        [ProducesResponseType(typeof(ResourceDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<ResourceDto>> GetResourceById(
            string id,
            [FromQuery] string clientId,
            CancellationToken cancellationToken)
        {
            var resource = await _permissionService.GetResourceByIdAsync(id, clientId, cancellationToken);
            if (resource == null)
            {
                return NotFound();
            }
            return Ok(resource);
        }

        /// <summary>
        /// 新增資源
        /// </summary>
        [HttpPost("resources")]
        [ProducesResponseType(typeof(ResourceDto), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> CreateResource(
            [FromBody] CreateResourceDto dto,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // 檢查名稱是否可用
            var canInsert = await _permissionService.CanInsertResourceAsync(dto.Name, dto.ClientId, null, cancellationToken);
            if (!canInsert)
            {
                return BadRequest(new { message = "資源名稱已存在" });
            }

            var created = await _permissionService.CreateResourceAsync(dto, cancellationToken);
            return CreatedAtAction(nameof(GetResourceById), new { id = created.Id, clientId = created.ClientId }, created);
        }

        /// <summary>
        /// 更新資源
        /// </summary>
        [HttpPut("resources/{id}")]
        [ProducesResponseType(typeof(ResourceDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateResource(
            string id,
            [FromBody] UpdateResourceDto dto,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            dto.Id = id;

            // 確認存在
            var existing = await _permissionService.GetResourceByIdAsync(id, dto.ClientId, cancellationToken);
            if (existing == null)
            {
                return NotFound();
            }

            // 檢查名稱是否可用（排除自己）
            var canInsert = await _permissionService.CanInsertResourceAsync(dto.Name, dto.ClientId, id, cancellationToken);
            if (!canInsert)
            {
                return BadRequest(new { message = "資源名稱已存在" });
            }

            var updated = await _permissionService.UpdateResourceAsync(dto, cancellationToken);
            return Ok(updated);
        }

        /// <summary>
        /// 刪除資源（軟刪除）
        /// </summary>
        [HttpDelete("resources/{id}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteResource(
            string id,
            [FromQuery] string clientId,
            CancellationToken cancellationToken)
        {
            var result = await _permissionService.DeleteResourceAsync(id, clientId, cancellationToken);
            if (!result)
            {
                return NotFound();
            }
            return Ok(new { success = true });
        }

        /// <summary>
        /// 檢查資源名稱是否可用
        /// </summary>
        [HttpGet("resources/check-name")]
        [ProducesResponseType(typeof(bool), 200)]
        public async Task<ActionResult<bool>> CanInsertResource(
            [FromQuery] string name,
            [FromQuery] string clientId,
            [FromQuery] string excludeId = null,
            CancellationToken cancellationToken = default)
        {
            var canInsert = await _permissionService.CanInsertResourceAsync(name, clientId, excludeId, cancellationToken);
            return Ok(canInsert);
        }

        #endregion

        #region ResourceScope 資源-範圍關聯

        /// <summary>
        /// 取得資源的所有範圍
        /// </summary>
        [HttpGet("resources/{resourceId}/scopes")]
        [ProducesResponseType(typeof(List<ResourceScopeDto>), 200)]
        public async Task<ActionResult<List<ResourceScopeDto>>> GetResourceScopes(
            string resourceId,
            [FromQuery] string clientId,
            CancellationToken cancellationToken)
        {
            var scopes = await _permissionService.GetResourceScopesAsync(resourceId, clientId, cancellationToken);
            return Ok(scopes);
        }

        /// <summary>
        /// 設定資源的範圍
        /// </summary>
        [HttpPut("resources/{resourceId}/scopes")]
        [ProducesResponseType(typeof(int), 200)]
        public async Task<ActionResult<int>> SetResourceScopes(
            string resourceId,
            [FromQuery] string clientId,
            [FromBody] List<string> scopeIds,
            CancellationToken cancellationToken)
        {
            var count = await _permissionService.SetResourceScopesAsync(resourceId, clientId, scopeIds, cancellationToken);
            return Ok(new { count });
        }

        #endregion

        #region UserPermission 使用者權限

        /// <summary>
        /// 取得使用者的所有權限
        /// </summary>
        [HttpGet("users/{userId}/permissions")]
        [ProducesResponseType(typeof(List<UserPermissionDto>), 200)]
        public async Task<ActionResult<List<UserPermissionDto>>> GetUserPermissions(
            string userId,
            [FromQuery] string clientId = null,
            CancellationToken cancellationToken = default)
        {
            var permissions = await _permissionService.GetUserPermissionsAsync(userId, clientId, cancellationToken);
            return Ok(permissions);
        }

        /// <summary>
        /// 取得資源的所有使用者權限
        /// </summary>
        [HttpGet("resources/{resourceId}/user-permissions")]
        [ProducesResponseType(typeof(List<UserPermissionDto>), 200)]
        public async Task<ActionResult<List<UserPermissionDto>>> GetResourceUserPermissions(
            string resourceId,
            [FromQuery] string clientId,
            CancellationToken cancellationToken)
        {
            var permissions = await _permissionService.GetResourceUserPermissionsAsync(resourceId, clientId, cancellationToken);
            return Ok(permissions);
        }

        /// <summary>
        /// 設定使用者權限
        /// </summary>
        [HttpPost("users/{userId}/permissions")]
        [ProducesResponseType(typeof(UserPermissionDto), 200)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<UserPermissionDto>> SetUserPermission(
            string userId,
            [FromBody] SetUserPermissionDto dto,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            dto.UserId = userId;
            var result = await _permissionService.SetUserPermissionAsync(dto, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// 移除使用者權限
        /// </summary>
        [HttpDelete("users/{userId}/permissions")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> RemoveUserPermission(
            string userId,
            [FromQuery] string clientId,
            [FromQuery] string resourceId,
            CancellationToken cancellationToken)
        {
            var result = await _permissionService.RemoveUserPermissionAsync(userId, clientId, resourceId, cancellationToken);
            if (!result)
            {
                return NotFound();
            }
            return Ok(new { success = true });
        }

        /// <summary>
        /// 取得使用者的有效權限（包含群組繼承）
        /// </summary>
        [HttpGet("users/{userId}/effective-permissions")]
        [ProducesResponseType(typeof(List<EffectivePermissionDto>), 200)]
        public async Task<ActionResult<List<EffectivePermissionDto>>> GetUserEffectivePermissions(
            string userId,
            [FromQuery] string clientId = null,
            CancellationToken cancellationToken = default)
        {
            var permissions = await _permissionService.GetUserEffectivePermissionsAsync(userId, clientId, cancellationToken);
            return Ok(permissions);
        }

        /// <summary>
        /// 檢查使用者是否有指定權限
        /// </summary>
        [HttpGet("users/{userId}/has-permission")]
        [ProducesResponseType(typeof(bool), 200)]
        public async Task<ActionResult<bool>> HasPermission(
            string userId,
            [FromQuery] string clientId,
            [FromQuery] string resourceId,
            [FromQuery] string scope,
            CancellationToken cancellationToken)
        {
            var hasPermission = await _permissionService.HasPermissionAsync(userId, clientId, resourceId, scope, cancellationToken);
            return Ok(hasPermission);
        }

        #endregion

        #region GroupPermission 群組權限

        /// <summary>
        /// 取得群組的所有權限
        /// </summary>
        [HttpGet("groups/{groupId}/permissions")]
        [ProducesResponseType(typeof(List<GroupPermissionDto>), 200)]
        public async Task<ActionResult<List<GroupPermissionDto>>> GetGroupPermissions(
            string groupId,
            [FromQuery] string clientId = null,
            CancellationToken cancellationToken = default)
        {
            var permissions = await _permissionService.GetGroupPermissionsAsync(groupId, clientId, cancellationToken);
            return Ok(permissions);
        }

        /// <summary>
        /// 取得資源的所有群組權限
        /// </summary>
        [HttpGet("resources/{resourceId}/group-permissions")]
        [ProducesResponseType(typeof(List<GroupPermissionDto>), 200)]
        public async Task<ActionResult<List<GroupPermissionDto>>> GetResourceGroupPermissions(
            string resourceId,
            [FromQuery] string clientId,
            CancellationToken cancellationToken)
        {
            var permissions = await _permissionService.GetResourceGroupPermissionsAsync(resourceId, clientId, cancellationToken);
            return Ok(permissions);
        }

        /// <summary>
        /// 設定群組權限
        /// </summary>
        [HttpPost("groups/{groupId}/permissions")]
        [ProducesResponseType(typeof(GroupPermissionDto), 200)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<GroupPermissionDto>> SetGroupPermission(
            string groupId,
            [FromBody] SetGroupPermissionDto dto,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            dto.GroupId = groupId;
            var result = await _permissionService.SetGroupPermissionAsync(dto, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// 移除群組權限
        /// </summary>
        [HttpDelete("groups/{groupId}/permissions")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> RemoveGroupPermission(
            string groupId,
            [FromQuery] string clientId,
            [FromQuery] string resourceId,
            CancellationToken cancellationToken)
        {
            var result = await _permissionService.RemoveGroupPermissionAsync(groupId, clientId, resourceId, cancellationToken);
            if (!result)
            {
                return NotFound();
            }
            return Ok(new { success = true });
        }

        #endregion
    }
}
