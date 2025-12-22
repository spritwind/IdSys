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
}
