-- ============================================================
-- UC Capital - RevokedTokens Table Creation Script
-- JWT Token 撤銷清單資料表建立腳本
--
-- 用途：儲存被撤銷的 JWT Token 資訊
-- 當 Token Introspection 時，系統會檢查此表判斷 Token 是否已撤銷
-- ============================================================

USE [IdentitySysDB]
GO

-- 如果表已存在則先刪除（開發環境使用，正式環境請註解掉）
-- IF OBJECT_ID('dbo.RevokedTokens', 'U') IS NOT NULL
--     DROP TABLE dbo.RevokedTokens
-- GO

-- 建立 RevokedTokens 表
CREATE TABLE [dbo].[RevokedTokens] (
    -- 主鍵
    [Id] INT IDENTITY(1,1) NOT NULL,

    -- JWT Token ID (jti claim) - 用於唯一識別被撤銷的 Token
    [Jti] NVARCHAR(200) NOT NULL,

    -- JTI 的 SHA256 Hash 值（用於加速查詢）
    [JtiHash] NVARCHAR(64) NULL,

    -- Token 主體 (sub claim) - 使用者的唯一識別碼
    [SubjectId] NVARCHAR(200) NULL,

    -- 客戶端 ID - 發行此 Token 的客戶端應用程式
    [ClientId] NVARCHAR(200) NOT NULL,

    -- Token 類型 (access_token, refresh_token, id_token)
    [TokenType] NVARCHAR(50) NOT NULL DEFAULT 'access_token',

    -- Token 原始過期時間 (UTC) - 用於清理過期的撤銷記錄
    [ExpirationTime] DATETIME2(7) NULL,

    -- 撤銷時間 (UTC)
    [RevokedAt] DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),

    -- 撤銷原因
    [Reason] NVARCHAR(500) NULL,

    -- 撤銷者（可能是使用者本人或管理員）
    [RevokedBy] NVARCHAR(200) NULL,

    -- 主鍵約束
    CONSTRAINT [PK_RevokedTokens] PRIMARY KEY CLUSTERED ([Id] ASC)
)
GO

-- ============================================================
-- 建立索引
-- ============================================================

-- JTI 唯一索引（用於快速查詢撤銷狀態）
CREATE UNIQUE NONCLUSTERED INDEX [IX_RevokedTokens_Jti]
    ON [dbo].[RevokedTokens] ([Jti] ASC)
GO

-- JTI Hash 索引（用於 Hash 查詢）
CREATE NONCLUSTERED INDEX [IX_RevokedTokens_JtiHash]
    ON [dbo].[RevokedTokens] ([JtiHash] ASC)
    WHERE [JtiHash] IS NOT NULL
GO

-- ClientId 索引（用於查詢特定客戶端的撤銷記錄）
CREATE NONCLUSTERED INDEX [IX_RevokedTokens_ClientId]
    ON [dbo].[RevokedTokens] ([ClientId] ASC)
GO

-- SubjectId 索引（用於查詢特定使用者的撤銷記錄）
CREATE NONCLUSTERED INDEX [IX_RevokedTokens_SubjectId]
    ON [dbo].[RevokedTokens] ([SubjectId] ASC)
    WHERE [SubjectId] IS NOT NULL
GO

-- 過期時間索引（用於清理過期記錄）
CREATE NONCLUSTERED INDEX [IX_RevokedTokens_ExpirationTime]
    ON [dbo].[RevokedTokens] ([ExpirationTime] ASC)
    WHERE [ExpirationTime] IS NOT NULL
GO

-- 撤銷時間索引（用於按時間排序）
CREATE NONCLUSTERED INDEX [IX_RevokedTokens_RevokedAt]
    ON [dbo].[RevokedTokens] ([RevokedAt] DESC)
GO

-- ============================================================
-- 新增欄位說明
-- ============================================================

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'JWT Token 撤銷清單。儲存被撤銷的 JWT Token 資訊，用於 Token Introspection 驗證。',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'RevokedTokens'
GO

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'JWT Token ID (jti claim)，唯一識別被撤銷的 Token',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'RevokedTokens',
    @level2type = N'COLUMN', @level2name = N'Jti'
GO

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Token 原始過期時間，用於自動清理過期的撤銷記錄',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'RevokedTokens',
    @level2type = N'COLUMN', @level2name = N'ExpirationTime'
GO

PRINT N'RevokedTokens 表建立完成'
GO

-- ============================================================
-- 清理過期撤銷記錄的預存程序（選用）
-- 建議設定 SQL Agent Job 定期執行
-- ============================================================

CREATE OR ALTER PROCEDURE [dbo].[sp_CleanupExpiredRevokedTokens]
    @DaysToKeep INT = 7  -- 保留過期後幾天的記錄
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CutoffDate DATETIME2(7) = DATEADD(DAY, -@DaysToKeep, GETUTCDATE());
    DECLARE @DeletedCount INT;

    DELETE FROM [dbo].[RevokedTokens]
    WHERE [ExpirationTime] IS NOT NULL
      AND [ExpirationTime] < @CutoffDate;

    SET @DeletedCount = @@ROWCOUNT;

    PRINT N'已清理 ' + CAST(@DeletedCount AS NVARCHAR(10)) + N' 筆過期的撤銷記錄';

    RETURN @DeletedCount;
END
GO

PRINT N'清理預存程序建立完成'
GO
