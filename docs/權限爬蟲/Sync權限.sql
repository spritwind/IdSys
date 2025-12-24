USE [XPOS]
GO
/****** Object:  StoredProcedure [dbo].[JOB_Sync權限]    Script Date: 2025/12/19 上午 10:14:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO




ALTER     PROCEDURE [dbo].[JOB_Sync權限]
AS
BEGIN
    SET NOCOUNT ON;SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
	BEGIN TRY
		
	--取得client token
	DECLARE @url NVARCHAR(MAX) = N'https://iam.uccapital.com.tw/realms/uccapital/protocol/openid-connect/token';
	DECLARE @H   NVARCHAR(MAX) = N'Content-Type: application/x-www-form-urlencoded';
	DECLARE @d   NVARCHAR(MAX) = concat('grant_type=client_credentials','&client_id=pos','&client_secret=aenwD7IEXLOjO7zufyZLkXzjfn7fj11i');
	DECLARE @json NVARCHAR(MAX) = CURL.XPOSTAndGetData(@H, @d, @url);

	DROP TABLE IF exists #H;
	select concat('Authorization: Bearer ', JSON_VALUE(@json, '$.access_token')) H,JSON_VALUE(@json, '$.access_token') token,'9740dcf7-0b06-4cd7-9775-5dc5403e7ee5' clientID into #H

	--取得所有users
	DECLARE @url2 NVARCHAR(MAX) = N'https://iam.uccapital.com.tw/admin/realms/uccapital/users';
	DECLARE @json2 NVARCHAR(MAX) = XPOS.CURL.XGET((select H from #H), @url2);
	PRINT @json2
	DROP TABLE IF exists #users;
	SELECT
		id = JSON_VALUE(value, '$.id'),
		lastName = JSON_VALUE(value, '$.lastName'),
		email = JSON_VALUE(value, '$.email'),
		[enabled] =JSON_VALUE(value, '$.enabled'),
		account = dbo.StrBetween(JSON_VALUE(value, '$.email'),'','@'),
		resourceApi =concat(N'https://iam.uccapital.com.tw/admin/realms/uccapital/clients/',( select clientID from #H),'/authz/resource-server/permission/evaluate'),
		resourceBody =concat(N'{"userId": "',JSON_VALUE(value, '$.id'),'"}') --{"userId": "dc1538b3-f136-48ea-8816-f4ca58db6aaa"}
		into #users
	FROM OPENJSON(@json2)
	where JSON_VALUE(value, '$.email') like '%@uccapital.com.tw';

	-- 建立結果表
	DROP TABLE IF exists #UserPermission;
	CREATE TABLE #UserPermission (
		[user_id] NVARCHAR(200),
		[account] NVARCHAR(200),
		resource_id NVARCHAR(200),
		[name] NVARCHAR(500),
		scopes NVARCHAR(200),
		rawjson NVARCHAR(MAX)
	);

	-- 宣告變數
	DECLARE @id NVARCHAR(200), @account NVARCHAR(200), @resourceBody NVARCHAR(200), @resourceApi NVARCHAR(1000), @json3 NVARCHAR(MAX);

	-- 建立 cursor
	DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
	SELECT id, account, resourceApi, resourceBody FROM #users --WHERE [id]='dc1538b3-f136-48ea-8816-f4ca58db6aaa' ;
	OPEN cur FETCH NEXT FROM cur INTO @id, @account, @resourceApi, @resourceBody;
	WHILE @@FETCH_STATUS = 0 BEGIN
		BEGIN TRY
			-- 調用 API
			--SET @json3 = XPOS.CURL.XGET((select H from #H), @resourceApi);

			PRINT @resourceBody;
			PRINT @resourceApi;
			SET @json3 = CURL.XPOSTAndGetData((select H from #H), @resourceBody, @resourceApi);
			PRINT @json3
			-- 解析每一個 resource 物件
			INSERT INTO #UserPermission (user_id,account, resource_id, name, scopes, rawjson)
			SELECT
				@id AS user_id,
				@account account,
				JSON_VALUE(value, '$.rsid') AS resource_id,
				JSON_VALUE(value, '$.rsname') AS [name],
				--JSON_VALUE(value, '$.rsname') AS [displayName],
				(
					--SELECT STRING_AGG(s.value, '@') FROM OPENJSON(value, '$.scopes') s
					SELECT  CASE WHEN COUNT(*) > 0 THEN '@' + STRING_AGG(s.value, '@')  ELSE ''  END
					FROM OPENJSON(value, '$.scopes') s
					WHERE ISNULL(LTRIM(RTRIM(s.value)), '') <> ''
				)  AS scopes,
				value AS rawjson
			FROM OPENJSON(@json3, '$.rpt.authorization.permissions');
		END TRY
		BEGIN CATCH
			PRINT CONCAT('Error fetching resource for ', @account, ': ', ERROR_MESSAGE());
		END CATCH;
		FETCH NEXT FROM cur INTO @id, @account, @resourceApi, @resourceBody;;
	END
	CLOSE cur;
	DEALLOCATE cur;

	 
	--更新至本地端權限 [USER]
	MERGE XPOS.dbo.[USER] AS T
	USING (SELECT account AS PK,email AS EMAIL,lastName AS NAME,'8u7BtCnDVEQ=' AS PWD,IIF([enabled] = 'true', 1, 0) AS ENABLED,'sys' AS INSUSER,'sys' AS UPDUSER,id AS TOKEN FROM  #users) AS S
		ON T.PK = S.PK
	WHEN MATCHED THEN -- (3) 若來源、目地都有 → UPDATE
		UPDATE SET T.PWD = S.PWD,T.NAME = S.NAME,T.EMAIL = S.EMAIL,T.ENABLED = S.ENABLED,T.TOKEN = S.TOKEN,T.UPDUSER = 'sys',T.UPDDATE = GETDATE()
	WHEN NOT MATCHED BY TARGET THEN
		INSERT (PK, PWD, NAME, EMAIL, ENABLED, INSUSER, UPDUSER, TOKEN)
		VALUES (S.PK, S.PWD, S.NAME, S.EMAIL, S.ENABLED, S.INSUSER, S.UPDUSER, S.TOKEN)
	WHEN NOT MATCHED BY SOURCE THEN
	    UPDATE SET T.ENABLED = 0,T.UPDUSER = 'sys',T.UPDDATE = GETDATE();

	--更新至本地端權限 [UserPermission]
	MERGE XPOS.dbo.[UserPermission] AS T
	USING ( SELECT account AS USER_PK, resource_id AS rsid,[name] rsname, scopes, 1 AS ENABLED, 'sys' AS INSUSER, 'sys' AS UPDUSER FROM #UserPermission where [name] not in ('Default Resource') and isnull(scopes,'')<>'' ) AS S
		ON T.USER_PK = S.USER_PK AND T.rsid = S.rsid
	WHEN MATCHED THEN -- (3) 若來源與目地皆有 → UPDATE
		UPDATE SET  T.rsname   = S.rsname,T.scopes   = S.scopes, T.ENABLED  = S.ENABLED, T.UPDUSER  = S.UPDUSER, T.UPDDATE  = GETDATE()
	WHEN NOT MATCHED BY TARGET THEN -- (2) 若來源有、目地沒有 → INSERT
		INSERT (USER_PK, rsid,rsname, scopes, ENABLED, INSUSER, UPDUSER, INSDATE, UPDDATE)
		VALUES (S.USER_PK, S.rsid, S.rsname, S.scopes, S.ENABLED, S.INSUSER, S.UPDUSER, GETDATE(), GETDATE())
	WHEN NOT MATCHED BY SOURCE THEN -- (4) 若來源沒有、目地有 → 將 ENABLED 改為 0
		UPDATE SET  T.ENABLED  = 0, T.UPDUSER  = 'sys', T.UPDDATE  = GETDATE();

	END TRY
    BEGIN CATCH
        -- 將錯誤信息插入到 AUDITLOG 表中
        DECLARE @ACT NVARCHAR(MAX) = 'JOB_Sync權限'
		DECLARE @ErrMsg2 NVARCHAR(MAX) =@ACT+'失敗: '+ ERROR_MESSAGE()
        INSERT INTO AUDITLOG (INSDATE, REMARKS, CATEGORY)
        VALUES (GETDATE(), @ErrMsg2, @ACT);
		exec [dbo].[SpLineNotify] @ErrMsg2
    END CATCH;
END;    
