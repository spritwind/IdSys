// UC Capital - Permission DTOs
// 權限控管資料傳輸物件

using System;
using System.Collections.Generic;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.Permission
{
    #region Scope DTOs

    /// <summary>
    /// 權限範圍 DTO
    /// </summary>
    public class ScopeDto
    {
        public string Id { get; set; }
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public string Name { get; set; }
        public string DisplayName { get; set; }
        public string IconUri { get; set; }
        public bool Enabled { get; set; }
        public DateTime? InsDate { get; set; }
        public DateTime? UpdDate { get; set; }
    }

    /// <summary>
    /// 建立權限範圍 DTO
    /// </summary>
    public class CreateScopeDto
    {
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public string Name { get; set; }
        public string DisplayName { get; set; }
        public string IconUri { get; set; }
    }

    /// <summary>
    /// 更新權限範圍 DTO
    /// </summary>
    public class UpdateScopeDto
    {
        public string Id { get; set; }
        public string ClientId { get; set; }
        public string Name { get; set; }
        public string DisplayName { get; set; }
        public string IconUri { get; set; }
    }

    #endregion

    #region Resource DTOs

    /// <summary>
    /// 資源 DTO
    /// </summary>
    public class ResourceDto
    {
        public string Id { get; set; }
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public string Name { get; set; }
        public string DisplayName { get; set; }
        public string Type { get; set; }
        public string Uri { get; set; }
        public bool Enabled { get; set; }
        public DateTime? InsDate { get; set; }
        public DateTime? UpdDate { get; set; }

        /// <summary>
        /// 資源關聯的範圍列表
        /// </summary>
        public List<string> Scopes { get; set; } = new List<string>();
    }

    /// <summary>
    /// 建立資源 DTO
    /// </summary>
    public class CreateResourceDto
    {
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public string Name { get; set; }
        public string DisplayName { get; set; }
        public string Type { get; set; }
        public string Uri { get; set; }
        public List<string> ScopeIds { get; set; } = new List<string>();
    }

    /// <summary>
    /// 更新資源 DTO
    /// </summary>
    public class UpdateResourceDto
    {
        public string Id { get; set; }
        public string ClientId { get; set; }
        public string Name { get; set; }
        public string DisplayName { get; set; }
        public string Type { get; set; }
        public string Uri { get; set; }
        public List<string> ScopeIds { get; set; } = new List<string>();
    }

    #endregion

    #region ResourceScope DTOs

    /// <summary>
    /// 資源-範圍關聯 DTO
    /// </summary>
    public class ResourceScopeDto
    {
        public string ResourceId { get; set; }
        public string ResourceName { get; set; }
        public string ScopeId { get; set; }
        public string ScopeName { get; set; }
        public string ClientId { get; set; }
        public DateTime? InsDate { get; set; }
    }

    #endregion

    #region UserPermission DTOs

    /// <summary>
    /// 使用者權限 DTO
    /// </summary>
    public class UserPermissionDto
    {
        public string UserId { get; set; }
        public string Username { get; set; }
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public string ResourceId { get; set; }
        public string ResourceName { get; set; }
        public List<string> Scopes { get; set; } = new List<string>();
        public bool Enabled { get; set; }
        public DateTime? InsDate { get; set; }
        public DateTime? UpdDate { get; set; }
    }

    /// <summary>
    /// 設定使用者權限 DTO
    /// </summary>
    public class SetUserPermissionDto
    {
        public string UserId { get; set; }
        public string Username { get; set; }
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public string ResourceId { get; set; }
        public string ResourceName { get; set; }
        public List<string> Scopes { get; set; } = new List<string>();
    }

    #endregion

    #region GroupPermission DTOs

    /// <summary>
    /// 群組權限 DTO
    /// </summary>
    public class GroupPermissionDto
    {
        public string GroupId { get; set; }
        public string GroupName { get; set; }
        public string GroupPath { get; set; }
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public string ResourceId { get; set; }
        public string ResourceName { get; set; }
        public List<string> Scopes { get; set; } = new List<string>();
        public bool InheritToChildren { get; set; }
        public bool Enabled { get; set; }
        public DateTime? InsDate { get; set; }
        public DateTime? UpdDate { get; set; }
    }

    /// <summary>
    /// 設定群組權限 DTO
    /// </summary>
    public class SetGroupPermissionDto
    {
        public string GroupId { get; set; }
        public string GroupName { get; set; }
        public string GroupPath { get; set; }
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public string ResourceId { get; set; }
        public string ResourceName { get; set; }
        public List<string> Scopes { get; set; } = new List<string>();
        public bool InheritToChildren { get; set; } = true;
    }

    #endregion

    #region EffectivePermission DTOs

    /// <summary>
    /// 有效權限 DTO（合併直接授權和群組繼承）
    /// </summary>
    public class EffectivePermissionDto
    {
        public string ResourceId { get; set; }
        public string ResourceName { get; set; }
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public List<string> Scopes { get; set; } = new List<string>();
        public string Source { get; set; }
        public bool IsFromGroup { get; set; }
        public string SourceGroupId { get; set; }
        public string SourceGroupName { get; set; }
    }

    #endregion

    #region User/Group DTOs (簡化版，用於下拉選單)

    /// <summary>
    /// 使用者簡要 DTO（用於選擇）
    /// </summary>
    public class UserBriefDto
    {
        public string Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string FullName { get; set; }
    }

    /// <summary>
    /// 群組簡要 DTO（用於選擇）
    /// </summary>
    public class GroupBriefDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Path { get; set; }
        public string DeptCode { get; set; }
        public string DeptZhName { get; set; }
    }

    #endregion

    #region Statistics DTOs

    /// <summary>
    /// 權限統計 DTO
    /// </summary>
    public class PermissionStatsDto
    {
        public int TotalScopes { get; set; }
        public int TotalResources { get; set; }
        public int TotalUserPermissions { get; set; }
        public int TotalGroupPermissions { get; set; }
        public int TotalClients { get; set; }
        public List<ClientStatsDto> ClientStats { get; set; } = new List<ClientStatsDto>();
    }

    /// <summary>
    /// 客戶端統計 DTO
    /// </summary>
    public class ClientStatsDto
    {
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public int ScopeCount { get; set; }
        public int ResourceCount { get; set; }
        public int UserPermissionCount { get; set; }
        public int GroupPermissionCount { get; set; }
    }

    #endregion
}
