-- =============================================
-- 1. 建立 KeycloakUser 表 (在 IdentitySysDB 執行)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'KeycloakUser')
BEGIN
    CREATE TABLE [dbo].[KeycloakUser] (
        [id]                 NVARCHAR(50)   NOT NULL PRIMARY KEY,  -- Keycloak User UUID
        [username]           NVARCHAR(200)  NULL,      -- 帳號 (email格式)
        [firstName]          NVARCHAR(100)  NULL,      -- 英文名
        [lastName]           NVARCHAR(100)  NULL,      -- 中文姓名
        [email]              NVARCHAR(200)  NULL,      -- Email
        [emailVerified]      BIT            NULL,      -- Email 驗證狀態
        [isEnabled]          BIT            NULL,      -- Keycloak 帳號啟用狀態
        [createdTime]        DATETIME       NULL,      -- 建立時間 (轉換後)
        [origin]             NVARCHAR(100)  NULL,      -- 來源 (LDAP同步用)
        [federationLink]     NVARCHAR(100)  NULL,      -- 聯邦連結ID
        [LDAP_ENTRY_DN]      NVARCHAR(500)  NULL,      -- LDAP 路徑 (含部門資訊)
        [LDAP_ID]            NVARCHAR(100)  NULL,      -- LDAP ID
        [ENABLED]            BIT            DEFAULT 1, -- 同步啟用狀態
        [INSDATE]            DATETIME       DEFAULT GETDATE(),
        [UPDDATE]            DATETIME       DEFAULT GETDATE()
    );

    CREATE INDEX IX_KeycloakUser_username ON [dbo].[KeycloakUser]([username]);
    CREATE INDEX IX_KeycloakUser_email ON [dbo].[KeycloakUser]([email]);
    CREATE INDEX IX_KeycloakUser_ENABLED ON [dbo].[KeycloakUser]([ENABLED]);

    PRINT '已建立 KeycloakUser 表';
END
ELSE
BEGIN
    PRINT 'KeycloakUser 表已存在';
END
GO

-- =============================================
-- 2. 建立 JOB_Sync使用者 SP
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[JOB_Sync使用者]
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
            PRINT '[DEBUG] JOB_Sync使用者';
            PRINT '========================================';
            PRINT 'Token 取得成功';
            PRINT '';
        END

        -- =============================================
        -- Step 2: 建立暫存表
        -- =============================================
        DROP TABLE IF EXISTS #AllUsers;
        CREATE TABLE #AllUsers (
            [id]                 NVARCHAR(50)   NOT NULL,
            [username]           NVARCHAR(200)  NULL,
            [firstName]          NVARCHAR(100)  NULL,
            [lastName]           NVARCHAR(100)  NULL,
            [email]              NVARCHAR(200)  NULL,
            [emailVerified]      BIT            NULL,
            [isEnabled]          BIT            NULL,
            [createdTime]        DATETIME       NULL,
            [origin]             NVARCHAR(100)  NULL,
            [federationLink]     NVARCHAR(100)  NULL,
            [LDAP_ENTRY_DN]      NVARCHAR(500)  NULL,
            [LDAP_ID]            NVARCHAR(100)  NULL
        );

        -- =============================================
        -- Step 3: 分頁抓取所有使用者
        -- =============================================
        DECLARE @first INT = 0;
        DECLARE @max INT = 500;
        DECLARE @fetchCount INT = 1;  -- 初始值設為1以進入迴圈
        DECLARE @loopCount INT = 0;
        DECLARE @maxLoops INT = 100;  -- 防止無限迴圈 (最多 50000 用戶)

        WHILE @fetchCount > 0 AND @loopCount < @maxLoops
        BEGIN
            SET @loopCount = @loopCount + 1;

            -- 組合 API URL (帶分頁參數)
            SET @url = CONCAT(N'https://iam.uccapital.com.tw/admin/realms/uccapital/users?first=', @first, N'&max=', @max);

            IF @DEBUG = 1
            BEGIN
                PRINT '[DEBUG] 第 ' + CAST(@loopCount AS VARCHAR(10)) + ' 次抓取';
                PRINT '[DEBUG] URL: ' + @url;
            END

            BEGIN TRY
                SET @json = XPOS.CURL.XGET(@H, @url);

                IF @DEBUG = 1 AND @loopCount = 1
                BEGIN
                    PRINT '[DEBUG] 第一筆回應 (前1000字): ' + LEFT(ISNULL(@json, 'NULL'), 1000);
                    PRINT '';
                END

                -- 計算本次抓取數量
                SELECT @fetchCount = COUNT(*)
                FROM OPENJSON(@json)
                WHERE JSON_VALUE(value, '$.id') IS NOT NULL;

                IF @DEBUG = 1
                BEGIN
                    PRINT '[DEBUG] 本次抓取: ' + CAST(@fetchCount AS VARCHAR(10)) + ' 筆';
                END

                -- 解析並插入暫存表
                INSERT INTO #AllUsers (
                    [id], [username], [firstName], [lastName], [email],
                    [emailVerified], [isEnabled], [createdTime], [origin], [federationLink],
                    [LDAP_ENTRY_DN], [LDAP_ID]
                )
                SELECT
                    JSON_VALUE(value, '$.id'),
                    JSON_VALUE(value, '$.username'),
                    JSON_VALUE(value, '$.firstName'),
                    JSON_VALUE(value, '$.lastName'),
                    JSON_VALUE(value, '$.email'),
                    CASE WHEN JSON_VALUE(value, '$.emailVerified') = 'true' THEN 1 ELSE 0 END,
                    CASE WHEN JSON_VALUE(value, '$.enabled') = 'true' THEN 1 ELSE 0 END,
                    -- 將毫秒時間戳轉換為 DATETIME
                    DATEADD(SECOND, TRY_CAST(JSON_VALUE(value, '$.createdTimestamp') AS BIGINT) / 1000, '1970-01-01'),
                    JSON_VALUE(value, '$.origin'),
                    JSON_VALUE(value, '$.federationLink'),
                    JSON_VALUE(value, '$.attributes.LDAP_ENTRY_DN[0]'),
                    JSON_VALUE(value, '$.attributes.LDAP_ID[0]')
                FROM OPENJSON(@json)
                WHERE JSON_VALUE(value, '$.id') IS NOT NULL;

                -- 移動到下一頁
                SET @first = @first + @max;

            END TRY
            BEGIN CATCH
                PRINT '[WARNING] Error fetching users at offset ' + CAST(@first AS VARCHAR(10)) + ': ' + ERROR_MESSAGE();
                SET @fetchCount = 0;  -- 停止迴圈
            END CATCH
        END

        IF @DEBUG = 1
        BEGIN
            DECLARE @totalFetched INT = (SELECT COUNT(*) FROM #AllUsers);
            PRINT '';
            PRINT '[DEBUG] 總共抓取: ' + CAST(@totalFetched AS VARCHAR(10)) + ' 位使用者';
            PRINT '[DEBUG] 迴圈次數: ' + CAST(@loopCount AS VARCHAR(10));
            PRINT '';
        END

        -- =============================================
        -- Step 4: MERGE 到正式表
        -- =============================================
        MERGE [dbo].[KeycloakUser] AS T
        USING #AllUsers AS S ON T.[id] = S.[id]
        WHEN MATCHED THEN
            UPDATE SET
                T.[username] = S.[username],
                T.[firstName] = S.[firstName],
                T.[lastName] = S.[lastName],
                T.[email] = S.[email],
                T.[emailVerified] = S.[emailVerified],
                T.[isEnabled] = S.[isEnabled],
                T.[createdTime] = S.[createdTime],
                T.[origin] = S.[origin],
                T.[federationLink] = S.[federationLink],
                T.[LDAP_ENTRY_DN] = S.[LDAP_ENTRY_DN],
                T.[LDAP_ID] = S.[LDAP_ID],
                T.[ENABLED] = 1,
                T.[UPDDATE] = GETDATE()
        WHEN NOT MATCHED BY TARGET THEN
            INSERT ([id], [username], [firstName], [lastName], [email],
                    [emailVerified], [isEnabled], [createdTime], [origin], [federationLink],
                    [LDAP_ENTRY_DN], [LDAP_ID], [ENABLED], [INSDATE], [UPDDATE])
            VALUES (S.[id], S.[username], S.[firstName], S.[lastName], S.[email],
                    S.[emailVerified], S.[isEnabled], S.[createdTime], S.[origin], S.[federationLink],
                    S.[LDAP_ENTRY_DN], S.[LDAP_ID], 1, GETDATE(), GETDATE())
        WHEN NOT MATCHED BY SOURCE THEN
            UPDATE SET T.[ENABLED] = 0, T.[UPDDATE] = GETDATE();

        DECLARE @mergeCount INT = @@ROWCOUNT;

        -- =============================================
        -- Step 5: 輸出結果
        -- =============================================
        DECLARE @totalUsers INT = (SELECT COUNT(*) FROM [dbo].[KeycloakUser] WHERE [ENABLED] = 1);
        DECLARE @elapsedSec INT = DATEDIFF(SECOND, @startTime, GETDATE());

        PRINT '[JOB_Sync使用者] 同步完成';
        PRINT '  總使用者數: ' + CAST(@totalUsers AS VARCHAR(10));
        PRINT '  異動筆數: ' + CAST(@mergeCount AS VARCHAR(10));
        PRINT '  執行時間: ' + CAST(@elapsedSec AS VARCHAR(10)) + ' 秒';

        IF @DEBUG = 1
        BEGIN
            PRINT '';
            PRINT '[DEBUG] === 前 20 筆使用者資料 ===';
            SELECT TOP 20
                [id], [username], [lastName], [email], [isEnabled],
                [createdTime], [LDAP_ENTRY_DN]
            FROM [dbo].[KeycloakUser]
            WHERE [ENABLED] = 1
            ORDER BY [username];
        END

        -- 清理暫存表
        DROP TABLE IF EXISTS #AllUsers;

    END TRY
    BEGIN CATCH
        DECLARE @ErrMsg NVARCHAR(MAX) = 'JOB_Sync使用者 失敗: ' + ERROR_MESSAGE();

        INSERT INTO XPOS.dbo.AUDITLOG (INSDATE, REMARKS, CATEGORY)
        VALUES (GETDATE(), @ErrMsg, 'JOB_Sync使用者');

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
-- EXEC [dbo].[JOB_Sync使用者] @DEBUG = 1;

-- 正常執行
-- EXEC [dbo].[JOB_Sync使用者];
