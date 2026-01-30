-- UC Capital - 建立權限檢查記錄表
-- PermissionCheckLogs

-- 先檢查表是否存在，不存在則建立
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PermissionCheckLogs')
BEGIN
    CREATE TABLE [dbo].[PermissionCheckLogs] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [CheckedAt] DATETIME2 NOT NULL,
        [ClientId] NVARCHAR(200) NOT NULL,
        [SubjectId] NVARCHAR(450) NULL,
        [UserName] NVARCHAR(256) NULL,
        [Resource] NVARCHAR(500) NOT NULL,
        [RequestedScopes] NVARCHAR(200) NOT NULL,
        [GrantedScopes] NVARCHAR(200) NULL,
        [Allowed] BIT NOT NULL,
        [IsSuccess] BIT NOT NULL,
        [ErrorCode] NVARCHAR(100) NULL,
        [ErrorMessage] NVARCHAR(1000) NULL,
        [IpAddress] NVARCHAR(50) NULL,
        [UserAgent] NVARCHAR(500) NULL,
        [ProcessingTimeMs] INT NULL
    );

    -- 建立索引
    CREATE INDEX [IX_PermissionCheckLogs_CheckedAt] ON [dbo].[PermissionCheckLogs] ([CheckedAt]);
    CREATE INDEX [IX_PermissionCheckLogs_SubjectId] ON [dbo].[PermissionCheckLogs] ([SubjectId]);
    CREATE INDEX [IX_PermissionCheckLogs_ClientId] ON [dbo].[PermissionCheckLogs] ([ClientId]);
    CREATE INDEX [IX_PermissionCheckLogs_SubjectId_Resource] ON [dbo].[PermissionCheckLogs] ([SubjectId], [Resource]);

    PRINT 'Table PermissionCheckLogs created successfully.';
END
ELSE
BEGIN
    PRINT 'Table PermissionCheckLogs already exists.';
END
GO
