# UC Capital Identity System - 資料庫結構說明

## 概述

本系統採用混合架構，包含**新架構**（Organizations/Groups）和**舊架構**（Keycloak 表），目前處於過渡期。

---

## 資料庫表結構

### 1. 多租戶支援

```
┌─────────────────────────────────────────────┐
│                  Tenants                     │
├─────────────────────────────────────────────┤
│ Id (Guid, PK)                               │
│ Code (租戶代碼，唯一)                        │
│ Name (租戶名稱)                              │
│ Domain (網域)                                │
│ LogoUrl                                      │
│ Settings (JSON 設定)                         │
│ IsEnabled                                    │
│ CreatedAt, UpdatedAt                         │
└─────────────────────────────────────────────┘
```

---

### 2. 組織架構模組 (Organization)

#### 新架構（推薦使用）

```
┌─────────────────────────────────────────────┐
│               Organizations                  │
├─────────────────────────────────────────────┤
│ Id (Guid, PK)                               │
│ TenantId (FK → Tenants)                     │
│ Code (部門代碼)                              │
│ Name (部門名稱)                              │
│ EnglishName                                  │
│ ChineseName                                  │
│ ParentId (FK → Organizations, 自我參照)     │
│ Path (路徑，如 /AD/MIS組)                   │
│ Depth (層級深度)                             │
│ SortOrder                                    │
│ ManagerUserId                                │
│ Description                                  │
│ InheritParentPermissions                     │
│ IsEnabled                                    │
│ CreatedAt, UpdatedAt                         │
└─────────────────────────────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────────────────────────┐
│           OrganizationMembers                │
├─────────────────────────────────────────────┤
│ Id (Guid, PK)                               │
│ OrganizationId (FK → Organizations)         │
│ UserId (FK → Users.Id)                      │
│ PositionId (FK → Positions)                 │
│ MemberRole (Member/Manager/Admin)           │
│ IsPrimary (是否為主要組織)                   │
│ JoinedAt                                     │
└─────────────────────────────────────────────┘
```

#### 舊架構（Keycloak，向下相容）

```
┌─────────────────────────────────────────────┐
│              KeycloakGroup                   │
├─────────────────────────────────────────────┤
│ id (String 50, PK)                          │
│ name                                         │
│ path                                         │
│ parentId                                     │
│ description                                  │
│ subGroupCount                                │
│ depth                                        │
│ dept_code                                    │
│ dept_ename                                   │
│ dept_zhname                                  │
│ manager                                      │
│ ENABLED                                      │
│ INSDATE, UPDDATE                             │
└─────────────────────────────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────────────────────────┐
│           KeycloakGroupMember                │
├─────────────────────────────────────────────┤
│ groupId (String 50, PK)                     │
│ userId (String 50, PK)                      │
│ username                                     │
│ groupName                                    │
│ groupPath                                    │
│ INSDATE                                      │
└─────────────────────────────────────────────┘
```

---

### 3. 群組模組 (Group)

```
┌─────────────────────────────────────────────┐
│                  Groups                      │
├─────────────────────────────────────────────┤
│ Id (Guid, PK)                               │
│ TenantId (FK → Tenants)                     │
│ Code (群組代碼)                              │
│ Name (群組名稱)                              │
│ Description                                  │
│ GroupType (General/Project/Team)            │
│ OwnerUserId                                  │
│ IsEnabled                                    │
│ CreatedAt, UpdatedAt                         │
└─────────────────────────────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────────────────────────┐
│              GroupMembers                    │
├─────────────────────────────────────────────┤
│ Id (Guid, PK)                               │
│ GroupId (FK → Groups)                       │
│ UserId (FK → Users.Id)                      │
│ MemberRole (Member/Admin/Owner)             │
│ InheritGroupPermissions                      │
│ JoinedAt                                     │
└─────────────────────────────────────────────┘
```

---

### 4. 權限模組 (Permission) - 詳細說明

權限系統由三個核心表組成：**資源 (Resource)**、**範圍 (Scope)**、**權限授權 (Permission)**

#### 4.1 權限資源 (PermissionResources)

資源代表系統中可被控管的功能、模組、API 或頁面。支援樹狀階層結構。

```
┌──────────────────────────────────────────────────────────────────┐
│                      PermissionResources                          │
├──────────────────────────────────────────────────────────────────┤
│ Id (Guid, PK)              - 資源唯一識別碼                       │
│ TenantId (FK → Tenants)    - 租戶 ID (NULL = 全域資源)            │
│ ClientId                    - 客戶端識別碼 (如: pos, admin, web)   │
│ ClientName                  - 客戶端顯示名稱                       │
│ Code                        - 資源代碼 (如: module_search_stock)   │
│ Name                        - 資源顯示名稱                         │
│ Description                 - 資源描述                             │
│ Uri                         - API 路徑 (如: /api/stock/search)    │
│ ResourceType                - 資源類型                             │
│ ParentId (FK → Self)       - 父資源 ID (用於樹狀結構)             │
│ SortOrder                   - 排序順序                             │
│ IsEnabled                   - 是否啟用                             │
│ CreatedAt, UpdatedAt        - 建立/更新時間                        │
└──────────────────────────────────────────────────────────────────┘
```

**資源類型 (ResourceType) 說明：**

| 類型 | 前綴 | 說明 | 範例 |
|------|------|------|------|
| `Module` | `module_` | 功能模組 | `module_search_stock` |
| `API` | `api_` | API 端點 | `api_user_create` |
| `Page` | `page_` | 前端頁面 | `page_dashboard` |
| `Function` | `feature_` | 特定功能 | `feature_export_excel` |
| `Report` | `report_` | 報表 | `report_daily_pnl` |
| `Data` | `data_` | 資料存取 | `data_client_info` |
| `Menu` | `menu_` | 選單項目 | `menu_settings` |

**資源階層範例：**

```
pos (ClientId)
├── module_search                    (搜尋模組)
│   ├── module_search_stock          (股票搜尋)
│   ├── module_search_bond           (債券搜尋)
│   └── module_search_futures        (期貨搜尋)
├── module_trading                   (交易模組)
│   ├── module_trading_order         (下單功能)
│   └── module_trading_cancel        (取消訂單)
└── report_daily                     (日報表)
    ├── report_daily_pnl             (損益報表)
    └── report_daily_position        (持倉報表)
```

---

#### 4.2 權限範圍 (PermissionScopes)

範圍定義對資源可執行的操作類型。

```
┌──────────────────────────────────────────────────────────────────┐
│                       PermissionScopes                            │
├──────────────────────────────────────────────────────────────────┤
│ Id (Guid, PK)              - 範圍唯一識別碼                       │
│ Code                        - 範圍代碼 (r/c/u/d/e/all)            │
│ Name                        - 範圍名稱                             │
│ Description                 - 範圍描述                             │
│ SortOrder                   - 排序順序                             │
└──────────────────────────────────────────────────────────────────┘
```

**預設權限範圍：**

| Code | Name | 說明 | 使用情境 |
|------|------|------|----------|
| `r` | Read | 讀取權限 | 查看資料、列表、報表 |
| `c` | Create | 新增權限 | 新增記錄、上傳檔案 |
| `u` | Update | 更新權限 | 編輯、修改現有資料 |
| `d` | Delete | 刪除權限 | 刪除記錄、移除資料 |
| `e` | Execute | 執行權限 | 觸發動作、執行功能 |
| `all` | All | 完整權限 | 擁有上述所有權限 |

**範圍格式說明：**

權限範圍在 `Permissions.Scopes` 欄位中以兩種格式儲存：

1. **@ 分隔格式**: `@r@e@u` (推薦)
2. **JSON 陣列格式**: `["r","e","u"]`

---

#### 4.3 權限授權 (Permissions)

記錄「誰」對「什麼資源」擁有「什麼操作權限」。

```
┌──────────────────────────────────────────────────────────────────┐
│                         Permissions                               │
├──────────────────────────────────────────────────────────────────┤
│ Id (Guid, PK)              - 權限記錄唯一識別碼                   │
│ TenantId (FK → Tenants)    - 租戶 ID                              │
│ SubjectType                 - 主體類型 (User/Group/Organization/Role) │
│ SubjectId                   - 主體 ID                              │
│ SubjectName                 - 主體名稱 (方便識別)                  │
│ ResourceId (FK)            - 資源 ID → PermissionResources        │
│ Scopes                      - 權限範圍 (格式: @r@e 或 JSON)       │
│ InheritToChildren           - 是否繼承給子組織/群組               │
│ IsEnabled                   - 是否啟用                             │
│ GrantedBy                   - 授權者 UserId                        │
│ GrantedAt                   - 授權時間                             │
│ ExpiresAt                   - 過期時間 (NULL = 永久)               │
└──────────────────────────────────────────────────────────────────┘
```

**主體類型 (SubjectType) 說明：**

| SubjectType | SubjectId 內容 | 說明 |
|-------------|----------------|------|
| `User` | 使用者 ID (GUID) | 直接授權給個人使用者 |
| `Group` | 群組 ID (GUID) | 授權給群組，成員自動繼承 |
| `Organization` | 組織 ID (GUID) | 授權給組織，成員自動繼承 |
| `Role` | 角色 ID (GUID) | 授權給角色，擁有該角色者繼承 |

---

### 5. 權限系統 ER 圖

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   Tenants   │       │PermissionResources│       │PermissionScopes │
│─────────────│       │──────────────────│       │─────────────────│
│ Id (PK)     │◄──────│ TenantId (FK)    │       │ Id (PK)         │
│ Code        │       │ Id (PK)          │       │ Code            │
│ Name        │       │ ClientId         │       │ Name            │
│ ...         │       │ Code             │       │ Description     │
└─────────────┘       │ Name             │       └─────────────────┘
      │               │ ParentId (FK)────┤              │
      │               │ ResourceType     │              │
      │               │ ...              │              │
      │               └────────┬─────────┘              │
      │                        │                        │
      │                        │ 1:N                    │
      │                        ▼                        │
      │               ┌──────────────────┐              │
      │               │   Permissions    │              │
      │               │──────────────────│              │
      └──────────────►│ TenantId (FK)    │              │
                      │ Id (PK)          │              │
                      │ SubjectType      │              │
                      │ SubjectId ───────┼──► Users / Groups / Organizations / Roles
                      │ SubjectName      │              │
                      │ ResourceId (FK)──┼──► PermissionResources
                      │ Scopes ──────────┼──► 參照 PermissionScopes.Code
                      │ InheritToChildren│              │
                      │ GrantedBy        │              │
                      │ GrantedAt        │              │
                      │ ExpiresAt        │              │
                      └──────────────────┘

權限查詢流程:
┌────────────┐                    ┌────────────────────┐
│   使用者   │ ──SubjectType=User──► │                    │
└────────────┘                    │                    │
                                  │    Permissions     │ ──ResourceId──► PermissionResources
┌────────────┐                    │     (授權記錄)      │
│   群組     │ ──SubjectType=Group──► │                    │ ──Scopes──► 操作範圍 (r/c/u/d/e)
└────────────┘                    │                    │
                                  └────────────────────┘
┌────────────┐                              │
│   組織     │ ──SubjectType=Organization───┘
└────────────┘
```

---

### 6. 權限繼承邏輯

```
                              有效權限計算
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
   使用者直接權限            群組繼承權限              組織繼承權限
   (SubjectType=User)     (SubjectType=Group)    (SubjectType=Organization)
        │                          │                          │
        │                          │                          │
        │                    檢查使用者是否              檢查使用者是否
        │                    為群組成員                  為組織成員
        │                          │                          │
        │                          ▼                          ▼
        │                   InheritGroupPermissions    InheritToChildren
        │                   = true?                    = true?
        │                          │                          │
        └──────────────────────────┴──────────────────────────┘
                                   │
                                   ▼
                           合併所有權限範圍
                          (取聯集，最大權限)
```

**範例：**

```
使用者: alice
├── 直接權限: module_search_stock → @r
├── 群組 "交易員" 的權限: module_trading → @r@e
└── 組織 "交易部" 的權限: report_daily → @r

Alice 的有效權限:
- module_search_stock: Read
- module_trading: Read, Execute
- report_daily: Read
```

---

## 完整系統 ER 圖

```
                                    ┌─────────────┐
                                    │   Tenants   │
                                    └──────┬──────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
              ▼                            ▼                            ▼
    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
    │  Organizations  │         │     Groups      │         │PermissionResources│
    │─────────────────│         │─────────────────│         │─────────────────│
    │ Id (PK)         │         │ Id (PK)         │         │ Id (PK)         │
    │ TenantId (FK)   │         │ TenantId (FK)   │         │ TenantId (FK)   │
    │ ParentId (FK)───┤         │ Code            │         │ ClientId        │
    │ Code            │         │ Name            │         │ Code            │
    │ Name            │         │ GroupType       │         │ Name            │
    │ Path            │         │ OwnerUserId     │         │ ParentId (FK)───┤
    │ ManagerUserId   │         │ ...             │         │ ResourceType    │
    │ ...             │         └────────┬────────┘         │ ...             │
    └────────┬────────┘                  │                  └────────┬────────┘
             │                           │                           │
             │ 1:N                       │ 1:N                       │ 1:N
             ▼                           ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
    │OrganizationMembers│       │  GroupMembers   │         │  Permissions    │
    │─────────────────│         │─────────────────│         │─────────────────│
    │ Id (PK)         │         │ Id (PK)         │         │ Id (PK)         │
    │ OrganizationId  │         │ GroupId (FK)    │         │ SubjectType     │
    │ UserId ─────────┼────┐    │ UserId ─────────┼────┐    │ SubjectId       │
    │ PositionId      │    │    │ MemberRole      │    │    │ ResourceId (FK) │
    │ MemberRole      │    │    │ JoinedAt        │    │    │ Scopes          │
    │ JoinedAt        │    │    └─────────────────┘    │    │ GrantedBy       │
    └─────────────────┘    │                           │    │ ...             │
                           │                           │    └─────────────────┘
                           │                           │
                           └───────────┬───────────────┘
                                       ▼
                              ┌─────────────────┐
                              │     Users       │
                              │─────────────────│
                              │ Id (PK)         │
                              │ UserName        │
                              │ Email           │
                              │ DisplayName     │
                              │ ...             │
                              └─────────────────┘
```

---

## API 端點與資料表對應

### OrganizationController (`/api/organization`)

| HTTP Method | 端點 | 操作 | 資料表 |
|-------------|------|------|--------|
| GET | `/` | 取得所有組織 | `Organizations` |
| GET | `/tree` | 取得樹狀結構 | `Organizations` + `OrganizationMembers` / `KeycloakGroupMember`(fallback) |
| GET | `/{id}` | 取得單一組織 | `Organizations` |
| GET | `/{id}/members` | 取得組織成員 | `OrganizationMembers` + `Users` |
| GET | `/stats` | 取得統計資料 | `Organizations` |
| GET | `/check-name` | 檢查名稱是否可用 | `Organizations` |
| GET | `/{id}/delete-confirmation` | 刪除確認（含子群組） | `Organizations` |
| POST | `/` | 新增組織 | `Organizations` |
| PUT | `/{id}` | 更新組織 | `Organizations` |
| DELETE | `/{id}` | 刪除組織（軟刪除） | `Organizations` |

**備註**: 成員數量計算會優先從 `OrganizationMembers` 取得，若為空則 fallback 到 `KeycloakGroupMember`（使用 Path 匹配）

---

### UserManagementController (`/api/usermanagement`)

| HTTP Method | 端點 | 操作 | 資料表 |
|-------------|------|------|--------|
| GET | `/` | 取得使用者列表 | `Users` + `OrganizationMembers` |
| GET | `/{id}` | 取得單一使用者 | `Users` |
| POST | `/` | 新增使用者 | `Users` |
| PUT | `/{id}` | 更新使用者 | `Users` |
| DELETE | `/{id}` | 刪除使用者 | `Users` |
| GET | `/{id}/roles` | 取得使用者角色 | `UserRoles` |
| POST | `/{id}/roles` | 指派角色 | `UserRoles` |
| DELETE | `/{id}/roles/{roleId}` | 移除角色 | `UserRoles` |
| GET | `/{id}/claims` | 取得使用者 Claims | `UserClaims` |
| POST | `/{id}/claims` | 新增 Claim | `UserClaims` |
| DELETE | `/{id}/claims/{claimId}` | 刪除 Claim | `UserClaims` |

**備註**: 當指定 `organizationId` 篩選時，會遞迴查詢該組織及所有子組織的成員

---

### PermissionV2Controller (`/api/v2/permissions`)

| HTTP Method | 端點 | 操作 | 資料表 |
|-------------|------|------|--------|
| GET | `/resources` | 取得所有資源 | `PermissionResources` |
| GET | `/resources/tree` | 取得資源樹狀結構 | `PermissionResources` |
| GET | `/resources/{id}` | 取得單一資源 | `PermissionResources` |
| GET | `/scopes` | 取得所有權限範圍 | `PermissionScopes` |
| GET | `/users/{userId}` | 取得使用者權限 | `Permissions` + `PermissionResources` |
| GET | `/users/{userId}/effective` | 取得有效權限（含繼承） | `Permissions` + 計算繼承 |
| GET | `/users/{userId}/check` | 檢查權限 | `Permissions` |
| GET | `/organizations/{orgId}` | 取得組織權限 | `Permissions` |
| GET | `/resources/{resourceId}/permissions` | 取得資源的所有權限 | `Permissions` |
| POST | `/grant` | 授予權限 | `Permissions` |
| POST | `/grant/batch` | 批次授予權限 | `Permissions` |
| PUT | `/{id}` | 更新權限 | `Permissions` |
| DELETE | `/{id}` | 撤銷權限 | `Permissions` |
| DELETE | `/batch` | 批次撤銷權限 | `Permissions` |

---

## 資料庫 View

### vw_OrganizationMembersDetail

提供 OrganizationMembers 的可讀性視圖，將 ID 轉換為名稱。

```sql
-- 查詢範例
SELECT * FROM vw_OrganizationMembersDetail
WHERE OrganizationName LIKE '%交易%'
ORDER BY OrganizationPath, UserDisplayName
```

| 欄位 | 類型 | 說明 |
|------|------|------|
| MemberId | uniqueidentifier | 成員記錄 ID |
| OrganizationId | uniqueidentifier | 組織 ID |
| OrganizationName | nvarchar | 組織名稱 |
| OrganizationChineseName | nvarchar | 組織中文名稱 |
| OrganizationCode | nvarchar | 組織代碼 |
| OrganizationPath | nvarchar | 組織路徑（如 /UC CEO/管理處/人資部） |
| OrganizationDepth | int | 組織深度（0=根節點） |
| UserId | nvarchar | 使用者 ID |
| UserName | nvarchar | 使用者帳號 |
| Email | nvarchar | 使用者 Email |
| UserDisplayName | nvarchar | 使用者顯示名稱（優先 DisplayName，其次 FirstName + LastName） |
| PositionId | uniqueidentifier | 職位 ID（可為 NULL） |
| PositionName | nvarchar | 職位名稱 |
| PositionCode | nvarchar | 職位代碼 |
| PositionLevel | int | 職位等級 |
| MemberRole | nvarchar | 成員角色（Member, Manager, Admin） |
| IsPrimary | bit | 是否為該使用者的主要組織 |
| JoinedAt | datetime2 | 加入時間 |

**View 定義**:

```sql
CREATE VIEW vw_OrganizationMembersDetail
AS
SELECT
    om.Id AS MemberId,
    om.OrganizationId,
    o.Name AS OrganizationName,
    o.ChineseName AS OrganizationChineseName,
    o.Code AS OrganizationCode,
    o.Path AS OrganizationPath,
    o.Depth AS OrganizationDepth,
    om.UserId,
    u.UserName,
    u.Email,
    COALESCE(u.DisplayName, CONCAT(u.FirstName, ' ', u.LastName)) AS UserDisplayName,
    om.PositionId,
    p.Name AS PositionName,
    p.Code AS PositionCode,
    p.Level AS PositionLevel,
    om.MemberRole,
    om.IsPrimary,
    om.JoinedAt
FROM OrganizationMembers om
LEFT JOIN Organizations o ON om.OrganizationId = o.Id
LEFT JOIN Users u ON om.UserId = u.Id
LEFT JOIN Positions p ON om.PositionId = p.Id;
```

---

## 資料遷移狀態

| 模組 | 新架構表 | 舊架構表 | 狀態 |
|------|----------|----------|------|
| 組織架構 | `Organizations` | `KeycloakGroup` | ✅ 已遷移結構，資料共存 |
| 組織成員 | `OrganizationMembers` | `KeycloakGroupMember` | ⚠️ 新表為空，使用舊表資料 |
| 群組 | `Groups` | - | ✅ 新架構 |
| 群組成員 | `GroupMembers` | - | ✅ 新架構 |
| 權限資源 | `PermissionResources` | `KeycloakResource` | ✅ 已遷移 |
| 權限範圍 | `PermissionScopes` | `KeycloakScope` | ✅ 已遷移 |
| 權限授權 | `Permissions` | `KeycloakUserPermission`, `KeycloakGroupPermission` | ✅ 已遷移 |

---

## 向下相容策略

### 組織成員數量查詢

```csharp
// OrganizationRepository.GetAllMemberCountsAsync()
// 1. 先嘗試 OrganizationMembers
// 2. 若為空，fallback 到 KeycloakGroupMember (使用 Path 匹配)
```

### 使用者查詢（依組織篩選）

```csharp
// UserManagementController.GetUsers()
// 使用 OrganizationRepository.GetAllDescendantMemberUserIdsAsync()
// 遞迴取得組織及所有子組織的成員 UserId
```

---

## 權限範圍代碼說明

| Code | 名稱 | 說明 |
|------|------|------|
| `r` | Read | 讀取 |
| `c` | Create | 新增 |
| `u` | Update | 更新 |
| `d` | Delete | 刪除 |
| `e` | Execute | 執行 |
| `all` | All | 全部權限 |

**格式**: `@r@e` 或 `["r","e"]`

---

## 建議的資料遷移步驟

若要完全遷移到新架構，需執行以下 SQL：

```sql
-- 將 KeycloakGroupMember 資料遷移到 OrganizationMembers
INSERT INTO OrganizationMembers (Id, OrganizationId, UserId, MemberRole, JoinedAt)
SELECT
    NEWID(),
    o.Id,
    k.userId,
    'Member',
    ISNULL(k.INSDATE, GETUTCDATE())
FROM KeycloakGroupMember k
INNER JOIN Organizations o ON o.Path = k.groupPath
WHERE NOT EXISTS (
    SELECT 1 FROM OrganizationMembers om
    WHERE om.OrganizationId = o.Id AND om.UserId = k.userId
);
```

---

## 相關檔案位置

| 類型 | 路徑 |
|------|------|
| 實體定義 | `src/Skoruba.Duende.IdentityServer.Admin.EntityFramework/Entities/` |
| DbContext | `src/Skoruba.Duende.IdentityServer.Admin.EntityFramework/DbContexts/` |
| Repository | `src/Skoruba.Duende.IdentityServer.Admin.EntityFramework/Repositories/` |
| Service | `src/Skoruba.Duende.IdentityServer.Admin.BusinessLogic/Services/` |
| API Controller | `src/Skoruba.Duende.IdentityServer.Admin.UI.Api/Controllers/` |
| 前端類型定義 | `TwFrontEnd/src/types/` |
| 前端 API 服務 | `TwFrontEnd/src/services/` |

---

*文件產生日期: 2025-12-29*
*版本: 1.2*
*View 建立狀態: ✅ vw_OrganizationMembersDetail 已建立 (102 筆資料)*
