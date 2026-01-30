// UC Capital - Permission Query Repository Interface
// 權限查詢儲存庫介面 (新架構)

using System.Collections.Generic;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces
{
    /// <summary>
    /// 權限查詢儲存庫介面
    /// 使用 vw_user_permission_scopes View 查詢權限
    /// </summary>
    public interface IPermissionQueryRepository
    {
        /// <summary>
        /// 根據 SubjectId (Users.Id) 查詢使用者權限
        /// </summary>
        /// <param name="subjectId">使用者 Subject ID (Users.Id)</param>
        /// <returns>使用者權限清單</returns>
        Task<IEnumerable<UserPermissionView>> GetPermissionsBySubjectIdAsync(string subjectId);

        /// <summary>
        /// 根據 SubjectId 和系統 ID (ClientId) 查詢使用者權限
        /// </summary>
        /// <param name="subjectId">使用者 Subject ID (Users.Id)</param>
        /// <param name="systemId">系統 ID (ClientId，可選)</param>
        /// <returns>使用者權限清單</returns>
        Task<IEnumerable<UserPermissionView>> GetPermissionsBySubjectIdAndSystemAsync(string subjectId, string? systemId);

        /// <summary>
        /// 檢查 SubjectId 是否存在於 Users 表中
        /// </summary>
        /// <param name="subjectId">使用者 Subject ID (Users.Id)</param>
        /// <returns>是否存在</returns>
        Task<bool> SubjectIdExistsAsync(string subjectId);

        /// <summary>
        /// 根據 SubjectId 和資源代碼查詢使用者權限
        /// </summary>
        /// <param name="subjectId">使用者 Subject ID</param>
        /// <param name="resourceCode">資源代碼</param>
        /// <returns>該資源的權限清單</returns>
        Task<IEnumerable<UserPermissionView>> GetPermissionsBySubjectIdAndResourceAsync(string subjectId, string resourceCode);

        /// <summary>
        /// 根據 SubjectId、資源代碼和系統 ID 查詢使用者權限
        /// </summary>
        /// <param name="subjectId">使用者 Subject ID</param>
        /// <param name="resourceCode">資源代碼</param>
        /// <param name="systemId">系統 ID (ClientId)</param>
        /// <returns>該資源的權限清單</returns>
        Task<IEnumerable<UserPermissionView>> GetPermissionsBySubjectIdResourceAndSystemAsync(string subjectId, string resourceCode, string systemId);

        /// <summary>
        /// 儲存權限檢查記錄
        /// </summary>
        /// <param name="log">權限檢查記錄</param>
        /// <returns>儲存的記錄</returns>
        Task<PermissionCheckLog> SavePermissionCheckLogAsync(PermissionCheckLog log);
    }
}
