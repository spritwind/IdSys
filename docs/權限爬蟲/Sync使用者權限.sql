-- =============================================
-- 1. 建立 KeycloakUserPermission 表 (在 IdentitySysDB 執行)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'KeycloakUserPermission')
BEGIN
    CREATE TABLE [dbo].[KeycloakUserPermission] (
        [userId]       NVARCHAR(50)  NOT NULL,  -- FK to KeycloakUser.id (Keycloak UUID)
        [clientId]     NVARCHAR(50)  NOT NULL,  -- Keycloak Client ID
        [resourceId]   NVARCHAR(200) NOT NULL,  -- rsid
        [username]     NVARCHAR(200) NULL,      -- 帳號 (冗餘，方便查詢)
        [clientName]   NVARCHAR(100) NULL,      -- Client 名稱 (冗餘，方便識別)
        [resourceName] NVARCHAR(500) NULL,      -- rsname (如 "部位表", "策略庫存")
        [scopes]       NVARCHAR(500) NULL,      -- 權限範圍 (如 "@read@write")
        [ENABLED]      BIT           DEFAULT 1, -- 同步啟用狀態
        [INSDATE]      DATETIME      DEFAULT GETDATE(),
        [UPDDATE]      DATETIME      DEFAULT GETDATE(),
        PRIMARY KEY ([userId], [clientId], [resourceId])
    );

    CREATE INDEX IX_KeycloakUserPermission_userId ON [dbo].[KeycloakUserPermission]([userId]);
    CREATE INDEX IX_KeycloakUserPermission_clientId ON [dbo].[KeycloakUserPermission]([clientId]);
    CREATE INDEX IX_KeycloakUserPermission_resourceName ON [dbo].[KeycloakUserPermission]([resourceName]);
    CREATE INDEX IX_KeycloakUserPermission_ENABLED ON [dbo].[KeycloakUserPermission]([ENABLED]);

    PRINT '已建立 KeycloakUserPermission 表';
END
ELSE
BEGIN
    PRINT 'KeycloakUserPermission 表已存在';
END
GO

-- =============================================
-- 2. 建立 JOB_Sync使用者權限 SP
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[JOB_Sync使用者權限]
    @DEBUG BIT = 0  -- DEBUG 模式：1=顯示詳細資訊，0=正常執行
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

    BEGIN TRY
        DECLARE @startTime DATETIME = GETDATE();
        DECLARE @json NVARCHAR(MAX);
        DECLARE @url NVARCHAR(MAX);
        DECLARE @H NVARCHAR(MAX);

        -- Client 設定 (POS 系統)
        DECLARE @clientId NVARCHAR(50) = '9740dcf7-0b06-4cd7-9775-5dc5403e7ee5';
        DECLARE @clientName NVARCHAR(100) = 'pos';

        -- =============================================
        -- Step 1: 取得 Client Token
        -- =============================================
        SET @url = N'https://iam.uccapital.com.tw/realms/uccapital/protocol/openid-connect/token';
        DECLARE @tokenHeader NVARCHAR(MAX) = N'Content-Type: application/x-www-form-urlencoded';
        DECLARE @tokenBody NVARCHAR(MAX) = N'grant_type=client_credentials&client_id=pos&client_secret=aenwD7IEXLOjO7zufyZLkXzjfn7fj11i';

        SET @json = XPOS.CURL.XPOSTAndGetData(@tokenHeader, @tokenBody, @url);
        SET @H = CONCAT('Authorization: Bearer ', JSON_VALUE(@json, '$.access_token'));

        IF @DEBUG = 1
        BEGIN
            PRINT '========================================';
            PRINT '[DEBUG] JOB_Sync使用者權限';
            PRINT '========================================';
            PRINT 'Token 取得成功';
            PRINT 'Client ID: ' + @clientId;
            PRINT 'Client Name: ' + @clientName;
            PRINT '';
        END

        -- =============================================
        -- Step 2: 建立暫存表
        -- =============================================
        DROP TABLE IF EXISTS #AllPermissions;
        CREATE TABLE #AllPermissions (
            [userId]       NVARCHAR(50)  NOT NULL,
            [clientId]     NVARCHAR(50)  NOT NULL,
            [resourceId]   NVARCHAR(200) NOT NULL,
            [username]     NVARCHAR(200) NULL,
            [clientName]   NVARCHAR(100) NULL,
            [resourceName] NVARCHAR(500) NULL,
            [scopes]       NVARCHAR(500) NULL
        );

        -- =============================================
        -- Step 3: 取得所有啟用的使用者清單
        -- =============================================
        DROP TABLE IF EXISTS #UserList;
        SELECT [id], [username]
        INTO #UserList
        FROM [dbo].[KeycloakUser]
        WHERE [ENABLED] = 1
          AND [username] LIKE '%@uccapital.com.tw';  -- 只處理公司帳號

        DECLARE @totalUsers INT = (SELECT COUNT(*) FROM #UserList);

        IF @DEBUG = 1
        BEGIN
            PRINT '[DEBUG] 需處理的使用者數: ' + CAST(@totalUsers AS VARCHAR(10));
            PRINT '';
        END

        -- =============================================
        -- Step 4: 逐一評估每個使用者的權限
        -- =============================================
        DECLARE @currentUserId NVARCHAR(50);
        DECLARE @currentUsername NVARCHAR(200);
        DECLARE @loopCount INT = 0;
        DECLARE @successCount INT = 0;
        DECLARE @errorCount INT = 0;
        DECLARE @permissionApiUrl NVARCHAR(500);
        DECLARE @permissionBody NVARCHAR(200);

        -- 組合權限評估 API URL
        SET @permissionApiUrl = CONCAT(
            N'https://iam.uccapital.com.tw/admin/realms/uccapital/clients/',
            @clientId,
            N'/authz/resource-server/permission/evaluate'
        );

        DECLARE user_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT [id], [username] FROM #UserList;

        OPEN user_cursor;
        FETCH NEXT FROM user_cursor INTO @currentUserId, @currentUsername;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @loopCount = @loopCount + 1;

            -- 組合請求 Body
            SET @permissionBody = CONCAT(N'{"userId": "', @currentUserId, '"}');

            BEGIN TRY
                -- 呼叫權限評估 API (POST)
                SET @json = XPOS.CURL.XPOSTAndGetData(@H, @permissionBody, @permissionApiUrl);

                -- 解析權限並插入暫存表
                INSERT INTO #AllPermissions (
                    [userId], [clientId], [resourceId], [username], [clientName], [resourceName], [scopes]
                )
                SELECT
                    @currentUserId,
                    @clientId,
                    JSON_VALUE(value, '$.rsid'),
                    @currentUsername,
                    @clientName,
                    JSON_VALUE(value, '$.rsname'),
                    (
                        SELECT CASE WHEN COUNT(*) > 0 THEN '@' + STRING_AGG(s.value, '@') ELSE '' END
                        FROM OPENJSON(value, '$.scopes') s
                        WHERE ISNULL(LTRIM(RTRIM(s.value)), '') <> ''
                    )
                FROM OPENJSON(@json, '$.rpt.authorization.permissions')
                WHERE JSON_VALUE(value, '$.rsname') <> 'Default Resource'
                  AND JSON_VALUE(value, '$.rsid') IS NOT NULL;

                SET @successCount = @successCount + 1;

                IF @DEBUG = 1 AND @loopCount <= 5
                BEGIN
                    DECLARE @permCount INT = (
                        SELECT COUNT(*)
                        FROM OPENJSON(@json, '$.rpt.authorization.permissions')
                        WHERE JSON_VALUE(value, '$.rsname') <> 'Default Resource'
                    );
                    PRINT '[DEBUG] ' + CAST(@loopCount AS VARCHAR(10)) + '. ' + @currentUsername + ' - 權限數: ' + CAST(@permCount AS VARCHAR(10));
                END

            END TRY
            BEGIN CATCH
                SET @errorCount = @errorCount + 1;
                IF @DEBUG = 1
                BEGIN
                    PRINT '[WARNING] ' + @currentUsername + ': ' + ERROR_MESSAGE();
                END
            END CATCH

            -- 每 50 筆顯示進度
            IF @DEBUG = 1 AND @loopCount % 50 = 0
            BEGIN
                PRINT '[DEBUG] 進度: ' + CAST(@loopCount AS VARCHAR(10)) + '/' + CAST(@totalUsers AS VARCHAR(10));
            END

            FETCH NEXT FROM user_cursor INTO @currentUserId, @currentUsername;
        END

        CLOSE user_cursor;
        DEALLOCATE user_cursor;

        IF @DEBUG = 1
        BEGIN
            DECLARE @totalPermissions INT = (SELECT COUNT(*) FROM #AllPermissions);
            PRINT '';
            PRINT '[DEBUG] 抓取完成';
            PRINT '[DEBUG]   成功: ' + CAST(@successCount AS VARCHAR(10)) + ' 位使用者';
            PRINT '[DEBUG]   失敗: ' + CAST(@errorCount AS VARCHAR(10)) + ' 位使用者';
            PRINT '[DEBUG]   總權限數: ' + CAST(@totalPermissions AS VARCHAR(10));
            PRINT '';
        END

        -- =============================================
        -- Step 5: MERGE 到正式表
        -- =============================================
        MERGE [dbo].[KeycloakUserPermission] AS T
        USING (
            SELECT [userId], [clientId], [resourceId], [username], [clientName], [resourceName], [scopes]
            FROM #AllPermissions
            WHERE ISNULL([scopes], '') <> ''  -- 只保留有 scopes 的權限
        ) AS S
        ON T.[userId] = S.[userId] AND T.[clientId] = S.[clientId] AND T.[resourceId] = S.[resourceId]
        WHEN MATCHED THEN
            UPDATE SET
                T.[username] = S.[username],
                T.[clientName] = S.[clientName],
                T.[resourceName] = S.[resourceName],
                T.[scopes] = S.[scopes],
                T.[ENABLED] = 1,
                T.[UPDDATE] = GETDATE()
        WHEN NOT MATCHED BY TARGET THEN
            INSERT ([userId], [clientId], [resourceId], [username], [clientName], [resourceName], [scopes], [ENABLED], [INSDATE], [UPDDATE])
            VALUES (S.[userId], S.[clientId], S.[resourceId], S.[username], S.[clientName], S.[resourceName], S.[scopes], 1, GETDATE(), GETDATE())
        WHEN NOT MATCHED BY SOURCE AND T.[clientId] = @clientId THEN
            UPDATE SET T.[ENABLED] = 0, T.[UPDDATE] = GETDATE();

        DECLARE @mergeCount INT = @@ROWCOUNT;

        -- =============================================
        -- Step 6: 輸出結果
        -- =============================================
        DECLARE @totalActivePermissions INT = (SELECT COUNT(*) FROM [dbo].[KeycloakUserPermission] WHERE [ENABLED] = 1 AND [clientId] = @clientId);
        DECLARE @elapsedSec INT = DATEDIFF(SECOND, @startTime, GETDATE());

        PRINT '[JOB_Sync使用者權限] 同步完成';
        PRINT '  Client: ' + @clientName + ' (' + @clientId + ')';
        PRINT '  處理使用者: ' + CAST(@totalUsers AS VARCHAR(10)) + ' 位';
        PRINT '  有效權限數: ' + CAST(@totalActivePermissions AS VARCHAR(10)) + ' 筆';
        PRINT '  異動筆數: ' + CAST(@mergeCount AS VARCHAR(10)) + ' 筆';
        PRINT '  執行時間: ' + CAST(@elapsedSec AS VARCHAR(10)) + ' 秒';

        IF @DEBUG = 1
        BEGIN
            PRINT '';
            PRINT '[DEBUG] === 資源權限統計 (前 10) ===';
            SELECT TOP 10
                [resourceName] AS [資源名稱],
                COUNT(DISTINCT [userId]) AS [擁有權限人數],
                COUNT(*) AS [權限筆數]
            FROM [dbo].[KeycloakUserPermission]
            WHERE [ENABLED] = 1 AND [clientId] = @clientId
            GROUP BY [resourceName]
            ORDER BY COUNT(DISTINCT [userId]) DESC;

            PRINT '';
            PRINT '[DEBUG] === 使用者權限數統計 (前 10) ===';
            SELECT TOP 10
                p.[username] AS [帳號],
                u.[lastName] AS [姓名],
                COUNT(*) AS [權限數]
            FROM [dbo].[KeycloakUserPermission] p
            LEFT JOIN [dbo].[KeycloakUser] u ON p.[userId] = u.[id]
            WHERE p.[ENABLED] = 1 AND p.[clientId] = @clientId
            GROUP BY p.[username], u.[lastName]
            ORDER BY COUNT(*) DESC;
        END

        -- 清理暫存表
        DROP TABLE IF EXISTS #AllPermissions;
        DROP TABLE IF EXISTS #UserList;

    END TRY
    BEGIN CATCH
        DECLARE @ErrMsg NVARCHAR(MAX) = 'JOB_Sync使用者權限 失敗: ' + ERROR_MESSAGE();

        INSERT INTO XPOS.dbo.AUDITLOG (INSDATE, REMARKS, CATEGORY)
        VALUES (GETDATE(), @ErrMsg, 'JOB_Sync使用者權限');

        EXEC XPOS.dbo.[SpLineNotify] @ErrMsg;

        PRINT @ErrMsg;
        THROW;
    END CATCH
END;
GO

-- =============================================
-- 3. 測試執行
-- =============================================
-- DEBUG 模式執行
-- EXEC [dbo].[JOB_Sync使用者權限] @DEBUG = 1;

-- 正常執行
-- EXEC [dbo].[JOB_Sync使用者權限];

-- =============================================
-- 4. 查詢範例
-- =============================================
-- 查詢某使用者的所有權限
-- SELECT p.*, u.lastName
-- FROM KeycloakUserPermission p
-- JOIN KeycloakUser u ON p.userId = u.id
-- WHERE p.username = 'devon.tu@uccapital.com.tw'
--   AND p.ENABLED = 1;

-- 查詢某資源有哪些人有權限
-- SELECT p.username, u.lastName, p.scopes
-- FROM KeycloakUserPermission p
-- JOIN KeycloakUser u ON p.userId = u.id
-- WHERE p.resourceName = '部位表'
--   AND p.ENABLED = 1;

-- 查詢使用者權限 + 群組資訊
-- SELECT
--     u.username, u.lastName,
--     p.resourceName, p.scopes,
--     ug.groupName, ug.groupPath
-- FROM KeycloakUser u
-- LEFT JOIN KeycloakUserPermission p ON u.id = p.userId AND p.ENABLED = 1
-- LEFT JOIN KeycloakUserGroup ug ON u.id = ug.userId
-- WHERE u.username = 'devon.tu@uccapital.com.tw';
