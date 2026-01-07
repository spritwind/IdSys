-- =====================================================
-- UC Capital Identity System
-- Migration: Add SubjectName column to Permissions table
-- Date: 2024-12-24
-- Description: 新增 SubjectName 欄位以提升權限資料可讀性
-- =====================================================

USE [IdentitySysDB]
GO

-- =====================================================
-- Step 1: 新增 SubjectName 欄位
-- =====================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'Permissions')
    AND name = 'SubjectName'
)
BEGIN
    ALTER TABLE Permissions
    ADD SubjectName NVARCHAR(200) NULL;

    PRINT '已新增 SubjectName 欄位';
END
ELSE
BEGIN
    PRINT 'SubjectName 欄位已存在，跳過新增';
END
GO

-- =====================================================
-- Step 2: 建立索引
-- =====================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'Permissions')
    AND name = 'IX_Permissions_SubjectName'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Permissions_SubjectName
    ON Permissions(SubjectName);

    PRINT '已建立 IX_Permissions_SubjectName 索引';
END
GO

-- =====================================================
-- Step 3: 回填 SubjectName (使用者權限)
-- =====================================================
PRINT '開始回填使用者權限的 SubjectName...';

UPDATE p
SET p.SubjectName = u.UserName
FROM Permissions p
INNER JOIN Users u ON p.SubjectId = u.Id
WHERE p.SubjectType = 'User'
  AND p.SubjectName IS NULL;

DECLARE @userCount INT = @@ROWCOUNT;
PRINT '已更新 ' + CAST(@userCount AS VARCHAR) + ' 筆使用者權限';
GO

-- =====================================================
-- Step 4: 回填 SubjectName (組織權限)
-- =====================================================
PRINT '開始回填組織權限的 SubjectName...';

UPDATE p
SET p.SubjectName = o.Name
FROM Permissions p
INNER JOIN Organizations o ON TRY_CAST(p.SubjectId AS UNIQUEIDENTIFIER) = o.Id
WHERE p.SubjectType = 'Organization'
  AND p.SubjectName IS NULL;

DECLARE @orgCount INT = @@ROWCOUNT;
PRINT '已更新 ' + CAST(@orgCount AS VARCHAR) + ' 筆組織權限';
GO

-- =====================================================
-- Step 5: 回填 SubjectName (群組權限 - 從 KeycloakGroup)
-- =====================================================
PRINT '開始回填群組權限的 SubjectName...';

-- 嘗試從 KeycloakGroup 取得名稱
UPDATE p
SET p.SubjectName = g.Name
FROM Permissions p
INNER JOIN KeycloakGroup g ON p.SubjectId = g.Id
WHERE p.SubjectType = 'Group'
  AND p.SubjectName IS NULL;

DECLARE @groupCount INT = @@ROWCOUNT;
PRINT '已更新 ' + CAST(@groupCount AS VARCHAR) + ' 筆群組權限';
GO

-- =====================================================
-- Step 6: 驗證結果
-- =====================================================
PRINT '';
PRINT '========== 回填結果統計 ==========';

SELECT
    SubjectType,
    COUNT(*) AS TotalCount,
    SUM(CASE WHEN SubjectName IS NOT NULL THEN 1 ELSE 0 END) AS HasNameCount,
    SUM(CASE WHEN SubjectName IS NULL THEN 1 ELSE 0 END) AS MissingNameCount
FROM Permissions
GROUP BY SubjectType
ORDER BY SubjectType;

-- 顯示缺少 SubjectName 的記錄 (前 20 筆)
PRINT '';
PRINT '========== 缺少 SubjectName 的記錄 (前 20 筆) ==========';

SELECT TOP 20
    p.Id,
    p.SubjectType,
    p.SubjectId,
    p.SubjectName,
    pr.Code AS ResourceCode,
    pr.Name AS ResourceName
FROM Permissions p
LEFT JOIN PermissionResources pr ON p.ResourceId = pr.Id
WHERE p.SubjectName IS NULL
ORDER BY p.SubjectType, p.SubjectId;

-- =====================================================
-- Step 7: 查看範例資料 (驗證可讀性)
-- =====================================================
PRINT '';
PRINT '========== 權限資料範例 (前 30 筆) ==========';

SELECT TOP 30
    p.Id,
    p.SubjectType AS [類型],
    p.SubjectName AS [名稱],
    p.SubjectId AS [ID],
    pr.ClientId AS [客戶端],
    pr.Code AS [資源代碼],
    pr.Name AS [資源名稱],
    p.Scopes AS [權限範圍],
    CASE WHEN p.InheritToChildren = 1 THEN '是' ELSE '否' END AS [繼承],
    CASE WHEN p.IsEnabled = 1 THEN '啟用' ELSE '停用' END AS [狀態]
FROM Permissions p
LEFT JOIN PermissionResources pr ON p.ResourceId = pr.Id
WHERE p.SubjectName IS NOT NULL
ORDER BY p.SubjectType, p.SubjectName, pr.ClientId, pr.Code;

GO

PRINT '';
PRINT '========== Migration 完成 ==========';
PRINT '新增欄位: Permissions.SubjectName NVARCHAR(200)';
PRINT '新增索引: IX_Permissions_SubjectName';
PRINT '';
