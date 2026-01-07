// UC Capital - Multi-Tenant Organization API Controller
// 多租戶組織架構 API 控制器

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.MultiTenant;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Configuration.Constants;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.ExceptionHandling;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Controllers
{
    /// <summary>
    /// 多租戶組織架構管理 API
    /// </summary>
    [Route("api/v2/organizations")]
    [ApiController]
    [TypeFilter(typeof(ControllerExceptionFilterAttribute))]
    [Produces("application/json", "application/problem+json")]
    [Authorize(Policy = AuthorizationConsts.AdministrationPolicy)]
    public class MultiTenantOrganizationController : ControllerBase
    {
        private readonly IMultiTenantOrganizationService _organizationService;

        // 預設租戶 ID (UC Capital)
        private static readonly Guid DefaultTenantId = Guid.Parse("72B3A6BF-EC79-4451-B223-003FA2A95340");

        public MultiTenantOrganizationController(IMultiTenantOrganizationService organizationService)
        {
            _organizationService = organizationService;
        }

        #region Organization 查詢

        /// <summary>
        /// 取得所有組織
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(List<OrganizationDto>), 200)]
        public async Task<ActionResult<List<OrganizationDto>>> GetAll([FromQuery] Guid? tenantId = null)
        {
            var organizations = await _organizationService.GetAllOrganizationsAsync(tenantId ?? DefaultTenantId);
            return Ok(organizations);
        }

        /// <summary>
        /// 取得組織樹狀結構
        /// </summary>
        [HttpGet("tree")]
        [ProducesResponseType(typeof(List<OrganizationTreeNodeDto>), 200)]
        public async Task<ActionResult<List<OrganizationTreeNodeDto>>> GetTree([FromQuery] Guid? tenantId = null)
        {
            var tree = await _organizationService.GetOrganizationTreeAsync(tenantId ?? DefaultTenantId);
            return Ok(tree);
        }

        /// <summary>
        /// 根據 ID 取得組織
        /// </summary>
        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(OrganizationDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<OrganizationDto>> GetById(Guid id)
        {
            var organization = await _organizationService.GetOrganizationByIdAsync(id);
            if (organization == null)
            {
                return NotFound();
            }
            return Ok(organization);
        }

        /// <summary>
        /// 取得子組織
        /// </summary>
        [HttpGet("{id:guid}/children")]
        [ProducesResponseType(typeof(List<OrganizationDto>), 200)]
        public async Task<ActionResult<List<OrganizationDto>>> GetChildren(Guid id)
        {
            var children = await _organizationService.GetChildOrganizationsAsync(id);
            return Ok(children);
        }

        /// <summary>
        /// 取得組織統計
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(OrganizationStatsDto), 200)]
        public async Task<ActionResult<OrganizationStatsDto>> GetStats([FromQuery] Guid? tenantId = null)
        {
            var stats = await _organizationService.GetOrganizationStatsAsync(tenantId ?? DefaultTenantId);
            return Ok(stats);
        }

        #endregion

        #region Organization CRUD

        /// <summary>
        /// 新增組織
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(OrganizationDto), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Create([FromBody] CreateOrganizationDto dto, [FromQuery] Guid? tenantId = null)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var created = await _organizationService.CreateOrganizationAsync(dto, tenantId ?? DefaultTenantId);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// 更新組織
        /// </summary>
        [HttpPut("{id:guid}")]
        [ProducesResponseType(typeof(OrganizationDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateOrganizationDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var updated = await _organizationService.UpdateOrganizationAsync(id, dto);
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// 刪除組織
        /// </summary>
        [HttpDelete("{id:guid}")]
        [ProducesResponseType(typeof(OperationResultDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Delete(Guid id, [FromQuery] bool includeDescendants = false)
        {
            var result = await _organizationService.DeleteOrganizationAsync(id, includeDescendants);
            if (!result.Success)
            {
                return NotFound();
            }
            return Ok(result);
        }

        #endregion

        #region OrganizationMember

        /// <summary>
        /// 取得組織成員
        /// </summary>
        [HttpGet("{id:guid}/members")]
        [ProducesResponseType(typeof(List<OrganizationMemberDto>), 200)]
        public async Task<ActionResult<List<OrganizationMemberDto>>> GetMembers(Guid id)
        {
            var members = await _organizationService.GetOrganizationMembersAsync(id);
            return Ok(members);
        }

        /// <summary>
        /// 新增組織成員
        /// </summary>
        [HttpPost("{id:guid}/members")]
        [ProducesResponseType(typeof(OrganizationMemberDto), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> AddMember(Guid id, [FromBody] AddOrganizationMemberDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            dto.OrganizationId = id;
            var member = await _organizationService.AddMemberAsync(dto);
            return CreatedAtAction(nameof(GetMembers), new { id }, member);
        }

        /// <summary>
        /// 移除組織成員
        /// </summary>
        [HttpDelete("{id:guid}/members/{userId}")]
        [ProducesResponseType(typeof(OperationResultDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> RemoveMember(Guid id, string userId)
        {
            var result = await _organizationService.RemoveMemberAsync(id, userId);
            if (!result.Success)
            {
                return NotFound();
            }
            return Ok(result);
        }

        #endregion

        #region Position

        /// <summary>
        /// 取得所有職位
        /// </summary>
        [HttpGet("positions")]
        [ProducesResponseType(typeof(List<PositionDto>), 200)]
        public async Task<ActionResult<List<PositionDto>>> GetPositions([FromQuery] Guid? tenantId = null)
        {
            var positions = await _organizationService.GetPositionsAsync(tenantId ?? DefaultTenantId);
            return Ok(positions);
        }

        #endregion

        #region User Organizations

        /// <summary>
        /// 取得使用者所屬組織
        /// </summary>
        [HttpGet("users/{userId}/organizations")]
        [ProducesResponseType(typeof(List<OrganizationMemberDto>), 200)]
        public async Task<ActionResult<List<OrganizationMemberDto>>> GetUserOrganizations(string userId)
        {
            var organizations = await _organizationService.GetUserOrganizationsAsync(userId);
            return Ok(organizations);
        }

        #endregion
    }
}
