# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

Skoruba.Duende.IdentityServer.Admin 是一個用於管理 Duende IdentityServer 與 ASP.NET Core Identity 的管理介面。使用 ASP.NET Core MVC 搭配 .NET 9.0 建置。

**授權注意事項**：Duende IdentityServer 在正式環境使用需要商業授權。

## 建置指令

```bash
# 建置整個方案
dotnet build Skoruba.Duende.IdentityServer.Admin.sln

# 建置特定專案
dotnet build src/Skoruba.Duende.IdentityServer.Admin/Skoruba.Duende.IdentityServer.Admin.csproj

# 執行所有測試
dotnet test

# 執行特定測試專案
dotnet test tests/Skoruba.Duende.IdentityServer.Admin.UnitTests

# 執行單一測試
dotnet test --filter "FullyQualifiedName~TestMethodName"

# 安裝前端套件（前端資源必要）
cd src/Skoruba.Duende.IdentityServer.Admin.UI && npm install
cd src/Skoruba.Duende.IdentityServer.STS.Identity && npm install

# Gulp 任務（在 Admin.UI 或 STS.Identity 專案資料夾中執行）
gulp build    # 建置所有樣式與腳本
gulp clean    # 清除 dist 資料夾
gulp styles   # 壓縮 CSS、編譯 SASS
gulp scripts  # 打包與壓縮 JS
gulp watch    # 監聽 SASS 變更
```

## 執行應用程式

在 Visual Studio 中設定以下為啟動專案（或分別執行）：
- `Skoruba.Duende.IdentityServer.Admin`（管理介面 - https://localhost:44303）
- `Skoruba.Duende.IdentityServer.Admin.Api`（API 含 Swagger - https://localhost:44302）
- `Skoruba.Duende.IdentityServer.STS.Identity`（安全性權杖服務 - https://localhost:44310）

初始化種子資料：`dotnet run /seed` 或在 appsettings.json 設定 `"ApplySeed": true`。

## Docker

```bash
docker-compose build
docker-compose up -d
```

本機開發使用 Docker 時，需在 hosts 檔案加入：
```
127.0.0.1 skoruba.local sts.skoruba.local admin.skoruba.local admin-api.skoruba.local
```

## 資料庫遷移

```bash
# 新增遷移（在 build 資料夾執行）
.\add-migrations.ps1 -migration <遷移名稱> -migrationProviderName <SqlServer|MySql|PostgreSQL|All>

# 範例
.\add-migrations.ps1 -migration DbInit -migrationProviderName SqlServer
```

支援的資料庫提供者：SqlServer、MySql、PostgreSQL。透過 `appsettings.json` 設定：
```json
"DatabaseProviderConfiguration": {
    "ProviderType": "SqlServer"
}
```

## 架構

### 方案分層

**Web 應用程式 (src/)**
- `Admin` - 管理介面啟動應用程式（MVC）
- `Admin.Api` - REST API 含 Swagger 支援
- `Admin.UI` - 可重用的管理介面套件（MVC 視圖、控制器、資源）
- `Admin.UI.Api` - 可重用的 API 套件
- `STS.Identity` - 安全性權杖服務（Duende IdentityServer 實例）

**商業邏輯 (src/)**
- `Admin.BusinessLogic` - IdentityServer 實體的 Services、DTOs、Mappers
- `Admin.BusinessLogic.Identity` - ASP.NET Core Identity 的 Services、DTOs、Mappers
- `Admin.BusinessLogic.Shared` - 共用 DTOs 與例外處理

**資料層 (src/)**
- `Admin.EntityFramework` - IdentityServer 的 EF Core 實體
- `Admin.EntityFramework.Identity` - ASP.NET Core Identity 的 Repositories
- `Admin.EntityFramework.Shared` - DbContexts 與共用 Identity 實體
- `Admin.EntityFramework.Configuration` - EF 設定
- `Admin.EntityFramework.Extensions` - EF 擴充
- `Admin.EntityFramework.SqlServer/MySql/PostgreSQL` - 各資料庫提供者的遷移

**共用 (src/)**
- `Shared` - 跨專案共用的 Identity DTOs
- `Shared.Configuration` - 共用設定輔助類別

### DbContexts

- `AdminIdentityDbContext` - ASP.NET Core Identity
- `AdminLogDbContext` - 應用程式日誌
- `IdentityServerConfigurationDbContext` - IdentityServer 設定（clients、resources）
- `IdentityServerPersistedGrantDbContext` - IdentityServer 操作儲存（grants、tokens）
- `AdminAuditLogDbContext` - 稽核日誌
- `IdentityServerDataProtectionDbContext` - 資料保護金鑰

### 測試專案

- `Admin.UnitTests` - 單元測試（xUnit、Moq、FluentAssertions、Bogus）
- `Admin.IntegrationTests` - 管理介面整合測試
- `Admin.Api.IntegrationTests` - API 整合測試
- `Admin.Api.UnitTests` - API 單元測試
- `STS.Identity.IntegrationTests` - STS 整合測試

整合測試使用 InMemory 資料庫與 Cookie 驗證搭配假登入 URL。

## 重要設定檔

- `appsettings.json` - 主要設定（連線字串、IdentityServer 設定）
- `serilog.json` - 日誌設定（Console、File、MSSqlServer、Seq sinks）
- `identityserverdata.json` - Clients 與 Resources 種子資料
- `identitydata.json` - 管理員使用者種子資料

## 發佈 (Publish)

所有專案的發佈產出統一放置於專案根目錄的 `publish/` 資料夾，結構如下：

```
publish/
├── Admin/          # Admin MVC 管理介面
├── Admin.Api/      # Admin REST API
├── STS.Identity/   # Security Token Service
├── TwFrontEnd/     # React 前端 (原始名稱)
└── app/            # React 前端 (部署名稱，與 TwFrontEnd 內容相同)
```

### 前端發佈

```bash
# 在 TwFrontEnd 資料夾中執行
npm run build

# 將 dist/ 內容複製到 publish 資料夾
cp -r dist/* ../publish/TwFrontEnd/
cp -r dist/* ../publish/app/
```

### 後端發佈

```bash
# Admin MVC
dotnet publish src/Skoruba.Duende.IdentityServer.Admin -c Release -o publish/Admin

# Admin API
dotnet publish src/Skoruba.Duende.IdentityServer.Admin.Api -c Release -o publish/Admin.Api

# STS Identity
dotnet publish src/Skoruba.Duende.IdentityServer.STS.Identity -c Release -o publish/STS.Identity
```

## 驗證與授權

授權使用 appsettings.json 中設定的 `AdministrationRole` 宣告。預設角色為 `SkorubaIdentityAdminAdministrator`。原則透過 `AddAuthorizationPolicies()` 註冊。
