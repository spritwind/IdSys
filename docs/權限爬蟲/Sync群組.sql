CREATE OR ALTER PROCEDURE [dbo].[JOB_Sync群組]
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
            PRINT '[DEBUG] JOB_Sync群組';
            PRINT '========================================';
            PRINT 'Token 取得成功';
            PRINT '';
        END

        -- =============================================
        -- Step 2: 建立暫存表 - Queue 用於 BFS 遍歷
        -- =============================================
        DROP TABLE IF EXISTS #GroupQueue;
        CREATE TABLE #GroupQueue (
            [id] NVARCHAR(50) NOT NULL,
            [depth] INT NOT NULL,
            [processed] BIT DEFAULT 0
        );

        DROP TABLE IF EXISTS #AllGroups;
        CREATE TABLE #AllGroups (
            [id] NVARCHAR(50) NOT NULL,
            [name] NVARCHAR(200),
            [path] NVARCHAR(500),
            [parentId] NVARCHAR(50),
            [description] NVARCHAR(500),
            [subGroupCount] INT,
            [depth] INT,
            [dept_code] NVARCHAR(50),
            [dept_ename] NVARCHAR(100),
            [dept_zhname] NVARCHAR(100),
            [manager] NVARCHAR(100)
        );

        -- =============================================
        -- Step 3: 取得根節點群組
        -- =============================================
        SET @url = N'https://iam.uccapital.com.tw/admin/realms/uccapital/groups';
        SET @json = XPOS.CURL.XGET(@H, @url);

        IF @DEBUG = 1
        BEGIN
            PRINT '[DEBUG] 根節點 API 回應:';
            PRINT LEFT(@json, 1000);
            PRINT '';
        END

        -- 解析根節點群組
        INSERT INTO #AllGroups ([id], [name], [path], [parentId], [description], [subGroupCount], [depth])
        SELECT
            JSON_VALUE(value, '$.id'),
            JSON_VALUE(value, '$.name'),
            JSON_VALUE(value, '$.path'),
            NULL,  -- 根節點沒有 parentId
            JSON_VALUE(value, '$.description'),
            ISNULL(TRY_CAST(JSON_VALUE(value, '$.subGroupCount') AS INT), 0),
            0  -- depth = 0
        FROM OPENJSON(@json);

        -- 將有子群組的根節點加入 Queue
        INSERT INTO #GroupQueue ([id], [depth], [processed])
        SELECT [id], 0, 0
        FROM #AllGroups
        WHERE [subGroupCount] > 0;

        IF @DEBUG = 1
        BEGIN
            DECLARE @rootGroupCount INT = (SELECT COUNT(*) FROM #AllGroups);
            DECLARE @queueCount INT = (SELECT COUNT(*) FROM #GroupQueue);
            PRINT '[DEBUG] 根節點群組數: ' + CAST(@rootGroupCount AS VARCHAR(10));
            PRINT '[DEBUG] 需要遞迴的群組數: ' + CAST(@queueCount AS VARCHAR(10));
            PRINT '';
        END

        -- =============================================
        -- Step 4: BFS 遞迴爬取所有子群組
        -- =============================================
        DECLARE @currentId NVARCHAR(50);
        DECLARE @currentDepth INT;
        DECLARE @loopCount INT = 0;
        DECLARE @maxLoops INT = 500;  -- 防止無限迴圈

        WHILE EXISTS (SELECT 1 FROM #GroupQueue WHERE [processed] = 0) AND @loopCount < @maxLoops
        BEGIN
            SET @loopCount = @loopCount + 1;

            -- 取出一個未處理的群組
            SELECT TOP 1 @currentId = [id], @currentDepth = [depth]
            FROM #GroupQueue
            WHERE [processed] = 0
            ORDER BY [depth], [id];

            -- 標記為已處理
            UPDATE #GroupQueue SET [processed] = 1 WHERE [id] = @currentId;

            -- 呼叫 API 取得子群組
            SET @url = CONCAT(N'https://iam.uccapital.com.tw/admin/realms/uccapital/groups/', @currentId, N'/children');

            BEGIN TRY
                SET @json = XPOS.CURL.XGET(@H, @url);

                IF @DEBUG = 1 AND @loopCount <= 5
                BEGIN
                    PRINT '[DEBUG] Loop ' + CAST(@loopCount AS VARCHAR(10)) + ' - Group ID: ' + @currentId;
                    PRINT '[DEBUG] URL: ' + @url;
                    PRINT '[DEBUG] Response: ' + LEFT(ISNULL(@json, 'NULL'), 500);
                    PRINT '';
                END

                -- 解析子群組
                INSERT INTO #AllGroups ([id], [name], [path], [parentId], [description], [subGroupCount], [depth],
                                        [dept_code], [dept_ename], [dept_zhname], [manager])
                SELECT
                    JSON_VALUE(value, '$.id'),
                    JSON_VALUE(value, '$.name'),
                    JSON_VALUE(value, '$.path'),
                    JSON_VALUE(value, '$.parentId'),
                    JSON_VALUE(value, '$.description'),
                    ISNULL(TRY_CAST(JSON_VALUE(value, '$.subGroupCount') AS INT), 0),
                    @currentDepth + 1,
                    -- attributes
                    JSON_VALUE(value, '$.attributes.dept_code[0]'),
                    JSON_VALUE(value, '$.attributes.dept_ename[0]'),
                    JSON_VALUE(value, '$.attributes.dept_zhname[0]'),
                    JSON_VALUE(value, '$.attributes.manager[0]')
                FROM OPENJSON(@json)
                WHERE JSON_VALUE(value, '$.id') IS NOT NULL;

                -- 將有子群組的加入 Queue
                INSERT INTO #GroupQueue ([id], [depth], [processed])
                SELECT
                    JSON_VALUE(value, '$.id'),
                    @currentDepth + 1,
                    0
                FROM OPENJSON(@json)
                WHERE ISNULL(TRY_CAST(JSON_VALUE(value, '$.subGroupCount') AS INT), 0) > 0
                  AND JSON_VALUE(value, '$.id') NOT IN (SELECT [id] FROM #GroupQueue);

            END TRY
            BEGIN CATCH
                PRINT '[WARNING] Error fetching children for group ' + @currentId + ': ' + ERROR_MESSAGE();
            END CATCH
        END

        IF @DEBUG = 1
        BEGIN
            DECLARE @totalGroupCount INT = (SELECT COUNT(*) FROM #AllGroups);
            PRINT '[DEBUG] 總迴圈次數: ' + CAST(@loopCount AS VARCHAR(10));
            PRINT '[DEBUG] 總群組數: ' + CAST(@totalGroupCount AS VARCHAR(10));
            PRINT '';
        END

        -- =============================================
        -- Step 5: MERGE 到正式表
        -- =============================================
        MERGE [dbo].[KeycloakGroup] AS T
        USING #AllGroups AS S ON T.[id] = S.[id]
        WHEN MATCHED THEN
            UPDATE SET
                T.[name] = S.[name],
                T.[path] = S.[path],
                T.[parentId] = S.[parentId],
                T.[description] = S.[description],
                T.[subGroupCount] = S.[subGroupCount],
                T.[depth] = S.[depth],
                T.[dept_code] = S.[dept_code],
                T.[dept_ename] = S.[dept_ename],
                T.[dept_zhname] = S.[dept_zhname],
                T.[manager] = S.[manager],
                T.[ENABLED] = 1,
                T.[UPDDATE] = GETDATE()
        WHEN NOT MATCHED BY TARGET THEN
            INSERT ([id], [name], [path], [parentId], [description], [subGroupCount], [depth],
                    [dept_code], [dept_ename], [dept_zhname], [manager], [ENABLED], [INSDATE], [UPDDATE])
            VALUES (S.[id], S.[name], S.[path], S.[parentId], S.[description], S.[subGroupCount], S.[depth],
                    S.[dept_code], S.[dept_ename], S.[dept_zhname], S.[manager], 1, GETDATE(), GETDATE())
        WHEN NOT MATCHED BY SOURCE THEN
            UPDATE SET T.[ENABLED] = 0, T.[UPDDATE] = GETDATE();

        DECLARE @mergeCount INT = @@ROWCOUNT;

        -- =============================================
        -- Step 6: 輸出結果
        -- =============================================
        DECLARE @totalGroups INT = (SELECT COUNT(*) FROM [dbo].[KeycloakGroup] WHERE [ENABLED] = 1);
        DECLARE @elapsedSec INT = DATEDIFF(SECOND, @startTime, GETDATE());

        PRINT '[JOB_Sync群組] 同步完成';
        PRINT '  總群組數: ' + CAST(@totalGroups AS VARCHAR(10));
        PRINT '  異動筆數: ' + CAST(@mergeCount AS VARCHAR(10));
        PRINT '  執行時間: ' + CAST(@elapsedSec AS VARCHAR(10)) + ' 秒';

        IF @DEBUG = 1
        BEGIN
            PRINT '';
            PRINT '[DEBUG] === 群組層級分布 ===';
            SELECT [depth] AS [層級], COUNT(*) AS [群組數]
            FROM [dbo].[KeycloakGroup]
            WHERE [ENABLED] = 1
            GROUP BY [depth]
            ORDER BY [depth];

            PRINT '';
            PRINT '[DEBUG] === 前 20 筆群組資料 ===';
            SELECT TOP 20 [id], [name], [path], [parentId], [depth], [dept_code], [manager]
            FROM [dbo].[KeycloakGroup]
            WHERE [ENABLED] = 1
            ORDER BY [path];
        END

        -- 清理暫存表
        DROP TABLE IF EXISTS #GroupQueue;
        DROP TABLE IF EXISTS #AllGroups;

    END TRY
    BEGIN CATCH
        DECLARE @ErrMsg NVARCHAR(MAX) = 'JOB_Sync群組 失敗: ' + ERROR_MESSAGE();

        INSERT INTO XPOS.dbo.AUDITLOG (INSDATE, REMARKS, CATEGORY)
        VALUES (GETDATE(), @ErrMsg, 'JOB_Sync群組');

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
-- EXEC [dbo].[JOB_Sync群組] @DEBUG = 1;

-- 正常執行
-- EXEC [dbo].[JOB_Sync群組];
