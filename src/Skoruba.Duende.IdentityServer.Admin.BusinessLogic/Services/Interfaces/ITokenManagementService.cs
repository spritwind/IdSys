// UC Capital - Token Management Service Interface
// Token 管理服務介面

using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.TokenManagement;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces
{
    /// <summary>
    /// Token 管理服務介面
    /// </summary>
    public interface ITokenManagementService
    {
        /// <summary>
        /// 取得所有活躍 Token（分頁）
        /// </summary>
        /// <param name="page">頁碼</param>
        /// <param name="pageSize">每頁筆數</param>
        /// <param name="search">搜尋關鍵字</param>
        /// <returns>Token 清單</returns>
        Task<TokenListResponse<ActiveTokenDto>> GetActiveTokensAsync(int page = 1, int pageSize = 20, string? search = null);

        /// <summary>
        /// 取得使用者的活躍 Token
        /// </summary>
        /// <param name="subjectId">使用者 ID</param>
        /// <param name="page">頁碼</param>
        /// <param name="pageSize">每頁筆數</param>
        /// <returns>Token 清單</returns>
        Task<TokenListResponse<ActiveTokenDto>> GetUserActiveTokensAsync(string subjectId, int page = 1, int pageSize = 20);

        /// <summary>
        /// 取得客戶端的活躍 Token
        /// </summary>
        /// <param name="clientId">客戶端 ID</param>
        /// <param name="page">頁碼</param>
        /// <param name="pageSize">每頁筆數</param>
        /// <returns>Token 清單</returns>
        Task<TokenListResponse<ActiveTokenDto>> GetClientActiveTokensAsync(string clientId, int page = 1, int pageSize = 20);

        /// <summary>
        /// 取得所有撤銷的 Token（分頁）
        /// </summary>
        /// <param name="page">頁碼</param>
        /// <param name="pageSize">每頁筆數</param>
        /// <returns>Token 清單</returns>
        Task<TokenListResponse<RevokedTokenDto>> GetRevokedTokensAsync(int page = 1, int pageSize = 20);

        /// <summary>
        /// 撤銷 Token
        /// </summary>
        /// <param name="request">撤銷請求</param>
        /// <param name="revokedBy">撤銷者</param>
        /// <returns>撤銷結果</returns>
        Task<RevokedTokenDto> RevokeTokenAsync(RevokeTokenRequest request, string revokedBy);

        /// <summary>
        /// 依 Grant Key 撤銷 Token（從 PersistedGrants 撤銷）
        /// </summary>
        /// <param name="grantKey">Grant Key</param>
        /// <param name="reason">撤銷原因</param>
        /// <param name="revokedBy">撤銷者</param>
        /// <returns>是否成功</returns>
        Task<bool> RevokeByGrantKeyAsync(string grantKey, string? reason, string revokedBy);

        /// <summary>
        /// 撤銷使用者的所有 Token
        /// </summary>
        /// <param name="subjectId">使用者 ID</param>
        /// <param name="reason">撤銷原因</param>
        /// <param name="revokedBy">撤銷者</param>
        /// <returns>撤銷數量</returns>
        Task<int> RevokeUserTokensAsync(string subjectId, string? reason, string revokedBy);

        /// <summary>
        /// 撤銷客戶端的所有 Token
        /// </summary>
        /// <param name="clientId">客戶端 ID</param>
        /// <param name="reason">撤銷原因</param>
        /// <param name="revokedBy">撤銷者</param>
        /// <returns>撤銷數量</returns>
        Task<int> RevokeClientTokensAsync(string clientId, string? reason, string revokedBy);

        /// <summary>
        /// 檢查 Token 是否已撤銷
        /// </summary>
        /// <param name="jti">JWT Token ID</param>
        /// <returns>是否已撤銷</returns>
        Task<bool> IsTokenRevokedAsync(string jti);

        /// <summary>
        /// 取消撤銷
        /// </summary>
        /// <param name="jti">JWT Token ID</param>
        /// <returns>是否成功</returns>
        Task<bool> UnrevokeTokenAsync(string jti);

        /// <summary>
        /// 取得 Token 統計資訊
        /// </summary>
        /// <returns>統計資訊</returns>
        Task<TokenStatistics> GetStatisticsAsync();

        /// <summary>
        /// 清理過期的撤銷記錄
        /// </summary>
        /// <returns>清理數量</returns>
        Task<int> CleanupExpiredRevokedTokensAsync();
    }
}
