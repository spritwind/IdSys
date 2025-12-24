-- UC Capital - 群組權限類型表
-- KeycloakGroupPermissionType

-- 建立表格
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'KeycloakGroupPermissionType')
BEGIN
    CREATE TABLE [dbo].[KeycloakGroupPermissionType] (
        [id]                NVARCHAR(50)    NOT NULL PRIMARY KEY,
        [name]              NVARCHAR(200)   NOT NULL,
        [description]       NVARCHAR(500)   NULL,
        [type]              NVARCHAR(50)    NULL,  -- resource, scope
        [logic]             NVARCHAR(50)    NULL,  -- POSITIVE, NEGATIVE
        [decisionStrategy]  NVARCHAR(50)    NULL,  -- AFFIRMATIVE, UNANIMOUS, CONSENSUS
        [resourceType]      NVARCHAR(200)   NULL,
        [ENABLED]           BIT             NULL DEFAULT 1,
        [INSDATE]           DATETIME        NULL DEFAULT GETDATE(),
        [UPDDATE]           DATETIME        NULL
    );

    CREATE NONCLUSTERED INDEX [IX_KeycloakGroupPermissionType_Name]
        ON [dbo].[KeycloakGroupPermissionType] ([name]);

    CREATE NONCLUSTERED INDEX [IX_KeycloakGroupPermissionType_Type]
        ON [dbo].[KeycloakGroupPermissionType] ([type]);

    PRINT 'Table KeycloakGroupPermissionType created successfully.';
END
ELSE
BEGIN
    PRINT 'Table KeycloakGroupPermissionType already exists.';
END
GO

-- 清空現有資料（如果需要重新匯入）
-- DELETE FROM [dbo].[KeycloakGroupPermissionType];

-- 匯入資料（使用 N'' Unicode 前綴確保中文正確處理）
INSERT INTO [dbo].[KeycloakGroupPermissionType] ([id], [name], [description], [type], [logic], [decisionStrategy], [resourceType], [ENABLED], [INSDATE])
VALUES
(N'900ac7a2-f606-4857-a2b4-d76117a729e6', N'AI交易組_permission', N'', N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'8fef909a-323d-428b-aeb2-44f6f520d87b', N'Ben.chen陳禎_permission', N'', N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'9614caff-ae7d-46b6-875d-895edcfdf2ad', N'CEO_all_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'6fb11a86-1086-4486-b7d6-9a35df1c1155', N'Cynthia晨心_permission', N'', N'scope', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'0b12b88e-6b6c-4cd2-ab30-805c357b455b', N'Daphne_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'b564dd9e-c88e-48c7-ab5e-29d31be3b318', N'Default Permission', N'A permission that applies to the default resource type', N'resource', N'POSITIVE', N'UNANIMOUS', N'urn:pos:resources:default', 1, GETDATE()),
(N'c4df9720-ab0a-437d-b520-d9ba36b67ea3', N'Eliot煌棋_permission', N'', N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'655b7feb-c32f-43e1-af1c-e4777df09fc0', N'Francis_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'980e3b74-e406-4979-b949-12a78747c39b', N'Hughes_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'cafa5826-62e3-4104-bb86-d33be32d5a7f', N'Jay新傑_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'72c019ef-5527-4276-baca-a20a8c605500', N'Ken_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'ba86b8ab-f292-455b-9e09-0a73ac230f1f', N'Rong+Brandon_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'5ab5d6e4-57ca-4d33-8496-9ec2376b8675', N'Roy_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'55304f59-5e96-4c4b-a5da-5979b91870b5', N'Stella_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'470d05b3-ad7c-4611-9da3-1d03e5205d17', N'Vincent_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'a08e3e8d-140d-4192-859a-59e10add9905', N'alice賴家怡_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'48367b5d-1134-4e23-8708-9a14b445fbf7', N'angela.青燕_permission', N'', N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'4cbf2574-4190-4782-a79e-a888debd4a11', N'module_search_個股產業分類+o_匯入新版清單_permission', N'', N'scope', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'f9f2b2dc-1476-4c9f-9427-1bcf432201bc', N'交易系統部策略組_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'c4a085fd-1e68-4396-bf07-e1ca6682f138', N'交易組員基本_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'9891f9bd-d2be-438c-bda9-f64e6325c257', N'動能組_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'd5b8b2eb-9e1e-4714-ab4d-2c2ada142079', N'動能組組長_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'ced4a8a8-9393-4f03-ad06-38307f0cb78f', N'套利組_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'dcc44640-2dd9-4680-bf8a-f18ff6eb0a53', N'帳務組_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'b147ed06-9d73-4cec-854f-67256bf9f4f7', N'後勤組_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'74faa773-3e81-469d-a50b-d75a502256f3', N'期貨組_permission', N'', N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'9a9cf6dc-6ddc-4eda-a644-7a56f7afe35a', N'期貨組組長_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'8179c324-226f-4318-bd8a-087a7866c3c6', N'研究組_permission', N'', N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'd3f9f727-1990-47bf-9d7f-53201ec67bc5', N'研究組組長_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'3eaec884-00b9-48e3-89e5-ca24c8077e36', N'程式交易部大機組_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'2aa97471-889d-4edf-be06-6914583f346e', N'結算部_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'20a069eb-7601-40d7-bfce-2d3b3ef21090', N'調整組_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'5971f752-49b6-45c8-9e4a-526cbc6931ec', N'調整組組長_permission', N'', N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'fe2117e4-8d9d-4998-a0f4-cdfdef129edd', N'量化組_permission', NULL, N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE()),
(N'e4128e41-1d90-41e2-81b0-dd852570422c', N'開發的臨時權限_permission', N'', N'resource', N'POSITIVE', N'AFFIRMATIVE', NULL, 1, GETDATE());

PRINT 'Data imported successfully. Total: 35 records.';
GO

-- 驗證
SELECT COUNT(*) AS TotalRecords FROM [dbo].[KeycloakGroupPermissionType];
GO
