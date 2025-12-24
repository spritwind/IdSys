-- =============================================
-- 1. 建立 KeycloakUserGroup 關聯表 (在 IdentitySysDB 執行)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'KeycloakUserGroup')
BEGIN
    CREATE TABLE [dbo].[KeycloakUserGroup] (
        [userId]    NVARCHAR(50)  NOT NULL,  -- FK to KeycloakUser.id
        [groupId]   NVARCHAR(50)  NOT NULL,  -- FK to KeycloakGroup.id
        [groupName] NVARCHAR(200) NULL,      -- 群組名稱 (冗餘，方便查詢)
        [groupPath] NVARCHAR(500) NULL,      -- 群組路徑 (冗餘，方便查詢)
        [INSDATE]   DATETIME DEFAULT GETDATE(),
        PRIMARY KEY ([userId], [groupId])    -- 複合主鍵
    );

    CREATE INDEX IX_KeycloakUserGroup_userId ON [dbo].[KeycloakUserGroup]([userId]);
    CREATE INDEX IX_KeycloakUserGroup_groupId ON [dbo].[KeycloakUserGroup]([groupId]);

    PRINT '已建立 KeycloakUserGroup 表';
END
ELSE
BEGIN
    PRINT 'KeycloakUserGroup 表已存在';
END
GO

-- =============================================
-- 2. 建立 JOB_Sync使用者群組 SP
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[JOB_Sync使用者群組]
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
            PRINT '[DEBUG] JOB_Sync使用者群組';
            PRINT '========================================';
            PRINT 'Token 取得成功';
            PRINT '';
        END

        -- =============================================
        -- Step 2: 建立暫存表
        -- =============================================
        DROP TABLE IF EXISTS #AllUserGroups;
        CREATE TABLE #AllUserGroups (
            [userId]    NVARCHAR(50)  NOT NULL,
            [groupId]   NVARCHAR(50)  NOT NULL,
            [groupName] NVARCHAR(200) NULL,
            [groupPath] NVARCHAR(500) NULL
        );

        -- =============================================
        -- Step 3: 取得所有啟用的使用者清單
        -- =============================================
        DROP TABLE IF EXISTS #UserList;
        SELECT [id], [username]
        INTO #UserList
        FROM [dbo].[KeycloakUser]
        WHERE [ENABLED] = 1;

        DECLARE @totalUsers INT = (SELECT COUNT(*) FROM #UserList);

        IF @DEBUG = 1
        BEGIN
            PRINT '[DEBUG] 需處理的使用者數: ' + CAST(@totalUsers AS VARCHAR(10));
            PRINT '';
        END

        -- =============================================
        -- Step 4: 逐一抓取每個使用者的群組
        -- =============================================
        DECLARE @currentUserId NVARCHAR(50);
        DECLARE @currentUsername NVARCHAR(200);
        DECLARE @loopCount INT = 0;
        DECLARE @successCount INT = 0;
        DECLARE @errorCount INT = 0;

        DECLARE user_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT [id], [username] FROM #UserList;

        OPEN user_cursor;
        FETCH NEXT FROM user_cursor INTO @currentUserId, @currentUsername;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @loopCount = @loopCount + 1;

            -- 組合 API URL
            SET @url = CONCAT(N'https://iam.uccapital.com.tw/admin/realms/uccapital/users/', @currentUserId, N'/groups');

            BEGIN TRY
                SET @json = XPOS.CURL.XGET(@H, @url);

                -- 解析並插入暫存表
                INSERT INTO #AllUserGroups ([userId], [groupId], [groupName], [groupPath])
                SELECT
                    @currentUserId,
                    JSON_VALUE(value, '$.id'),
                    JSON_VALUE(value, '$.name'),
                    JSON_VALUE(value, '$.path')
                FROM OPENJSON(@json)
                WHERE JSON_VALUE(value, '$.id') IS NOT NULL;

                SET @successCount = @successCount + 1;

                IF @DEBUG = 1 AND @loopCount <= 5
                BEGIN
                    DECLARE @groupCount INT = (SELECT COUNT(*) FROM OPENJSON(@json) WHERE JSON_VALUE(value, '$.id') IS NOT NULL);
                    PRINT '[DEBUG] ' + CAST(@loopCount AS VARCHAR(10)) + '. ' + @currentUsername + ' - 群組數: ' + CAST(@groupCount AS VARCHAR(10));
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
            DECLARE @totalRelations INT = (SELECT COUNT(*) FROM #AllUserGroups);
            PRINT '';
            PRINT '[DEBUG] 抓取完成';
            PRINT '[DEBUG]   成功: ' + CAST(@successCount AS VARCHAR(10)) + ' 位使用者';
            PRINT '[DEBUG]   失敗: ' + CAST(@errorCount AS VARCHAR(10)) + ' 位使用者';
            PRINT '[DEBUG]   總關聯數: ' + CAST(@totalRelations AS VARCHAR(10));
            PRINT '';
        END

        -- =============================================
        -- Step 5: 同步到正式表 (先刪後插)
        -- =============================================
        BEGIN TRANSACTION;

        -- 刪除所有舊資料
        DELETE FROM [dbo].[KeycloakUserGroup];
        DECLARE @deleteCount INT = @@ROWCOUNT;

        -- 插入新資料
        INSERT INTO [dbo].[KeycloakUserGroup] ([userId], [groupId], [groupName], [groupPath], [INSDATE])
        SELECT [userId], [groupId], [groupName], [groupPath], GETDATE()
        FROM #AllUserGroups;

        DECLARE @insertCount INT = @@ROWCOUNT;

        COMMIT TRANSACTION;

        -- =============================================
        -- Step 6: 輸出結果
        -- =============================================
        DECLARE @elapsedSec INT = DATEDIFF(SECOND, @startTime, GETDATE());

        PRINT '[JOB_Sync使用者群組] 同步完成';
        PRINT '  處理使用者: ' + CAST(@totalUsers AS VARCHAR(10)) + ' 位';
        PRINT '  刪除舊資料: ' + CAST(@deleteCount AS VARCHAR(10)) + ' 筆';
        PRINT '  新增關聯: ' + CAST(@insertCount AS VARCHAR(10)) + ' 筆';
        PRINT '  執行時間: ' + CAST(@elapsedSec AS VARCHAR(10)) + ' 秒';

        IF @DEBUG = 1
        BEGIN
            PRINT '';
            PRINT '[DEBUG] === 群組成員統計 (前 10 大群組) ===';
            SELECT TOP 10
                ug.[groupName],
                ug.[groupPath],
                COUNT(*) AS [成員數]
            FROM [dbo].[KeycloakUserGroup] ug
            GROUP BY ug.[groupName], ug.[groupPath]
            ORDER BY COUNT(*) DESC;

            PRINT '';
            PRINT '[DEBUG] === 使用者群組數統計 ===';
            SELECT TOP 10
                u.[username],
                u.[lastName],
                COUNT(ug.[groupId]) AS [所屬群組數]
            FROM [dbo].[KeycloakUser] u
            LEFT JOIN [dbo].[KeycloakUserGroup] ug ON u.[id] = ug.[userId]
            WHERE u.[ENABLED] = 1
            GROUP BY u.[username], u.[lastName]
            ORDER BY COUNT(ug.[groupId]) DESC;
        END

        -- 清理暫存表
        DROP TABLE IF EXISTS #AllUserGroups;
        DROP TABLE IF EXISTS #UserList;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(MAX) = 'JOB_Sync使用者群組 失敗: ' + ERROR_MESSAGE();

        INSERT INTO XPOS.dbo.AUDITLOG (INSDATE, REMARKS, CATEGORY)
        VALUES (GETDATE(), @ErrMsg, 'JOB_Sync使用者群組');

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
-- EXEC [dbo].[JOB_Sync使用者群組] @DEBUG = 1;

-- 正常執行
-- EXEC [dbo].[JOB_Sync使用者群組];

-- =============================================
-- 4. 查詢範例
-- =============================================
-- 查詢某使用者所屬的所有群組
-- SELECT ug.*, u.username, u.lastName
-- FROM KeycloakUserGroup ug
-- JOIN KeycloakUser u ON ug.userId = u.id
-- WHERE u.username = 'someone@uccapital.com.tw';

-- 查詢某群組的所有成員
-- SELECT u.username, u.lastName, ug.groupPath
-- FROM KeycloakUserGroup ug
-- JOIN KeycloakUser u ON ug.userId = u.id
-- WHERE ug.groupName = '人員管理組';
