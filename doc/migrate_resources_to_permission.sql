-- UC Capital - 遷移 prs_resource 資料到 PermissionResources
-- 針對 riskcontrolsystemweb (內部警示系統)
-- 排除部位表相關資源

-- 先查看要遷移的資料
SELECT resource_id, resource_code, SystemId, SystemName
FROM prs_resource
WHERE SystemId = 'riskcontrolsystemweb'
AND resource_code NOT LIKE '%部位%'
ORDER BY resource_id;

-- 遷移資料到 PermissionResources
INSERT INTO PermissionResources (Id, TenantId, ClientId, ClientName, Code, Name, Description, Uri, ResourceType, ParentId, SortOrder, IsEnabled, CreatedAt, UpdatedAt)
SELECT
    NEWID() as Id,
    NULL as TenantId,
    'riskcontrolsystemweb' as ClientId,
    N'內部警示系統(風控)' as ClientName,
    resource_code as Code,
    resource_code as Name,
    NULL as Description,
    NULL as Uri,
    'Module' as ResourceType,
    NULL as ParentId,
    resource_id as SortOrder,
    1 as IsEnabled,
    GETUTCDATE() as CreatedAt,
    NULL as UpdatedAt
FROM prs_resource
WHERE SystemId = 'riskcontrolsystemweb'
AND resource_code NOT LIKE N'%部位%'
AND NOT EXISTS (
    SELECT 1 FROM PermissionResources pr
    WHERE pr.ClientId = 'riskcontrolsystemweb'
    AND pr.Code = prs_resource.resource_code
);

-- 驗證遷移結果
SELECT Id, ClientId, ClientName, Code, Name, SortOrder
FROM PermissionResources
WHERE ClientId = 'riskcontrolsystemweb'
ORDER BY SortOrder;

GO
