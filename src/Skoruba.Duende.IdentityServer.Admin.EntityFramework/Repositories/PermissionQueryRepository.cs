// UC Capital - Permission Query Repository Implementation
// 權限查詢儲存庫實作 (新架構)

using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories
{
    /// <summary>
    /// 權限查詢儲存庫實作
    /// 使用 vw_user_permission_scopes View 查詢權限
    /// </summary>
    public class PermissionQueryRepository : IPermissionQueryRepository
    {
        private readonly PermissionQueryDbContext _dbContext;

        public PermissionQueryRepository(PermissionQueryDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<UserPermissionView>> GetPermissionsBySubjectIdAsync(string subjectId)
        {
            return await _dbContext.UserPermissions
                .Where(x => x.SubjectId == subjectId)
                .AsNoTracking()
                .ToListAsync();
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<UserPermissionView>> GetPermissionsBySubjectIdAndSystemAsync(string subjectId, string? systemId)
        {
            var query = _dbContext.UserPermissions.Where(x => x.SubjectId == subjectId);

            if (!string.IsNullOrEmpty(systemId))
            {
                query = query.Where(x => x.SystemId == systemId);
            }

            return await query.AsNoTracking().ToListAsync();
        }

        /// <inheritdoc/>
        public async Task<bool> SubjectIdExistsAsync(string subjectId)
        {
            // 檢查 Users 表中是否存在該使用者
            return await _dbContext.Users
                .AnyAsync(x => x.Id == subjectId);
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<UserPermissionView>> GetPermissionsBySubjectIdAndResourceAsync(string subjectId, string resourceCode)
        {
            return await _dbContext.UserPermissions
                .Where(x => x.SubjectId == subjectId && x.ResourceCode == resourceCode)
                .AsNoTracking()
                .ToListAsync();
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<UserPermissionView>> GetPermissionsBySubjectIdResourceAndSystemAsync(string subjectId, string resourceCode, string systemId)
        {
            return await _dbContext.UserPermissions
                .Where(x => x.SubjectId == subjectId && x.ResourceCode == resourceCode && x.SystemId == systemId)
                .AsNoTracking()
                .ToListAsync();
        }

        /// <inheritdoc/>
        public async Task<PermissionCheckLog> SavePermissionCheckLogAsync(PermissionCheckLog log)
        {
            _dbContext.PermissionCheckLogs.Add(log);
            await _dbContext.SaveChangesAsync();
            return log;
        }
    }
}
