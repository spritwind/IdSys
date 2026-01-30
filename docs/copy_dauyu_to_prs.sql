-- UC Capital - 複製 dauyu 表到 prs 表
-- 執行日期: 2026-01-15
-- 來源: dauyu_* 表
-- 目標: prs_* 表

USE IdentitySysDB;
GO

-- ============================================
-- Step 1: 建立 prs_group 表 (從 dauyu_group 複製結構)
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'prs_group')
BEGIN
    CREATE TABLE [dbo].[prs_group] (
        [Id] INT NOT NULL PRIMARY KEY,
        [Type] NVARCHAR(50) NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [NormalizedName] NVARCHAR(50) NULL,
        [ConcurrencyStamp] UNIQUEIDENTIFIER NULL
    );
    PRINT 'Table prs_group created.';
END
ELSE
BEGIN
    PRINT 'Table prs_group already exists.';
END
GO

-- ============================================
-- Step 2: 建立 prs_resource 表 (從 dauyu_resource 複製結構)
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'prs_resource')
BEGIN
    CREATE TABLE [dbo].[prs_resource] (
        [resource_id] INT NOT NULL PRIMARY KEY,
        [resource_code] NVARCHAR(100) NOT NULL,
        [SystemId] NVARCHAR(30) NULL,
        [SystemName] NVARCHAR(100) NULL
    );
    PRINT 'Table prs_resource created.';
END
ELSE
BEGIN
    PRINT 'Table prs_resource already exists.';
END
GO

-- ============================================
-- Step 3: 建立 prs_scope 表 (從 dauyu_scope 複製結構)
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'prs_scope')
BEGIN
    CREATE TABLE [dbo].[prs_scope] (
        [perm_code] NVARCHAR(20) NOT NULL PRIMARY KEY,
        [perm_name] NVARCHAR(50) NULL
    );
    PRINT 'Table prs_scope created.';
END
ELSE
BEGIN
    PRINT 'Table prs_scope already exists.';
END
GO

-- ============================================
-- Step 4: 建立 prs_user 表 (從 dauyu_user 複製結構)
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'prs_user')
BEGIN
    CREATE TABLE [dbo].[prs_user] (
        [UserId] INT NULL,
        [Name] NVARCHAR(50) NULL,
        [enName] NVARCHAR(50) NULL,
        [DepId] INT NULL
    );
    PRINT 'Table prs_user created.';
END
ELSE
BEGIN
    PRINT 'Table prs_user already exists.';
END
GO

-- ============================================
-- Step 5: 建立 prs_group_resource 表 (從 dauyu_group_resource 複製結構)
-- 需要先建立被參照的表 (prs_resource, prs_scope)
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'prs_group_resource')
BEGIN
    CREATE TABLE [dbo].[prs_group_resource] (
        [DepId] VARCHAR(8) NULL,
        [ResourceId] INT NOT NULL,
        [perm_code] NVARCHAR(20) NOT NULL
    );
    PRINT 'Table prs_group_resource created.';
END
ELSE
BEGIN
    PRINT 'Table prs_group_resource already exists.';
END
GO

-- ============================================
-- Step 6: 複製資料 - prs_group
-- ============================================
IF NOT EXISTS (SELECT TOP 1 1 FROM prs_group)
BEGIN
    INSERT INTO [dbo].[prs_group] ([Id], [Type], [Name], [NormalizedName], [ConcurrencyStamp])
    SELECT [Id], [Type], [Name], [NormalizedName], [ConcurrencyStamp]
    FROM [dbo].[dauyu_group];
    PRINT 'Data copied to prs_group: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows.';
END
ELSE
BEGIN
    PRINT 'prs_group already has data, skipping.';
END
GO

-- ============================================
-- Step 7: 複製資料 - prs_resource
-- ============================================
IF NOT EXISTS (SELECT TOP 1 1 FROM prs_resource)
BEGIN
    INSERT INTO [dbo].[prs_resource] ([resource_id], [resource_code], [SystemId], [SystemName])
    SELECT [resource_id], [resource_code], [SystemId], [SystemName]
    FROM [dbo].[dauyu_resource];
    PRINT 'Data copied to prs_resource: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows.';
END
ELSE
BEGIN
    PRINT 'prs_resource already has data, skipping.';
END
GO

-- ============================================
-- Step 8: 複製資料 - prs_scope
-- ============================================
IF NOT EXISTS (SELECT TOP 1 1 FROM prs_scope)
BEGIN
    INSERT INTO [dbo].[prs_scope] ([perm_code], [perm_name])
    SELECT [perm_code], [perm_name]
    FROM [dbo].[dauyu_scope];
    PRINT 'Data copied to prs_scope: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows.';
END
ELSE
BEGIN
    PRINT 'prs_scope already has data, skipping.';
END
GO

-- ============================================
-- Step 9: 複製資料 - prs_user
-- ============================================
IF NOT EXISTS (SELECT TOP 1 1 FROM prs_user)
BEGIN
    INSERT INTO [dbo].[prs_user] ([UserId], [Name], [enName], [DepId])
    SELECT [UserId], [Name], [enName], [DepId]
    FROM [dbo].[dauyu_user];
    PRINT 'Data copied to prs_user: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows.';
END
ELSE
BEGIN
    PRINT 'prs_user already has data, skipping.';
END
GO

-- ============================================
-- Step 10: 複製資料 - prs_group_resource
-- ============================================
IF NOT EXISTS (SELECT TOP 1 1 FROM prs_group_resource)
BEGIN
    INSERT INTO [dbo].[prs_group_resource] ([DepId], [ResourceId], [perm_code])
    SELECT [DepId], [ResourceId], [perm_code]
    FROM [dbo].[dauyu_group_resource];
    PRINT 'Data copied to prs_group_resource: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows.';
END
ELSE
BEGIN
    PRINT 'prs_group_resource already has data, skipping.';
END
GO

-- ============================================
-- Step 11: 建立外鍵關聯
-- ============================================
-- FK: prs_group_resource.ResourceId -> prs_resource.resource_id
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_prs_group_resource_ResourceId')
BEGIN
    ALTER TABLE [dbo].[prs_group_resource]
    ADD CONSTRAINT [FK_prs_group_resource_ResourceId]
    FOREIGN KEY ([ResourceId]) REFERENCES [dbo].[prs_resource] ([resource_id]);
    PRINT 'Foreign key FK_prs_group_resource_ResourceId created.';
END
GO

-- FK: prs_group_resource.perm_code -> prs_scope.perm_code
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_prs_group_resource_perm_code')
BEGIN
    ALTER TABLE [dbo].[prs_group_resource]
    ADD CONSTRAINT [FK_prs_group_resource_perm_code]
    FOREIGN KEY ([perm_code]) REFERENCES [dbo].[prs_scope] ([perm_code]);
    PRINT 'Foreign key FK_prs_group_resource_perm_code created.';
END
GO

-- ============================================
-- Step 12: 驗證結果
-- ============================================
PRINT '========================================';
PRINT 'Verification - Row counts:';
PRINT '========================================';

SELECT 'prs_group' AS TableName, COUNT(*) AS Cnt FROM prs_group
UNION ALL SELECT 'prs_group_resource', COUNT(*) FROM prs_group_resource
UNION ALL SELECT 'prs_resource', COUNT(*) FROM prs_resource
UNION ALL SELECT 'prs_scope', COUNT(*) FROM prs_scope
UNION ALL SELECT 'prs_user', COUNT(*) FROM prs_user;
GO

PRINT '========================================';
PRINT 'Copy completed successfully!';
PRINT '========================================';
GO
