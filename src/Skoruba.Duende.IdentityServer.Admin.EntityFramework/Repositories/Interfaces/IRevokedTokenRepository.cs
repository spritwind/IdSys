// UC Capital - Revoked Token Repository Interface
// 撤銷 Token Repository 介面

using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces
{
    /// <summary>
    /// 撤銷 Token Repository 介面
    /// </summary>
    public interface IRevokedTokenRepository
    {
        /// <summary>
        /// 檢查 Token 是否已被撤銷
        /// </summary>
        /// <param name="jti">JWT Token ID</param>
        /// <returns>是否已撤銷</returns>
        Task<bool> IsRevokedAsync(string jti);

        /// <summary>
        /// 撤銷 Token
        /// </summary>
        /// <param name="revokedToken">撤銷 Token 資訊</param>
        /// <returns>撤銷結果</returns>
        Task<RevokedToken> RevokeAsync(RevokedToken revokedToken);

        /// <summary>
        /// 取得撤銷 Token 資訊
        /// </summary>
        /// <param name="jti">JWT Token ID</param>
        /// <returns>撤銷 Token 資訊</returns>
        Task<RevokedToken?> GetByJtiAsync(string jti);

        /// <summary>
        /// 取得所有撤銷的 Token（分頁）
        /// </summary>
        /// <param name="page">頁碼（從 1 開始）</param>
        /// <param name="pageSize">每頁筆數</param>
        /// <returns>撤銷 Token 清單</returns>
        Task<(IEnumerable<RevokedToken> Items, int TotalCount)> GetAllAsync(int page = 1, int pageSize = 20);

        /// <summary>
        /// 依客戶端取得撤銷的 Token
        /// </summary>
        /// <param name="clientId">客戶端 ID</param>
        /// <param name="page">頁碼</param>
        /// <param name="pageSize">每頁筆數</param>
        /// <returns>撤銷 Token 清單</returns>
        Task<(IEnumerable<RevokedToken> Items, int TotalCount)> GetByClientIdAsync(string clientId, int page = 1, int pageSize = 20);

        /// <summary>
        /// 依使用者取得撤銷的 Token
        /// </summary>
        /// <param name="subjectId">使用者 ID</param>
        /// <param name="page">頁碼</param>
        /// <param name="pageSize">每頁筆數</param>
        /// <returns>撤銷 Token 清單</returns>
        Task<(IEnumerable<RevokedToken> Items, int TotalCount)> GetBySubjectIdAsync(string subjectId, int page = 1, int pageSize = 20);

        /// <summary>
        /// 清理過期的撤銷記錄
        /// </summary>
        /// <param name="before">清理此時間之前的記錄</param>
        /// <returns>清理的筆數</returns>
        Task<int> CleanupExpiredAsync(DateTime before);

        /// <summary>
        /// 取消撤銷（恢復 Token）
        /// </summary>
        /// <param name="jti">JWT Token ID</param>
        /// <returns>是否成功</returns>
        Task<bool> UnrevokeAsync(string jti);
    }
}
