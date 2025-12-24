-- UC Capital - 群組權限表
-- 用於群組層級的權限設定，成員自動繼承
-- 執行時間: 2024

-- 建立 KeycloakGroupPermission 表
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'KeycloakGroupPermission')
BEGIN
    CREATE TABLE [dbo].[KeycloakGroupPermission] (
        [groupId]           NVARCHAR(50)    NOT NULL,
        [clientId]          NVARCHAR(50)    NOT NULL,
        [resourceId]        NVARCHAR(200)   NOT NULL,
        [groupName]         NVARCHAR(200)   NULL,
        [groupPath]         NVARCHAR(500)   NULL,
        [clientName]        NVARCHAR(100)   NULL,
        [resourceName]      NVARCHAR(500)   NULL,
        [scopes]            NVARCHAR(500)   NULL,
        [inheritToChildren] BIT             NULL DEFAULT 1,
        [ENABLED]           BIT             NULL DEFAULT 1,
        [INSDATE]           DATETIME        NULL DEFAULT GETDATE(),
        [UPDDATE]           DATETIME        NULL,
        CONSTRAINT [PK_KeycloakGroupPermission] PRIMARY KEY CLUSTERED (
            [groupId] ASC,
            [clientId] ASC,
            [resourceId] ASC
        )
    );

    -- 建立索引以加速查詢
    CREATE NONCLUSTERED INDEX [IX_KeycloakGroupPermission_GroupId]
        ON [dbo].[KeycloakGroupPermission] ([groupId]);

    CREATE NONCLUSTERED INDEX [IX_KeycloakGroupPermission_ClientId]
        ON [dbo].[KeycloakGroupPermission] ([clientId]);

    CREATE NONCLUSTERED INDEX [IX_KeycloakGroupPermission_ResourceId]
        ON [dbo].[KeycloakGroupPermission] ([resourceId]);

    PRINT 'Table KeycloakGroupPermission created successfully.';
END
ELSE
BEGIN
    PRINT 'Table KeycloakGroupPermission already exists.';
END
GO

-- 新增註解
EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'群組權限表 - 群組對資源的授權，成員自動繼承',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'KeycloakGroupPermission';
GO
