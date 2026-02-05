// UC Capital - Google Sync Repository Interface
// Google Workspace 同步資料庫操作介面

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities.GoogleSync;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces
{
    /// <summary>
    /// Google Workspace 同步資料庫操作介面
    /// </summary>
    public interface IGoogleSyncRepository
    {
        /// <summary>
        /// 取得現有組織與成員統計
        /// </summary>
        Task<(int organizationCount, int memberCount)> GetExistingStatsAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Upsert 組織架構（使用 MERGE）
        /// </summary>
        /// <returns>建立數、更新數、停用數</returns>
        Task<(int created, int updated, int disabled)> UpsertOrganizationsAsync(
            List<SyncOrganization> organizations,
            Guid tenantId,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// 同步人員對應
        /// </summary>
        /// <returns>同步數、失敗數、失敗的 Email 清單</returns>
        Task<(int synced, int failed, List<string> failedEmails)> SyncMembersAsync(
            List<SyncOrganizationMember> members,
            Guid tenantId,
            CancellationToken cancellationToken = default);
    }
}
