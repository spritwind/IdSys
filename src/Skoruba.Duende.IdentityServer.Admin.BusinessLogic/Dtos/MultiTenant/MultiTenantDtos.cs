// UC Capital - Multi-Tenant DTOs
// 多租戶系統資料傳輸物件

using System;
using System.Collections.Generic;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.MultiTenant
{
    #region Organization DTOs

    /// <summary>
    /// 組織 DTO
    /// </summary>
    public class OrganizationDto
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string EnglishName { get; set; }
        public Guid? ParentId { get; set; }
        public string Path { get; set; }
        public int Depth { get; set; }
        public int SortOrder { get; set; }
        public string ManagerUserId { get; set; }
        public string ManagerName { get; set; }
        public string Description { get; set; }
        public bool InheritParentPermissions { get; set; }
        public bool IsEnabled { get; set; }
        public int MemberCount { get; set; }
        public int ChildCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<OrganizationDto> Children { get; set; } = new List<OrganizationDto>();
    }

    /// <summary>
    /// 組織樹狀結構 DTO
    /// </summary>
    public class OrganizationTreeNodeDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string EnglishName { get; set; }
        public string Code { get; set; }
        public Guid? ParentId { get; set; }
        public int Depth { get; set; }
        public string ManagerName { get; set; }
        public int MemberCount { get; set; }
        public bool IsRoot => ParentId == null;
        public List<OrganizationTreeNodeDto> Children { get; set; } = new List<OrganizationTreeNodeDto>();
    }

    /// <summary>
    /// 新增組織 DTO
    /// </summary>
    public class CreateOrganizationDto
    {
        public string Name { get; set; }
        public string EnglishName { get; set; }
        public string Code { get; set; }
        public Guid? ParentId { get; set; }
        public string ManagerUserId { get; set; }
        public string Description { get; set; }
        public int SortOrder { get; set; }
        public bool InheritParentPermissions { get; set; } = true;
    }

    /// <summary>
    /// 更新組織 DTO
    /// </summary>
    public class UpdateOrganizationDto
    {
        public string Name { get; set; }
        public string EnglishName { get; set; }
        public string Code { get; set; }
        public Guid? ParentId { get; set; }
        public string ManagerUserId { get; set; }
        public string Description { get; set; }
        public int SortOrder { get; set; }
        public bool InheritParentPermissions { get; set; }
    }

    #endregion

    #region OrganizationMember DTOs

    /// <summary>
    /// 組織成員 DTO
    /// </summary>
    public class OrganizationMemberDto
    {
        public Guid Id { get; set; }
        public Guid OrganizationId { get; set; }
        public string OrganizationName { get; set; }
        public string UserId { get; set; }
        public string UserName { get; set; }
        public string DisplayName { get; set; }
        public string Email { get; set; }
        public Guid? PositionId { get; set; }
        public string PositionName { get; set; }
        public string MemberRole { get; set; }
        public bool IsPrimary { get; set; }
        public DateTime JoinedAt { get; set; }
    }

    /// <summary>
    /// 新增組織成員 DTO
    /// </summary>
    public class AddOrganizationMemberDto
    {
        public Guid OrganizationId { get; set; }
        public string UserId { get; set; }
        public Guid? PositionId { get; set; }
        public string MemberRole { get; set; } = "Member";
        public bool IsPrimary { get; set; }
    }

    #endregion

    #region Position DTOs

    /// <summary>
    /// 職位 DTO
    /// </summary>
    public class PositionDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public int Level { get; set; }
        public string Permissions { get; set; }
        public bool IsEnabled { get; set; }
    }

    #endregion

    #region Permission DTOs

    /// <summary>
    /// 權限資源 DTO
    /// </summary>
    public class PermissionResourceDto
    {
        public Guid Id { get; set; }
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Uri { get; set; }
        public string ResourceType { get; set; }
        public Guid? ParentId { get; set; }
        public int SortOrder { get; set; }
        public bool IsEnabled { get; set; }
        public List<PermissionResourceDto> Children { get; set; } = new List<PermissionResourceDto>();
    }

    /// <summary>
    /// 權限範圍 DTO
    /// </summary>
    public class PermissionScopeDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
    }

    /// <summary>
    /// 權限 DTO
    /// </summary>
    public class PermissionDto
    {
        public Guid Id { get; set; }
        public Guid? TenantId { get; set; }
        public string SubjectType { get; set; }
        public string SubjectId { get; set; }
        public string SubjectName { get; set; }
        public Guid ResourceId { get; set; }
        public string ResourceCode { get; set; }
        public string ResourceName { get; set; }
        public string ClientId { get; set; }
        public string Scopes { get; set; }
        public List<string> ScopeList { get; set; }
        public bool InheritToChildren { get; set; }
        public bool IsEnabled { get; set; }
        public string GrantedBy { get; set; }
        public DateTime GrantedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }

    /// <summary>
    /// 授予權限 DTO
    /// </summary>
    public class GrantPermissionDto
    {
        public string SubjectType { get; set; }
        public string SubjectId { get; set; }
        /// <summary>
        /// 主體名稱 (使用者名稱或組織名稱，用於提升可讀性)
        /// </summary>
        public string SubjectName { get; set; }
        public Guid ResourceId { get; set; }
        public List<string> Scopes { get; set; }
        public bool InheritToChildren { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }

    /// <summary>
    /// 批次授予權限 DTO
    /// </summary>
    public class BatchGrantPermissionDto
    {
        public string SubjectType { get; set; }
        public string SubjectId { get; set; }
        /// <summary>
        /// 主體名稱 (使用者名稱或組織名稱，用於提升可讀性)
        /// </summary>
        public string SubjectName { get; set; }
        public List<ResourceScopeDto> ResourceScopes { get; set; }
        public bool InheritToChildren { get; set; }
    }

    /// <summary>
    /// 資源範圍對應 DTO
    /// </summary>
    public class ResourceScopeDto
    {
        public Guid ResourceId { get; set; }
        public List<string> Scopes { get; set; }
    }

    /// <summary>
    /// 使用者有效權限 DTO
    /// </summary>
    public class UserEffectivePermissionsDto
    {
        public string UserId { get; set; }
        public string UserName { get; set; }
        public List<EffectivePermissionDto> Permissions { get; set; } = new List<EffectivePermissionDto>();
    }

    /// <summary>
    /// 有效權限明細 DTO
    /// </summary>
    public class EffectivePermissionDto
    {
        public Guid ResourceId { get; set; }
        public string ResourceCode { get; set; }
        public string ResourceName { get; set; }
        public string ClientId { get; set; }
        public List<string> Scopes { get; set; }
        public string Source { get; set; }  // Direct, Organization, Group
        public string SourceId { get; set; }
        public string SourceName { get; set; }
    }

    #endregion

    #region Statistics DTOs

    /// <summary>
    /// 組織統計 DTO
    /// </summary>
    public class OrganizationStatsDto
    {
        public int TotalOrganizations { get; set; }
        public int TotalMembers { get; set; }
        public int MaxDepth { get; set; }
    }

    #endregion

    #region Common DTOs

    /// <summary>
    /// 操作結果 DTO
    /// </summary>
    public class OperationResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public object Data { get; set; }
    }

    /// <summary>
    /// 分頁結果 DTO
    /// </summary>
    public class PagedResultDto<T>
    {
        public List<T> Items { get; set; }
        public int TotalCount { get; set; }
        public int PageIndex { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
        public bool HasPreviousPage => PageIndex > 1;
        public bool HasNextPage => PageIndex < TotalPages;
    }

    #endregion
}
