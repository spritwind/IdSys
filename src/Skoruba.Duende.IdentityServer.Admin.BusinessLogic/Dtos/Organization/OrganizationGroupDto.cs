// UC Capital - Organization Group DTO
// 組織架構資料傳輸物件

using System;
using System.Collections.Generic;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.Organization
{
    /// <summary>
    /// 組織群組 DTO
    /// </summary>
    public class OrganizationGroupDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Path { get; set; }
        public string ParentId { get; set; }
        public string Description { get; set; }
        public int SubGroupCount { get; set; }
        public int Depth { get; set; }
        public string DeptCode { get; set; }
        public string DeptEName { get; set; }
        public string DeptZhName { get; set; }
        public string Manager { get; set; }
        public bool Enabled { get; set; }
        public DateTime? InsDate { get; set; }
        public DateTime? UpdDate { get; set; }
        public List<OrganizationGroupDto> Children { get; set; } = new List<OrganizationGroupDto>();
    }

    /// <summary>
    /// 組織樹狀結構 DTO (用於前端渲染)
    /// </summary>
    public class OrganizationTreeDto
    {
        public string Id { get; set; }
        public string Name { get; set; }

        /// <summary>
        /// 父節點 ID（null 表示根節點）
        /// </summary>
        public string ParentId { get; set; }

        public string DeptCode { get; set; }
        public string DeptEName { get; set; }
        public string DeptZhName { get; set; }
        public string Manager { get; set; }
        public string Description { get; set; }
        public int Depth { get; set; }

        /// <summary>
        /// 是否為 CEO/最高層級節點（後端計算，前端無需再判斷）
        /// </summary>
        public bool IsCeo { get; set; }

        /// <summary>
        /// 是否為根節點（ParentId 為空）
        /// </summary>
        public bool IsRoot => string.IsNullOrEmpty(ParentId);

        /// <summary>
        /// 子節點數量
        /// </summary>
        public int ChildCount => Children?.Count ?? 0;

        /// <summary>
        /// 該組織本身的成員數量
        /// </summary>
        public int MemberCount { get; set; }

        /// <summary>
        /// 該組織及所有子孫組織的成員總數（去重）
        /// </summary>
        public int TotalMemberCount { get; set; }

        public List<OrganizationTreeDto> Children { get; set; } = new List<OrganizationTreeDto>();
    }

    /// <summary>
    /// 組織統計 DTO
    /// </summary>
    public class OrganizationStatsDto
    {
        public int TotalGroups { get; set; }
        public int TotalRootGroups { get; set; }
        public int MaxDepth { get; set; }
        public int GroupsWithManagers { get; set; }
    }

    /// <summary>
    /// 新增組織群組 DTO
    /// </summary>
    public class CreateOrganizationGroupDto
    {
        /// <summary>
        /// 部門名稱（必填）
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// 父群組 ID（null 表示根層級）
        /// </summary>
        public string ParentId { get; set; }

        /// <summary>
        /// 部門代碼
        /// </summary>
        public string DeptCode { get; set; }

        /// <summary>
        /// 中文名稱
        /// </summary>
        public string DeptZhName { get; set; }

        /// <summary>
        /// 英文名稱
        /// </summary>
        public string DeptEName { get; set; }

        /// <summary>
        /// 部門主管
        /// </summary>
        public string Manager { get; set; }

        /// <summary>
        /// 描述
        /// </summary>
        public string Description { get; set; }
    }

    /// <summary>
    /// 更新組織群組 DTO
    /// </summary>
    public class UpdateOrganizationGroupDto
    {
        /// <summary>
        /// 部門名稱（必填）
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// 父群組 ID（null 表示根層級）
        /// </summary>
        public string ParentId { get; set; }

        /// <summary>
        /// 部門代碼
        /// </summary>
        public string DeptCode { get; set; }

        /// <summary>
        /// 中文名稱
        /// </summary>
        public string DeptZhName { get; set; }

        /// <summary>
        /// 英文名稱
        /// </summary>
        public string DeptEName { get; set; }

        /// <summary>
        /// 部門主管
        /// </summary>
        public string Manager { get; set; }

        /// <summary>
        /// 描述
        /// </summary>
        public string Description { get; set; }
    }

    /// <summary>
    /// 刪除確認資訊 DTO（包含待刪除的群組及子群組列表）
    /// </summary>
    public class DeleteConfirmationDto
    {
        /// <summary>
        /// 待刪除的群組
        /// </summary>
        public OrganizationGroupDto Group { get; set; }

        /// <summary>
        /// 將被一同刪除的子群組列表
        /// </summary>
        public List<OrganizationGroupDto> Descendants { get; set; } = new List<OrganizationGroupDto>();

        /// <summary>
        /// 總計將刪除的群組數量（包含自身）
        /// </summary>
        public int TotalCount => 1 + (Descendants?.Count ?? 0);

        /// <summary>
        /// 是否有子群組
        /// </summary>
        public bool HasDescendants => Descendants?.Count > 0;
    }

    /// <summary>
    /// 刪除結果 DTO
    /// </summary>
    public class DeleteResultDto
    {
        /// <summary>
        /// 是否成功
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// 刪除的群組數量
        /// </summary>
        public int DeletedCount { get; set; }

        /// <summary>
        /// 訊息
        /// </summary>
        public string Message { get; set; }
    }

    /// <summary>
    /// 群組成員 DTO（基於 KeycloakGroupMember）
    /// </summary>
    public class GroupMemberDto
    {
        /// <summary>
        /// 群組 ID
        /// </summary>
        public string GroupId { get; set; }

        /// <summary>
        /// 使用者 ID
        /// </summary>
        public string UserId { get; set; }

        /// <summary>
        /// 使用者名稱
        /// </summary>
        public string UserName { get; set; }

        /// <summary>
        /// 顯示名稱
        /// </summary>
        public string DisplayName { get; set; }

        /// <summary>
        /// Email
        /// </summary>
        public string Email { get; set; }

        /// <summary>
        /// 群組名稱
        /// </summary>
        public string GroupName { get; set; }

        /// <summary>
        /// 群組路徑
        /// </summary>
        public string GroupPath { get; set; }

        /// <summary>
        /// 加入時間
        /// </summary>
        public DateTime? JoinedAt { get; set; }
    }
}
