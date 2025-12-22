// UC Capital - Organization Controller
// 組織架構管理控制器

using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.UI.Configuration.Constants;
using Skoruba.Duende.IdentityServer.Admin.UI.ExceptionHandling;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Areas.AdminUI.Controllers
{
    [Authorize(Policy = AuthorizationConsts.AdministrationPolicy)]
    [TypeFilter(typeof(ControllerExceptionFilterAttribute))]
    [Area(CommonConsts.AdminUIArea)]
    public class OrganizationController : BaseController
    {
        private readonly IOrganizationService _organizationService;
        private readonly ILogger<OrganizationController> _logger;

        public OrganizationController(
            IOrganizationService organizationService,
            ILogger<OrganizationController> logger) : base(logger)
        {
            _organizationService = organizationService;
            _logger = logger;
        }

        /// <summary>
        /// 組織架構主頁面
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var stats = await _organizationService.GetOrganizationStatsAsync();
            ViewBag.Stats = stats;
            return View();
        }

        /// <summary>
        /// 取得組織樹狀結構（JSON API）
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetOrganizationTree()
        {
            try
            {
                var tree = await _organizationService.GetOrganizationTreeAsync();
                return Json(tree);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "取得組織樹狀結構時發生錯誤");
                return StatusCode(500, new { error = "無法載入組織架構資料" });
            }
        }

        /// <summary>
        /// 取得所有組織群組（JSON API）
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllGroups()
        {
            try
            {
                var groups = await _organizationService.GetAllGroupsAsync();
                return Json(groups);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "取得組織群組時發生錯誤");
                return StatusCode(500, new { error = "無法載入組織群組資料" });
            }
        }

        /// <summary>
        /// 取得單一組織群組詳細資料（JSON API）
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetGroup(string id)
        {
            try
            {
                var group = await _organizationService.GetGroupByIdAsync(id);
                if (group == null)
                {
                    return NotFound(new { error = "找不到指定的組織群組" });
                }
                return Json(group);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "取得組織群組 {GroupId} 時發生錯誤", id);
                return StatusCode(500, new { error = "無法載入組織群組資料" });
            }
        }

        /// <summary>
        /// 取得組織統計資料（JSON API）
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var stats = await _organizationService.GetOrganizationStatsAsync();
                return Json(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "取得組織統計資料時發生錯誤");
                return StatusCode(500, new { error = "無法載入統計資料" });
            }
        }
    }
}
