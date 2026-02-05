// UC Capital - Google Workspace Sync Service Interface
// Google Workspace 同步服務介面

using System;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.GoogleSync;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces
{
    /// <summary>
    /// Google Workspace 組織架構同步服務介面
    /// </summary>
    public interface IGoogleWorkspaceSyncService
    {
        /// <summary>
        /// 預覽同步內容（不寫入資料庫）
        /// </summary>
        /// <param name="tenantId">租戶 ID</param>
        /// <param name="targetEmails">指定同步的 Email（null = 全量）</param>
        /// <param name="cancellationToken">取消 Token</param>
        /// <returns>預覽結果</returns>
        Task<GoogleSyncPreviewDto> PreviewSyncAsync(
            Guid? tenantId = null,
            string[]? targetEmails = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// 同步組織架構
        /// </summary>
        /// <param name="tenantId">租戶 ID</param>
        /// <param name="cancellationToken">取消 Token</param>
        /// <returns>同步結果</returns>
        Task<GoogleSyncResultDto> SyncOrganizationsAsync(
            Guid? tenantId = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// 同步人員對應
        /// </summary>
        /// <param name="tenantId">租戶 ID</param>
        /// <param name="targetEmails">指定同步的 Email（null = 全量）</param>
        /// <param name="cancellationToken">取消 Token</param>
        /// <returns>同步結果</returns>
        Task<GoogleSyncResultDto> SyncMembersAsync(
            Guid? tenantId = null,
            string[]? targetEmails = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// 完整同步（組織架構 + 人員對應）
        /// </summary>
        /// <param name="request">同步請求參數</param>
        /// <param name="cancellationToken">取消 Token</param>
        /// <returns>同步結果</returns>
        Task<GoogleSyncResultDto> FullSyncAsync(
            GoogleSyncRequestDto request,
            CancellationToken cancellationToken = default);
    }
}
