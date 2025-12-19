# UC Capital Google OAuth 整合計畫書

> **版本**: 1.0
> **建立日期**: 2024-12-19
> **狀態**: 規劃階段

---

## 目錄

1. [專案概述](#1-專案概述)
2. [系統架構](#2-系統架構)
3. [整合流程](#3-整合流程)
4. [技術實作細節](#4-技術實作細節)
5. [安全性考量](#5-安全性考量)
6. [資料庫設計](#6-資料庫設計)
7. [API 端點設計](#7-api-端點設計)
8. [前端整合指南](#8-前端整合指南)
9. [測試計畫](#9-測試計畫)
10. [部署檢查清單](#10-部署檢查清單)
11. [維運與監控](#11-維運與監控)

---

## 1. 專案概述

### 1.1 目標

將組織的 Google Workspace 帳戶整合至 UC Capital 驗證伺服器，實現：

- 員工使用 Google 帳戶進行單一登入 (SSO)
- 集中式身分與授權管理
- 自訂 JWT Token 包含組織角色與權限
- API 資源的細粒度存取控制

### 1.2 範圍

| 項目 | 包含 | 不包含 |
|------|------|--------|
| 身分驗證 | Google OAuth 2.0 | 其他社交登入 (Facebook, LINE 等) |
| 使用者來源 | 組織 Google Workspace | 個人 Gmail 帳戶 |
| 應用類型 | SPA、Server-side Web、Mobile | IoT 裝置 |
| 權限模型 | RBAC (角色型存取控制) | ABAC (屬性型存取控制) |

### 1.3 利害關係人

| 角色 | 職責 |
|------|------|
| 系統架構師 | 整體架構設計與技術決策 |
| 後端開發者 | IdentityServer 與 API 整合實作 |
| 前端開發者 | 用戶端 OIDC 整合 |
| IT 管理員 | Google Cloud Console 設定 |
| 資安人員 | 安全性審查與合規確認 |

---

## 2. 系統架構

### 2.1 高層架構圖

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UC Capital 驗證架構                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐                                                          │
│   │   使用者      │                                                          │
│   │  (瀏覽器)    │                                                          │
│   └──────┬───────┘                                                          │
│          │ ① 存取應用程式                                                    │
│          ▼                                                                   │
│   ┌──────────────┐      ② 重導向登入       ┌──────────────────────┐        │
│   │   前端應用    │ ──────────────────────▶ │  UC Capital STS      │        │
│   │  (React/Vue) │                         │  (IdentityServer)    │        │
│   └──────────────┘                         │  https://localhost:  │        │
│          ▲                                 │       44310          │        │
│          │ ⑦ JWT Token                     └──────────┬───────────┘        │
│          │                                            │                     │
│          │                               ③ 選擇 Google 登入                 │
│          │                                            ▼                     │
│          │                                 ┌──────────────────────┐        │
│          │                                 │   Google OAuth 2.0   │        │
│          │                                 │   (Workspace)        │        │
│          │                                 └──────────┬───────────┘        │
│          │                                            │                     │
│          │                               ④ 使用者授權 & 回調                │
│          │                                            ▼                     │
│          │                                 ┌──────────────────────┐        │
│          │      ⑥ 派發 UC Capital Token    │  建立/連結本地帳戶   │        │
│          │ ◀─────────────────────────────  │  指派角色與權限      │        │
│          │                                 └──────────────────────┘        │
│          │                                            │                     │
│          │                                            ▼                     │
│   ┌──────┴───────┐      ⑧ API 請求         ┌──────────────────────┐        │
│   │   前端應用    │ ──────────────────────▶ │   API 服務           │        │
│   │              │      (Bearer Token)     │   (驗證 JWT)         │        │
│   └──────────────┘                         └──────────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 元件說明

| 元件 | 技術 | 職責 |
|------|------|------|
| **UC Capital STS** | Duende IdentityServer 7.x | 身分驗證、Token 派發、使用者管理 |
| **Admin UI** | ASP.NET Core MVC | 管理用戶端、資源、使用者、角色 |
| **Admin API** | ASP.NET Core Web API | 提供管理功能的 RESTful API |
| **前端應用** | React / Vue / Angular | 使用者介面，整合 oidc-client-ts |
| **後端 API** | ASP.NET Core Web API | 業務邏輯，驗證 JWT Token |

### 2.3 網路拓撲

```
┌─────────────────────────────────────────────────────────────────┐
│                        內部網路 (Intranet)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ STS Server  │  │ Admin UI    │  │ API Server  │             │
│  │ :44310      │  │ :44303      │  │ :44302      │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                    ┌─────┴─────┐                                │
│                    │  Load     │                                │
│                    │  Balancer │                                │
│                    └─────┬─────┘                                │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │   Firewall  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌────┴────┐ ┌─────┴─────┐
        │  使用者   │ │ Google  │ │  外部     │
        │  瀏覽器   │ │ OAuth   │ │  服務     │
        └───────────┘ └─────────┘ └───────────┘
```

---

## 3. 整合流程

### 3.1 驗證流程 (Authorization Code Flow with PKCE)

```
┌─────────┐                              ┌─────────┐                              ┌─────────┐
│  使用者  │                              │   STS   │                              │ Google  │
└────┬────┘                              └────┬────┘                              └────┬────┘
     │                                        │                                        │
     │ 1. 存取應用程式                         │                                        │
     │ ──────────────────────────────────────▶│                                        │
     │                                        │                                        │
     │ 2. 重導向至登入頁面                     │                                        │
     │ ◀──────────────────────────────────────│                                        │
     │                                        │                                        │
     │ 3. 點擊「使用 Google 登入」             │                                        │
     │ ──────────────────────────────────────▶│                                        │
     │                                        │                                        │
     │                                        │ 4. 重導向至 Google OAuth               │
     │                                        │ ──────────────────────────────────────▶│
     │                                        │                                        │
     │ 5. Google 登入頁面                      │                                        │
     │ ◀───────────────────────────────────────────────────────────────────────────────│
     │                                        │                                        │
     │ 6. 輸入 Google 帳密 & 授權              │                                        │
     │ ────────────────────────────────────────────────────────────────────────────────▶
     │                                        │                                        │
     │                                        │ 7. 授權碼回調                           │
     │                                        │ ◀──────────────────────────────────────│
     │                                        │                                        │
     │                                        │ 8. 交換 Google Token                   │
     │                                        │ ──────────────────────────────────────▶│
     │                                        │                                        │
     │                                        │ 9. 返回 Google Token                   │
     │                                        │ ◀──────────────────────────────────────│
     │                                        │                                        │
     │                                        │ 10. 驗證 Email 網域                    │
     │                                        │     建立/連結本地帳戶                   │
     │                                        │     指派角色                           │
     │                                        │                                        │
     │ 11. 返回 UC Capital JWT Token          │                                        │
     │ ◀──────────────────────────────────────│                                        │
     │                                        │                                        │
     │ 12. 使用 Token 呼叫 API                 │                                        │
     │ ──────────────────────────────────────▶│                                        │
     │                                        │                                        │
```

### 3.2 Token 換發流程

```
┌─────────┐                              ┌─────────┐
│  前端   │                              │   STS   │
└────┬────┘                              └────┬────┘
     │                                        │
     │ 1. Access Token 即將到期               │
     │    (前端定時檢查)                      │
     │                                        │
     │ 2. 使用 Refresh Token 請求新 Token     │
     │ ──────────────────────────────────────▶│
     │                                        │
     │                                        │ 3. 驗證 Refresh Token
     │                                        │    檢查使用者狀態
     │                                        │    檢查角色是否變更
     │                                        │
     │ 4. 返回新的 Access Token               │
     │ ◀──────────────────────────────────────│
     │                                        │
```

### 3.3 使用者首次登入流程

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         首次 Google 登入流程                               │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────┐                                                      │
│  │ Google 回調     │                                                      │
│  │ 取得使用者資訊   │                                                      │
│  └────────┬────────┘                                                      │
│           │                                                                │
│           ▼                                                                │
│  ┌─────────────────┐     否      ┌─────────────────┐                     │
│  │ Email 是否為    │ ──────────▶ │ 拒絕存取        │                     │
│  │ @uccapital.com? │             │ 顯示錯誤訊息    │                     │
│  └────────┬────────┘             └─────────────────┘                     │
│           │ 是                                                             │
│           ▼                                                                │
│  ┌─────────────────┐     是      ┌─────────────────┐                     │
│  │ 本地帳戶是否    │ ──────────▶ │ 連結現有帳戶    │                     │
│  │ 已存在?        │             │ 更新登入資訊    │                     │
│  └────────┬────────┘             └────────┬────────┘                     │
│           │ 否                             │                              │
│           ▼                                │                              │
│  ┌─────────────────┐                       │                              │
│  │ 建立新本地帳戶   │                       │                              │
│  │ - UserName      │                       │                              │
│  │ - Email         │                       │                              │
│  │ - Name Claim    │                       │                              │
│  └────────┬────────┘                       │                              │
│           │                                │                              │
│           ▼                                ▼                              │
│  ┌─────────────────────────────────────────────────┐                     │
│  │ 查詢角色映射規則                                 │                     │
│  │ (根據 Email / Google 群組 / 部門)               │                     │
│  └────────┬────────────────────────────────────────┘                     │
│           │                                                                │
│           ▼                                                                │
│  ┌─────────────────┐                                                      │
│  │ 指派角色        │                                                      │
│  │ - 預設角色      │                                                      │
│  │ - 映射角色      │                                                      │
│  └────────┬────────┘                                                      │
│           │                                                                │
│           ▼                                                                │
│  ┌─────────────────┐                                                      │
│  │ 派發 JWT Token  │                                                      │
│  │ 重導向至應用    │                                                      │
│  └─────────────────┘                                                      │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 技術實作細節

### 4.1 Google Cloud Console 設定

#### 4.1.1 建立 OAuth 2.0 憑證

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Google+ API** 和 **Google People API**
4. 建立 OAuth 2.0 用戶端 ID

```
應用程式類型: Web 應用程式
名稱: UC Capital IdentityServer
已授權的 JavaScript 來源:
  - https://localhost:44310
  - https://auth.uccapital.com (正式環境)

已授權的重新導向 URI:
  - https://localhost:44310/signin-google
  - https://auth.uccapital.com/signin-google (正式環境)
```

#### 4.1.2 限制組織網域 (選用)

在 Google Admin Console 設定：
- 限制 OAuth 同意畫面僅對內部使用者顯示
- 或在程式碼中驗證 email 網域

### 4.2 IdentityServer 設定

#### 4.2.1 appsettings.json

```json
{
  "ExternalProvidersConfiguration": {
    "UseGoogleProvider": true,
    "GoogleClientId": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    "GoogleClientSecret": "YOUR_GOOGLE_CLIENT_SECRET",
    "GoogleCallbackPath": "/signin-google"
  },

  "GoogleIntegration": {
    "AllowedDomains": ["uccapital.com"],
    "AutoCreateUsers": true,
    "DefaultRole": "Employee",
    "RoleMappings": {
      "admin@uccapital.com": ["UCCapitalAdministrator"],
      "finance-team@uccapital.com": ["FinanceManager", "ReportViewer"],
      "it-team@uccapital.com": ["ITSupport", "SystemMonitor"]
    }
  }
}
```

#### 4.2.2 StartupHelpers.cs 修改

```csharp
// 在 AddExternalProviders 方法中增強 Google 設定
private static void AddExternalProviders(
    AuthenticationBuilder authenticationBuilder,
    IConfiguration configuration)
{
    var externalProviderConfig = configuration
        .GetSection(nameof(ExternalProvidersConfiguration))
        .Get<ExternalProvidersConfiguration>();

    if (externalProviderConfig.UseGoogleProvider)
    {
        authenticationBuilder.AddGoogle(options =>
        {
            options.ClientId = externalProviderConfig.GoogleClientId;
            options.ClientSecret = externalProviderConfig.GoogleClientSecret;
            options.CallbackPath = externalProviderConfig.GoogleCallbackPath;

            // 請求額外的 Scope
            options.Scope.Add("email");
            options.Scope.Add("profile");
            options.Scope.Add("openid");

            // 保存 Token 以便後續使用
            options.SaveTokens = true;

            // 自訂 Claims 映射
            options.ClaimActions.MapJsonKey("picture", "picture");
            options.ClaimActions.MapJsonKey("locale", "locale");

            // 事件處理
            options.Events.OnCreatingTicket = async context =>
            {
                // 可在此處查詢 Google Directory API 取得群組資訊
                var email = context.Principal?.FindFirstValue(ClaimTypes.Email);

                // 驗證網域
                if (!IsAllowedDomain(email, configuration))
                {
                    context.Fail("此 Google 帳戶不屬於允許的組織網域");
                    return;
                }
            };
        });
    }
}

private static bool IsAllowedDomain(string email, IConfiguration configuration)
{
    var allowedDomains = configuration
        .GetSection("GoogleIntegration:AllowedDomains")
        .Get<string[]>() ?? new[] { "uccapital.com" };

    return allowedDomains.Any(domain =>
        email?.EndsWith($"@{domain}", StringComparison.OrdinalIgnoreCase) == true);
}
```

#### 4.2.3 AccountController.cs 修改

```csharp
[HttpGet]
[AllowAnonymous]
public async Task<IActionResult> ExternalLoginCallback(
    string returnUrl = null,
    string remoteError = null)
{
    if (remoteError != null)
    {
        ModelState.AddModelError(string.Empty,
            _localizer["ErrorExternalProvider", remoteError]);
        return View(nameof(Login));
    }

    var info = await _signInManager.GetExternalLoginInfoAsync();
    if (info == null)
        return RedirectToAction(nameof(Login));

    // 取得 Email
    var email = info.Principal.FindFirstValue(ClaimTypes.Email);

    // 驗證網域
    if (!IsAllowedDomain(email))
    {
        _logger.LogWarning("拒絕非組織網域的登入嘗試: {Email}", email);
        return View("AccessDenied", new AccessDeniedViewModel
        {
            Message = "僅限 UC Capital 員工使用組織 Google 帳戶登入"
        });
    }

    // 嘗試以外部登入簽入
    var result = await _signInManager.ExternalLoginSignInAsync(
        info.LoginProvider,
        info.ProviderKey,
        isPersistent: false);

    if (result.Succeeded)
    {
        // 更新使用者的登入資訊
        await UpdateUserLoginInfo(info);
        return RedirectToLocal(returnUrl);
    }

    if (result.IsLockedOut)
        return View("Lockout");

    // 新使用者 - 自動建立帳戶 (如果啟用)
    if (_configuration.GetValue<bool>("GoogleIntegration:AutoCreateUsers"))
    {
        return await AutoCreateUserAndSignIn(info, returnUrl);
    }

    // 否則顯示確認頁面
    ViewData["ReturnUrl"] = returnUrl;
    ViewData["LoginProvider"] = info.LoginProvider;

    return View("ExternalLoginConfirmation",
        new ExternalLoginConfirmationViewModel
        {
            Email = email,
            UserName = GenerateUserNameFromEmail(email)
        });
}

private async Task<IActionResult> AutoCreateUserAndSignIn(
    ExternalLoginInfo info,
    string returnUrl)
{
    var email = info.Principal.FindFirstValue(ClaimTypes.Email);
    var name = info.Principal.FindFirstValue(ClaimTypes.Name)
        ?? info.Principal.FindFirstValue("name");

    // 建立使用者
    var user = new ApplicationUser
    {
        UserName = GenerateUserNameFromEmail(email),
        Email = email,
        EmailConfirmed = true // Google 已驗證
    };

    var createResult = await _userManager.CreateAsync(user);
    if (!createResult.Succeeded)
    {
        _logger.LogError("建立使用者失敗: {Errors}",
            string.Join(", ", createResult.Errors.Select(e => e.Description)));
        return View("Error");
    }

    // 添加 Claims
    await _userManager.AddClaimAsync(user, new Claim("name", name ?? email));
    await _userManager.AddClaimAsync(user, new Claim("idp", "Google"));

    // 連結外部登入
    await _userManager.AddLoginAsync(user, info);

    // 指派角色
    await AssignRolesBasedOnEmail(user, email);

    // 登入
    await _signInManager.SignInAsync(user, isPersistent: false);

    _logger.LogInformation("使用者 {Email} 透過 Google OAuth 自動建立並登入", email);

    return RedirectToLocal(returnUrl);
}

private async Task AssignRolesBasedOnEmail(ApplicationUser user, string email)
{
    var roleMappings = _configuration
        .GetSection("GoogleIntegration:RoleMappings")
        .Get<Dictionary<string, string[]>>() ?? new();

    // 預設角色
    var defaultRole = _configuration.GetValue<string>("GoogleIntegration:DefaultRole")
        ?? "Employee";

    if (!await _roleManager.RoleExistsAsync(defaultRole))
        await _roleManager.CreateAsync(new IdentityRole(defaultRole));

    await _userManager.AddToRoleAsync(user, defaultRole);

    // 映射角色
    foreach (var mapping in roleMappings)
    {
        if (email.Equals(mapping.Key, StringComparison.OrdinalIgnoreCase))
        {
            foreach (var role in mapping.Value)
            {
                if (!await _roleManager.RoleExistsAsync(role))
                    await _roleManager.CreateAsync(new IdentityRole(role));

                await _userManager.AddToRoleAsync(user, role);
            }
        }
    }
}

private string GenerateUserNameFromEmail(string email)
{
    // alice@uccapital.com -> alice
    return email?.Split('@').FirstOrDefault() ?? email;
}
```

### 4.3 JWT Token 設計

#### 4.3.1 Token 內容結構

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "signing-key-id"
  },
  "payload": {
    "iss": "https://auth.uccapital.com",
    "sub": "e7699e49-48c3-4354-a474-907640f92e2a",
    "aud": ["uc_capital_api", "uc_capital_admin_api"],
    "exp": 1702987200,
    "iat": 1702983600,
    "nbf": 1702983600,
    "auth_time": 1702983590,
    "idp": "Google",
    "amr": ["external"],
    "client_id": "uc_capital_web_app",
    "scope": "openid profile email roles offline_access uc_capital_api",

    "name": "王小明",
    "email": "xiaoming.wang@uccapital.com",
    "email_verified": true,
    "picture": "https://lh3.googleusercontent.com/...",

    "role": [
      "Employee",
      "FinanceManager"
    ],

    "department": "財務部",
    "employee_id": "UC2024001"
  }
}
```

#### 4.3.2 自訂 ProfileService

```csharp
public class CustomProfileService : IProfileService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IUserClaimsPrincipalFactory<ApplicationUser> _claimsFactory;

    public CustomProfileService(
        UserManager<ApplicationUser> userManager,
        IUserClaimsPrincipalFactory<ApplicationUser> claimsFactory)
    {
        _userManager = userManager;
        _claimsFactory = claimsFactory;
    }

    public async Task GetProfileDataAsync(ProfileDataRequestContext context)
    {
        var sub = context.Subject.GetSubjectId();
        var user = await _userManager.FindByIdAsync(sub);

        if (user == null)
            return;

        var principal = await _claimsFactory.CreateAsync(user);
        var claims = principal.Claims.ToList();

        // 添加角色
        var roles = await _userManager.GetRolesAsync(user);
        claims.AddRange(roles.Select(r => new Claim("role", r)));

        // 添加自訂 Claims
        var userClaims = await _userManager.GetClaimsAsync(user);
        claims.AddRange(userClaims);

        // 根據請求的 Scope 過濾 Claims
        context.IssuedClaims = claims
            .Where(c => context.RequestedClaimTypes.Contains(c.Type))
            .ToList();
    }

    public async Task IsActiveAsync(IsActiveContext context)
    {
        var sub = context.Subject.GetSubjectId();
        var user = await _userManager.FindByIdAsync(sub);

        context.IsActive = user != null
            && !await _userManager.IsLockedOutAsync(user);
    }
}
```

### 4.4 用戶端設定

#### 4.4.1 SPA 用戶端 (前端應用)

```json
{
  "ClientId": "uc_capital_web_app",
  "ClientName": "UC Capital Web Application",
  "ClientUri": "https://app.uccapital.com",
  "AllowedGrantTypes": ["authorization_code"],
  "RequirePkce": true,
  "RequireClientSecret": false,
  "AllowedScopes": [
    "openid",
    "profile",
    "email",
    "roles",
    "offline_access",
    "uc_capital_api"
  ],
  "RedirectUris": [
    "https://app.uccapital.com/callback",
    "https://app.uccapital.com/silent-renew"
  ],
  "PostLogoutRedirectUris": [
    "https://app.uccapital.com"
  ],
  "AllowedCorsOrigins": [
    "https://app.uccapital.com"
  ],
  "AllowOfflineAccess": true,
  "AccessTokenLifetime": 3600,
  "RefreshTokenExpiration": "Sliding",
  "SlidingRefreshTokenLifetime": 1296000,
  "RefreshTokenUsage": "ReUse",
  "UpdateAccessTokenClaimsOnRefresh": true,
  "IdentityProviderRestrictions": ["Google"]
}
```

#### 4.4.2 API Scope 定義

```json
{
  "Name": "uc_capital_api",
  "DisplayName": "UC Capital API",
  "Description": "存取 UC Capital 業務 API",
  "UserClaims": [
    "name",
    "email",
    "role",
    "department",
    "employee_id"
  ]
}
```

---

## 5. 安全性考量

### 5.1 網域限制

| 檢查點 | 說明 |
|--------|------|
| Google OAuth 回調 | 驗證 email 網域為 `@uccapital.com` |
| Token 派發前 | 再次確認使用者屬於允許的網域 |
| API Gateway | 可選：在 Gateway 層再次驗證 |

### 5.2 Token 安全

| 項目 | 設定 |
|------|------|
| 簽署演算法 | RS256 (非對稱金鑰) |
| Access Token 有效期 | 1 小時 |
| Refresh Token 有效期 | 15 天 (滑動視窗) |
| Token 儲存 | 僅存於記憶體或安全的 HttpOnly Cookie |

### 5.3 HTTPS 強制

```csharp
// Program.cs
app.UseHttpsRedirection();
app.UseHsts();

// 強制 HTTPS 的 Cookie
services.Configure<CookiePolicyOptions>(options =>
{
    options.Secure = CookieSecurePolicy.Always;
    options.MinimumSameSitePolicy = SameSiteMode.Strict;
});
```

### 5.4 CORS 設定

```csharp
services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", builder =>
    {
        builder
            .WithOrigins(
                "https://app.uccapital.com",
                "https://admin.uccapital.com")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});
```

### 5.5 Rate Limiting

```csharp
services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", config =>
    {
        config.Window = TimeSpan.FromMinutes(1);
        config.PermitLimit = 5; // 每分鐘最多 5 次登入嘗試
    });
});
```

---

## 6. 資料庫設計

### 6.1 使用者相關表格

```sql
-- 使用者表 (ASP.NET Identity)
CREATE TABLE Users (
    Id NVARCHAR(450) PRIMARY KEY,
    UserName NVARCHAR(256),
    NormalizedUserName NVARCHAR(256),
    Email NVARCHAR(256),
    NormalizedEmail NVARCHAR(256),
    EmailConfirmed BIT,
    PasswordHash NVARCHAR(MAX),        -- Google 使用者此欄位為空
    SecurityStamp NVARCHAR(MAX),
    ConcurrencyStamp NVARCHAR(MAX),
    PhoneNumber NVARCHAR(MAX),
    PhoneNumberConfirmed BIT,
    TwoFactorEnabled BIT,
    LockoutEnd DATETIMEOFFSET,
    LockoutEnabled BIT,
    AccessFailedCount INT
);

-- 外部登入連結表
CREATE TABLE UserLogins (
    LoginProvider NVARCHAR(128),       -- "Google"
    ProviderKey NVARCHAR(128),         -- Google 使用者 ID
    ProviderDisplayName NVARCHAR(MAX),
    UserId NVARCHAR(450),
    PRIMARY KEY (LoginProvider, ProviderKey),
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);

-- 使用者 Claims 表
CREATE TABLE UserClaims (
    Id INT IDENTITY PRIMARY KEY,
    UserId NVARCHAR(450),
    ClaimType NVARCHAR(MAX),           -- "name", "department", "employee_id"
    ClaimValue NVARCHAR(MAX),
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);

-- 角色表
CREATE TABLE Roles (
    Id NVARCHAR(450) PRIMARY KEY,
    Name NVARCHAR(256),
    NormalizedName NVARCHAR(256),
    ConcurrencyStamp NVARCHAR(MAX)
);

-- 使用者角色關聯表
CREATE TABLE UserRoles (
    UserId NVARCHAR(450),
    RoleId NVARCHAR(450),
    PRIMARY KEY (UserId, RoleId),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (RoleId) REFERENCES Roles(Id)
);
```

### 6.2 預設角色

```sql
INSERT INTO Roles (Id, Name, NormalizedName) VALUES
    (NEWID(), 'Employee', 'EMPLOYEE'),
    (NEWID(), 'Manager', 'MANAGER'),
    (NEWID(), 'FinanceManager', 'FINANCEMANAGER'),
    (NEWID(), 'ITSupport', 'ITSUPPORT'),
    (NEWID(), 'UCCapitalAdministrator', 'UCCAPITALADMINISTRATOR');
```

---

## 7. API 端點設計

### 7.1 驗證 Middleware 設定

```csharp
// API 專案 Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://auth.uccapital.com";
        options.Audience = "uc_capital_api";

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5),
            RoleClaimType = "role",
            NameClaimType = "name"
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                if (context.Exception is SecurityTokenExpiredException)
                {
                    context.Response.Headers.Add("Token-Expired", "true");
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireEmployee", policy =>
        policy.RequireRole("Employee"));

    options.AddPolicy("RequireFinance", policy =>
        policy.RequireRole("FinanceManager"));

    options.AddPolicy("RequireAdmin", policy =>
        policy.RequireRole("UCCapitalAdministrator"));

    options.AddPolicy("CanReadReports", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("FinanceManager") ||
            context.User.IsInRole("Manager") ||
            context.User.IsInRole("UCCapitalAdministrator")));
});
```

### 7.2 API Controller 範例

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize] // 需要有效的 JWT Token
public class ReportsController : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "CanReadReports")]
    public IActionResult GetReports()
    {
        var userId = User.FindFirstValue("sub");
        var userName = User.FindFirstValue("name");
        var roles = User.FindAll("role").Select(c => c.Value);

        // 業務邏輯...

        return Ok(new { Message = $"Hello {userName}", Roles = roles });
    }

    [HttpPost]
    [Authorize(Roles = "FinanceManager")]
    public IActionResult CreateReport([FromBody] ReportDto report)
    {
        // 只有 FinanceManager 可以建立報表
        return Created("", report);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "UCCapitalAdministrator")]
    public IActionResult DeleteReport(int id)
    {
        // 只有管理員可以刪除
        return NoContent();
    }
}
```

### 7.3 Token 驗證端點

```csharp
[ApiController]
[Route("api/[controller]")]
public class TokenController : ControllerBase
{
    [HttpGet("validate")]
    [Authorize]
    public IActionResult ValidateToken()
    {
        // 如果能進入這裡，表示 Token 有效
        var claims = User.Claims.Select(c => new { c.Type, c.Value });

        return Ok(new
        {
            Valid = true,
            Subject = User.FindFirstValue("sub"),
            Expiration = User.FindFirstValue("exp"),
            Claims = claims
        });
    }

    [HttpGet("userinfo")]
    [Authorize]
    public IActionResult GetUserInfo()
    {
        return Ok(new
        {
            Sub = User.FindFirstValue("sub"),
            Name = User.FindFirstValue("name"),
            Email = User.FindFirstValue("email"),
            Roles = User.FindAll("role").Select(c => c.Value),
            IdP = User.FindFirstValue("idp")
        });
    }
}
```

---

## 8. 前端整合指南

### 8.1 oidc-client-ts 設定

```typescript
// auth-config.ts
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const config = {
  authority: 'https://auth.uccapital.com',
  client_id: 'uc_capital_web_app',
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  silent_redirect_uri: `${window.location.origin}/silent-renew`,
  response_type: 'code',
  scope: 'openid profile email roles offline_access uc_capital_api',
  automaticSilentRenew: true,
  includeIdTokenInSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),

  // 強制使用 Google 登入
  extraQueryParams: {
    acr_values: 'idp:Google'
  }
};

export const userManager = new UserManager(config);
```

### 8.2 React Hook 範例

```typescript
// useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { userManager } from './auth-config';
import type { User } from 'oidc-client-ts';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 初始化時檢查現有登入狀態
    userManager.getUser().then(user => {
      setUser(user);
      setLoading(false);
    });

    // 監聽使用者狀態變化
    const handleUserLoaded = (user: User) => setUser(user);
    const handleUserUnloaded = () => setUser(null);
    const handleSilentRenewError = (error: Error) => {
      console.error('靜默更新失敗:', error);
      setError('登入已過期，請重新登入');
    };

    userManager.events.addUserLoaded(handleUserLoaded);
    userManager.events.addUserUnloaded(handleUserUnloaded);
    userManager.events.addSilentRenewError(handleSilentRenewError);

    return () => {
      userManager.events.removeUserLoaded(handleUserLoaded);
      userManager.events.removeUserUnloaded(handleUserUnloaded);
      userManager.events.removeSilentRenewError(handleSilentRenewError);
    };
  }, []);

  const login = useCallback(() => {
    return userManager.signinRedirect();
  }, []);

  const logout = useCallback(() => {
    return userManager.signoutRedirect();
  }, []);

  const getAccessToken = useCallback(async () => {
    const user = await userManager.getUser();
    return user?.access_token;
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user && !user.expired,
    login,
    logout,
    getAccessToken,
    roles: user?.profile?.role as string[] | undefined
  };
}
```

### 8.3 API 請求攔截器

```typescript
// api-client.ts
import axios from 'axios';
import { userManager } from './auth-config';

const apiClient = axios.create({
  baseURL: 'https://api.uccapital.com'
});

// 請求攔截器：自動附加 Token
apiClient.interceptors.request.use(async (config) => {
  const user = await userManager.getUser();

  if (user?.access_token) {
    config.headers.Authorization = `Bearer ${user.access_token}`;
  }

  return config;
});

// 回應攔截器：處理 Token 過期
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token 過期，嘗試靜默更新
      try {
        await userManager.signinSilent();
        // 重試原始請求
        return apiClient.request(error.config);
      } catch {
        // 靜默更新失敗，重導向至登入
        await userManager.signinRedirect();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 8.4 定時驗證 Token

```typescript
// token-validator.ts
import { userManager } from './auth-config';

export function startTokenValidator(intervalMs: number = 60000) {
  const checkToken = async () => {
    const user = await userManager.getUser();

    if (!user) return;

    // 檢查是否即將過期（剩餘 5 分鐘內）
    const expiresIn = user.expires_in ?? 0;

    if (expiresIn < 300) {
      console.log('Token 即將過期，嘗試更新...');
      try {
        await userManager.signinSilent();
        console.log('Token 更新成功');
      } catch (error) {
        console.error('Token 更新失敗:', error);
      }
    }
  };

  // 立即檢查一次
  checkToken();

  // 定時檢查
  return setInterval(checkToken, intervalMs);
}
```

---

## 9. 測試計畫

### 9.1 單元測試

| 測試項目 | 說明 |
|----------|------|
| 網域驗證 | 驗證 `IsAllowedDomain()` 方法正確過濾非組織 email |
| 角色映射 | 驗證 `AssignRolesBasedOnEmail()` 正確指派角色 |
| Token 產生 | 驗證 ProfileService 產生正確的 Claims |

### 9.2 整合測試

| 測試案例 | 步驟 | 預期結果 |
|----------|------|----------|
| 組織帳戶首次登入 | 使用 `@uccapital.com` 帳戶登入 | 自動建立帳戶並派發 Token |
| 非組織帳戶登入 | 使用 `@gmail.com` 帳戶登入 | 顯示拒絕存取訊息 |
| Token 換發 | 等待 Token 即將過期後觸發靜默更新 | 成功取得新 Token |
| API 授權 | 使用 Token 存取受保護的 API | 根據角色返回適當回應 |
| 登出流程 | 點擊登出按鈕 | 清除本地 Session 並重導向 |

### 9.3 負載測試

```yaml
# k6 測試腳本
scenarios:
  login_flow:
    executor: 'ramping-vus'
    startVUs: 0
    stages:
      - duration: '1m'
        target: 50
      - duration: '3m'
        target: 50
      - duration: '1m'
        target: 0

thresholds:
  http_req_duration: ['p(95)<500']  # 95% 的請求應在 500ms 內完成
  http_req_failed: ['rate<0.01']    # 失敗率應低於 1%
```

---

## 10. 部署檢查清單

### 10.1 Google Cloud Console

- [ ] 建立正式環境的 OAuth 2.0 憑證
- [ ] 設定已授權的重新導向 URI（正式網域）
- [ ] 確認 OAuth 同意畫面設定
- [ ] 限制應用程式為「內部」（僅組織使用者）

### 10.2 IdentityServer

- [ ] 更新 `appsettings.Production.json` 中的 Google 憑證
- [ ] 設定正式環境的簽署憑證（非開發用臨時憑證）
- [ ] 配置 HTTPS 憑證
- [ ] 設定資料庫連線字串
- [ ] 執行資料庫遷移
- [ ] 建立預設角色

### 10.3 網路與安全

- [ ] 設定防火牆規則
- [ ] 配置 Load Balancer
- [ ] 啟用 WAF（Web Application Firewall）
- [ ] 設定 CORS 政策
- [ ] 確認 HTTPS 強制

### 10.4 監控

- [ ] 設定應用程式日誌收集
- [ ] 配置健康檢查端點
- [ ] 設定效能監控
- [ ] 建立告警規則

---

## 11. 維運與監控

### 11.1 健康檢查端點

```csharp
// HealthChecks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>()
    .AddUrlGroup(new Uri("https://accounts.google.com/.well-known/openid-configuration"),
        name: "Google OAuth")
    .AddCheck<TokenSigningHealthCheck>("Token Signing");
```

### 11.2 日誌記錄

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft.AspNetCore": "Warning",
        "Duende.IdentityServer": "Debug"
      }
    },
    "WriteTo": [
      { "Name": "Console" },
      {
        "Name": "File",
        "Args": {
          "path": "logs/uc-capital-auth-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 30
        }
      },
      {
        "Name": "Seq",
        "Args": {
          "serverUrl": "http://seq.uccapital.com:5341"
        }
      }
    ],
    "Enrich": ["FromLogContext", "WithMachineName", "WithEnvironmentName"]
  }
}
```

### 11.3 關鍵指標監控

| 指標 | 閾值 | 告警 |
|------|------|------|
| 登入成功率 | > 99% | 低於閾值時通知 |
| Token 派發延遲 | < 500ms (P95) | 超過閾值時通知 |
| 錯誤率 | < 1% | 超過閾值時通知 |
| 活躍 Session 數 | 依業務量 | 異常增減時通知 |

### 11.4 常見問題排查

| 問題 | 可能原因 | 解決方案 |
|------|----------|----------|
| Google 登入失敗 | 憑證過期或錯誤 | 檢查 Google Cloud Console |
| Token 驗證失敗 | 時間不同步 | 檢查伺服器時間，調整 ClockSkew |
| 角色未正確指派 | 映射規則錯誤 | 檢查 `RoleMappings` 設定 |
| 靜默更新失敗 | Refresh Token 過期 | 要求使用者重新登入 |

---

## 附錄

### A. 參考資源

- [Duende IdentityServer 文件](https://docs.duendesoftware.com/)
- [Google OAuth 2.0 文件](https://developers.google.com/identity/protocols/oauth2)
- [oidc-client-ts GitHub](https://github.com/authts/oidc-client-ts)
- [ASP.NET Core 身分驗證文件](https://docs.microsoft.com/aspnet/core/security/authentication/)

### B. 版本歷程

| 版本 | 日期 | 作者 | 變更說明 |
|------|------|------|----------|
| 1.0 | 2024-12-19 | Claude | 初版建立 |

### C. 核准記錄

| 階段 | 核准者 | 日期 | 簽章 |
|------|--------|------|------|
| 架構設計 | | | |
| 安全審查 | | | |
| 正式上線 | | | |
