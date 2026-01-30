-- UC Capital - 建立新的權限查詢 View
-- 使用 Users, Permissions, PermissionResources, PermissionScopes 表

-- 先刪除舊的 View (如果存在)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_user_permissions')
    DROP VIEW vw_user_permissions;
GO

-- 建立新的權限查詢 View
CREATE VIEW vw_user_permissions
AS
SELECT
    -- User 資訊
    u.Id AS SubjectId,
    u.UserName,
    u.DisplayName AS UserName_Display,
    u.FirstName AS UserEnglishName,
    u.Email,

    -- System 資訊 (從 PermissionResources)
    pr.ClientId AS SystemId,
    pr.ClientName AS SystemName,

    -- Resource 資訊
    pr.Id AS ResourceId,
    pr.Code AS ResourceCode,
    pr.Name AS ResourceName,
    pr.ResourceType,

    -- Permission 資訊
    p.Id AS PermissionId,
    p.Scopes,
    p.IsEnabled,
    p.GrantedAt,
    p.ExpiresAt

FROM Users u
INNER JOIN Permissions p ON p.SubjectType = 'User' AND p.SubjectId = u.Id
INNER JOIN PermissionResources pr ON pr.Id = p.ResourceId
WHERE p.IsEnabled = 1
  AND (p.ExpiresAt IS NULL OR p.ExpiresAt > GETUTCDATE())
GO

-- 驗證 View 是否建立成功
SELECT TOP 5 * FROM vw_user_permissions;
GO

-- 查看特定系統的權限
SELECT * FROM vw_user_permissions
WHERE SystemId = 'riskcontrolsystemweb';
GO

-- 建立解析 Scopes 的輔助函數 (可選)
-- Scopes 格式: @r@e@c 表示有 Read, Export, Create 權限

-- 建立更詳細的 View 來展開 Scopes
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_user_permission_scopes')
    DROP VIEW vw_user_permission_scopes;
GO

CREATE VIEW vw_user_permission_scopes
AS
SELECT
    vup.SubjectId,
    vup.UserName,
    vup.UserName_Display,
    vup.UserEnglishName,
    vup.Email,
    vup.SystemId,
    vup.SystemName,
    vup.ResourceId,
    vup.ResourceCode,
    vup.ResourceName,
    vup.ResourceType,
    vup.PermissionId,
    vup.Scopes,
    ps.Code AS PermissionCode,
    ps.Name AS PermissionName,
    vup.IsEnabled,
    vup.GrantedAt,
    vup.ExpiresAt
FROM vw_user_permissions vup
CROSS APPLY (
    SELECT Code, Name
    FROM PermissionScopes
    WHERE vup.Scopes LIKE '%@' + Code + '%'
       OR vup.Scopes = 'all'
       OR Code = 'all' AND vup.Scopes = '@all'
) ps;
GO

-- 驗證詳細 View
SELECT TOP 20 * FROM vw_user_permission_scopes
WHERE SystemId = 'riskcontrolsystemweb'
ORDER BY UserName, ResourceCode, PermissionCode;
GO
