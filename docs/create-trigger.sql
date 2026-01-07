-- ============================================
-- Permissions 表自動填入名稱觸發器
-- ============================================

-- 先刪除已存在的觸發器
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_Permissions_AutoFillNames')
BEGIN
    DROP TRIGGER TR_Permissions_AutoFillNames;
END
GO

CREATE TRIGGER TR_Permissions_AutoFillNames
ON Permissions
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- 更新 SubjectName（User）
    UPDATE p
    SET p.SubjectName = u.UserName
    FROM Permissions p
    INNER JOIN inserted i ON p.Id = i.Id
    INNER JOIN Users u ON i.SubjectId = u.Id
    WHERE i.SubjectType = 'User'
    AND (p.SubjectName IS NULL OR p.SubjectName = '');

    -- 更新 SubjectName（Group）
    UPDATE p
    SET p.SubjectName = g.Name
    FROM Permissions p
    INNER JOIN inserted i ON p.Id = i.Id
    INNER JOIN Groups g ON i.SubjectId = g.Id
    WHERE i.SubjectType = 'Group'
    AND (p.SubjectName IS NULL OR p.SubjectName = '');

    -- 更新 ResourceCode 和 ResourceName
    UPDATE p
    SET p.ResourceCode = pr.Code,
        p.ResourceName = pr.Name
    FROM Permissions p
    INNER JOIN inserted i ON p.Id = i.Id
    INNER JOIN PermissionResources pr ON i.ResourceId = pr.Id
    WHERE p.ResourceCode IS NULL OR p.ResourceName IS NULL;

    -- 更新 GrantedByName
    UPDATE p
    SET p.GrantedByName = u.UserName
    FROM Permissions p
    INNER JOIN inserted i ON p.Id = i.Id
    INNER JOIN Users u ON i.GrantedBy = u.Id
    WHERE i.GrantedBy IS NOT NULL
    AND (p.GrantedByName IS NULL OR p.GrantedByName = '');
END;
GO

PRINT 'Trigger TR_Permissions_AutoFillNames created successfully';
GO
