// UC Capital - Organization API DTOs
// 組織架構 API 資料傳輸物件

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Dtos.Organization
{
    /// <summary>
    /// 組織群組 API DTO
    /// </summary>
    public class OrganizationGroupApiDto
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
    }

    /// <summary>
    /// 組織樹狀結構 API DTO
    /// </summary>
    public class OrganizationTreeApiDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string ParentId { get; set; }
        public string DeptCode { get; set; }
        public string DeptEName { get; set; }
        public string DeptZhName { get; set; }
        public string Manager { get; set; }
        public string Description { get; set; }
        public int Depth { get; set; }
        public bool IsCeo { get; set; }
        public bool IsRoot { get; set; }
        public int ChildCount { get; set; }

        /// <summary>
        /// 該組織本身的成員數量
        /// </summary>
        public int MemberCount { get; set; }

        /// <summary>
        /// 該組織及所有子孫組織的成員總數
        /// </summary>
        public int TotalMemberCount { get; set; }

        public List<OrganizationTreeApiDto> Children { get; set; } = new List<OrganizationTreeApiDto>();
    }

    /// <summary>
    /// 組織統計 API DTO
    /// </summary>
    public class OrganizationStatsApiDto
    {
        public int TotalGroups { get; set; }
        public int TotalRootGroups { get; set; }
        public int MaxDepth { get; set; }
        public int GroupsWithManagers { get; set; }
    }

    /// <summary>
    /// 新增組織群組 API DTO
    /// </summary>
    public class CreateOrganizationGroupApiDto
    {
        /// <summary>
        /// 部門名稱（必填）
        /// </summary>
        [Required(ErrorMessage = "部門名稱為必填欄位")]
        [StringLength(200, ErrorMessage = "部門名稱最長 200 字元")]
        public string Name { get; set; }

        /// <summary>
        /// 父群組 ID（null 表示根層級）
        /// </summary>
        [StringLength(50)]
        public string ParentId { get; set; }

        /// <summary>
        /// 部門代碼
        /// </summary>
        [StringLength(50)]
        public string DeptCode { get; set; }

        /// <summary>
        /// 中文名稱
        /// </summary>
        [StringLength(100)]
        public string DeptZhName { get; set; }

        /// <summary>
        /// 英文名稱
        /// </summary>
        [StringLength(100)]
        public string DeptEName { get; set; }

        /// <summary>
        /// 部門主管
        /// </summary>
        [StringLength(100)]
        public string Manager { get; set; }

        /// <summary>
        /// 描述
        /// </summary>
        [StringLength(500)]
        public string Description { get; set; }
    }

    /// <summary>
    /// 更新組織群組 API DTO
    /// </summary>
    public class UpdateOrganizationGroupApiDto
    {
        /// <summary>
        /// 部門名稱（必填）
        /// </summary>
        [Required(ErrorMessage = "部門名稱為必填欄位")]
        [StringLength(200, ErrorMessage = "部門名稱最長 200 字元")]
        public string Name { get; set; }

        /// <summary>
        /// 父群組 ID（null 表示根層級）
        /// </summary>
        [StringLength(50)]
        public string ParentId { get; set; }

        /// <summary>
        /// 部門代碼
        /// </summary>
        [StringLength(50)]
        public string DeptCode { get; set; }

        /// <summary>
        /// 中文名稱
        /// </summary>
        [StringLength(100)]
        public string DeptZhName { get; set; }

        /// <summary>
        /// 英文名稱
        /// </summary>
        [StringLength(100)]
        public string DeptEName { get; set; }

        /// <summary>
        /// 部門主管
        /// </summary>
        [StringLength(100)]
        public string Manager { get; set; }

        /// <summary>
        /// 描述
        /// </summary>
        [StringLength(500)]
        public string Description { get; set; }
    }

    /// <summary>
    /// 刪除確認 API DTO
    /// </summary>
    public class DeleteConfirmationApiDto
    {
        /// <summary>
        /// 待刪除的群組
        /// </summary>
        public OrganizationGroupApiDto Group { get; set; }

        /// <summary>
        /// 將被一同刪除的子群組列表
        /// </summary>
        public List<OrganizationGroupApiDto> Descendants { get; set; } = new List<OrganizationGroupApiDto>();

        /// <summary>
        /// 總計將刪除的群組數量（包含自身）
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// 是否有子群組
        /// </summary>
        public bool HasDescendants { get; set; }
    }

    /// <summary>
    /// 刪除結果 API DTO
    /// </summary>
    public class DeleteResultApiDto
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
    /// 群組成員 API DTO
    /// </summary>
    public class GroupMemberApiDto
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
