// UC Capital - Organization API Controller
// 組織架構 API 控制器

using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.Organization;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Configuration.Constants;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Dtos.Organization;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.ExceptionHandling;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Mappers;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Resources;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Controllers
{
    /// <summary>
    /// 組織架構管理 API
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [TypeFilter(typeof(ControllerExceptionFilterAttribute))]
    [Produces("application/json", "application/problem+json")]
    [Authorize(Policy = AuthorizationConsts.AdministrationPolicy)]
    public class OrganizationController : ControllerBase
    {
        private readonly IOrganizationService _organizationService;
        private readonly IApiErrorResources _errorResources;

        public OrganizationController(
            IOrganizationService organizationService,
            IApiErrorResources errorResources)
        {
            _organizationService = organizationService;
            _errorResources = errorResources;
        }

        #region 查詢端點

        /// <summary>
        /// 取得所有組織群組（扁平列表）
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(List<OrganizationGroupApiDto>), 200)]
        public async Task<ActionResult<List<OrganizationGroupApiDto>>> GetAll()
        {
            var groups = await _organizationService.GetAllGroupsAsync();
            var result = groups.ConvertAll(g => g.ToOrganizationApiModel<OrganizationGroupApiDto>());
            return Ok(result);
        }

        /// <summary>
        /// 取得組織樹狀結構
        /// </summary>
        [HttpGet("tree")]
        [ProducesResponseType(typeof(List<OrganizationTreeApiDto>), 200)]
        public async Task<ActionResult<List<OrganizationTreeApiDto>>> GetTree()
        {
            var tree = await _organizationService.GetOrganizationTreeAsync();
            var result = tree.ConvertAll(t => t.ToOrganizationApiModel<OrganizationTreeApiDto>());
            return Ok(result);
        }

        /// <summary>
        /// 根據 ID 取得組織群組
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(OrganizationGroupApiDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<OrganizationGroupApiDto>> GetById(string id)
        {
            var group = await _organizationService.GetGroupByIdAsync(id);
            if (group == null)
            {
                return NotFound();
            }

            var result = group.ToOrganizationApiModel<OrganizationGroupApiDto>();
            return Ok(result);
        }

        /// <summary>
        /// 取得組織統計資料
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(OrganizationStatsApiDto), 200)]
        public async Task<ActionResult<OrganizationStatsApiDto>> GetStats()
        {
            var stats = await _organizationService.GetOrganizationStatsAsync();
            var result = stats.ToOrganizationApiModel<OrganizationStatsApiDto>();
            return Ok(result);
        }

        /// <summary>
        /// 檢查群組名稱是否可用
        /// </summary>
        [HttpGet("check-name")]
        [ProducesResponseType(typeof(bool), 200)]
        public async Task<ActionResult<bool>> CanInsert(
            [FromQuery] string name,
            [FromQuery] string parentId = null,
            [FromQuery] string excludeId = null)
        {
            var canInsert = await _organizationService.CanInsertGroupAsync(name, parentId, excludeId);
            return Ok(canInsert);
        }

        /// <summary>
        /// 取得刪除確認資訊（包含將被刪除的子群組列表）
        /// </summary>
        [HttpGet("{id}/delete-confirmation")]
        [ProducesResponseType(typeof(DeleteConfirmationApiDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<DeleteConfirmationApiDto>> GetDeleteConfirmation(string id)
        {
            var confirmation = await _organizationService.GetDeleteConfirmationAsync(id);
            if (confirmation == null)
            {
                return NotFound();
            }

            var result = confirmation.ToOrganizationApiModel<DeleteConfirmationApiDto>();
            return Ok(result);
        }

        #endregion

        #region 新增/修改/刪除端點

        /// <summary>
        /// 新增組織群組
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(OrganizationGroupApiDto), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Create([FromBody] CreateOrganizationGroupApiDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var createDto = dto.ToOrganizationApiModel<CreateOrganizationGroupDto>();
            var created = await _organizationService.CreateGroupAsync(createDto);
            var result = created.ToOrganizationApiModel<OrganizationGroupApiDto>();

            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        /// <summary>
        /// 更新組織群組
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(OrganizationGroupApiDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateOrganizationGroupApiDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // 確認群組存在
            var existing = await _organizationService.GetGroupByIdAsync(id);
            if (existing == null)
            {
                return NotFound();
            }

            var updateDto = dto.ToOrganizationApiModel<UpdateOrganizationGroupDto>();
            var updated = await _organizationService.UpdateGroupAsync(id, updateDto);
            var result = updated.ToOrganizationApiModel<OrganizationGroupApiDto>();

            return Ok(result);
        }

        /// <summary>
        /// 刪除組織群組（含所有子群組）
        /// </summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(typeof(DeleteResultApiDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Delete(string id)
        {
            // 確認群組存在
            var existing = await _organizationService.GetGroupByIdAsync(id);
            if (existing == null)
            {
                return NotFound();
            }

            var deleteResult = await _organizationService.DeleteGroupAsync(id);
            var result = deleteResult.ToOrganizationApiModel<DeleteResultApiDto>();

            return Ok(result);
        }

        #endregion
    }
}
