// UC Capital Identity Admin
// Extended User Management API Controller

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.DbContexts;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.Entities.Identity;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Configuration.Constants;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.ExceptionHandling;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Controllers
{
    /// <summary>
    /// 使用者管理擴展 API - 提供統計、啟用/停用、解鎖、重設密碼等功能
    /// </summary>
    [Route("api/user-management")]
    [ApiController]
    [TypeFilter(typeof(ControllerExceptionFilterAttribute))]
    [Produces("application/json", "application/problem+json")]
    [Authorize(Policy = AuthorizationConsts.AdministrationPolicy)]
    public class UserManagementController : ControllerBase
    {
        private readonly UserManager<UserIdentity> _userManager;
        private readonly RoleManager<UserIdentityRole> _roleManager;
        private readonly AdminIdentityDbContext _dbContext;
        private readonly OrganizationDbContext _organizationDbContext;
        private readonly IOrganizationRepository _organizationRepository;

        public UserManagementController(
            UserManager<UserIdentity> userManager,
            RoleManager<UserIdentityRole> roleManager,
            AdminIdentityDbContext dbContext,
            OrganizationDbContext organizationDbContext,
            IOrganizationRepository organizationRepository)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _dbContext = dbContext;
            _organizationDbContext = organizationDbContext;
            _organizationRepository = organizationRepository;
        }

        #region User CRUD

        /// <summary>
        /// 取得使用者列表（分頁）
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<PagedUserResultDto>> GetUsers(
            string search = null,
            bool? isActive = null,
            bool? emailConfirmed = null,
            string roleId = null,
            string organizationId = null,
            int page = 1,
            int pageSize = 10,
            string sortBy = null,
            string sortDirection = "asc")
        {
            var query = _userManager.Users.AsQueryable();

            // 組織成員篩選（遞迴查詢該組織及所有子組織的成員）
            if (!string.IsNullOrEmpty(organizationId))
            {
                // 使用 Repository 遞迴取得該組織及所有子組織的成員 UserId 列表
                var memberUserIds = await _organizationRepository.GetAllDescendantMemberUserIdsAsync(organizationId);

                // 篩選使用者
                query = query.Where(u => memberUserIds.Contains(u.Id));
            }

            // 搜尋
            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(u =>
                    u.UserName.Contains(search) ||
                    u.Email.Contains(search) ||
                    u.DisplayName.Contains(search) ||
                    u.FirstName.Contains(search) ||
                    u.LastName.Contains(search));
            }

            // 篩選
            if (isActive.HasValue)
                query = query.Where(u => u.IsActive == isActive.Value);

            if (emailConfirmed.HasValue)
                query = query.Where(u => u.EmailConfirmed == emailConfirmed.Value);

            // 角色篩選
            if (!string.IsNullOrEmpty(roleId))
            {
                var role = await _roleManager.FindByIdAsync(roleId);
                if (role != null)
                {
                    var usersInRole = await _userManager.GetUsersInRoleAsync(role.Name);
                    var userIds = usersInRole.Select(u => u.Id).ToList();
                    query = query.Where(u => userIds.Contains(u.Id));
                }
            }

            // 排序
            query = sortBy?.ToLower() switch
            {
                "username" => sortDirection == "desc" ? query.OrderByDescending(u => u.UserName) : query.OrderBy(u => u.UserName),
                "email" => sortDirection == "desc" ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
                "createdat" => sortDirection == "desc" ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt),
                "displayname" => sortDirection == "desc" ? query.OrderByDescending(u => u.DisplayName) : query.OrderBy(u => u.DisplayName),
                _ => query.OrderByDescending(u => u.CreatedAt)
            };

            var totalCount = await query.CountAsync();
            var userEntities = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // 取得每個使用者的角色
            var users = new List<UserListItemDto>();
            foreach (var u in userEntities)
            {
                var roles = await _userManager.GetRolesAsync(u);
                users.Add(new UserListItemDto
                {
                    Id = u.Id,
                    UserName = u.UserName,
                    Email = u.Email,
                    DisplayName = u.DisplayName,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    IsActive = u.IsActive,
                    EmailConfirmed = u.EmailConfirmed,
                    LockoutEnd = u.LockoutEnd,
                    CreatedAt = u.CreatedAt,
                    Roles = roles.ToList()
                });
            }

            return Ok(new PagedUserResultDto
            {
                Items = users,
                TotalCount = totalCount,
                PageIndex = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            });
        }

        /// <summary>
        /// 取得單一使用者
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<UserDetailDto>> GetUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            return Ok(await GetUserDetailInternal(user));
        }

        /// <summary>
        /// 更新使用者
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDetailDto dto)
        {
            return await UpdateUserDetail(id, dto);
        }

        /// <summary>
        /// 刪除使用者
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
                return BadRequest(new { message = "刪除失敗", errors = result.Errors.Select(e => e.Description) });

            return Ok(new { message = "使用者已刪除" });
        }

        #endregion

        #region User Claims

        /// <summary>
        /// 取得使用者的宣告
        /// </summary>
        [HttpGet("{id}/claims")]
        public async Task<ActionResult<List<UserClaimDto>>> GetUserClaims(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            var claims = await _userManager.GetClaimsAsync(user);
            var claimDtos = claims.Select((c, index) => new UserClaimDto
            {
                Id = index + 1, // Claims don't have ID, use index
                UserId = id,
                ClaimType = c.Type,
                ClaimValue = c.Value
            }).ToList();

            return Ok(claimDtos);
        }

        /// <summary>
        /// 新增使用者宣告
        /// </summary>
        [HttpPost("{id}/claims")]
        public async Task<ActionResult<UserClaimDto>> AddUserClaim(string id, [FromBody] AddUserClaimDto dto)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            var claim = new System.Security.Claims.Claim(dto.ClaimType, dto.ClaimValue);
            var result = await _userManager.AddClaimAsync(user, claim);

            if (!result.Succeeded)
                return BadRequest(new { message = "新增宣告失敗", errors = result.Errors.Select(e => e.Description) });

            return Ok(new UserClaimDto
            {
                Id = 0, // Claims don't have ID
                UserId = id,
                ClaimType = dto.ClaimType,
                ClaimValue = dto.ClaimValue
            });
        }

        /// <summary>
        /// 刪除使用者宣告
        /// </summary>
        [HttpDelete("{id}/claims/{claimId}")]
        public async Task<IActionResult> DeleteUserClaim(string id, int claimId)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            var claims = await _userManager.GetClaimsAsync(user);
            if (claimId < 1 || claimId > claims.Count)
                return NotFound(new { message = "宣告不存在" });

            var claim = claims[claimId - 1];
            var result = await _userManager.RemoveClaimAsync(user, claim);

            if (!result.Succeeded)
                return BadRequest(new { message = "刪除宣告失敗", errors = result.Errors.Select(e => e.Description) });

            return Ok(new { message = "宣告已刪除" });
        }

        #endregion

        #region Single Role Operations

        /// <summary>
        /// 新增角色給使用者
        /// </summary>
        [HttpPost("{id}/roles/{roleId}")]
        public async Task<IActionResult> AddRoleToUser(string id, string roleId)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            var role = await _roleManager.FindByIdAsync(roleId);
            if (role == null)
                return NotFound(new { message = "角色不存在" });

            var result = await _userManager.AddToRoleAsync(user, role.Name);
            if (!result.Succeeded)
                return BadRequest(new { message = "新增角色失敗", errors = result.Errors.Select(e => e.Description) });

            return Ok(new { message = "角色已新增" });
        }

        /// <summary>
        /// 移除使用者的角色
        /// </summary>
        [HttpDelete("{id}/roles/{roleId}")]
        public async Task<IActionResult> RemoveRoleFromUser(string id, string roleId)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            var role = await _roleManager.FindByIdAsync(roleId);
            if (role == null)
                return NotFound(new { message = "角色不存在" });

            var result = await _userManager.RemoveFromRoleAsync(user, role.Name);
            if (!result.Succeeded)
                return BadRequest(new { message = "移除角色失敗", errors = result.Errors.Select(e => e.Description) });

            return Ok(new { message = "角色已移除" });
        }

        #endregion

        #region Statistics

        /// <summary>
        /// 取得使用者統計資料
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult<UserStatsDto>> GetStats()
        {
            var now = DateTime.UtcNow;
            var sevenDaysAgo = now.AddDays(-7);

            var totalUsers = await _userManager.Users.CountAsync();
            var activeUsers = await _userManager.Users.CountAsync(u => u.IsActive);
            var inactiveUsers = await _userManager.Users.CountAsync(u => !u.IsActive);
            var lockedUsers = await _userManager.Users.CountAsync(u => u.LockoutEnd != null && u.LockoutEnd > now);
            var unconfirmedUsers = await _userManager.Users.CountAsync(u => !u.EmailConfirmed);
            var recentRegistrations = await _userManager.Users.CountAsync(u => u.CreatedAt >= sevenDaysAgo);

            // 角色分佈
            var roles = await _roleManager.Roles.ToListAsync();
            var roleDistribution = new List<RoleDistributionDto>();

            foreach (var role in roles)
            {
                var usersInRole = await _userManager.GetUsersInRoleAsync(role.Name);
                roleDistribution.Add(new RoleDistributionDto
                {
                    RoleId = role.Id,
                    RoleName = role.Name,
                    UserCount = usersInRole.Count,
                    Percentage = totalUsers > 0 ? Math.Round((double)usersInRole.Count / totalUsers * 100, 2) : 0
                });
            }

            return Ok(new UserStatsDto
            {
                TotalUsers = totalUsers,
                ActiveUsers = activeUsers,
                InactiveUsers = inactiveUsers,
                LockedUsers = lockedUsers,
                UnconfirmedUsers = unconfirmedUsers,
                RecentRegistrations = recentRegistrations,
                RoleDistribution = roleDistribution
            });
        }

        #endregion

        #region User Status Operations

        /// <summary>
        /// 啟用使用者帳號
        /// </summary>
        [HttpPost("{id}/activate")]
        public async Task<IActionResult> Activate(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            user.IsActive = true;
            user.UpdatedAt = DateTime.UtcNow;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
                return BadRequest(new { message = "啟用失敗", errors = result.Errors.Select(e => e.Description) });

            return Ok(new { message = "使用者已啟用" });
        }

        /// <summary>
        /// 停用使用者帳號
        /// </summary>
        [HttpPost("{id}/deactivate")]
        public async Task<IActionResult> Deactivate(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
                return BadRequest(new { message = "停用失敗", errors = result.Errors.Select(e => e.Description) });

            return Ok(new { message = "使用者已停用" });
        }

        /// <summary>
        /// 解除使用者鎖定
        /// </summary>
        [HttpPost("{id}/unlock")]
        public async Task<IActionResult> Unlock(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            var result = await _userManager.SetLockoutEndDateAsync(user, null);
            if (!result.Succeeded)
                return BadRequest(new { message = "解鎖失敗", errors = result.Errors.Select(e => e.Description) });

            // 重設登入失敗次數
            await _userManager.ResetAccessFailedCountAsync(user);

            return Ok(new { message = "使用者已解鎖" });
        }

        #endregion

        #region Password Management

        /// <summary>
        /// 管理員重設使用者密碼
        /// </summary>
        [HttpPost("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordDto dto)
        {
            if (dto.NewPassword != dto.ConfirmPassword)
                return BadRequest(new { message = "密碼不一致" });

            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            // 移除現有密碼並設定新密碼
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);

            if (!result.Succeeded)
                return BadRequest(new { message = "重設密碼失敗", errors = result.Errors.Select(e => e.Description) });

            user.UpdatedAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            return Ok(new { message = "密碼已重設" });
        }

        #endregion

        #region Role Management

        /// <summary>
        /// 批量設定使用者角色
        /// </summary>
        [HttpPut("{id}/roles")]
        public async Task<IActionResult> SetUserRoles(string id, [FromBody] SetUserRolesDto dto)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            // 取得目前角色
            var currentRoles = await _userManager.GetRolesAsync(user);

            // 移除所有目前角色
            if (currentRoles.Any())
            {
                var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
                if (!removeResult.Succeeded)
                    return BadRequest(new { message = "移除角色失敗", errors = removeResult.Errors.Select(e => e.Description) });
            }

            // 新增指定角色
            if (dto.RoleIds != null && dto.RoleIds.Any())
            {
                var roleNames = new List<string>();
                foreach (var roleId in dto.RoleIds)
                {
                    var role = await _roleManager.FindByIdAsync(roleId);
                    if (role != null)
                        roleNames.Add(role.Name);
                }

                if (roleNames.Any())
                {
                    var addResult = await _userManager.AddToRolesAsync(user, roleNames);
                    if (!addResult.Succeeded)
                        return BadRequest(new { message = "新增角色失敗", errors = addResult.Errors.Select(e => e.Description) });
                }
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            return Ok(new { message = "角色已更新" });
        }

        /// <summary>
        /// 取得使用者角色（簡化版）
        /// </summary>
        [HttpGet("{id}/roles")]
        public async Task<ActionResult<List<UserRoleDto>>> GetUserRoles(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            var roleNames = await _userManager.GetRolesAsync(user);
            var result = new List<UserRoleDto>();

            foreach (var roleName in roleNames)
            {
                var role = await _roleManager.FindByNameAsync(roleName);
                if (role != null)
                {
                    result.Add(new UserRoleDto
                    {
                        UserId = id,
                        RoleId = role.Id,
                        RoleName = role.Name
                    });
                }
            }

            return Ok(result);
        }

        #endregion

        #region Search & Validation

        /// <summary>
        /// 輕量搜尋使用者（用於自動完成）
        /// </summary>
        [HttpGet("search")]
        public async Task<ActionResult<List<UserBriefDto>>> SearchUsers(string search, int limit = 20)
        {
            if (string.IsNullOrWhiteSpace(search))
                return Ok(new List<UserBriefDto>());

            var users = await _userManager.Users
                .Where(u => u.UserName.Contains(search) ||
                           u.Email.Contains(search) ||
                           u.DisplayName.Contains(search))
                .Take(limit)
                .Select(u => new UserBriefDto
                {
                    Id = u.Id,
                    UserName = u.UserName,
                    Email = u.Email,
                    DisplayName = u.DisplayName,
                    IsActive = u.IsActive
                })
                .ToListAsync();

            return Ok(users);
        }

        /// <summary>
        /// 檢查使用者名稱是否可用
        /// </summary>
        [HttpGet("check-username")]
        public async Task<ActionResult<AvailabilityDto>> CheckUsernameAvailable(string username, string excludeId = null)
        {
            var query = _userManager.Users.Where(u => u.UserName == username);
            if (!string.IsNullOrEmpty(excludeId))
                query = query.Where(u => u.Id != excludeId);

            var exists = await query.AnyAsync();

            return Ok(new AvailabilityDto { Available = !exists });
        }

        /// <summary>
        /// 檢查 Email 是否可用
        /// </summary>
        [HttpGet("check-email")]
        public async Task<ActionResult<AvailabilityDto>> CheckEmailAvailable(string email, string excludeId = null)
        {
            var query = _userManager.Users.Where(u => u.Email == email);
            if (!string.IsNullOrEmpty(excludeId))
                query = query.Where(u => u.Id != excludeId);

            var exists = await query.AnyAsync();

            return Ok(new AvailabilityDto { Available = !exists });
        }

        #endregion

        #region Bulk Operations

        /// <summary>
        /// 批量操作使用者
        /// </summary>
        [HttpPost("bulk")]
        public async Task<ActionResult<BulkOperationResultDto>> BulkOperation([FromBody] BulkUserOperationDto dto)
        {
            var result = new BulkOperationResultDto
            {
                Success = true,
                ProcessedCount = 0,
                FailedCount = 0,
                Errors = new List<string>()
            };

            foreach (var userId in dto.UserIds)
            {
                try
                {
                    var user = await _userManager.FindByIdAsync(userId);
                    if (user == null)
                    {
                        result.FailedCount++;
                        result.Errors.Add($"使用者 {userId} 不存在");
                        continue;
                    }

                    switch (dto.Operation.ToLower())
                    {
                        case "activate":
                            user.IsActive = true;
                            user.UpdatedAt = DateTime.UtcNow;
                            await _userManager.UpdateAsync(user);
                            break;

                        case "deactivate":
                            user.IsActive = false;
                            user.UpdatedAt = DateTime.UtcNow;
                            await _userManager.UpdateAsync(user);
                            break;

                        case "unlock":
                            await _userManager.SetLockoutEndDateAsync(user, null);
                            await _userManager.ResetAccessFailedCountAsync(user);
                            break;

                        case "lock":
                            await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddYears(100));
                            break;

                        case "assignrole":
                            if (!string.IsNullOrEmpty(dto.RoleId))
                            {
                                var role = await _roleManager.FindByIdAsync(dto.RoleId);
                                if (role != null)
                                    await _userManager.AddToRoleAsync(user, role.Name);
                            }
                            break;

                        case "removerole":
                            if (!string.IsNullOrEmpty(dto.RoleId))
                            {
                                var role = await _roleManager.FindByIdAsync(dto.RoleId);
                                if (role != null)
                                    await _userManager.RemoveFromRoleAsync(user, role.Name);
                            }
                            break;

                        case "delete":
                            await _userManager.DeleteAsync(user);
                            break;

                        default:
                            result.FailedCount++;
                            result.Errors.Add($"不支援的操作: {dto.Operation}");
                            continue;
                    }

                    result.ProcessedCount++;
                }
                catch (Exception ex)
                {
                    result.FailedCount++;
                    result.Errors.Add($"處理使用者 {userId} 時發生錯誤: {ex.Message}");
                }
            }

            result.Success = result.FailedCount == 0;
            return Ok(result);
        }

        #endregion

        #region Extended User Operations

        /// <summary>
        /// 取得使用者詳細資訊（含擴展欄位）
        /// </summary>
        [HttpGet("{id}/detail")]
        public async Task<ActionResult<UserDetailDto>> GetUserDetail(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            var roles = await _userManager.GetRolesAsync(user);
            var claims = await _userManager.GetClaimsAsync(user);

            return Ok(new UserDetailDto
            {
                Id = user.Id,
                UserName = user.UserName,
                Email = user.Email,
                EmailConfirmed = user.EmailConfirmed,
                PhoneNumber = user.PhoneNumber,
                PhoneNumberConfirmed = user.PhoneNumberConfirmed,
                TwoFactorEnabled = user.TwoFactorEnabled,
                LockoutEnabled = user.LockoutEnabled,
                LockoutEnd = user.LockoutEnd,
                AccessFailedCount = user.AccessFailedCount,
                FirstName = user.FirstName,
                LastName = user.LastName,
                DisplayName = user.DisplayName,
                PrimaryOrganizationId = user.PrimaryOrganizationId,
                TenantId = user.TenantId,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                Roles = roles.ToList(),
                Claims = claims.Select(c => new UserClaimSimpleDto
                {
                    Type = c.Type,
                    Value = c.Value
                }).ToList()
            });
        }

        /// <summary>
        /// 更新使用者擴展資訊
        /// </summary>
        [HttpPut("{id}/detail")]
        public async Task<IActionResult> UpdateUserDetail(string id, [FromBody] UpdateUserDetailDto dto)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "使用者不存在" });

            // 檢查 UserName 唯一性
            if (user.UserName != dto.UserName)
            {
                var existingUser = await _userManager.FindByNameAsync(dto.UserName);
                if (existingUser != null)
                    return BadRequest(new { message = "使用者名稱已被使用" });
            }

            // 檢查 Email 唯一性
            if (user.Email != dto.Email)
            {
                var existingUser = await _userManager.FindByEmailAsync(dto.Email);
                if (existingUser != null)
                    return BadRequest(new { message = "Email 已被使用" });
            }

            user.UserName = dto.UserName;
            user.Email = dto.Email;
            user.FirstName = dto.FirstName;
            user.LastName = dto.LastName;
            user.DisplayName = dto.DisplayName;
            user.PhoneNumber = dto.PhoneNumber;
            user.PrimaryOrganizationId = dto.PrimaryOrganizationId;
            user.IsActive = dto.IsActive;
            user.EmailConfirmed = dto.EmailConfirmed;
            user.LockoutEnabled = dto.LockoutEnabled;
            user.TwoFactorEnabled = dto.TwoFactorEnabled;
            user.UpdatedAt = DateTime.UtcNow;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
                return BadRequest(new { message = "更新失敗", errors = result.Errors.Select(e => e.Description) });

            return Ok(new { message = "使用者已更新" });
        }

        /// <summary>
        /// 建立使用者（含擴展欄位）
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<UserDetailDto>> CreateUser([FromBody] CreateUserDto dto)
        {
            if (dto.Password != dto.ConfirmPassword)
                return BadRequest(new { message = "密碼不一致" });

            // 檢查 UserName
            var existingByName = await _userManager.FindByNameAsync(dto.UserName);
            if (existingByName != null)
                return BadRequest(new { message = "使用者名稱已被使用" });

            // 檢查 Email
            var existingByEmail = await _userManager.FindByEmailAsync(dto.Email);
            if (existingByEmail != null)
                return BadRequest(new { message = "Email 已被使用" });

            var user = new UserIdentity
            {
                UserName = dto.UserName,
                Email = dto.Email,
                EmailConfirmed = dto.EmailConfirmed,
                PhoneNumber = dto.PhoneNumber,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                DisplayName = dto.DisplayName,
                PrimaryOrganizationId = dto.PrimaryOrganizationId,
                TenantId = dto.TenantId,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
                return BadRequest(new { message = "建立使用者失敗", errors = result.Errors.Select(e => e.Description) });

            // 指派角色
            if (dto.Roles != null && dto.Roles.Any())
            {
                foreach (var roleId in dto.Roles)
                {
                    var role = await _roleManager.FindByIdAsync(roleId);
                    if (role != null)
                        await _userManager.AddToRoleAsync(user, role.Name);
                }
            }

            return CreatedAtAction(nameof(GetUserDetail), new { id = user.Id }, await GetUserDetailInternal(user));
        }

        private async Task<UserDetailDto> GetUserDetailInternal(UserIdentity user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var claims = await _userManager.GetClaimsAsync(user);

            return new UserDetailDto
            {
                Id = user.Id,
                UserName = user.UserName,
                Email = user.Email,
                EmailConfirmed = user.EmailConfirmed,
                PhoneNumber = user.PhoneNumber,
                PhoneNumberConfirmed = user.PhoneNumberConfirmed,
                TwoFactorEnabled = user.TwoFactorEnabled,
                LockoutEnabled = user.LockoutEnabled,
                LockoutEnd = user.LockoutEnd,
                AccessFailedCount = user.AccessFailedCount,
                FirstName = user.FirstName,
                LastName = user.LastName,
                DisplayName = user.DisplayName,
                PrimaryOrganizationId = user.PrimaryOrganizationId,
                TenantId = user.TenantId,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                Roles = roles.ToList(),
                Claims = claims.Select(c => new UserClaimSimpleDto { Type = c.Type, Value = c.Value }).ToList()
            };
        }

        #endregion
    }

    #region DTOs

    public class UserStatsDto
    {
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int InactiveUsers { get; set; }
        public int LockedUsers { get; set; }
        public int UnconfirmedUsers { get; set; }
        public int RecentRegistrations { get; set; }
        public List<RoleDistributionDto> RoleDistribution { get; set; }
    }

    public class RoleDistributionDto
    {
        public string RoleId { get; set; }
        public string RoleName { get; set; }
        public int UserCount { get; set; }
        public double Percentage { get; set; }
    }

    public class ResetPasswordDto
    {
        [Required]
        public string NewPassword { get; set; }

        [Required]
        public string ConfirmPassword { get; set; }
    }

    public class SetUserRolesDto
    {
        public List<string> RoleIds { get; set; }
    }

    public class UserRoleDto
    {
        public string UserId { get; set; }
        public string RoleId { get; set; }
        public string RoleName { get; set; }
    }

    public class UserBriefDto
    {
        public string Id { get; set; }
        public string UserName { get; set; }
        public string Email { get; set; }
        public string DisplayName { get; set; }
        public bool IsActive { get; set; }
    }

    public class AvailabilityDto
    {
        public bool Available { get; set; }
    }

    public class BulkUserOperationDto
    {
        [Required]
        public List<string> UserIds { get; set; }

        [Required]
        public string Operation { get; set; }

        public string RoleId { get; set; }
    }

    public class BulkOperationResultDto
    {
        public bool Success { get; set; }
        public int ProcessedCount { get; set; }
        public int FailedCount { get; set; }
        public List<string> Errors { get; set; }
    }

    public class UserDetailDto
    {
        public string Id { get; set; }
        public string UserName { get; set; }
        public string Email { get; set; }
        public bool EmailConfirmed { get; set; }
        public string PhoneNumber { get; set; }
        public bool PhoneNumberConfirmed { get; set; }
        public bool TwoFactorEnabled { get; set; }
        public bool LockoutEnabled { get; set; }
        public DateTimeOffset? LockoutEnd { get; set; }
        public int AccessFailedCount { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string DisplayName { get; set; }
        public Guid? PrimaryOrganizationId { get; set; }
        public string PrimaryOrganizationName { get; set; }
        public Guid? TenantId { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<string> Roles { get; set; }
        public List<UserClaimSimpleDto> Claims { get; set; }
    }

    public class UserClaimSimpleDto
    {
        public string Type { get; set; }
        public string Value { get; set; }
    }

    public class UpdateUserDetailDto
    {
        [Required]
        public string UserName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string DisplayName { get; set; }
        public string PhoneNumber { get; set; }
        public Guid? PrimaryOrganizationId { get; set; }
        public bool IsActive { get; set; }
        public bool EmailConfirmed { get; set; }
        public bool LockoutEnabled { get; set; }
        public bool TwoFactorEnabled { get; set; }
    }

    public class CreateUserDto
    {
        [Required]
        public string UserName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }

        [Required]
        public string ConfirmPassword { get; set; }

        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string DisplayName { get; set; }
        public string PhoneNumber { get; set; }
        public Guid? PrimaryOrganizationId { get; set; }
        public Guid? TenantId { get; set; }
        public bool IsActive { get; set; } = true;
        public bool EmailConfirmed { get; set; }
        public List<string> Roles { get; set; }
    }

    public class PagedUserResultDto
    {
        public List<UserListItemDto> Items { get; set; }
        public int TotalCount { get; set; }
        public int PageIndex { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class UserListItemDto
    {
        public string Id { get; set; }
        public string UserName { get; set; }
        public string Email { get; set; }
        public string DisplayName { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public bool IsActive { get; set; }
        public bool EmailConfirmed { get; set; }
        public DateTimeOffset? LockoutEnd { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<string> Roles { get; set; } = new List<string>();
    }

    public class UserClaimDto
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public string ClaimType { get; set; }
        public string ClaimValue { get; set; }
    }

    public class AddUserClaimDto
    {
        [Required]
        public string ClaimType { get; set; }

        [Required]
        public string ClaimValue { get; set; }
    }

    #endregion
}
