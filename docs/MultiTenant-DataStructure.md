# UC Capital 多租戶資料結構說明

> 文件版本：1.0
> 更新日期：2024-12-24
> 適用系統：UC Capital Identity Server

---

## 目錄

1. [資料搬遷概述](#1-資料搬遷概述)
2. [新資料表結構](#2-新資料表結構)
3. [資料表關聯圖](#3-資料表關聯圖)
4. [新舊資料表對應](#4-新舊資料表對應)
5. [權限設定情境說明](#5-權限設定情境說明)
6. [API 端點對照](#6-api-端點對照)

---

## 1. 資料搬遷概述

### 1.1 搬遷背景

原系統使用 Keycloak 相關資料表管理組織與權限，為支援多租戶架構並提升效能，已將資料搬遷至新的標準化資料表結構。

### 1.2 搬遷統計

| 項目 | 數量 | 說明 |
|------|------|------|
| Organizations | 83 筆 | 從 KeycloakGroup 搬遷 |
| Users | 98 筆 | 從 KeycloakUser 搬遷至 AspNetUsers |
| OrganizationMembers | 102 筆 | 從 KeycloakUserGroup 搬遷 |
| PermissionResources | 183 筆 | 從 KeycloakResource 搬遷 |
| Permissions | 5,484 筆 | 從 KeycloakGroupPermission + KeycloakUserPermission 合併 |

### 1.3 預設租戶

```
TenantId: 72B3A6BF-EC79-4451-B223-003FA2A95340
Name: UC Capital
```

---

## 2. 新資料表結構

### 2.1 Tenants (租戶)

```sql
CREATE TABLE Tenants (
    Id              UNIQUEIDENTIFIER PRIMARY KEY,
    Code            NVARCHAR(50) NOT NULL,      -- 租戶代碼 (如: uc-capital)
    Name            NVARCHAR(200) NOT NULL,     -- 租戶名稱
    Description     NVARCHAR(500),              -- 描述
    IsEnabled       BIT DEFAULT 1,              -- 是否啟用
    Settings        NVARCHAR(MAX),              -- JSON 設定
    CreatedAt       DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2
);
```

### 2.2 Organizations (組織/部門)

```sql
CREATE TABLE Organizations (
    Id                  UNIQUEIDENTIFIER PRIMARY KEY,
    TenantId            UNIQUEIDENTIFIER NOT NULL,  -- 所屬租戶
    ParentId            UNIQUEIDENTIFIER,           -- 父組織 ID
    Code                NVARCHAR(50),               -- 組織代碼
    Name                NVARCHAR(200) NOT NULL,     -- 組織名稱
    ShortName           NVARCHAR(100),              -- 簡稱
    Description         NVARCHAR(500),              -- 描述
    Path                NVARCHAR(1000),             -- 階層路徑 (如: /UC/投資處/交易部)
    Level               INT DEFAULT 0,              -- 層級深度
    SortOrder           INT DEFAULT 0,              -- 排序
    ManagerUserId       NVARCHAR(450),              -- 主管 UserId
    IsEnabled           BIT DEFAULT 1,
    CreatedAt           DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt           DATETIME2,

    FOREIGN KEY (TenantId) REFERENCES Tenants(Id),
    FOREIGN KEY (ParentId) REFERENCES Organizations(Id)
);
```

### 2.3 OrganizationMembers (組織成員)

```sql
CREATE TABLE OrganizationMembers (
    Id              UNIQUEIDENTIFIER PRIMARY KEY,
    OrganizationId  UNIQUEIDENTIFIER NOT NULL,  -- 所屬組織
    UserId          NVARCHAR(450) NOT NULL,     -- 使用者 ID
    PositionId      UNIQUEIDENTIFIER,           -- 職位 ID
    IsPrimary       BIT DEFAULT 0,              -- 是否為主要組織
    JoinedAt        DATETIME2 DEFAULT GETUTCDATE(),

    FOREIGN KEY (OrganizationId) REFERENCES Organizations(Id),
    FOREIGN KEY (UserId) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (PositionId) REFERENCES Positions(Id)
);
```

### 2.4 Positions (職位)

```sql
CREATE TABLE Positions (
    Id              UNIQUEIDENTIFIER PRIMARY KEY,
    TenantId        UNIQUEIDENTIFIER NOT NULL,
    Code            NVARCHAR(50),               -- 職位代碼
    Name            NVARCHAR(100) NOT NULL,     -- 職位名稱
    Level           INT DEFAULT 0,              -- 職等
    SortOrder       INT DEFAULT 0,
    IsEnabled       BIT DEFAULT 1,
    CreatedAt       DATETIME2 DEFAULT GETUTCDATE(),

    FOREIGN KEY (TenantId) REFERENCES Tenants(Id)
);
```

### 2.5 PermissionResources (權限資源)

```sql
CREATE TABLE PermissionResources (
    Id              UNIQUEIDENTIFIER PRIMARY KEY,
    TenantId        UNIQUEIDENTIFIER,           -- NULL = 全域資源
    ClientId        NVARCHAR(100) NOT NULL,     -- 客戶端 ID (如: pos, admin)
    ClientName      NVARCHAR(200),              -- 客戶端名稱
    Code            NVARCHAR(200) NOT NULL,     -- 資源代碼 (如: module_search_order)
    Name            NVARCHAR(200) NOT NULL,     -- 資源名稱
    Description     NVARCHAR(500),
    Uri             NVARCHAR(500),              -- API 路徑
    ResourceType    NVARCHAR(50),               -- Module, API, Page, Function
    ParentId        UNIQUEIDENTIFIER,           -- 父資源 (樹狀結構)
    SortOrder       INT DEFAULT 0,
    IsEnabled       BIT DEFAULT 1,
    CreatedAt       DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2,

    FOREIGN KEY (TenantId) REFERENCES Tenants(Id),
    FOREIGN KEY (ParentId) REFERENCES PermissionResources(Id)
);
```

### 2.6 PermissionScopes (權限範圍)

```sql
CREATE TABLE PermissionScopes (
    Id              UNIQUEIDENTIFIER PRIMARY KEY,
    Code            NVARCHAR(50) NOT NULL,      -- 範圍代碼 (r, c, u, d, e, all)
    Name            NVARCHAR(100) NOT NULL,     -- 範圍名稱
    Description     NVARCHAR(200)
);

-- 預設資料
INSERT INTO PermissionScopes VALUES
('...', 'r',   '讀取', 'Read - 檢視資料'),
('...', 'c',   '新增', 'Create - 建立資料'),
('...', 'u',   '更新', 'Update - 修改資料'),
('...', 'd',   '刪除', 'Delete - 移除資料'),
('...', 'e',   '匯出', 'Export - 匯出資料'),
('...', 'all', '全部', 'All - 完整權限');
```

### 2.7 Permissions (權限授予)

```sql
CREATE TABLE Permissions (
    Id                  UNIQUEIDENTIFIER PRIMARY KEY,
    TenantId            UNIQUEIDENTIFIER,           -- 租戶 ID
    SubjectType         NVARCHAR(20) NOT NULL,      -- 'User' 或 'Organization'
    SubjectId           NVARCHAR(450) NOT NULL,     -- UserId 或 OrganizationId
    SubjectName         NVARCHAR(200),              -- 主體名稱 (使用者名稱/組織名稱，提升可讀性)
    ResourceId          UNIQUEIDENTIFIER NOT NULL,  -- 資源 ID
    Scopes              NVARCHAR(100),              -- 權限範圍 (格式: @r@c@u@d)
    InheritToChildren   BIT DEFAULT 0,              -- 是否繼承給子組織
    IsEnabled           BIT DEFAULT 1,
    GrantedBy           NVARCHAR(450),              -- 授權者 UserId
    GrantedAt           DATETIME2 DEFAULT GETUTCDATE(),
    ExpiresAt           DATETIME2,                  -- 過期時間 (NULL = 永久)

    FOREIGN KEY (TenantId) REFERENCES Tenants(Id),
    FOREIGN KEY (ResourceId) REFERENCES PermissionResources(Id)
);

-- 索引
CREATE INDEX IX_Permissions_SubjectType_SubjectId ON Permissions(SubjectType, SubjectId);
CREATE INDEX IX_Permissions_SubjectName ON Permissions(SubjectName);
CREATE INDEX IX_Permissions_ResourceId ON Permissions(ResourceId);
```

> **重要**: `SubjectName` 欄位用於提升資料可讀性，方便快速識別權限授予對象。
> 授權時應同時填入 `SubjectId` 和 `SubjectName`。

---

## 3. 資料表關聯圖

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TENANTS (租戶)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Id: 72B3A6BF-EC79-4451-B223-003FA2A95340                            │   │
│  │ Code: uc-capital                                                     │   │
│  │ Name: UC Capital                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ TenantId
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORGANIZATIONS (組織架構)                             │
│                                                                              │
│  ┌────────────┐                                                             │
│  │ UC Capital │ (Root, Level=0)                                             │
│  │ CEO 室     │                                                             │
│  └─────┬──────┘                                                             │
│        │ ParentId                                                           │
│        ▼                                                                    │
│  ┌──────────────┬──────────────┬──────────────┐                            │
│  │   管理處     │    投資處    │    資訊處    │ (Level=1)                   │
│  └──────┬───────┴──────┬───────┴──────┬───────┘                            │
│         │              │              │                                     │
│         ▼              ▼              ▼                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                              │
│  │  人資部    │ │  交易部    │ │  開發部    │ (Level=2)                    │
│  │  財務部    │ │  研究部    │ │  維運部    │                              │
│  │  行政部    │ │  風控部    │ │            │                              │
│  └────────────┘ └────────────┘ └────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ OrganizationId
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ORGANIZATION_MEMBERS (組織成員)                          │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ OrganizationId  │ UserId          │ PositionId │ IsPrimary          │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ 交易部          │ user-001        │ 經理       │ true               │  │
│  │ 交易部          │ user-002        │ 專員       │ true               │  │
│  │ 風控部          │ user-001        │ 顧問       │ false (兼任)       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ UserId
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ASPNETUSERS (使用者)                                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Id        │ UserName      │ Email                │ PrimaryOrgId     │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ user-001  │ john.wang     │ john@uccapital.com   │ 交易部           │  │
│  │ user-002  │ mary.chen     │ mary@uccapital.com   │ 交易部           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                     PERMISSION_RESOURCES (權限資源)                          │
│                                                                              │
│  ClientId: pos (POS 系統)                                                   │
│  ┌────────────────────┐                                                     │
│  │ module_pos         │ (Type: Module, 根模組)                              │
│  └─────────┬──────────┘                                                     │
│            │ ParentId                                                       │
│            ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ module_search_xxx    │ module_trade_xxx    │ module_report_xxx     │   │
│  │ (搜尋功能模組)       │ (交易功能模組)      │ (報表功能模組)        │   │
│  └──────────┬───────────┴──────────┬──────────┴──────────┬────────────┘   │
│             │                      │                     │                 │
│             ▼                      ▼                     ▼                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐           │
│  │ search_order     │ │ trade_buy        │ │ report_daily     │           │
│  │ search_customer  │ │ trade_sell       │ │ report_monthly   │           │
│  │ search_product   │ │ trade_cancel     │ │ report_export    │           │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSIONS (權限授予)                               │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ SubjectType │ SubjectName │ ResourceCode     │ ResourceName │ Scopes │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │ Organization│ 投資處      │ module_trade_xxx │ 交易模組     │ @r@c@u │ │
│  │ Organization│ 交易部      │ trade_buy        │ 買入下單     │ @r@c@u@d│ │
│  │ User        │ 王小明      │ report_export    │ 報表匯出     │ @r@e   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  SubjectName 提升可讀性：查詢時直接顯示「王小明」而非「user-001」           │
│                                                                              │
│  Scopes 格式說明:                                                           │
│  @r = Read    @c = Create    @u = Update    @d = Delete    @e = Export     │
│  @all = 全部權限                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 關聯說明

| 關聯 | 說明 |
|------|------|
| Tenants → Organizations | 一個租戶有多個組織 |
| Organizations → Organizations | 自關聯，形成樹狀結構 |
| Organizations → OrganizationMembers | 一個組織有多個成員 |
| AspNetUsers → OrganizationMembers | 一個使用者可屬於多個組織 |
| Tenants → PermissionResources | 租戶特有資源 (TenantId = NULL 為全域) |
| PermissionResources → PermissionResources | 自關聯，資源樹狀結構 |
| Permissions → PermissionResources | 權限對應到資源 |
| Permissions → (User/Organization) | 權限授予對象 |

---

## 4. 新舊資料表對應

### 4.1 組織架構

| 舊表 (Keycloak) | 新表 | 欄位對應 |
|-----------------|------|----------|
| KeycloakGroup.Id | Organizations.Id | 直接對應 (GUID) |
| KeycloakGroup.Name | Organizations.Name | 直接對應 |
| KeycloakGroup.Path | Organizations.Path | 直接對應 |
| KeycloakGroup.DeptCode | Organizations.Code | 直接對應 |
| KeycloakGroup.DeptZhName | Organizations.ShortName | 中文名稱 |
| KeycloakGroup.Manager | Organizations.ManagerUserId | 需查詢 UserId |
| KeycloakGroup.ParentId | Organizations.ParentId | 從 Path 推算 |
| (計算) | Organizations.Level | 從 Path 計算深度 |

### 4.2 使用者

| 舊表 (Keycloak) | 新表 | 欄位對應 |
|-----------------|------|----------|
| KeycloakUser.Id | AspNetUsers.Id | 直接對應 (保留原 GUID) |
| KeycloakUser.Username | AspNetUsers.UserName | 直接對應 |
| KeycloakUser.Email | AspNetUsers.Email | 直接對應 |
| KeycloakUser.FirstName | AspNetUsers.FirstName | 擴充欄位 |
| KeycloakUser.LastName | AspNetUsers.LastName | 擴充欄位 |
| KeycloakUser.Enabled | AspNetUsers.LockoutEnabled | 反向邏輯 |

### 4.3 組織成員

| 舊表 (Keycloak) | 新表 | 欄位對應 |
|-----------------|------|----------|
| KeycloakUserGroup.UserId | OrganizationMembers.UserId | 直接對應 |
| KeycloakUserGroup.GroupId | OrganizationMembers.OrganizationId | 直接對應 |
| (新增) | OrganizationMembers.PositionId | 職位關聯 |
| (新增) | OrganizationMembers.IsPrimary | 主要組織標記 |

### 4.4 權限資源

| 舊表 (Keycloak) | 新表 | 欄位對應 |
|-----------------|------|----------|
| KeycloakResource.Id | PermissionResources.Id | 直接對應 |
| KeycloakResource.ClientId | PermissionResources.ClientId | 直接對應 |
| KeycloakResource.Name | PermissionResources.Code | 作為代碼 |
| KeycloakResource.DisplayName | PermissionResources.Name | 顯示名稱 |
| KeycloakResource.Type | PermissionResources.ResourceType | 直接對應 |

### 4.5 權限

| 舊表 (Keycloak) | 新表 | 說明 |
|-----------------|------|------|
| KeycloakGroupPermission | Permissions (SubjectType='Organization') | 組織權限 |
| KeycloakUserPermission | Permissions (SubjectType='User') | 使用者權限 |

**Scopes 格式轉換：**
- 舊格式：`@r@e` (直接儲存)
- 新格式：`@r@e` (保持相同，使用 @ 分隔)

---

## 5. 權限設定情境說明

### 情境 1：新增部門並授予模組權限

**場景：** 建立新的「量化交易部」，並授予 POS 系統交易模組的讀取和新增權限。

```
步驟 1: 建立組織
```

```sql
INSERT INTO Organizations (Id, TenantId, ParentId, Code, Name, Path, Level)
VALUES (
    NEWID(),
    '72B3A6BF-EC79-4451-B223-003FA2A95340',  -- UC Capital
    '投資處的Id',                              -- ParentId
    'QUANT',
    '量化交易部',
    '/UC Capital/投資處/量化交易部',
    2
);
```

```
步驟 2: 授予權限
```

```sql
-- 授予 module_trade_xxx 的讀取和新增權限給「量化交易部」
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, GrantedBy)
VALUES (
    NEWID(),
    '72B3A6BF-EC79-4451-B223-003FA2A95340',
    'Organization',
    '量化交易部的Id',
    '量化交易部',              -- 名稱：提升可讀性
    'module_trade_xxx的ResourceId',
    '@r@c',                    -- 讀取 + 新增
    1,                         -- 繼承給子組織
    '管理員UserId'
);
```

**資料流向：**
```
Organizations (新增)
    └── Permissions (新增)
            └── PermissionResources (關聯)
```

---

### 情境 2：員工加入部門並繼承組織權限

**場景：** 新員工「王小明」加入「交易部」，自動繼承交易部的權限。

```
步驟 1: 建立使用者
```

```sql
-- 使用者已透過 Identity 系統建立
-- AspNetUsers 已有資料
```

```
步驟 2: 加入組織
```

```sql
INSERT INTO OrganizationMembers (Id, OrganizationId, UserId, PositionId, IsPrimary, JoinedAt)
VALUES (
    NEWID(),
    '交易部的Id',
    '王小明的UserId',
    '專員職位的Id',
    1,                    -- 主要組織
    GETUTCDATE()
);

-- 更新使用者主要組織
UPDATE AspNetUsers
SET PrimaryOrganizationId = '交易部的Id'
WHERE Id = '王小明的UserId';
```

**權限繼承邏輯：**
```
查詢王小明的有效權限:

1. 直接權限 (SubjectType='User', SubjectId='王小明')
2. 組織權限 (SubjectType='Organization', SubjectId='交易部')
3. 父組織繼承權限 (SubjectType='Organization', SubjectId='投資處', InheritToChildren=1)

SELECT p.*
FROM Permissions p
WHERE
    -- 直接權限
    (p.SubjectType = 'User' AND p.SubjectId = '王小明UserId')
    OR
    -- 所屬組織權限
    (p.SubjectType = 'Organization' AND p.SubjectId IN (
        SELECT om.OrganizationId
        FROM OrganizationMembers om
        WHERE om.UserId = '王小明UserId'
    ))
    OR
    -- 父組織繼承權限
    (p.SubjectType = 'Organization' AND p.InheritToChildren = 1 AND p.SubjectId IN (
        SELECT o2.Id
        FROM Organizations o1
        JOIN Organizations o2 ON o1.Path LIKE o2.Path + '%'
        WHERE o1.Id IN (
            SELECT om.OrganizationId
            FROM OrganizationMembers om
            WHERE om.UserId = '王小明UserId'
        )
    ));
```

**資料流向：**
```
AspNetUsers (存在)
    └── OrganizationMembers (新增)
            └── Organizations (關聯)
                    └── Permissions (繼承查詢)
```

---

### 情境 3：授予個人特殊權限

**場景：** 「王小明」需要額外的報表匯出權限，但其他交易部成員不需要。

```sql
-- 授予個人特殊權限
INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, SubjectName, ResourceId, Scopes, InheritToChildren, GrantedBy)
VALUES (
    NEWID(),
    '72B3A6BF-EC79-4451-B223-003FA2A95340',
    'User',                           -- 個人權限
    '王小明的UserId',
    '王小明',                         -- 名稱：提升可讀性
    'report_export的ResourceId',
    '@r@e',                           -- 讀取 + 匯出
    0,                                -- 不繼承 (個人權限不適用)
    '管理員UserId'
);
```

**權限優先順序：**
```
1. 個人權限 (最高優先)
2. 主要組織權限
3. 兼任組織權限
4. 父組織繼承權限 (最低優先)

注意：權限是「合併」邏輯，不是覆蓋
```

---

### 情境 4：撤銷組織權限

**場景：** 「交易部」不再需要「報表匯出」功能。

```sql
-- 方法 1: 停用權限 (保留記錄)
UPDATE Permissions
SET IsEnabled = 0
WHERE SubjectType = 'Organization'
  AND SubjectId = '交易部的Id'
  AND ResourceId = 'report_export的ResourceId';

-- 方法 2: 刪除權限
DELETE FROM Permissions
WHERE SubjectType = 'Organization'
  AND SubjectId = '交易部的Id'
  AND ResourceId = 'report_export的ResourceId';
```

**影響範圍：**
```
交易部所有成員將失去 report_export 權限
(除非有個人權限或從父組織繼承)
```

---

### 情境 5：檢查使用者權限

**場景：** 檢查「王小明」是否有「交易下單」權限。

**API 呼叫：**
```http
GET /api/v2/permissions/users/{userId}/check?resourceId={resourceId}&scope=c
```

**內部查詢邏輯：**
```sql
-- 檢查是否有 trade_buy 的 create 權限
DECLARE @userId NVARCHAR(450) = '王小明的UserId';
DECLARE @resourceId UNIQUEIDENTIFIER = 'trade_buy的ResourceId';
DECLARE @scope NVARCHAR(10) = 'c';

SELECT CASE WHEN EXISTS (
    SELECT 1 FROM Permissions p
    WHERE p.IsEnabled = 1
      AND p.ResourceId = @resourceId
      AND p.Scopes LIKE '%@' + @scope + '%'
      AND (
          -- 個人權限
          (p.SubjectType = 'User' AND p.SubjectId = @userId)
          OR
          -- 組織權限
          (p.SubjectType = 'Organization' AND p.SubjectId IN (
              SELECT om.OrganizationId FROM OrganizationMembers om WHERE om.UserId = @userId
          ))
          OR
          -- 繼承權限
          (p.SubjectType = 'Organization' AND p.InheritToChildren = 1 AND p.SubjectId IN (
              SELECT o2.Id
              FROM OrganizationMembers om
              JOIN Organizations o1 ON om.OrganizationId = o1.Id
              JOIN Organizations o2 ON o1.Path LIKE o2.Path + '%'
              WHERE om.UserId = @userId
          ))
      )
      AND (p.ExpiresAt IS NULL OR p.ExpiresAt > GETUTCDATE())
) THEN 1 ELSE 0 END AS HasPermission;
```

**回傳結果：**
```json
{
    "userId": "王小明的UserId",
    "resourceId": "trade_buy的ResourceId",
    "scope": "c",
    "hasPermission": true
}
```

---

### 情境 6：批次授權給多個資源

**場景：** 「研究部」需要所有搜尋功能的讀取權限。

```sql
-- 取得所有 search 開頭的資源
DECLARE @orgId UNIQUEIDENTIFIER = '研究部的Id';
DECLARE @grantedBy NVARCHAR(450) = '管理員UserId';

INSERT INTO Permissions (Id, TenantId, SubjectType, SubjectId, ResourceId, Scopes, InheritToChildren, GrantedBy)
SELECT
    NEWID(),
    '72B3A6BF-EC79-4451-B223-003FA2A95340',
    'Organization',
    @orgId,
    pr.Id,
    '@r',                -- 只有讀取
    0,
    @grantedBy
FROM PermissionResources pr
WHERE pr.Code LIKE 'search_%'
  AND pr.ClientId = 'pos'
  AND pr.IsEnabled = 1;
```

---

## 6. API 端點對照

### 6.1 組織管理 API

| 操作 | HTTP Method | 端點 | 說明 |
|------|-------------|------|------|
| 取得所有組織 | GET | `/api/v2/organizations` | 含 tenantId 參數 |
| 取得組織樹 | GET | `/api/v2/organizations/tree` | 樹狀結構 |
| 取得單一組織 | GET | `/api/v2/organizations/{id}` | |
| 取得子組織 | GET | `/api/v2/organizations/{id}/children` | |
| 取得統計 | GET | `/api/v2/organizations/stats` | |
| 新增組織 | POST | `/api/v2/organizations` | |
| 更新組織 | PUT | `/api/v2/organizations/{id}` | |
| 刪除組織 | DELETE | `/api/v2/organizations/{id}` | 可選 includeDescendants |
| 取得成員 | GET | `/api/v2/organizations/{id}/members` | |
| 新增成員 | POST | `/api/v2/organizations/{id}/members` | |
| 移除成員 | DELETE | `/api/v2/organizations/{id}/members/{userId}` | |

### 6.2 權限管理 API

| 操作 | HTTP Method | 端點 | 說明 |
|------|-------------|------|------|
| 取得資源列表 | GET | `/api/v2/permissions/resources` | 可選 clientId |
| 取得資源樹 | GET | `/api/v2/permissions/resources/tree` | 需要 clientId |
| 取得權限範圍 | GET | `/api/v2/permissions/scopes` | |
| 取得使用者權限 | GET | `/api/v2/permissions/users/{userId}` | 直接權限 |
| 取得有效權限 | GET | `/api/v2/permissions/users/{userId}/effective` | 含繼承 |
| 檢查權限 | GET | `/api/v2/permissions/users/{userId}/check` | |
| 取得組織權限 | GET | `/api/v2/permissions/organizations/{id}` | |
| 授予權限 | POST | `/api/v2/permissions/grant` | |
| 批次授權 | POST | `/api/v2/permissions/grant/batch` | |
| 更新權限 | PUT | `/api/v2/permissions/{id}` | |
| 撤銷權限 | DELETE | `/api/v2/permissions/{id}` | |
| 批次撤銷 | DELETE | `/api/v2/permissions/batch` | |

---

## 附錄：常用查詢

### A. 查詢使用者所有有效權限

```sql
SELECT
    p.Id,
    CASE p.SubjectType
        WHEN 'User' THEN '個人權限'
        WHEN 'Organization' THEN '組織權限'
    END AS PermissionType,
    o.Name AS OrganizationName,
    pr.ClientId,
    pr.Code AS ResourceCode,
    pr.Name AS ResourceName,
    p.Scopes,
    p.InheritToChildren,
    p.ExpiresAt
FROM Permissions p
JOIN PermissionResources pr ON p.ResourceId = pr.Id
LEFT JOIN Organizations o ON p.SubjectType = 'Organization' AND p.SubjectId = CAST(o.Id AS NVARCHAR(450))
WHERE p.IsEnabled = 1
  AND (
      (p.SubjectType = 'User' AND p.SubjectId = @userId)
      OR
      (p.SubjectType = 'Organization' AND p.SubjectId IN (
          SELECT CAST(om.OrganizationId AS NVARCHAR(450))
          FROM OrganizationMembers om
          WHERE om.UserId = @userId
      ))
  )
ORDER BY p.SubjectType, pr.ClientId, pr.Code;
```

### B. 查詢組織及其所有成員權限

```sql
SELECT
    u.UserName,
    u.Email,
    pos.Name AS PositionName,
    pr.ClientId,
    pr.Code AS ResourceCode,
    p.Scopes
FROM OrganizationMembers om
JOIN AspNetUsers u ON om.UserId = u.Id
LEFT JOIN Positions pos ON om.PositionId = pos.Id
JOIN Permissions p ON (
    (p.SubjectType = 'User' AND p.SubjectId = u.Id)
    OR
    (p.SubjectType = 'Organization' AND p.SubjectId = CAST(om.OrganizationId AS NVARCHAR(450)))
)
JOIN PermissionResources pr ON p.ResourceId = pr.Id
WHERE om.OrganizationId = @organizationId
  AND p.IsEnabled = 1
ORDER BY u.UserName, pr.ClientId, pr.Code;
```

---

*文件結束*
