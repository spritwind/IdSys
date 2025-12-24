-- =============================================
-- JOB_驗證使用者群組
-- 比對 KeycloakUserGroup (User→Groups) vs KeycloakGroupMember (Group→Members)
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[JOB_驗證使用者群組]
    @DEBUG BIT = 0  -- DEBUG 模式：1=顯示詳細資訊，0=正常執行
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

    BEGIN TRY
        DECLARE @startTime DATETIME = GETDATE();

        IF @DEBUG = 1
        BEGIN
            PRINT '========================================';
            PRINT '[DEBUG] JOB_驗證使用者群組';
            PRINT '========================================';
            PRINT '';
        END

        -- =============================================
        -- Step 1: 統計兩邊資料量
        -- =============================================
        DECLARE @userGroupCount INT = (SELECT COUNT(*) FROM [dbo].[KeycloakUserGroup]);
        DECLARE @groupMemberCount INT = (SELECT COUNT(*) FROM [dbo].[KeycloakGroupMember]);

        PRINT '[驗證] 資料統計:';
        PRINT '  KeycloakUserGroup (User→Groups): ' + CAST(@userGroupCount AS VARCHAR(10)) + ' 筆';
        PRINT '  KeycloakGroupMember (Group→Members): ' + CAST(@groupMemberCount AS VARCHAR(10)) + ' 筆';
        PRINT '';

        -- =============================================
        -- Step 2: 找出差異
        -- =============================================

        -- 只在 UserGroup (User端有，Group端沒有)
        DROP TABLE IF EXISTS #OnlyInUserGroup;
        SELECT
            ug.[userId],
            ug.[groupId],
            u.[username],
            u.[lastName],
            ug.[groupName],
            ug.[groupPath]
        INTO #OnlyInUserGroup
        FROM [dbo].[KeycloakUserGroup] ug
        LEFT JOIN [dbo].[KeycloakGroupMember] gm
            ON ug.[userId] = gm.[userId] AND ug.[groupId] = gm.[groupId]
        LEFT JOIN [dbo].[KeycloakUser] u ON ug.[userId] = u.[id]
        WHERE gm.[userId] IS NULL;

        DECLARE @onlyInUserGroupCount INT = (SELECT COUNT(*) FROM #OnlyInUserGroup);

        -- 只在 GroupMember (Group端有，User端沒有)
        DROP TABLE IF EXISTS #OnlyInGroupMember;
        SELECT
            gm.[userId],
            gm.[groupId],
            gm.[username],
            u.[lastName],
            gm.[groupName],
            gm.[groupPath]
        INTO #OnlyInGroupMember
        FROM [dbo].[KeycloakGroupMember] gm
        LEFT JOIN [dbo].[KeycloakUserGroup] ug
            ON gm.[userId] = ug.[userId] AND gm.[groupId] = ug.[groupId]
        LEFT JOIN [dbo].[KeycloakUser] u ON gm.[userId] = u.[id]
        WHERE ug.[userId] IS NULL;

        DECLARE @onlyInGroupMemberCount INT = (SELECT COUNT(*) FROM #OnlyInGroupMember);

        -- 兩邊都有 (一致)
        DECLARE @matchCount INT = (
            SELECT COUNT(*)
            FROM [dbo].[KeycloakUserGroup] ug
            INNER JOIN [dbo].[KeycloakGroupMember] gm
                ON ug.[userId] = gm.[userId] AND ug.[groupId] = gm.[groupId]
        );

        -- =============================================
        -- Step 3: 輸出驗證結果
        -- =============================================
        PRINT '[驗證] 比對結果:';
        PRINT '  一致 (兩邊都有): ' + CAST(@matchCount AS VARCHAR(10)) + ' 筆';
        PRINT '  只在 UserGroup: ' + CAST(@onlyInUserGroupCount AS VARCHAR(10)) + ' 筆';
        PRINT '  只在 GroupMember: ' + CAST(@onlyInGroupMemberCount AS VARCHAR(10)) + ' 筆';
        PRINT '';

        -- 判斷是否有差異
        DECLARE @hasDifference BIT = 0;
        IF @onlyInUserGroupCount > 0 OR @onlyInGroupMemberCount > 0
        BEGIN
            SET @hasDifference = 1;
            PRINT '[驗證] *** 發現差異! ***';
            PRINT '';

            -- 顯示差異明細
            IF @onlyInUserGroupCount > 0
            BEGIN
                PRINT '[差異] === 只在 UserGroup (User端有，Group端沒有) ===';
                SELECT
                    [username] AS [帳號],
                    [lastName] AS [姓名],
                    [groupName] AS [群組名稱],
                    [groupPath] AS [群組路徑]
                FROM #OnlyInUserGroup
                ORDER BY [username], [groupName];
            END

            IF @onlyInGroupMemberCount > 0
            BEGIN
                PRINT '[差異] === 只在 GroupMember (Group端有，User端沒有) ===';
                SELECT
                    [username] AS [帳號],
                    [lastName] AS [姓名],
                    [groupName] AS [群組名稱],
                    [groupPath] AS [群組路徑]
                FROM #OnlyInGroupMember
                ORDER BY [username], [groupName];
            END

            -- 記錄到 AUDITLOG
            DECLARE @diffMsg NVARCHAR(MAX) = CONCAT(
                'JOB_驗證使用者群組 發現差異: ',
                '一致=', @matchCount, ', ',
                '只在UserGroup=', @onlyInUserGroupCount, ', ',
                '只在GroupMember=', @onlyInGroupMemberCount
            );

            INSERT INTO XPOS.dbo.AUDITLOG (INSDATE, REMARKS, CATEGORY)
            VALUES (GETDATE(), @diffMsg, 'JOB_驗證使用者群組');

            PRINT '';
            PRINT '[驗證] 已記錄到 AUDITLOG';
        END
        ELSE
        BEGIN
            PRINT '[驗證] ✓ 資料完全一致，無差異';
        END

        -- =============================================
        -- Step 4: DEBUG 模式額外資訊
        -- =============================================
        IF @DEBUG = 1
        BEGIN
            PRINT '';
            PRINT '[DEBUG] === 群組成員數比對 ===';

            -- 比對每個群組的成員數
            SELECT
                COALESCE(ug.[groupName], gm.[groupName]) AS [群組名稱],
                COUNT(DISTINCT ug.[userId]) AS [UserGroup成員數],
                COUNT(DISTINCT gm.[userId]) AS [GroupMember成員數],
                CASE
                    WHEN COUNT(DISTINCT ug.[userId]) = COUNT(DISTINCT gm.[userId]) THEN '✓ 一致'
                    ELSE '✗ 不一致'
                END AS [狀態]
            FROM [dbo].[KeycloakUserGroup] ug
            FULL OUTER JOIN [dbo].[KeycloakGroupMember] gm
                ON ug.[groupId] = gm.[groupId] AND ug.[userId] = gm.[userId]
            GROUP BY COALESCE(ug.[groupName], gm.[groupName]), COALESCE(ug.[groupId], gm.[groupId])
            HAVING COUNT(DISTINCT ug.[userId]) <> COUNT(DISTINCT gm.[userId])
            ORDER BY [群組名稱];

            PRINT '';
            PRINT '[DEBUG] === 使用者群組數比對 ===';

            -- 比對每個使用者的群組數
            SELECT TOP 20
                COALESCE(u.[username], gm.[username]) AS [帳號],
                u.[lastName] AS [姓名],
                COUNT(DISTINCT ug.[groupId]) AS [UserGroup群組數],
                COUNT(DISTINCT gm.[groupId]) AS [GroupMember群組數],
                CASE
                    WHEN COUNT(DISTINCT ug.[groupId]) = COUNT(DISTINCT gm.[groupId]) THEN '✓ 一致'
                    ELSE '✗ 不一致'
                END AS [狀態]
            FROM [dbo].[KeycloakUser] u
            LEFT JOIN [dbo].[KeycloakUserGroup] ug ON u.[id] = ug.[userId]
            LEFT JOIN [dbo].[KeycloakGroupMember] gm ON u.[id] = gm.[userId]
            WHERE u.[ENABLED] = 1
            GROUP BY u.[id], COALESCE(u.[username], gm.[username]), u.[lastName]
            HAVING COUNT(DISTINCT ug.[groupId]) <> COUNT(DISTINCT gm.[groupId])
            ORDER BY [帳號];
        END

        -- =============================================
        -- Step 5: 輸出摘要
        -- =============================================
        DECLARE @elapsedSec INT = DATEDIFF(SECOND, @startTime, GETDATE());

        PRINT '';
        PRINT '[JOB_驗證使用者群組] 驗證完成';
        PRINT '  執行時間: ' + CAST(@elapsedSec AS VARCHAR(10)) + ' 秒';
        PRINT '  結果: ' + CASE WHEN @hasDifference = 1 THEN '有差異' ELSE '完全一致' END;

        -- 清理暫存表
        DROP TABLE IF EXISTS #OnlyInUserGroup;
        DROP TABLE IF EXISTS #OnlyInGroupMember;

        -- 回傳差異狀態 (0=一致, 1=有差異)
        RETURN @hasDifference;

    END TRY
    BEGIN CATCH
        DECLARE @ErrMsg NVARCHAR(MAX) = 'JOB_驗證使用者群組 失敗: ' + ERROR_MESSAGE();

        INSERT INTO XPOS.dbo.AUDITLOG (INSDATE, REMARKS, CATEGORY)
        VALUES (GETDATE(), @ErrMsg, 'JOB_驗證使用者群組');

        PRINT @ErrMsg;
        THROW;
    END CATCH
END;
GO

-- =============================================
-- 測試執行
-- =============================================
-- DEBUG 模式執行
-- EXEC [dbo].[JOB_驗證使用者群組] @DEBUG = 1;

-- 正常執行
-- EXEC [dbo].[JOB_驗證使用者群組];

-- 取得回傳值
-- DECLARE @result INT;
-- EXEC @result = [dbo].[JOB_驗證使用者群組] @DEBUG = 1;
-- PRINT '驗證結果: ' + CASE WHEN @result = 0 THEN '一致' ELSE '有差異' END;
