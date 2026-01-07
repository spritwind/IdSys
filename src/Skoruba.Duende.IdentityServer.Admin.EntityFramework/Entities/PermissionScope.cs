// UC Capital Identity System
// Permission Scope entity

using System;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 權限範圍實體
    /// </summary>
    public class PermissionScope
    {
        public Guid Id { get; set; }

        /// <summary>
        /// 範圍代碼 (r, c, u, d, e, all)
        /// </summary>
        public string Code { get; set; }

        /// <summary>
        /// 範圍名稱
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// 描述
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// 排序
        /// </summary>
        public int SortOrder { get; set; }
    }
}
