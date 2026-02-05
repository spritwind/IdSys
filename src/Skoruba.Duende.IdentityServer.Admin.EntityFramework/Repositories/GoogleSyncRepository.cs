// UC Capital - Google Sync Repository Implementation
// Google Workspace 同步資料庫操作實作（使用 Dapper）

using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities.GoogleSync;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories
{
    /// <summary>
    /// Google Workspace 同步資料庫操作實作
    /// 使用 Dapper 執行高效能 MERGE 操作
    /// </summary>
    public class GoogleSyncRepository : IGoogleSyncRepository
    {
        private readonly string _connectionString;
        private readonly ILogger<GoogleSyncRepository> _logger;

        public GoogleSyncRepository(
            IConfiguration configuration,
            ILogger<GoogleSyncRepository> logger)
        {
            _connectionString = configuration.GetConnectionString("IdentitySysDbConnection")
                ?? configuration.GetConnectionString("ConfigurationDbConnection")
                ?? throw new InvalidOperationException("Database connection string not found");
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<(int organizationCount, int memberCount)> GetExistingStatsAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync(cancellationToken);

            var orgCount = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM [dbo].[Organizations] WHERE [TenantId] = @TenantId AND [IsEnabled] = 1",
                new { TenantId = tenantId });

            var memberCount = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(*) FROM [dbo].[OrganizationMembers] AS M
                INNER JOIN [dbo].[Organizations] AS O ON M.[OrganizationId] = O.[Id_104]
                WHERE O.[TenantId] = @TenantId AND O.[IsEnabled] = 1",
                new { TenantId = tenantId });

            return (orgCount, memberCount);
        }

        /// <inheritdoc/>
        public async Task<(int created, int updated, int disabled)> UpsertOrganizationsAsync(
            List<SyncOrganization> organizations,
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            if (organizations == null || organizations.Count == 0)
                return (0, 0, 0);

            var systemNow = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");

            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync(cancellationToken);

            // 計算同步範圍起點
            var allPaths = organizations.Select(o => o.Path).ToHashSet();
            var scopeRoots = organizations
                .Where(o => string.IsNullOrEmpty(o.ParentId_104) || !allPaths.Contains(GetParentPath(o.Path)))
                .Select(o => o.Path)
                .ToList();

            await using var trans = await conn.BeginTransactionAsync(cancellationToken);
            try
            {
                // A. 建立暫存表
                await conn.ExecuteAsync(@"
                    CREATE TABLE #SourceOrgs (
                        Id_104                   NVARCHAR(100),
                        Name                     NVARCHAR(255),
                        Code                     NVARCHAR(100),
                        Path                     NVARCHAR(MAX),
                        Depth                    INT,
                        ParentId_104             NVARCHAR(100),
                        Description              NVARCHAR(MAX),
                        InheritParentPermissions BIT,
                        ChineseName              NVARCHAR(200),
                        EnglishName              NVARCHAR(200),
                        GroupType                NVARCHAR(20),
                        CreatedAt                NVARCHAR(50),
                        UpdatedAt                NVARCHAR(50),
                        NewGuid                  UNIQUEIDENTIFIER
                    );
                    CREATE TABLE #SyncScope (ScopePath NVARCHAR(MAX));", null, trans);

                // B. 注入來源資料
                foreach (var org in organizations)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO #SourceOrgs (Id_104, Name, Code, Path, Depth, ParentId_104, Description,
                            InheritParentPermissions, ChineseName, EnglishName, GroupType, CreatedAt, UpdatedAt, NewGuid)
                        VALUES (@Id_104, @Name, @Code, @Path, @Depth, @ParentId_104, @Description,
                            @InheritParentPermissions, @ChineseName, @EnglishName, @GroupType, @CreatedAt, @UpdatedAt, @Id)",
                        org, trans);
                }

                // 注入同步邊界
                foreach (var scopeRoot in scopeRoots)
                {
                    await conn.ExecuteAsync("INSERT INTO #SyncScope (ScopePath) VALUES (@Path)",
                        new { Path = scopeRoot }, trans);
                }

                // C. 執行 MERGE 與連動更新
                var result = await conn.QueryFirstAsync<MergeResult>(@"
                    DECLARE @Created INT = 0, @Updated INT = 0, @Disabled INT = 0;
                    DECLARE @MergeOutput TABLE (Action NVARCHAR(10));

                    -- 1. MERGE 組織
                    MERGE [dbo].[Organizations] AS T
                    USING #SourceOrgs AS S ON T.[Id_104] = S.[Id_104] AND T.[TenantId] = @TenantId
                    WHEN MATCHED THEN
                        UPDATE SET
                            [Name]                     = S.[Name],
                            [Code]                     = S.[Code],
                            [Path]                     = S.[Path],
                            [Depth]                    = S.[Depth],
                            [ParentId_104]             = S.[ParentId_104],
                            [Description]              = S.[Description],
                            [InheritParentPermissions] = S.[InheritParentPermissions],
                            [ChineseName]              = S.[ChineseName],
                            [EnglishName]              = S.[EnglishName],
                            [GroupType]                = S.[GroupType],
                            [IsEnabled]                = 1,
                            [UpdatedAt]                = S.[UpdatedAt]
                    WHEN NOT MATCHED BY TARGET THEN
                        INSERT ([Id], [Id_104], [Name], [Code], [Path], [Depth], [TenantId], [IsEnabled],
                                [InheritParentPermissions], [Description], [ChineseName], [EnglishName],
                                [GroupType], [CreatedAt], [UpdatedAt], [SortOrder], [ParentId_104])
                        VALUES (S.[NewGuid], S.[Id_104], S.[Name], S.[Code], S.[Path], S.[Depth], @TenantId, 1,
                                S.[InheritParentPermissions], S.[Description], S.[ChineseName], S.[EnglishName],
                                S.[GroupType], S.[CreatedAt], S.[UpdatedAt], 0, S.[ParentId_104])
                    OUTPUT $action INTO @MergeOutput;

                    -- 統計結果
                    SELECT @Created = COUNT(*) FROM @MergeOutput WHERE Action = 'INSERT';
                    SELECT @Updated = COUNT(*) FROM @MergeOutput WHERE Action = 'UPDATE';

                    -- 2. 路徑連動更新
                    UPDATE Child
                    SET [Path]      = Parent.[Path] + SUBSTRING(Child.[Path], LEN(ISNULL(OldPath.[Path], Child.[Path])) + 1, LEN(Child.[Path])),
                        [UpdatedAt] = @SystemNow
                    FROM [dbo].[Organizations] AS Child
                    INNER JOIN [dbo].[Organizations] AS Parent ON Child.[ParentId_104] = Parent.[Id_104]
                    INNER JOIN #SourceOrgs AS OldPath ON OldPath.[Id_104] = Parent.[Id_104]
                    WHERE Child.[TenantId] = @TenantId
                        AND Child.[Path] NOT LIKE Parent.[Path] + '/%';

                    -- 3. 範圍內軟刪除
                    UPDATE T
                    SET [IsEnabled] = 0,
                        [UpdatedAt] = @SystemNow
                    FROM [dbo].[Organizations] AS T
                    WHERE T.[TenantId] = @TenantId
                        AND EXISTS (SELECT 1 FROM #SyncScope AS SC WHERE T.[Path] = SC.[ScopePath] OR T.[Path] LIKE SC.[ScopePath] + '/%')
                        AND T.[Id_104] NOT IN (SELECT [Id_104] FROM #SourceOrgs);
                    SET @Disabled = @@ROWCOUNT;

                    -- 4. 補齊父層 GUID 關聯
                    UPDATE O
                    SET [ParentId] = P.[Id]
                    FROM [dbo].[Organizations] AS O
                    INNER JOIN [dbo].[Organizations] AS P ON O.[ParentId_104] = P.[Id_104]
                    WHERE O.[TenantId] = @TenantId
                        AND (O.[ParentId] IS NULL OR O.[ParentId] <> P.[Id]);

                    SELECT @Created AS Created, @Updated AS Updated, @Disabled AS Disabled;",
                    new { TenantId = tenantId, SystemNow = systemNow }, trans);

                await trans.CommitAsync(cancellationToken);

                _logger.LogInformation(
                    "Organizations MERGE completed: Created={Created}, Updated={Updated}, Disabled={Disabled}",
                    result.Created, result.Updated, result.Disabled);

                return (result.Created, result.Updated, result.Disabled);
            }
            catch (Exception ex)
            {
                await trans.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Failed to upsert organizations");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<(int synced, int failed, List<string> failedEmails)> SyncMembersAsync(
            List<SyncOrganizationMember> members,
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            if (members == null || members.Count == 0)
                return (0, 0, new List<string>());

            var failedEmails = new List<string>();

            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync(cancellationToken);

            await using var trans = await conn.BeginTransactionAsync(cancellationToken);
            try
            {
                // A. 建立暫存表
                await conn.ExecuteAsync(@"
                    CREATE TABLE #RawMembers (
                        Email           NVARCHAR(255),
                        OrgId104        NVARCHAR(100),
                        PosName         NVARCHAR(255),
                        MemberRole      NVARCHAR(50),
                        IsPrimary       BIT,
                        JoinedAt        NVARCHAR(50),
                        NewGuid         UNIQUEIDENTIFIER
                    );", null, trans);

                // B. 注入資料
                foreach (var member in members)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO #RawMembers (Email, OrgId104, PosName, MemberRole, IsPrimary, JoinedAt, NewGuid)
                        VALUES (@UserId, @OrganizationId, @TempPositionName, @MemberRole, @IsPrimary, @JoinedAt, @Id)",
                        member, trans);
                }

                // C. 執行同步
                var result = await conn.QueryFirstAsync<SyncMemberResult>(@"
                    -- 1. 建立轉換後的來源表
                    SELECT
                        U.[Id] AS [UserId],
                        O.[Id] AS [OrganizationId],
                        P.[Id] AS [PositionId],
                        RM.[MemberRole],
                        RM.[IsPrimary],
                        RM.[JoinedAt],
                        RM.[NewGuid],
                        RM.[Email]
                    INTO #ConvertedMembers
                    FROM #RawMembers AS RM
                    INNER JOIN [dbo].[Users] AS U WITH (NOLOCK) ON U.[Email] = RM.[Email] AND U.[IsActive] = 1
                    INNER JOIN [dbo].[Organizations] AS O WITH (NOLOCK) ON O.[Id_104] = RM.[OrgId104] AND O.[TenantId] = @TenantId
                    LEFT JOIN [dbo].[Positions] AS P WITH (NOLOCK) ON P.[Name] = RM.[PosName];

                    -- 找出無法對應的 Email
                    SELECT RM.[Email] INTO #FailedEmails FROM #RawMembers AS RM
                    WHERE NOT EXISTS (SELECT 1 FROM #ConvertedMembers AS C WHERE C.[Email] = RM.[Email]);

                    -- 2. 清理舊關係
                    DELETE T WITH (ROWLOCK)
                    FROM [dbo].[OrganizationMembers] AS T
                    WHERE T.[UserId] IN (SELECT [UserId] FROM #ConvertedMembers)
                        AND EXISTS (SELECT 1 FROM [dbo].[Organizations] AS O WHERE O.[Id] = T.[OrganizationId] AND O.[TenantId] = @TenantId);

                    -- 3. 插入新關係
                    INSERT INTO [dbo].[OrganizationMembers] WITH (ROWLOCK)
                        ([Id], [OrganizationId], [UserId], [PositionId], [MemberRole], [IsPrimary], [JoinedAt])
                    SELECT [NewGuid], [OrganizationId], [UserId], [PositionId], [MemberRole], [IsPrimary], [JoinedAt]
                    FROM #ConvertedMembers;

                    DECLARE @Synced INT = @@ROWCOUNT;
                    DECLARE @Failed INT = (SELECT COUNT(*) FROM #FailedEmails);

                    SELECT @Synced AS Synced, @Failed AS Failed;",
                    new { TenantId = tenantId }, trans);

                // 取得失敗的 Email
                var failedResult = await conn.QueryAsync<string>(
                    "SELECT [Email] FROM #FailedEmails", null, trans);
                failedEmails.AddRange(failedResult);

                await trans.CommitAsync(cancellationToken);

                _logger.LogInformation(
                    "Members sync completed: Synced={Synced}, Failed={Failed}",
                    result.Synced, result.Failed);

                return (result.Synced, result.Failed, failedEmails);
            }
            catch (Exception ex)
            {
                await trans.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Failed to sync members");
                throw;
            }
        }

        #region Helpers

        private static string GetParentPath(string path)
        {
            return path.LastIndexOf('/') <= 0 ? "/" : path[..path.LastIndexOf('/')];
        }

        private class MergeResult
        {
            public int Created { get; set; }
            public int Updated { get; set; }
            public int Disabled { get; set; }
        }

        private class SyncMemberResult
        {
            public int Synced { get; set; }
            public int Failed { get; set; }
        }

        #endregion
    }
}
