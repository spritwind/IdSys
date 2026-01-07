-- =============================================
-- UC Capital - 建立組織架構資料表
-- 執行此腳本前請先備份資料庫
-- =============================================

USE [IdentitySysDB]
GO

-- 檢查 Organizations 表是否存在
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Organizations')
BEGIN
    PRINT N'建立 Organizations 表...'

    CREATE TABLE [dbo].[Organizations] (
        [Id]                UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [TenantId]          UNIQUEIDENTIFIER NOT NULL,
        [ParentId]          UNIQUEIDENTIFIER NULL,
        [Code]              NVARCHAR(50) NULL,
        [Name]              NVARCHAR(200) NOT NULL,
        [ChineseName]       NVARCHAR(200) NULL,
        [EnglishName]       NVARCHAR(200) NULL,
        [Path]              NVARCHAR(500) NOT NULL,
        [Depth]             INT NOT NULL DEFAULT 0,
        [SortOrder]         INT NOT NULL DEFAULT 0,
        [ManagerUserId]     NVARCHAR(450) NULL,
        [Description]       NVARCHAR(500) NULL,
        [IsEnabled]         BIT NOT NULL DEFAULT 1,
        [CreatedAt]         DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt]         DATETIME2 NULL,

        CONSTRAINT [FK_Organizations_Parent] FOREIGN KEY ([ParentId])
            REFERENCES [dbo].[Organizations]([Id])
    );

    -- 建立索引
    CREATE INDEX [IX_Organizations_TenantId] ON [dbo].[Organizations]([TenantId]);
    CREATE INDEX [IX_Organizations_ParentId] ON [dbo].[Organizations]([ParentId]);
    CREATE INDEX [IX_Organizations_Path] ON [dbo].[Organizations]([Path]);
    CREATE INDEX [IX_Organizations_IsEnabled] ON [dbo].[Organizations]([IsEnabled]);

    PRINT N'Organizations 表建立完成'
END
ELSE
BEGIN
    PRINT N'Organizations 表已存在'
END
GO

-- 檢查 OrganizationMembers 表是否存在
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'OrganizationMembers')
BEGIN
    PRINT N'建立 OrganizationMembers 表...'

    CREATE TABLE [dbo].[OrganizationMembers] (
        [Id]                UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [OrganizationId]    UNIQUEIDENTIFIER NOT NULL,
        [UserId]            NVARCHAR(450) NOT NULL,
        [MemberRole]        NVARCHAR(50) NOT NULL DEFAULT 'Member',
        [JoinedAt]          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT [FK_OrganizationMembers_Organization] FOREIGN KEY ([OrganizationId])
            REFERENCES [dbo].[Organizations]([Id]) ON DELETE CASCADE
    );

    -- 建立索引
    CREATE INDEX [IX_OrganizationMembers_OrganizationId] ON [dbo].[OrganizationMembers]([OrganizationId]);
    CREATE INDEX [IX_OrganizationMembers_UserId] ON [dbo].[OrganizationMembers]([UserId]);
    CREATE UNIQUE INDEX [IX_OrganizationMembers_OrgUser] ON [dbo].[OrganizationMembers]([OrganizationId], [UserId]);

    PRINT N'OrganizationMembers 表建立完成'
END
ELSE
BEGIN
    PRINT N'OrganizationMembers 表已存在'
END
GO

-- 建立預設租戶 (如果不存在)
-- 注意：Tenants 表可能不存在，這是可選的
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Tenants')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Tenants] WHERE [Id] = '00000000-0000-0000-0000-000000000001')
    BEGIN
        INSERT INTO [dbo].[Tenants] ([Id], [Code], [Name], [IsEnabled], [CreatedAt])
        VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'UC Capital', 1, GETUTCDATE());
        PRINT N'已建立預設租戶'
    END
END
GO

-- 建立根組織 (如果不存在)
IF NOT EXISTS (SELECT 1 FROM [dbo].[Organizations] WHERE [ParentId] IS NULL)
BEGIN
    INSERT INTO [dbo].[Organizations]
        ([Id], [TenantId], [ParentId], [Code], [Name], [ChineseName], [Path], [Depth], [SortOrder], [IsEnabled])
    VALUES
        (NEWID(), '00000000-0000-0000-0000-000000000001', NULL, 'UC', 'UC Capital', 'UC Capital', '/UC Capital', 0, 1, 1);
    PRINT N'已建立根組織'
END
GO

-- 驗證表結構
SELECT 'Organizations' AS TableName, COUNT(*) AS RecordCount FROM [dbo].[Organizations]
UNION ALL
SELECT 'OrganizationMembers', COUNT(*) FROM [dbo].[OrganizationMembers];
GO

PRINT N'腳本執行完成'
GO
