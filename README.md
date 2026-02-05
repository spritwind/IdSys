# PRS 身份認證管理系統

> UC Capital 企業級身份認證與權限管理平台

基於 [Skoruba.Duende.IdentityServer.Admin](https://github.com/skoruba/Duende.IdentityServer.Admin) 深度客製化，整合多租戶架構、組織架構管理、權限控管與 Google Workspace 同步功能。

## 系統架構

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端應用程式                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   React SPA     │   Admin MVC     │   Third-party Apps          │
│  (TwFrontEnd)   │   (原生管理介面)  │   (透過 OIDC 整合)           │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                       │
         ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      REST API Layer                             │
│  /api/v2/permissions  /api/v2/organizations  /api/v2/google-sync│
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Admin MVC      │ │  Admin API      │ │  STS Identity   │
│  (prs.uccapital)│ │  (Swagger)      │ │  (OAuth/OIDC)   │
│  Port: 443      │ │  Port: 44302    │ │  Port: 44310    │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SQL Server (IdentitySysDB)                   │
│  Users | Roles | Organizations | Permissions | Tokens | Clients │
└─────────────────────────────────────────────────────────────────┘
```

## 核心功能

### 身份認證 (STS)
- OAuth 2.0 / OpenID Connect 標準協定
- JWT Token 發行與驗證
- Token 撤銷機制（支援即時黑名單）
- 多因素認證 (2FA)
- Google Workspace 外部登入

### 權限管理
- **多租戶架構**：支援多公司/部門獨立權限空間
- **RBAC + ABAC 混合模型**
  - 直接授權：User → Resource
  - 組織繼承：User → Organization → Resource（遞迴向上）
  - 群組繼承：User → Group → Resource（扁平）
- **Scope 細粒度控制**：`Read`、`Create`、`Update`、`Delete`
- **動態權限計算**：權限變更即時生效

### 組織架構
- 樹狀組織結構（支援無限層級）
- 組織成員管理
- 職位管理
- **Google Workspace 同步**：自動同步組織單位與人員對應

### 管理介面
- **React SPA** (TwFrontEnd)：現代化前端，支援深色/淺色主題
- **MVC Admin**：原生 Bootstrap 管理介面
- **Swagger API 文件**：完整的 REST API 文件

## 技術規格

| 項目 | 版本/技術 |
|------|----------|
| 後端框架 | .NET 9.0 |
| 前端框架 | React 18 + TypeScript + Vite |
| UI 元件 | Tailwind CSS + Lucide Icons |
| 資料庫 | SQL Server |
| ORM | Entity Framework Core 9 + Dapper |
| 身份認證 | Duende IdentityServer 7.x |
| 日誌 | Serilog |

## 專案結構

```
├── src/
│   ├── Skoruba.Duende.IdentityServer.Admin/        # Admin MVC 主程式
│   ├── Skoruba.Duende.IdentityServer.Admin.Api/    # REST API (Swagger)
│   ├── Skoruba.Duende.IdentityServer.STS.Identity/ # STS 身份認證服務
│   ├── Skoruba.Duende.IdentityServer.Admin.UI.Api/ # API Controllers
│   ├── Skoruba.Duende.IdentityServer.Admin.BusinessLogic/  # 商業邏輯層
│   └── Skoruba.Duende.IdentityServer.Admin.EntityFramework/ # 資料存取層
│
├── TwFrontEnd/                                     # React SPA 前端
│   ├── src/
│   │   ├── pages/          # 頁面元件
│   │   ├── components/     # 共用元件
│   │   ├── services/       # API 服務
│   │   └── contexts/       # React Context
│   └── dist/               # 建置輸出
│
├── publish/                                        # 發佈輸出
│   ├── Admin/              # Admin MVC
│   ├── Admin.Api/          # REST API
│   ├── STS.Identity/       # STS
│   └── app/                # React SPA
│
└── docs/
    ├── Postman/            # API 測試集合
    └── 待整合API/          # 待整合專案文件
```

## API 端點

### 權限管理 API
```
GET    /api/v2/permissions/user/{userId}          # 取得使用者有效權限
POST   /api/v2/permissions/grant                  # 授予權限
DELETE /api/v2/permissions/{permissionId}         # 撤銷權限
POST   /api/v2/permissions/batch-revoke           # 批次撤銷
```

### 組織架構 API
```
GET    /api/v2/organizations                      # 取得組織列表
GET    /api/v2/organizations/{id}/members         # 取得組織成員
POST   /api/v2/organizations                      # 建立組織
```

### Google Workspace 同步 API
```
GET    /api/v2/google-sync/health                 # 連線健康檢查
GET    /api/v2/google-sync/preview                # 預覽同步內容
POST   /api/v2/google-sync/organizations          # 同步組織架構
POST   /api/v2/google-sync/members                # 同步人員對應
POST   /api/v2/google-sync/full                   # 完整同步
```

### Token 管理 API
```
GET    /api/v2/tokens/active                      # 取得有效 Token
GET    /api/v2/tokens/revoked                     # 取得已撤銷 Token
POST   /api/v2/tokens/revoke                      # 撤銷 Token
```

## 建置指令

### 後端
```bash
# 建置整個方案
dotnet build Skoruba.Duende.IdentityServer.Admin.sln

# 發佈
dotnet publish src/Skoruba.Duende.IdentityServer.Admin -c Release -o publish/Admin
dotnet publish src/Skoruba.Duende.IdentityServer.Admin.Api -c Release -o publish/Admin.Api
dotnet publish src/Skoruba.Duende.IdentityServer.STS.Identity -c Release -o publish/STS.Identity
```

### 前端
```bash
cd TwFrontEnd
npm install
npm run build

# 複製到發佈資料夾
cp -r dist/* ../publish/app/
```

## 部署設定

### 正式環境 URL
- **Admin MVC**: https://prs.uccapital.com.tw
- **STS**: https://sts.uccapital.com.tw
- **React SPA**: https://prs.uccapital.com.tw/app

### 資料庫
- Server: 172.16.38.11
- Database: IdentitySysDB

### IIS 設定
- Hosting Model: InProcess
- Application Pool: .NET CLR Version = No Managed Code
- **重要**：部署後須回收 Application Pool

## 設定檔

### appsettings.json 主要設定
```json
{
  "ConnectionStrings": {
    "ConfigurationDbConnection": "Server=...;Database=IdentitySysDB;..."
  },
  "AdminConfiguration": {
    "IdentityServerBaseUrl": "https://sts.uccapital.com.tw",
    "AdministrationRole": "UCCapitalAdministrator"
  },
  "GoogleWorkspaceSettings": {
    "ServiceAccountKeyPath": "prs-project.json",
    "AdminEmail": "prs@uccapital.com.tw",
    "DefaultTenantId": "00000000-0000-0000-0000-000000000001"
  }
}
```

## 開發指南

### 本機開發
1. 設定 Visual Studio 多專案啟動：
   - Skoruba.Duende.IdentityServer.Admin
   - Skoruba.Duende.IdentityServer.STS.Identity

2. 啟動前端開發伺服器：
```bash
cd TwFrontEnd
npm run dev
```

### 程式碼變更部署對照表

| 變更範圍 | 需要重新部署 |
|----------|-------------|
| Admin.UI.Api (Controllers) | Admin + Admin.Api |
| Admin.BusinessLogic (Services) | Admin + Admin.Api |
| Admin.EntityFramework (Repositories) | Admin + Admin.Api |
| TwFrontEnd (React) | app/ |
| STS.Identity | STS.Identity |

## 授權聲明

本專案基於 [Skoruba.Duende.IdentityServer.Admin](https://github.com/skoruba/Duende.IdentityServer.Admin) 開發，遵循 Apache License 2.0。

**Duende IdentityServer** 在正式環境使用需要商業授權，詳情請參考 [Duende 授權說明](https://duendesoftware.com/products/identityserver#pricing)。

---

**UC Capital Information Technology Team**
