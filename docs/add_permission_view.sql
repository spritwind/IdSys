-- UC Capital - Permission Query 功能所需的資料庫變更
-- 執行日期: 2026-01-15
-- 目的: 新增 SubjectId 欄位並建立權限查詢 View

USE IdentitySysDB;
GO

-- ============================================
-- Step 1: 在 prs_user 新增 SubjectId 欄位
-- 用於對應 OAuth Token 中的 sub claim
-- ============================================
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'prs_user' AND COLUMN_NAME = 'SubjectId'
)
BEGIN
    ALTER TABLE [dbo].[prs_user]
    ADD [SubjectId] NVARCHAR(450) NULL;

    PRINT 'Column SubjectId added to prs_user.';

    -- 建立索引以加速查詢
    CREATE NONCLUSTERED INDEX [IX_prs_user_SubjectId]
    ON [dbo].[prs_user] ([SubjectId]);

    PRINT 'Index IX_prs_user_SubjectId created.';
END
ELSE
BEGIN
    PRINT 'Column SubjectId already exists in prs_user.';
END
GO

-- ============================================
-- Step 2: 建立權限查詢 View
-- 將 User -> Group -> Resource -> Scope 攤平
-- ============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_user_permissions')
BEGIN
    DROP VIEW [dbo].[vw_user_permissions];
    PRINT 'Existing view vw_user_permissions dropped.';
END
GO

CREATE VIEW [dbo].[vw_user_permissions] AS
SELECT
    u.UserId,
    u.SubjectId,
    u.Name AS UserName,
    u.enName AS UserEnglishName,
    g.Id AS GroupId,
    g.Name AS GroupName,
    g.Type AS GroupType,
    r.resource_id AS ResourceId,
    r.resource_code AS ResourceCode,
    r.SystemId,
    r.SystemName,
    s.perm_code AS PermissionCode,
    s.perm_name AS PermissionName
FROM [dbo].[prs_user] u
INNER JOIN [dbo].[prs_group] g ON u.DepId = g.Id
INNER JOIN [dbo].[prs_group_resource] gr ON CAST(g.Id AS VARCHAR(8)) = gr.DepId
INNER JOIN [dbo].[prs_resource] r ON gr.ResourceId = r.resource_id
INNER JOIN [dbo].[prs_scope] s ON gr.perm_code = s.perm_code;
GO

PRINT 'View vw_user_permissions created successfully.';
GO

-- ============================================
-- Step 3: 驗證 View
-- ============================================
SELECT TOP 10 * FROM [dbo].[vw_user_permissions];
GO

PRINT '========================================'
PRINT 'Permission View setup completed!'
PRINT '========================================'
GO
