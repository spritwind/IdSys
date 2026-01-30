-- UC Capital - 內部警示系統 (riskcontrolsystemweb) 權限設定 SQL
-- 根據權限矩陣圖片產生
-- 執行前請先確認 SubjectId 和 ResourceId

-- ========================================
-- Step 1: 查詢現有的資源 (PermissionResources)
-- ========================================
SELECT Id, Code, Name, ClientId, ClientName, SortOrder
FROM PermissionResources
WHERE ClientId = 'riskcontrolsystemweb'
ORDER BY SortOrder;

-- ========================================
-- Step 2: 確認/新增缺少的資源
-- ========================================
-- 從圖片中識別出的資源清單:
-- 1. module_login
-- 2. module_查詢
-- 3. module_查詢無風險交易
-- 4. data_查詢資料
-- 5. module_詳細資訊
-- 6. module_交易說明
-- 7. module_部長簽核
-- 8. module_風控簽核

-- 檢查是否有缺少的資源，如有需要則新增
DECLARE @ClientId NVARCHAR(200) = 'riskcontrolsystemweb';
DECLARE @ClientName NVARCHAR(200) = N'內部警示系統(風控)';

-- 新增缺少的資源 (如果不存在)
IF NOT EXISTS (SELECT 1 FROM PermissionResources WHERE ClientId = @ClientId AND Code = 'module_login')
    INSERT INTO PermissionResources (Id, TenantId, ClientId, ClientName, Code, Name, Description, Uri, ResourceType, ParentId, SortOrder, IsEnabled, CreatedAt)
    VALUES (NEWID(), NULL, @ClientId, @ClientName, 'module_login', N'登入模組', N'系統登入權限', NULL, 'Module', NULL, 1, 1, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM PermissionResources WHERE ClientId = @ClientId AND Code = N'module_查詢')
    INSERT INTO PermissionResources (Id, TenantId, ClientId, ClientName, Code, Name, Description, Uri, ResourceType, ParentId, SortOrder, IsEnabled, CreatedAt)
    VALUES (NEWID(), NULL, @ClientId, @ClientName, N'module_查詢', N'查詢模組', N'基本查詢功能', NULL, 'Module', NULL, 2, 1, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM PermissionResources WHERE ClientId = @ClientId AND Code = N'module_查詢無風險交易')
    INSERT INTO PermissionResources (Id, TenantId, ClientId, ClientName, Code, Name, Description, Uri, ResourceType, ParentId, SortOrder, IsEnabled, CreatedAt)
    VALUES (NEWID(), NULL, @ClientId, @ClientName, N'module_查詢無風險交易', N'查詢無風險交易', N'查詢無風險交易功能', NULL, 'Module', NULL, 3, 1, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM PermissionResources WHERE ClientId = @ClientId AND Code = N'data_查詢資料')
    INSERT INTO PermissionResources (Id, TenantId, ClientId, ClientName, Code, Name, Description, Uri, ResourceType, ParentId, SortOrder, IsEnabled, CreatedAt)
    VALUES (NEWID(), NULL, @ClientId, @ClientName, N'data_查詢資料', N'查詢資料', N'資料查詢權限(CRUD)', NULL, 'Data', NULL, 4, 1, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM PermissionResources WHERE ClientId = @ClientId AND Code = N'module_詳細資訊')
    INSERT INTO PermissionResources (Id, TenantId, ClientId, ClientName, Code, Name, Description, Uri, ResourceType, ParentId, SortOrder, IsEnabled, CreatedAt)
    VALUES (NEWID(), NULL, @ClientId, @ClientName, N'module_詳細資訊', N'詳細資訊', N'詳細資訊查看/匯出', NULL, 'Module', NULL, 5, 1, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM PermissionResources WHERE ClientId = @ClientId AND Code = N'module_交易說明')
    INSERT INTO PermissionResources (Id, TenantId, ClientId, ClientName, Code, Name, Description, Uri, ResourceType, ParentId, SortOrder, IsEnabled, CreatedAt)
    VALUES (NEWID(), NULL, @ClientId, @ClientName, N'module_交易說明', N'交易說明', N'交易說明編輯', NULL, 'Module', NULL, 6, 1, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM PermissionResources WHERE ClientId = @ClientId AND Code = N'module_部長簽核')
    INSERT INTO PermissionResources (Id, TenantId, ClientId, ClientName, Code, Name, Description, Uri, ResourceType, ParentId, SortOrder, IsEnabled, CreatedAt)
    VALUES (NEWID(), NULL, @ClientId, @ClientName, N'module_部長簽核', N'部長簽核', N'部長簽核功能', NULL, 'Module', NULL, 7, 1, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM PermissionResources WHERE ClientId = @ClientId AND Code = N'module_風控簽核')
    INSERT INTO PermissionResources (Id, TenantId, ClientId, ClientName, Code, Name, Description, Uri, ResourceType, ParentId, SortOrder, IsEnabled, CreatedAt)
    VALUES (NEWID(), NULL, @ClientId, @ClientName, N'module_風控簽核', N'風控簽核', N'風控簽核功能', NULL, 'Module', NULL, 8, 1, GETUTCDATE());

GO

-- ========================================
-- Step 3: 查詢使用者/群組資訊
-- ========================================
-- 查詢系統中的使用者 (需要找出 SubjectId)
SELECT Id as SubjectId, UserName, UserName_Display
FROM Users
WHERE UserName LIKE '%陳禎%'
   OR UserName LIKE '%煌棋%'
   OR UserName LIKE '%萊融%'
   OR UserName LIKE '%Jay%'
   OR UserName LIKE '%PC.LEE%'
   OR UserName LIKE '%Devon%'
   OR UserName_Display LIKE '%陳禎%'
   OR UserName_Display LIKE '%煌棋%'
   OR UserName_Display LIKE '%萊融%';

-- ========================================
-- Step 4: 定義群組 (如需要使用 Group 而非 User)
-- ========================================
-- 方案 A: 使用個別 User 授權
-- 方案 B: 建立 Groups 然後將權限授予 Group

-- 如果要使用 Groups，先建立群組 (假設 Groups 表存在)
-- INSERT INTO Groups (Id, Name, Description, CreatedAt)
-- VALUES
--     (NEWID(), N'動能組員', N'動能組成員', GETUTCDATE()),
--     (NEWID(), N'交易部長', N'交易部長群組', GETUTCDATE()),
--     (NEWID(), N'風控稽核組', N'管理處長/風控稽核組', GETUTCDATE());

-- ========================================
-- Step 5: 清除現有權限 (選用 - 小心使用!)
-- ========================================
-- 如需清除現有的 riskcontrolsystemweb 權限，取消下面的註解
-- DELETE FROM Permissions
-- WHERE ResourceId IN (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb');

-- ========================================
-- Step 6: 插入權限資料
-- ========================================
-- 使用變數儲存 ResourceId
DECLARE @ResourceId_login UNIQUEIDENTIFIER;
DECLARE @ResourceId_query UNIQUEIDENTIFIER;
DECLARE @ResourceId_queryNoRisk UNIQUEIDENTIFIER;
DECLARE @ResourceId_data UNIQUEIDENTIFIER;
DECLARE @ResourceId_detail UNIQUEIDENTIFIER;
DECLARE @ResourceId_tradeMemo UNIQUEIDENTIFIER;
DECLARE @ResourceId_managerApprove UNIQUEIDENTIFIER;
DECLARE @ResourceId_riskApprove UNIQUEIDENTIFIER;

-- 取得各資源的 Id
SELECT @ResourceId_login = Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = 'module_login';
SELECT @ResourceId_query = Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_查詢';
SELECT @ResourceId_queryNoRisk = Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_查詢無風險交易';
SELECT @ResourceId_data = Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'data_查詢資料';
SELECT @ResourceId_detail = Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_詳細資訊';
SELECT @ResourceId_tradeMemo = Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_交易說明';
SELECT @ResourceId_managerApprove = Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_部長簽核';
SELECT @ResourceId_riskApprove = Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_風控簽核';

-- 驗證資源 Id
SELECT
    @ResourceId_login as 'module_login',
    @ResourceId_query as 'module_查詢',
    @ResourceId_queryNoRisk as 'module_查詢無風險交易',
    @ResourceId_data as 'data_查詢資料',
    @ResourceId_detail as 'module_詳細資訊',
    @ResourceId_tradeMemo as 'module_交易說明',
    @ResourceId_managerApprove as 'module_部長簽核',
    @ResourceId_riskApprove as 'module_風控簽核';

GO

-- ========================================
-- Step 7: 權限矩陣設定
-- ========================================
-- 權限代碼說明:
-- @r = 讀取 (Read)
-- @c = 建立 (Create)
-- @u = 更新 (Update)
-- @d = 刪除 (Delete)
-- @e = 匯出 (Export)
-- @all = 全部權限

-- ==========================================
-- 群組 1: 動能組員 (陳禎)
-- ==========================================
-- 請將 'YOUR_SUBJECT_ID_1' 替換為實際的 UserId 或 GroupId

DECLARE @Subject_動能組員 NVARCHAR(450) = 'YOUR_SUBJECT_ID_1';  -- TODO: 替換為實際 ID

-- module_login: R
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_動能組員, N'動能組員(陳禎)', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = 'module_login'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_動能組員 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = 'module_login'));

-- module_查詢: R (檢視者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_動能組員, N'動能組員(陳禎)', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_查詢'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_動能組員 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_查詢'));

-- module_查詢無風險交易: 無權限 (—)
-- 不插入任何權限

-- data_查詢資料: R (檢視者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_動能組員, N'動能組員(陳禎)', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'data_查詢資料'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_動能組員 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'data_查詢資料'));

-- module_詳細資訊: R (檢視者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_動能組員, N'動能組員(陳禎)', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_詳細資訊'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_動能組員 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_詳細資訊'));

-- module_交易說明: R+CUD (編輯者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_動能組員, N'動能組員(陳禎)', Id, '@c@d@r@u', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_交易說明'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_動能組員 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_交易說明'));

-- module_部長簽核: R (檢視者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_動能組員, N'動能組員(陳禎)', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_部長簽核'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_動能組員 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_部長簽核'));

-- module_風控簽核: R (檢視者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_動能組員, N'動能組員(陳禎)', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_風控簽核'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_動能組員 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_風控簽核'));

GO

-- ==========================================
-- 群組 2: 交易部長 (煌棋、萊融)
-- ==========================================
-- 請將 'YOUR_SUBJECT_ID_2' 替換為實際的 UserId 或 GroupId

DECLARE @Subject_交易部長 NVARCHAR(450) = 'YOUR_SUBJECT_ID_2';  -- TODO: 替換為實際 ID

-- module_login: R
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_交易部長, N'交易部長(煌棋、萊融)', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = 'module_login'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_交易部長 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = 'module_login'));

-- module_查詢: R (檢視者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_交易部長, N'交易部長(煌棋、萊融)', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_查詢'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_交易部長 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_查詢'));

-- module_查詢無風險交易: R (檢視者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_交易部長, N'交易部長(煌棋、萊融)', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_查詢無風險交易'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_交易部長 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_查詢無風險交易'));

-- data_查詢資料: R (檢視者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_交易部長, N'交易部長(煌棋、萊融)', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'data_查詢資料'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_交易部長 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'data_查詢資料'));

-- module_詳細資訊: R+E (匯出者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_交易部長, N'交易部長(煌棋、萊融)', Id, '@e@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_詳細資訊'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_交易部長 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_詳細資訊'));

-- module_交易說明: R+CUD (編輯者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_交易部長, N'交易部長(煌棋、萊融)', Id, '@c@d@r@u', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_交易說明'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_交易部長 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_交易說明'));

-- module_部長簽核: R+CUD (編輯者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_交易部長, N'交易部長(煌棋、萊融)', Id, '@c@d@r@u', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_部長簽核'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_交易部長 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_部長簽核'));

-- module_風控簽核: R (檢視者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_交易部長, N'交易部長(煌棋、萊融)', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_風控簽核'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_交易部長 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_風控簽核'));

GO

-- ==========================================
-- 群組 3: 管理處長(Jay)/風控稽核組(李律PC.LEE)/Devon
-- ==========================================
-- 請將 'YOUR_SUBJECT_ID_3' 替換為實際的 UserId 或 GroupId

DECLARE @Subject_風控稽核組 NVARCHAR(450) = 'YOUR_SUBJECT_ID_3';  -- TODO: 替換為實際 ID

-- module_login: R
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_風控稽核組, N'管理處長/風控稽核組', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = 'module_login'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_風控稽核組 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = 'module_login'));

-- module_查詢: R (檢視者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_風控稽核組, N'管理處長/風控稽核組', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_查詢'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_風控稽核組 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_查詢'));

-- module_查詢無風險交易: R (檢視者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_風控稽核組, N'管理處長/風控稽核組', Id, '@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_查詢無風險交易'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_風控稽核組 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_查詢無風險交易'));

-- data_查詢資料: C/R/U/D (編輯者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_風控稽核組, N'管理處長/風控稽核組', Id, '@c@d@r@u', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'data_查詢資料'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_風控稽核組 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'data_查詢資料'));

-- module_詳細資訊: R+E (匯出者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_風控稽核組, N'管理處長/風控稽核組', Id, '@e@r', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_詳細資訊'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_風控稽核組 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_詳細資訊'));

-- module_交易說明: R+CUD (編輯者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_風控稽核組, N'管理處長/風控稽核組', Id, '@c@d@r@u', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_交易說明'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_風控稽核組 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_交易說明'));

-- module_部長簽核: R+CUD (編輯者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_風控稽核組, N'管理處長/風控稽核組', Id, '@c@d@r@u', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_部長簽核'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_風控稽核組 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_部長簽核'));

-- module_風控簽核: R+CUD (編輯者)
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT NEWID(), NULL, 'User', @Subject_風控稽核組, N'管理處長/風控稽核組', Id, '@c@d@r@u', 0, 1, 'system', GETUTCDATE(), NULL
FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_風控簽核'
AND NOT EXISTS (SELECT 1 FROM Permissions WHERE SubjectId = @Subject_風控稽核組 AND ResourceId = (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb' AND Code = N'module_風控簽核'));

GO

-- ========================================
-- Step 8: 驗證權限設定結果
-- ========================================
SELECT
    p.Id,
    p.SubjectType,
    p.SubjectId,
    p.SubjectName,
    pr.Code as ResourceCode,
    pr.Name as ResourceName,
    p.Scopes,
    p.IsEnabled,
    p.GrantedAt
FROM Permissions p
INNER JOIN PermissionResources pr ON p.ResourceId = pr.Id
WHERE pr.ClientId = 'riskcontrolsystemweb'
ORDER BY p.SubjectName, pr.SortOrder;

GO

-- ========================================
-- 快速版本: 如果你已經知道所有 SubjectId
-- ========================================
-- 取消下面的註解並填入實際的 SubjectId，一次執行所有設定

/*
-- 先清除現有權限 (選用)
DELETE FROM Permissions
WHERE ResourceId IN (SELECT Id FROM PermissionResources WHERE ClientId = 'riskcontrolsystemweb');

-- 批量插入權限
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, IsEnabled, GrantedBy, GrantedAt, ExpiresAt)
SELECT
    NEWID(),
    NULL,
    'User',
    t.SubjectId,
    t.SubjectName,
    pr.Id,
    t.Scopes,
    0,
    1,
    'system',
    GETUTCDATE(),
    NULL
FROM (
    -- 動能組員(陳禎) 權限
    SELECT 'SUBJECT_ID_1' as SubjectId, N'動能組員(陳禎)' as SubjectName, 'module_login' as ResourceCode, '@r' as Scopes
    UNION ALL SELECT 'SUBJECT_ID_1', N'動能組員(陳禎)', N'module_查詢', '@r'
    UNION ALL SELECT 'SUBJECT_ID_1', N'動能組員(陳禎)', N'data_查詢資料', '@r'
    UNION ALL SELECT 'SUBJECT_ID_1', N'動能組員(陳禎)', N'module_詳細資訊', '@r'
    UNION ALL SELECT 'SUBJECT_ID_1', N'動能組員(陳禎)', N'module_交易說明', '@c@d@r@u'
    UNION ALL SELECT 'SUBJECT_ID_1', N'動能組員(陳禎)', N'module_部長簽核', '@r'
    UNION ALL SELECT 'SUBJECT_ID_1', N'動能組員(陳禎)', N'module_風控簽核', '@r'

    -- 交易部長(煌棋、萊融) 權限
    UNION ALL SELECT 'SUBJECT_ID_2', N'交易部長(煌棋、萊融)', 'module_login', '@r'
    UNION ALL SELECT 'SUBJECT_ID_2', N'交易部長(煌棋、萊融)', N'module_查詢', '@r'
    UNION ALL SELECT 'SUBJECT_ID_2', N'交易部長(煌棋、萊融)', N'module_查詢無風險交易', '@r'
    UNION ALL SELECT 'SUBJECT_ID_2', N'交易部長(煌棋、萊融)', N'data_查詢資料', '@r'
    UNION ALL SELECT 'SUBJECT_ID_2', N'交易部長(煌棋、萊融)', N'module_詳細資訊', '@e@r'
    UNION ALL SELECT 'SUBJECT_ID_2', N'交易部長(煌棋、萊融)', N'module_交易說明', '@c@d@r@u'
    UNION ALL SELECT 'SUBJECT_ID_2', N'交易部長(煌棋、萊融)', N'module_部長簽核', '@c@d@r@u'
    UNION ALL SELECT 'SUBJECT_ID_2', N'交易部長(煌棋、萊融)', N'module_風控簽核', '@r'

    -- 管理處長/風控稽核組 權限
    UNION ALL SELECT 'SUBJECT_ID_3', N'管理處長/風控稽核組', 'module_login', '@r'
    UNION ALL SELECT 'SUBJECT_ID_3', N'管理處長/風控稽核組', N'module_查詢', '@r'
    UNION ALL SELECT 'SUBJECT_ID_3', N'管理處長/風控稽核組', N'module_查詢無風險交易', '@r'
    UNION ALL SELECT 'SUBJECT_ID_3', N'管理處長/風控稽核組', N'data_查詢資料', '@c@d@r@u'
    UNION ALL SELECT 'SUBJECT_ID_3', N'管理處長/風控稽核組', N'module_詳細資訊', '@e@r'
    UNION ALL SELECT 'SUBJECT_ID_3', N'管理處長/風控稽核組', N'module_交易說明', '@c@d@r@u'
    UNION ALL SELECT 'SUBJECT_ID_3', N'管理處長/風控稽核組', N'module_部長簽核', '@c@d@r@u'
    UNION ALL SELECT 'SUBJECT_ID_3', N'管理處長/風控稽核組', N'module_風控簽核', '@c@d@r@u'
) t
INNER JOIN PermissionResources pr ON pr.Code = t.ResourceCode AND pr.ClientId = 'riskcontrolsystemweb';
*/
