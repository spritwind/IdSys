-- ============================================
-- UC Capital 權限比對檢驗 SQL
-- 比對 XPOS.UserPermission 與 IdentitySysDB.Permissions
-- Date: 2024-12-24
-- ============================================

USE master;
GO

-- ============================================
-- 1. 總覽統計
-- ============================================
PRINT '========== 權限總覽統計 =========='

SELECT 'XPOS.UserPermission (啟用)' AS [資料表], COUNT(*) AS [筆數]
FROM XPOS.dbo.UserPermission WHERE ENABLED = '1'
UNION ALL
SELECT 'XPOS.UserPermission (停用)', COUNT(*)
FROM XPOS.dbo.UserPermission WHERE ENABLED = '0'
UNION ALL
SELECT 'IdentitySysDB.Permissions (User, 啟用)', COUNT(*)
FROM IdentitySysDB.dbo.Permissions WHERE SubjectType = 'User' AND IsEnabled = 1
UNION ALL
SELECT 'IdentitySysDB.Permissions (User, 停用)', COUNT(*)
FROM IdentitySysDB.dbo.Permissions WHERE SubjectType = 'User' AND IsEnabled = 0;

-- ============================================
-- 2. 啟用權限比對結果
-- ============================================
PRINT ''
PRINT '========== 啟用權限比對結果 =========='

SELECT '兩邊相符 (啟用)' AS [比對結果], COUNT(*) AS [筆數]
FROM XPOS.dbo.UserPermission xp
WHERE xp.ENABLED = '1'
AND EXISTS (
    SELECT 1
    FROM IdentitySysDB.dbo.Permissions p
    JOIN IdentitySysDB.dbo.Users u ON p.SubjectId = u.Id
    WHERE p.SubjectType = 'User'
    AND p.IsEnabled = 1
    AND u.UserName = xp.USER_PK + '@uccapital.com.tw'
    AND UPPER(CAST(p.ResourceId AS VARCHAR(36))) = UPPER(xp.rsid)
)

UNION ALL

SELECT 'XPOS 獨有 (啟用)', COUNT(*)
FROM XPOS.dbo.UserPermission xp
WHERE xp.ENABLED = '1'
AND NOT EXISTS (
    SELECT 1
    FROM IdentitySysDB.dbo.Permissions p
    JOIN IdentitySysDB.dbo.Users u ON p.SubjectId = u.Id
    WHERE p.SubjectType = 'User'
    AND p.IsEnabled = 1
    AND u.UserName = xp.USER_PK + '@uccapital.com.tw'
    AND UPPER(CAST(p.ResourceId AS VARCHAR(36))) = UPPER(xp.rsid)
)

UNION ALL

SELECT 'IdentitySysDB 獨有 (啟用)', COUNT(*)
FROM IdentitySysDB.dbo.Permissions p
JOIN IdentitySysDB.dbo.Users u ON p.SubjectId = u.Id
WHERE p.SubjectType = 'User'
AND p.IsEnabled = 1
AND NOT EXISTS (
    SELECT 1
    FROM XPOS.dbo.UserPermission xp
    WHERE xp.ENABLED = '1'
    AND u.UserName = xp.USER_PK + '@uccapital.com.tw'
    AND UPPER(CAST(p.ResourceId AS VARCHAR(36))) = UPPER(xp.rsid)
);

-- ============================================
-- 3. 狀態不一致的權限 (XPOS停用 但 IdentitySysDB啟用)
-- ============================================
PRINT ''
PRINT '========== 狀態不一致 (XPOS停用 但 IdentitySysDB啟用) =========='

SELECT
    xp.USER_PK AS [XPOS使用者],
    u.UserName AS [IdentitySysDB使用者],
    xp.rsname AS [資源名稱],
    xp.ENABLED AS [XPOS狀態],
    p.IsEnabled AS [IdentitySysDB狀態]
FROM XPOS.dbo.UserPermission xp
JOIN IdentitySysDB.dbo.Users u ON u.UserName = xp.USER_PK + '@uccapital.com.tw'
JOIN IdentitySysDB.dbo.Permissions p ON p.SubjectId = u.Id
    AND UPPER(CAST(p.ResourceId AS VARCHAR(36))) = UPPER(xp.rsid)
WHERE xp.ENABLED = '0' AND p.IsEnabled = 1 AND p.SubjectType = 'User'
ORDER BY xp.USER_PK, xp.rsname;

-- ============================================
-- 4. IdentitySysDB 獨有權限明細 (前 50 筆)
-- ============================================
PRINT ''
PRINT '========== IdentitySysDB 獨有權限明細 (前 50 筆) =========='

SELECT TOP 50
    p.SubjectName AS [使用者],
    pr.Code AS [資源代碼],
    p.Scopes AS [權限範圍],
    p.GrantedAt AS [授權時間]
FROM IdentitySysDB.dbo.Permissions p
JOIN IdentitySysDB.dbo.Users u ON p.SubjectId = u.Id
LEFT JOIN IdentitySysDB.dbo.PermissionResources pr ON p.ResourceId = pr.Id
WHERE p.SubjectType = 'User'
AND p.IsEnabled = 1
AND NOT EXISTS (
    SELECT 1
    FROM XPOS.dbo.UserPermission xp
    WHERE xp.ENABLED = '1'
    AND u.UserName = xp.USER_PK + '@uccapital.com.tw'
    AND UPPER(CAST(p.ResourceId AS VARCHAR(36))) = UPPER(xp.rsid)
)
ORDER BY p.SubjectName, pr.Code;

-- ============================================
-- 5. XPOS 獨有權限明細 (前 50 筆)
-- ============================================
PRINT ''
PRINT '========== XPOS 獨有權限明細 (前 50 筆) =========='

SELECT TOP 50
    xp.USER_PK AS [使用者],
    xp.rsname AS [資源名稱],
    xp.scopes AS [權限範圍],
    xp.INSDATE AS [新增時間]
FROM XPOS.dbo.UserPermission xp
WHERE xp.ENABLED = '1'
AND NOT EXISTS (
    SELECT 1
    FROM IdentitySysDB.dbo.Permissions p
    JOIN IdentitySysDB.dbo.Users u ON p.SubjectId = u.Id
    WHERE p.SubjectType = 'User'
    AND p.IsEnabled = 1
    AND u.UserName = xp.USER_PK + '@uccapital.com.tw'
    AND UPPER(CAST(p.ResourceId AS VARCHAR(36))) = UPPER(xp.rsid)
)
ORDER BY xp.USER_PK, xp.rsname;

-- ============================================
-- 6. Scope 不一致的權限
-- ============================================
PRINT ''
PRINT '========== Scope 不一致的權限 (前 50 筆) =========='

SELECT TOP 50
    xp.USER_PK AS [使用者],
    xp.rsname AS [資源名稱],
    xp.scopes AS [XPOS Scope],
    p.Scopes AS [IdentitySysDB Scope]
FROM XPOS.dbo.UserPermission xp
JOIN IdentitySysDB.dbo.Users u ON u.UserName = xp.USER_PK + '@uccapital.com.tw'
JOIN IdentitySysDB.dbo.Permissions p ON p.SubjectId = u.Id
    AND UPPER(CAST(p.ResourceId AS VARCHAR(36))) = UPPER(xp.rsid)
WHERE xp.ENABLED = '1'
AND p.IsEnabled = 1
AND p.SubjectType = 'User'
AND xp.scopes <> p.Scopes
ORDER BY xp.USER_PK, xp.rsname;

-- ============================================
-- 7. 使用者層級統計
-- ============================================
PRINT ''
PRINT '========== 使用者權限數量比對 =========='

SELECT
    COALESCE(x.USER_PK + '@uccapital.com.tw', i.SubjectName) AS [使用者],
    ISNULL(x.XPOS權限數, 0) AS [XPOS權限數],
    ISNULL(i.IdentitySysDB權限數, 0) AS [IdentitySysDB權限數],
    ISNULL(i.IdentitySysDB權限數, 0) - ISNULL(x.XPOS權限數, 0) AS [差異]
FROM (
    SELECT USER_PK, COUNT(*) AS [XPOS權限數]
    FROM XPOS.dbo.UserPermission
    WHERE ENABLED = '1'
    GROUP BY USER_PK
) x
FULL OUTER JOIN (
    SELECT SubjectName, COUNT(*) AS [IdentitySysDB權限數]
    FROM IdentitySysDB.dbo.Permissions
    WHERE SubjectType = 'User' AND IsEnabled = 1
    GROUP BY SubjectName
) i ON i.SubjectName = x.USER_PK + '@uccapital.com.tw'
WHERE ISNULL(i.IdentitySysDB權限數, 0) <> ISNULL(x.XPOS權限數, 0)
ORDER BY [差異] DESC;

GO

PRINT ''
PRINT '========== 比對完成 =========='
