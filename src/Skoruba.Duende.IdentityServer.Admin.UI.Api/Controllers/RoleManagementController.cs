// UC Capital Identity Admin
// Extended Role Management API Controller

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.DbContexts;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.Entities.Identity;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Configuration.Constants;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.ExceptionHandling;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Controllers
{
    /// <summary>
    /// 角色管理擴展 API
    /// </summary>
    [Route("api/role-management")]
    [ApiController]
    [TypeFilter(typeof(ControllerExceptionFilterAttribute))]
    [Produces("application/json", "application/problem+json")]
    [Authorize(Policy = AuthorizationConsts.AdministrationPolicy)]
    public class RoleManagementController : ControllerBase
    {
        private readonly UserManager<UserIdentity> _userManager;
        private readonly RoleManager<UserIdentityRole> _roleManager;
        private readonly AdminIdentityDbContext _dbContext;

        public RoleManagementController(
            UserManager<UserIdentity> userManager,
            RoleManager<UserIdentityRole> roleManager,
            AdminIdentityDbContext dbContext)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _dbContext = dbContext;
        }

        /// <summary>
        /// 取得所有角色（含使用者數量）
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<RoleWithCountDto>>> GetRoles()
        {
            var roles = await _roleManager.Roles.ToListAsync();
            var result = new List<RoleWithCountDto>();

            foreach (var role in roles)
            {
                var usersInRole = await _userManager.GetUsersInRoleAsync(role.Name);
                result.Add(new RoleWithCountDto
                {
                    Id = role.Id,
                    Name = role.Name,
                    NormalizedName = role.NormalizedName,
                    UserCount = usersInRole.Count
                });
            }

            return Ok(result);
        }

        /// <summary>
        /// 取得單一角色
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<RoleWithCountDto>> GetRole(string id)
        {
            var role = await _roleManager.FindByIdAsync(id);
            if (role == null)
                return NotFound(new { message = "角色不存在" });

            var usersInRole = await _userManager.GetUsersInRoleAsync(role.Name);

            return Ok(new RoleWithCountDto
            {
                Id = role.Id,
                Name = role.Name,
                NormalizedName = role.NormalizedName,
                UserCount = usersInRole.Count
            });
        }

        /// <summary>
        /// 建立角色
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<RoleWithCountDto>> CreateRole([FromBody] CreateRoleDto dto)
        {
            // 檢查角色名稱是否已存在
            var existing = await _roleManager.FindByNameAsync(dto.Name);
            if (existing != null)
                return BadRequest(new { message = "角色名稱已存在" });

            var role = new UserIdentityRole
            {
                Name = dto.Name
            };

            var result = await _roleManager.CreateAsync(role);
            if (!result.Succeeded)
                return BadRequest(new { message = "建立角色失敗", errors = result.Errors.Select(e => e.Description) });

            return CreatedAtAction(nameof(GetRole), new { id = role.Id }, new RoleWithCountDto
            {
                Id = role.Id,
                Name = role.Name,
                NormalizedName = role.NormalizedName,
                UserCount = 0
            });
        }

        /// <summary>
        /// 更新角色
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRole(string id, [FromBody] UpdateRoleDto dto)
        {
            var role = await _roleManager.FindByIdAsync(id);
            if (role == null)
                return NotFound(new { message = "角色不存在" });

            // 檢查新名稱是否與其他角色重複
            if (role.Name != dto.Name)
            {
                var existing = await _roleManager.FindByNameAsync(dto.Name);
                if (existing != null && existing.Id != id)
                    return BadRequest(new { message = "角色名稱已存在" });
            }

            role.Name = dto.Name;

            var result = await _roleManager.UpdateAsync(role);
            if (!result.Succeeded)
                return BadRequest(new { message = "更新角色失敗", errors = result.Errors.Select(e => e.Description) });

            return Ok(new { message = "角色已更新" });
        }

        /// <summary>
        /// 刪除角色
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRole(string id)
        {
            var role = await _roleManager.FindByIdAsync(id);
            if (role == null)
                return NotFound(new { message = "角色不存在" });

            var result = await _roleManager.DeleteAsync(role);
            if (!result.Succeeded)
                return BadRequest(new { message = "刪除角色失敗", errors = result.Errors.Select(e => e.Description) });

            return Ok(new { message = "角色已刪除" });
        }

        /// <summary>
        /// 取得角色的使用者
        /// </summary>
        [HttpGet("{id}/users")]
        public async Task<ActionResult<List<RoleUserDto>>> GetRoleUsers(string id)
        {
            var role = await _roleManager.FindByIdAsync(id);
            if (role == null)
                return NotFound(new { message = "角色不存在" });

            var users = await _userManager.GetUsersInRoleAsync(role.Name);

            var result = users.Select(u => new RoleUserDto
            {
                Id = u.Id,
                UserName = u.UserName,
                Email = u.Email,
                DisplayName = u.DisplayName,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            }).ToList();

            return Ok(result);
        }

        /// <summary>
        /// 取得角色的宣告
        /// </summary>
        [HttpGet("{id}/claims")]
        public async Task<ActionResult<List<RoleClaimDto>>> GetRoleClaims(string id)
        {
            var role = await _roleManager.FindByIdAsync(id);
            if (role == null)
                return NotFound(new { message = "角色不存在" });

            var claims = await _roleManager.GetClaimsAsync(role);

            var result = claims.Select(c => new RoleClaimDto
            {
                RoleId = id,
                ClaimType = c.Type,
                ClaimValue = c.Value
            }).ToList();

            return Ok(result);
        }

        /// <summary>
        /// 新增角色宣告
        /// </summary>
        [HttpPost("{id}/claims")]
        public async Task<IActionResult> AddRoleClaim(string id, [FromBody] AddRoleClaimDto dto)
        {
            var role = await _roleManager.FindByIdAsync(id);
            if (role == null)
                return NotFound(new { message = "角色不存在" });

            var claim = new System.Security.Claims.Claim(dto.ClaimType, dto.ClaimValue);
            var result = await _roleManager.AddClaimAsync(role, claim);

            if (!result.Succeeded)
                return BadRequest(new { message = "新增宣告失敗", errors = result.Errors.Select(e => e.Description) });

            return Ok(new { message = "宣告已新增" });
        }

        /// <summary>
        /// 移除角色宣告
        /// </summary>
        [HttpDelete("{id}/claims")]
        public async Task<IActionResult> RemoveRoleClaim(string id, [FromQuery] string claimType, [FromQuery] string claimValue)
        {
            var role = await _roleManager.FindByIdAsync(id);
            if (role == null)
                return NotFound(new { message = "角色不存在" });

            var claim = new System.Security.Claims.Claim(claimType, claimValue);
            var result = await _roleManager.RemoveClaimAsync(role, claim);

            if (!result.Succeeded)
                return BadRequest(new { message = "移除宣告失敗", errors = result.Errors.Select(e => e.Description) });

            return Ok(new { message = "宣告已移除" });
        }
    }

    #region Role DTOs

    public class RoleWithCountDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string NormalizedName { get; set; }
        public string Description { get; set; }
        public int UserCount { get; set; }
    }

    public class CreateRoleDto
    {
        [Required]
        public string Name { get; set; }

        public string Description { get; set; }
    }

    public class UpdateRoleDto
    {
        [Required]
        public string Name { get; set; }

        public string Description { get; set; }
    }

    public class RoleUserDto
    {
        public string Id { get; set; }
        public string UserName { get; set; }
        public string Email { get; set; }
        public string DisplayName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class RoleClaimDto
    {
        public string RoleId { get; set; }
        public string ClaimType { get; set; }
        public string ClaimValue { get; set; }
    }

    public class AddRoleClaimDto
    {
        [Required]
        public string ClaimType { get; set; }

        [Required]
        public string ClaimValue { get; set; }
    }

    #endregion
}
