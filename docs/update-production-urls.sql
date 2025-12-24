-- ============================================
-- UC Capital IdentityServer 正式環境 URL 更新腳本
-- ============================================
-- 執行此腳本前請先備份資料庫
--
-- 正式環境設定:
--   Admin UI: https://Prs.Uccapital.com.tw
--   STS: https://Prs.Uccapital.com.tw/sts
-- ============================================

USE [IdentitySysDB]
GO

-- 開始交易
BEGIN TRANSACTION
GO

PRINT N'開始更新 uc_capital_admin Client 設定...'

-- 1. 更新 uc_capital_admin 的 ClientUri
UPDATE [Clients]
SET [ClientUri] = N'https://Prs.Uccapital.com.tw'
WHERE [ClientId] = N'uc_capital_admin'

-- 2. 更新 uc_capital_admin 的 FrontChannelLogoutUri
UPDATE [Clients]
SET [FrontChannelLogoutUri] = N'https://Prs.Uccapital.com.tw/signout-oidc'
WHERE [ClientId] = N'uc_capital_admin'

-- 3. 刪除舊的 RedirectUris 並新增正式環境的
DELETE FROM [ClientRedirectUris]
WHERE [ClientId] = (SELECT [Id] FROM [Clients] WHERE [ClientId] = N'uc_capital_admin')

INSERT INTO [ClientRedirectUris] ([RedirectUri], [ClientId])
SELECT N'https://Prs.Uccapital.com.tw/signin-oidc', [Id]
FROM [Clients]
WHERE [ClientId] = N'uc_capital_admin'

-- 4. 刪除舊的 PostLogoutRedirectUris 並新增正式環境的
DELETE FROM [ClientPostLogoutRedirectUris]
WHERE [ClientId] = (SELECT [Id] FROM [Clients] WHERE [ClientId] = N'uc_capital_admin')

INSERT INTO [ClientPostLogoutRedirectUris] ([PostLogoutRedirectUri], [ClientId])
SELECT N'https://Prs.Uccapital.com.tw/signout-callback-oidc', [Id]
FROM [Clients]
WHERE [ClientId] = N'uc_capital_admin'

-- 5. 刪除舊的 AllowedCorsOrigins 並新增正式環境的
DELETE FROM [ClientCorsOrigins]
WHERE [ClientId] = (SELECT [Id] FROM [Clients] WHERE [ClientId] = N'uc_capital_admin')

INSERT INTO [ClientCorsOrigins] ([Origin], [ClientId])
SELECT N'https://Prs.Uccapital.com.tw', [Id]
FROM [Clients]
WHERE [ClientId] = N'uc_capital_admin'

PRINT N'uc_capital_admin 設定更新完成'

-- ============================================
-- 更新 uc_capital_demo_client (選用)
-- ============================================
PRINT N'開始更新 uc_capital_demo_client Client 設定...'

-- 更新 ClientUri
UPDATE [Clients]
SET [ClientUri] = N'https://Prs.Uccapital.com.tw/sts'
WHERE [ClientId] = N'uc_capital_demo_client'

-- 刪除舊的 RedirectUris 並新增正式環境的
DELETE FROM [ClientRedirectUris]
WHERE [ClientId] = (SELECT [Id] FROM [Clients] WHERE [ClientId] = N'uc_capital_demo_client')

INSERT INTO [ClientRedirectUris] ([RedirectUri], [ClientId])
SELECT N'https://Prs.Uccapital.com.tw/sts/demo/callback.html', [Id]
FROM [Clients]
WHERE [ClientId] = N'uc_capital_demo_client'

INSERT INTO [ClientRedirectUris] ([RedirectUri], [ClientId])
SELECT N'https://Prs.Uccapital.com.tw/sts/demo/silent-renew.html', [Id]
FROM [Clients]
WHERE [ClientId] = N'uc_capital_demo_client'

-- 刪除舊的 PostLogoutRedirectUris 並新增正式環境的
DELETE FROM [ClientPostLogoutRedirectUris]
WHERE [ClientId] = (SELECT [Id] FROM [Clients] WHERE [ClientId] = N'uc_capital_demo_client')

INSERT INTO [ClientPostLogoutRedirectUris] ([PostLogoutRedirectUri], [ClientId])
SELECT N'https://Prs.Uccapital.com.tw/sts/demo/', [Id]
FROM [Clients]
WHERE [ClientId] = N'uc_capital_demo_client'

-- 刪除舊的 AllowedCorsOrigins 並新增正式環境的
DELETE FROM [ClientCorsOrigins]
WHERE [ClientId] = (SELECT [Id] FROM [Clients] WHERE [ClientId] = N'uc_capital_demo_client')

INSERT INTO [ClientCorsOrigins] ([Origin], [ClientId])
SELECT N'https://Prs.Uccapital.com.tw', [Id]
FROM [Clients]
WHERE [ClientId] = N'uc_capital_demo_client'

PRINT N'uc_capital_demo_client 設定更新完成'

-- 驗證更新結果
PRINT N''
PRINT N'============================================'
PRINT N'驗證更新結果'
PRINT N'============================================'

SELECT
    c.[ClientId],
    c.[ClientName],
    c.[ClientUri],
    c.[FrontChannelLogoutUri]
FROM [Clients] c
WHERE c.[ClientId] IN (N'uc_capital_admin', N'uc_capital_demo_client')

SELECT
    c.[ClientId],
    r.[RedirectUri]
FROM [Clients] c
INNER JOIN [ClientRedirectUris] r ON c.[Id] = r.[ClientId]
WHERE c.[ClientId] IN (N'uc_capital_admin', N'uc_capital_demo_client')

SELECT
    c.[ClientId],
    p.[PostLogoutRedirectUri]
FROM [Clients] c
INNER JOIN [ClientPostLogoutRedirectUris] p ON c.[Id] = p.[ClientId]
WHERE c.[ClientId] IN (N'uc_capital_admin', N'uc_capital_demo_client')

SELECT
    c.[ClientId],
    o.[Origin]
FROM [Clients] c
INNER JOIN [ClientCorsOrigins] o ON c.[Id] = o.[ClientId]
WHERE c.[ClientId] IN (N'uc_capital_admin', N'uc_capital_demo_client')

-- 確認無誤後提交交易
COMMIT TRANSACTION
GO

PRINT N''
PRINT N'============================================'
PRINT N'URL 更新完成！'
PRINT N'============================================'
