-- =============================================
-- 1. 建立 KeycloakGroupMember 表 (在 IdentitySysDB 執行)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'KeycloakGroupMember')
BEGIN
    CREATE TABLE [dbo].[KeycloakGroupMember] (
        [groupId]   NVARCHAR(50)  NOT NULL,  -- FK to KeycloakGroup.id
        [userId]    NVARCHAR(50)  NOT NULL,  -- FK to KeycloakUser.id
        [username]  NVARCHAR(200) NULL,      -- 冗餘，方便查詢
        [groupName] NVARCHAR(200) NULL,      -- 冗餘，方便查詢
        [groupPath] NVARCHAR(500) NULL,      -- 冗餘，方便查詢
        [INSDATE]   DATETIME DEFAULT GETDATE(),
        PRIMARY KEY ([groupId], [userId])
    );

    CREATE INDEX IX_KeycloakGroupMember_groupId ON [dbo].[KeycloakGroupMember]([groupId]);
    CREATE INDEX IX_KeycloakGroupMember_userId ON [dbo].[KeycloakGroupMember]([userId]);

    PRINT '已建立 KeycloakGroupMember 表';
END
ELSE
BEGIN
    PRINT 'KeycloakGroupMember 表已存在';
END
GO

-- =============================================
-- 2. 建立 JOB_Sync群組成員 SP
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[JOB_Sync群組成員]
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
            PRINT '[DEBUG] JOB_Sync群組成員';
            PRINT '========================================';
            PRINT 'Token 取得成功';
            PRINT '';
        END

        -- =============================================
        -- Step 2: 建立暫存表
        -- =============================================
        DROP TABLE IF EXISTS #AllGroupMembers;
        CREATE TABLE #AllGroupMembers (
            [groupId]   NVARCHAR(50)  NOT NULL,
            [userId]    NVARCHAR(50)  NOT NULL,
            [username]  NVARCHAR(200) NULL,
            [groupName] NVARCHAR(200) NULL,
            [groupPath] NVARCHAR(500) NULL
        );

        -- =============================================
        -- Step 3: 取得所有啟用的群組清單
        -- =============================================
        DROP TABLE IF EXISTS #GroupList;
        SELECT [id], [name], [path]
        INTO #GroupList
        FROM [dbo].[KeycloakGroup]
        WHERE [ENABLED] = 1;

        DECLARE @totalGroups INT = (SELECT COUNT(*) FROM #GroupList);

        IF @DEBUG = 1
        BEGIN
            PRINT '[DEBUG] 需處理的群組數: ' + CAST(@totalGroups AS VARCHAR(10));
            PRINT '';
        END

        -- =============================================
        -- Step 4: 逐一抓取每個群組的成員
        -- =============================================
        DECLARE @currentGroupId NVARCHAR(50);
        DECLARE @currentGroupName NVARCHAR(200);
        DECLARE @currentGroupPath NVARCHAR(500);
        DECLARE @loopCount INT = 0;
        DECLARE @successCount INT = 0;
        DECLARE @errorCount INT = 0;

        DECLARE group_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT [id], [name], [path] FROM #GroupList;

        OPEN group_cursor;
        FETCH NEXT FROM group_cursor INTO @currentGroupId, @currentGroupName, @currentGroupPath;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @loopCount = @loopCount + 1;

            -- 組合 API URL
            SET @url = CONCAT(N'https://iam.uccapital.com.tw/admin/realms/uccapital/groups/', @currentGroupId, N'/members');

            BEGIN TRY
                SET @json = XPOS.CURL.XGET(@H, @url);

                -- 解析並插入暫存表
                INSERT INTO #AllGroupMembers ([groupId], [userId], [username], [groupName], [groupPath])
                SELECT
                    @currentGroupId,
                    JSON_VALUE(value, '$.id'),
                    JSON_VALUE(value, '$.username'),
                    @currentGroupName,
                    @currentGroupPath
                FROM OPENJSON(@json)
                WHERE JSON_VALUE(value, '$.id') IS NOT NULL;

                SET @successCount = @successCount + 1;

                IF @DEBUG = 1 AND @loopCount <= 5
                BEGIN
                    DECLARE @memberCount INT = (SELECT COUNT(*) FROM OPENJSON(@json) WHERE JSON_VALUE(value, '$.id') IS NOT NULL);
                    PRINT '[DEBUG] ' + CAST(@loopCount AS VARCHAR(10)) + '. ' + @currentGroupName + ' - 成員數: ' + CAST(@memberCount AS VARCHAR(10));
                END

            END TRY
            BEGIN CATCH
                SET @errorCount = @errorCount + 1;
                IF @DEBUG = 1
                BEGIN
                    PRINT '[WARNING] ' + @currentGroupName + ': ' + ERROR_MESSAGE();
                END
            END CATCH

            -- 每 50 筆顯示進度
            IF @DEBUG = 1 AND @loopCount % 50 = 0
            BEGIN
                PRINT '[DEBUG] 進度: ' + CAST(@loopCount AS VARCHAR(10)) + '/' + CAST(@totalGroups AS VARCHAR(10));
            END

            FETCH NEXT FROM group_cursor INTO @currentGroupId, @currentGroupName, @currentGroupPath;
        END

        CLOSE group_cursor;
        DEALLOCATE group_cursor;

        IF @DEBUG = 1
        BEGIN
            DECLARE @totalRelations INT = (SELECT COUNT(*) FROM #AllGroupMembers);
            PRINT '';
            PRINT '[DEBUG] 抓取完成';
            PRINT '[DEBUG]   成功: ' + CAST(@successCount AS VARCHAR(10)) + ' 個群組';
            PRINT '[DEBUG]   失敗: ' + CAST(@errorCount AS VARCHAR(10)) + ' 個群組';
            PRINT '[DEBUG]   總關聯數: ' + CAST(@totalRelations AS VARCHAR(10));
            PRINT '';
        END

        -- =============================================
        -- Step 5: 同步到正式表 (先刪後插)
        -- =============================================
        BEGIN TRANSACTION;

        -- 刪除所有舊資料
        DELETE FROM [dbo].[KeycloakGroupMember];
        DECLARE @deleteCount INT = @@ROWCOUNT;

        -- 插入新資料
        INSERT INTO [dbo].[KeycloakGroupMember] ([groupId], [userId], [username], [groupName], [groupPath], [INSDATE])
        SELECT [groupId], [userId], [username], [groupName], [groupPath], GETDATE()
        FROM #AllGroupMembers;

        DECLARE @insertCount INT = @@ROWCOUNT;

        COMMIT TRANSACTION;

        -- =============================================
        -- Step 6: 輸出結果
        -- =============================================
        DECLARE @elapsedSec INT = DATEDIFF(SECOND, @startTime, GETDATE());

        PRINT '[JOB_Sync群組成員] 同步完成';
        PRINT '  處理群組: ' + CAST(@totalGroups AS VARCHAR(10)) + ' 個';
        PRINT '  刪除舊資料: ' + CAST(@deleteCount AS VARCHAR(10)) + ' 筆';
        PRINT '  新增關聯: ' + CAST(@insertCount AS VARCHAR(10)) + ' 筆';
        PRINT '  執行時間: ' + CAST(@elapsedSec AS VARCHAR(10)) + ' 秒';

        IF @DEBUG = 1
        BEGIN
            PRINT '';
            PRINT '[DEBUG] === 成員數最多的群組 (前 10) ===';
            SELECT TOP 10
                [groupName],
                [groupPath],
                COUNT(*) AS [成員數]
            FROM [dbo].[KeycloakGroupMember]
            GROUP BY [groupName], [groupPath]
            ORDER BY COUNT(*) DESC;
        END

        -- 清理暫存表
        DROP TABLE IF EXISTS #AllGroupMembers;
        DROP TABLE IF EXISTS #GroupList;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(MAX) = 'JOB_Sync群組成員 失敗: ' + ERROR_MESSAGE();

        INSERT INTO XPOS.dbo.AUDITLOG (INSDATE, REMARKS, CATEGORY)
        VALUES (GETDATE(), @ErrMsg, 'JOB_Sync群組成員');

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
-- EXEC [dbo].[JOB_Sync群組成員] @DEBUG = 1;

-- 正常執行
-- EXEC [dbo].[JOB_Sync群組成員];
