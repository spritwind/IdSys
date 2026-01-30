// UC Capital - PRS User Entity
// 對應 prs_user 資料表

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// PRS 使用者實體
    /// 對應 prs_user 資料表
    /// </summary>
    public class PrsUser
    {
        /// <summary>
        /// 使用者 ID
        /// </summary>
        public int? UserId { get; set; }

        /// <summary>
        /// 使用者中文姓名
        /// </summary>
        public string? Name { get; set; }

        /// <summary>
        /// 使用者英文姓名
        /// </summary>
        public string? EnName { get; set; }

        /// <summary>
        /// 部門 ID
        /// </summary>
        public int? DepId { get; set; }

        /// <summary>
        /// OAuth Subject ID
        /// 對應 ASP.NET Identity 使用者的 ID (sub claim)
        /// </summary>
        public string? SubjectId { get; set; }
    }
}
