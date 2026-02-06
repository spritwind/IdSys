// UC Capital - Group Management API Controller
// 群組管理 API 控制器

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
    /// 群組管理 API
    /// </summary>
    [Route("api/v2/groups")]
    [ApiController]
    [TypeFilter(typeof(ControllerExceptionFilterAttribute))]
    [Produces("application/json", "application/problem+json")]
    [Authorize(Policy = AuthorizationConsts.AdministrationPolicy)]
    public class GroupController : ControllerBase
    {
        private readonly IGroupService _groupService;
        private readonly ILogger<GroupController> _logger;

        // 預設租戶 ID (UC Capital)
        private static readonly Guid DefaultTenantId = Guid.Parse("72B3A6BF-EC79-4451-B223-003FA2A95340");

        public GroupController(IGroupService groupService, ILogger<GroupController> logger)
        {
            _groupService = groupService;
            _logger = logger;
        }

        #region Group CRUD

        /// <summary>
        /// 取得所有群組 (可依 GroupType 篩選)
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(List<GroupDto>), 200)]
        public async Task<ActionResult<List<GroupDto>>> GetAll([FromQuery] string groupType = null)
        {
            var groups = await _groupService.GetAllGroupsAsync(DefaultTenantId, groupType);
            return Ok(groups);
        }

        /// <summary>
        /// 取得群組統計
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(GroupStatsDto), 200)]
        public async Task<ActionResult<GroupStatsDto>> GetStats()
        {
            var stats = await _groupService.GetGroupStatsAsync(DefaultTenantId);
            return Ok(stats);
        }

        /// <summary>
        /// 依 ID 取得群組
        /// </summary>
        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(GroupDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<GroupDto>> GetById(Guid id)
        {
            var group = await _groupService.GetGroupByIdAsync(id);
            if (group == null) return NotFound();
            return Ok(group);
        }

        /// <summary>
        /// 新增群組
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(GroupDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<GroupDto>> Create([FromBody] CreateGroupDto dto)
        {
            try
            {
                var created = await _groupService.CreateGroupAsync(dto, DefaultTenantId);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// 更新群組
        /// </summary>
        [HttpPut("{id:guid}")]
        [ProducesResponseType(typeof(GroupDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<GroupDto>> Update(Guid id, [FromBody] UpdateGroupDto dto)
        {
            try
            {
                var updated = await _groupService.UpdateGroupAsync(id, dto);
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// 刪除群組 (soft delete)
        /// </summary>
        [HttpDelete("{id:guid}")]
        [ProducesResponseType(typeof(OperationResultDto), 200)]
        public async Task<ActionResult<OperationResultDto>> Delete(Guid id)
        {
            var result = await _groupService.DeleteGroupAsync(id);
            return Ok(result);
        }

        #endregion

        #region GroupMember

        /// <summary>
        /// 取得群組成員
        /// </summary>
        [HttpGet("{id:guid}/members")]
        [ProducesResponseType(typeof(List<GroupMemberDetailDto>), 200)]
        public async Task<ActionResult<List<GroupMemberDetailDto>>> GetMembers(Guid id)
        {
            var members = await _groupService.GetGroupMembersAsync(id);
            return Ok(members);
        }

        /// <summary>
        /// 新增群組成員
        /// </summary>
        [HttpPost("{id:guid}/members")]
        [ProducesResponseType(typeof(GroupMemberDetailDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<GroupMemberDetailDto>> AddMember(Guid id, [FromBody] AddGroupMemberDto dto)
        {
            try
            {
                var member = await _groupService.AddGroupMemberAsync(id, dto);
                return StatusCode(201, member);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// 移除群組成員
        /// </summary>
        [HttpDelete("{id:guid}/members/{userId}")]
        [ProducesResponseType(typeof(OperationResultDto), 200)]
        public async Task<ActionResult<OperationResultDto>> RemoveMember(Guid id, string userId)
        {
            var result = await _groupService.RemoveGroupMemberAsync(id, userId);
            return Ok(result);
        }

        #endregion
    }
}
