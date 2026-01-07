# UC Capital 驗證系統整合開發手冊

本文件說明如何將新的應用程式 (AP) 串接 UC Capital 驗證系統。

---

## 目錄

1. [概述](#1-概述)
2. [驗證伺服器提供的資訊](#2-驗證伺服器提供的資訊)
3. [Client 註冊流程](#3-client-註冊流程)
4. [AP 端實作指南](#4-ap-端實作指南)
5. [各語言/框架實作範例](#5-各語言框架實作範例)
6. [Token 使用與更新](#6-token-使用與更新)
7. [登出實作](#7-登出實作)
8. [常見問題](#8-常見問題)
9. [安全性檢核清單](#9-安全性檢核清單)

---

## 1. 概述

### 1.1 驗證系統架構

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   您的應用程式   │ ──────► │  IdentityServer │ ◄────── │    Admin API    │
│   (新 Client)   │         │   (驗證中心)     │         │   (資源伺服器)   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                           │
        │   OAuth 2.0 / OIDC        │
        │   Authorization Code      │
        │   + PKCE                  │
        └───────────────────────────┘
```

### 1.2 支援的授權流程

| 流程 | 適用場景 | 安全性 |
|------|---------|--------|
| **Authorization Code + PKCE** | Web App、SPA、Mobile App | ⭐⭐⭐⭐⭐ (推薦) |
| Client Credentials | Server-to-Server (M2M) | ⭐⭐⭐⭐ |

> ⚠️ **注意**：不支援 Implicit Flow，請一律使用 Authorization Code + PKCE。

---

## 2. 驗證伺服器提供的資訊

### 2.1 環境端點

| 環境 | IdentityServer URL | Admin API URL | 說明 |
|------|-------------------|---------------|------|
| 開發環境 | `https://localhost:44310` | `https://localhost:44302` | 本機開發 |
| 正式環境 | `https://prs.uccapital.com.tw/sts` | `https://prs.uccapital.com.tw/admin` | Production |

### 2.2 OIDC Discovery 端點

```
{IdentityServer URL}/.well-known/openid-configuration
```

範例：
```bash
# 正式環境
curl https://prs.uccapital.com.tw/sts/.well-known/openid-configuration

# 開發環境
curl https://localhost:44310/.well-known/openid-configuration
```

回傳內容包含所有必要的端點資訊：
```json
{
  "issuer": "https://prs.uccapital.com.tw/sts",
  "authorization_endpoint": "https://prs.uccapital.com.tw/sts/connect/authorize",
  "token_endpoint": "https://prs.uccapital.com.tw/sts/connect/token",
  "userinfo_endpoint": "https://prs.uccapital.com.tw/sts/connect/userinfo",
  "end_session_endpoint": "https://prs.uccapital.com.tw/sts/connect/endsession",
  "jwks_uri": "https://prs.uccapital.com.tw/sts/.well-known/openid-configuration/jwks",
  "scopes_supported": ["openid", "profile", "email", "offline_access", ...],
  ...
}
```

### 2.3 可用的 Scopes

| Scope | 說明 | 包含的 Claims |
|-------|------|--------------|
| `openid` | **必要** - 啟用 OIDC | `sub` (用戶唯一識別碼) |
| `profile` | 基本用戶資料 | `name`, `family_name`, `given_name`, `nickname`, `picture` |
| `email` | 電子郵件 | `email`, `email_verified` |
| `roles` | 用戶角色 | `role` |
| `offline_access` | 取得 Refresh Token | - |
| `uc_capital_admin_api` | 存取管理 API | `role`, `name` |

### 2.4 Client 註冊後提供的資訊

我們會提供以下資訊給 AP 開發團隊：

```yaml
# Client 設定資訊
client_id: "your_app_client_id"
client_secret: "your_app_client_secret"  # 如果是 Confidential Client

# 端點資訊
authority: "https://prs.uccapital.com.tw/sts"
authorization_endpoint: "https://prs.uccapital.com.tw/sts/connect/authorize"
token_endpoint: "https://prs.uccapital.com.tw/sts/connect/token"
userinfo_endpoint: "https://prs.uccapital.com.tw/sts/connect/userinfo"
end_session_endpoint: "https://prs.uccapital.com.tw/sts/connect/endsession"

# 允許的 Scopes
allowed_scopes:
  - openid
  - profile
  - email
  - roles
  - offline_access
  - uc_capital_admin_api  # 如果需要存取 API

# Token 有效期
access_token_lifetime: 3600        # 1 小時
refresh_token_lifetime: 86400      # 24 小時 (絕對過期)
sliding_refresh_token: 43200       # 12 小時 (滑動過期)
```

---

## 3. Client 註冊流程

### 3.1 AP 端需提供的資訊

請填寫以下表單並提交給驗證系統管理員：

```yaml
# ========== 必填資訊 ==========

# 應用程式基本資訊
app_name: "您的應用程式名稱"
app_description: "應用程式簡述"
app_type: "spa | web_server | mobile | machine"  # 選擇一種

# 負責人資訊
contact_name: "開發負責人姓名"
contact_email: "developer@company.com"

# 重導向 URI (可多個)
redirect_uris:
  - "https://your-app.com/auth/callback"
  - "https://your-app.com/auth/silent-renew"  # 靜默更新用

# 登出後重導向 URI
post_logout_redirect_uris:
  - "https://your-app.com/"

# 允許的 CORS 來源
allowed_cors_origins:
  - "https://your-app.com"

# ========== 選填資訊 ==========

# 需要的 Scopes
requested_scopes:
  - openid
  - profile
  - email
  - roles
  - offline_access  # 如果需要 Refresh Token

# 是否需要 Client Secret (建議 SPA 不需要)
require_client_secret: false

# Access Token 有效期 (預設 3600 秒)
access_token_lifetime: 3600

# 是否需要存取 Admin API
need_api_access: true
```

### 3.2 我們回覆的設定資訊

註冊完成後，我們會提供：

```yaml
# ========== Client 設定 ==========
client_id: "your_app_20240101"
client_secret: "K8s#mP2$vL9@nQ5x"  # 僅 Confidential Client

# ========== 環境設定 ==========
environments:
  development:
    authority: "https://localhost:44310"
  production:
    authority: "https://prs.uccapital.com.tw/sts"

# ========== 已授權的 Scopes ==========
scopes: "openid profile email roles offline_access uc_capital_admin_api"

# ========== Token 設定 ==========
access_token_lifetime: 3600
refresh_token_usage: "OneTimeOnly"  # 每次使用後換新
refresh_token_expiration: "Sliding"
```

---

## 4. AP 端實作指南

### 4.1 認證流程概述

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Authorization Code Flow + PKCE                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  步驟 1: 產生 PKCE 參數                                                       │
│  ──────────────────────                                                      │
│  code_verifier  = 隨機字串 (43-128 字元)                                      │
│  code_challenge = BASE64URL(SHA256(code_verifier))                           │
│                                                                              │
│  步驟 2: 導向授權端點                                                         │
│  ────────────────────                                                        │
│  GET /connect/authorize                                                      │
│    ?client_id=your_client_id                                                 │
│    &redirect_uri=https://your-app.com/callback                               │
│    &response_type=code                                                       │
│    &scope=openid profile email offline_access                                │
│    &state=random_state_value                                                 │
│    &code_challenge=xxxxxxxx                                                  │
│    &code_challenge_method=S256                                               │
│                                                                              │
│  步驟 3: 用戶登入並同意授權                                                    │
│  ────────────────────────                                                    │
│  IdentityServer 顯示登入頁面 → 用戶登入 → 重導向回 AP                          │
│                                                                              │
│  步驟 4: 收到授權碼                                                           │
│  ─────────────────                                                           │
│  GET https://your-app.com/callback                                           │
│    ?code=authorization_code                                                  │
│    &state=random_state_value                                                 │
│                                                                              │
│  步驟 5: 交換 Token                                                           │
│  ─────────────────                                                           │
│  POST /connect/token                                                         │
│    grant_type=authorization_code                                             │
│    &code=authorization_code                                                  │
│    &redirect_uri=https://your-app.com/callback                               │
│    &client_id=your_client_id                                                 │
│    &code_verifier=original_code_verifier                                     │
│                                                                              │
│  步驟 6: 收到 Token                                                           │
│  ─────────────────                                                           │
│  {                                                                           │
│    "access_token": "eyJhbGciOiJSUzI1NiIs...",                                │
│    "token_type": "Bearer",                                                   │
│    "expires_in": 3600,                                                       │
│    "refresh_token": "CfDJ8NrV...",                                           │
│    "id_token": "eyJhbGciOiJSUzI1NiIs..."                                     │
│  }                                                                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 PKCE 參數產生

```javascript
// JavaScript 範例
function generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(buffer) {
    return btoa(String.fromCharCode(...buffer))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
```

---

## 5. 各語言/框架實作範例

### 5.1 React / TypeScript (使用 oidc-client-ts)

#### 安裝套件
```bash
npm install oidc-client-ts react-oidc-context
```

#### 設定檔 `auth.config.ts`
```typescript
import { UserManagerSettings, WebStorageStateStore } from 'oidc-client-ts';

// 環境設定
const isProduction = import.meta.env.PROD;
const authority = isProduction
    ? 'https://prs.uccapital.com.tw/sts'
    : 'https://localhost:44310';

export const oidcConfig: UserManagerSettings = {
    authority,
    client_id: 'your_app_client_id',
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: window.location.origin,
    response_type: 'code',
    scope: 'openid profile email roles offline_access uc_capital_admin_api',

    // 自動更新 Token
    automaticSilentRenew: true,
    silent_redirect_uri: `${window.location.origin}/auth/silent-renew`,

    // Token 儲存位置
    userStore: new WebStorageStateStore({ store: localStorage }),

    // 監控 Session
    monitorSession: true,
};
```

#### App.tsx
```tsx
import { AuthProvider, useAuth } from 'react-oidc-context';
import { oidcConfig } from './auth.config';

function App() {
    return (
        <AuthProvider {...oidcConfig}>
            <Router>
                <Routes>
                    <Route path="/auth/callback" element={<CallbackPage />} />
                    <Route path="/auth/silent-renew" element={<SilentRenewPage />} />
                    <Route path="/*" element={
                        <ProtectedRoute>
                            <MainApp />
                        </ProtectedRoute>
                    } />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

// 登入按鈕元件
function LoginButton() {
    const auth = useAuth();

    if (auth.isAuthenticated) {
        return (
            <div>
                <span>歡迎, {auth.user?.profile.name}</span>
                <button onClick={() => auth.signoutRedirect()}>登出</button>
            </div>
        );
    }

    return <button onClick={() => auth.signinRedirect()}>登入</button>;
}

// 受保護的路由
function ProtectedRoute({ children }) {
    const auth = useAuth();

    if (auth.isLoading) return <div>載入中...</div>;
    if (!auth.isAuthenticated) {
        auth.signinRedirect();
        return null;
    }

    return children;
}
```

#### Callback 頁面 `CallbackPage.tsx`
```tsx
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

export function CallbackPage() {
    const auth = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!auth.isLoading && auth.isAuthenticated) {
            navigate('/');
        }
    }, [auth.isLoading, auth.isAuthenticated]);

    if (auth.error) {
        return <div>登入失敗: {auth.error.message}</div>;
    }

    return <div>處理登入中...</div>;
}
```

#### Silent Renew 頁面 `silent-renew.html`
```html
<!DOCTYPE html>
<html>
<head>
    <title>Silent Renew</title>
</head>
<body>
    <script src="https://cdn.jsdelivr.net/npm/oidc-client-ts@3.0.1/dist/browser/oidc-client-ts.min.js"></script>
    <script>
        new oidc.UserManager({ response_mode: 'query' })
            .signinSilentCallback()
            .catch(err => console.error(err));
    </script>
</body>
</html>
```

#### API 呼叫範例
```typescript
import { useAuth } from 'react-oidc-context';

function useApi() {
    const auth = useAuth();

    const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
        const token = auth.user?.access_token;

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 401) {
            // Token 過期，嘗試更新
            await auth.signinSilent();
            // 重試請求
            return fetchWithAuth(url, options);
        }

        return response;
    };

    return { fetchWithAuth };
}
```

---

### 5.2 ASP.NET Core MVC / Razor Pages

#### 安裝套件
```bash
dotnet add package Microsoft.AspNetCore.Authentication.OpenIdConnect
```

#### Program.cs
```csharp
var builder = WebApplication.CreateBuilder(args);

// 設定驗證
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
})
.AddCookie()
.AddOpenIdConnect(options =>
{
    // 正式環境: https://prs.uccapital.com.tw/sts
    // 開發環境: https://localhost:44310
    options.Authority = "https://prs.uccapital.com.tw/sts";
    options.ClientId = "your_app_client_id";
    options.ClientSecret = "your_app_client_secret";

    options.ResponseType = "code";
    options.SaveTokens = true;
    options.GetClaimsFromUserInfoEndpoint = true;

    options.Scope.Clear();
    options.Scope.Add("openid");
    options.Scope.Add("profile");
    options.Scope.Add("email");
    options.Scope.Add("roles");
    options.Scope.Add("offline_access");
    options.Scope.Add("uc_capital_admin_api");

    options.ClaimActions.MapJsonKey("role", "role");

    options.TokenValidationParameters = new TokenValidationParameters
    {
        NameClaimType = "name",
        RoleClaimType = "role"
    };
});

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();
```

#### Controller 範例
```csharp
[Authorize]
public class HomeController : Controller
{
    public IActionResult Index()
    {
        // 取得用戶資訊
        var userName = User.Identity?.Name;
        var userId = User.FindFirst("sub")?.Value;
        var email = User.FindFirst("email")?.Value;
        var roles = User.FindAll("role").Select(c => c.Value);

        return View();
    }

    public async Task<IActionResult> CallApi()
    {
        // 取得 Access Token
        var accessToken = await HttpContext.GetTokenAsync("access_token");

        var client = new HttpClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await client.GetAsync("https://prs.uccapital.com.tw/admin/api/data");

        return Ok(await response.Content.ReadAsStringAsync());
    }

    public IActionResult Logout()
    {
        return SignOut(
            CookieAuthenticationDefaults.AuthenticationScheme,
            OpenIdConnectDefaults.AuthenticationScheme
        );
    }
}
```

---

### 5.3 Vue.js 3 (使用 vue-oidc-client)

#### 安裝套件
```bash
npm install oidc-client-ts
```

#### auth.ts
```typescript
import { UserManager, WebStorageStateStore, User } from 'oidc-client-ts';
import { ref, computed } from 'vue';

// 環境設定
const isProduction = import.meta.env.PROD;
const authority = isProduction
    ? 'https://prs.uccapital.com.tw/sts'
    : 'https://localhost:44310';

const settings = {
    authority,
    client_id: 'your_app_client_id',
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: window.location.origin,
    response_type: 'code',
    scope: 'openid profile email roles offline_access',
    automaticSilentRenew: true,
    userStore: new WebStorageStateStore({ store: localStorage }),
};

const userManager = new UserManager(settings);
const user = ref<User | null>(null);

export function useAuth() {
    const isAuthenticated = computed(() => !!user.value && !user.value.expired);

    const login = () => userManager.signinRedirect();
    const logout = () => userManager.signoutRedirect();
    const getAccessToken = () => user.value?.access_token;

    const handleCallback = async () => {
        user.value = await userManager.signinRedirectCallback();
    };

    const loadUser = async () => {
        user.value = await userManager.getUser();
    };

    return {
        user,
        isAuthenticated,
        login,
        logout,
        getAccessToken,
        handleCallback,
        loadUser,
    };
}
```

---

### 5.4 .NET Console / Windows Service (Client Credentials)

適用於 Server-to-Server 通訊，不需要用戶互動。

```csharp
using IdentityModel.Client;

public class ApiClient
{
    private readonly HttpClient _httpClient;
    private readonly string _authority;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _scope;

    private string? _accessToken;
    private DateTime _tokenExpiry;

    public ApiClient()
    {
        _httpClient = new HttpClient();
        // 正式環境: https://prs.uccapital.com.tw/sts
        // 開發環境: https://localhost:44310
        _authority = "https://prs.uccapital.com.tw/sts";
        _clientId = "your_service_client_id";
        _clientSecret = "your_service_client_secret";
        _scope = "uc_capital_admin_api";
    }

    public async Task<string> GetAccessTokenAsync()
    {
        // 檢查 Token 是否還有效
        if (!string.IsNullOrEmpty(_accessToken) && DateTime.UtcNow < _tokenExpiry)
        {
            return _accessToken;
        }

        // 取得新 Token
        var disco = await _httpClient.GetDiscoveryDocumentAsync(_authority);
        if (disco.IsError) throw new Exception(disco.Error);

        var tokenResponse = await _httpClient.RequestClientCredentialsTokenAsync(
            new ClientCredentialsTokenRequest
            {
                Address = disco.TokenEndpoint,
                ClientId = _clientId,
                ClientSecret = _clientSecret,
                Scope = _scope
            });

        if (tokenResponse.IsError) throw new Exception(tokenResponse.Error);

        _accessToken = tokenResponse.AccessToken;
        _tokenExpiry = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn - 60);

        return _accessToken;
    }

    public async Task<string> CallApiAsync(string url)
    {
        var token = await GetAccessTokenAsync();

        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        var response = await _httpClient.GetAsync(url);
        return await response.Content.ReadAsStringAsync();
    }
}
```

---

### 5.5 Python (使用 Authlib)

```python
from authlib.integrations.requests_client import OAuth2Session

# 設定
# 正式環境: https://prs.uccapital.com.tw/sts
# 開發環境: https://localhost:44310
authority = 'https://prs.uccapital.com.tw/sts'

client_id = 'your_app_client_id'
client_secret = 'your_app_client_secret'
authorize_url = f'{authority}/connect/authorize'
token_url = f'{authority}/connect/token'
redirect_uri = 'https://your-app.com/callback'
scope = 'openid profile email'

# 建立 OAuth2 Session
client = OAuth2Session(
    client_id=client_id,
    client_secret=client_secret,
    redirect_uri=redirect_uri,
    scope=scope,
    code_challenge_method='S256'  # 啟用 PKCE
)

# Step 1: 產生授權 URL
authorization_url, state = client.create_authorization_url(authorize_url)
print(f'請開啟此 URL 登入: {authorization_url}')

# Step 2: 用戶登入後取得 callback URL
callback_url = input('請貼上 callback URL: ')

# Step 3: 交換 Token
token = client.fetch_token(token_url, authorization_response=callback_url)
print(f'Access Token: {token["access_token"]}')

# Step 4: 呼叫 API
response = client.get('https://prs.uccapital.com.tw/admin/api/data')
print(response.json())
```

---

### 5.6 Java Spring Boot

#### pom.xml
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

#### application.yml
```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          uccapital:
            client-id: your_app_client_id
            client-secret: your_app_client_secret
            scope: openid,profile,email,roles
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
        provider:
          uccapital:
            # 正式環境: https://prs.uccapital.com.tw/sts
            # 開發環境: https://localhost:44310
            issuer-uri: https://prs.uccapital.com.tw/sts
```

#### SecurityConfig.java
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .defaultSuccessUrl("/dashboard", true)
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/")
            );

        return http.build();
    }
}
```

---

## 6. Token 使用與更新

### 6.1 Access Token 使用

在呼叫 API 時，將 Access Token 放在 HTTP Header：

```http
GET /admin/api/users HTTP/1.1
Host: prs.uccapital.com.tw
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6.2 Token 更新流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    Token 更新策略                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  方法 1: 自動靜默更新 (推薦)                                     │
│  ────────────────────────────                                   │
│  - 使用 oidc-client-ts 的 automaticSilentRenew                  │
│  - 在 Token 過期前自動在背景更新                                 │
│  - 使用隱藏的 iframe 完成                                        │
│                                                                 │
│  方法 2: 手動使用 Refresh Token                                  │
│  ─────────────────────────────                                  │
│  POST /connect/token                                            │
│  Content-Type: application/x-www-form-urlencoded                │
│                                                                 │
│  grant_type=refresh_token                                       │
│  &refresh_token=CfDJ8NrV...                                     │
│  &client_id=your_app_client_id                                  │
│                                                                 │
│  回應:                                                          │
│  {                                                              │
│    "access_token": "新的 access token",                         │
│    "refresh_token": "新的 refresh token",  ← 注意：會換新的！    │
│    "expires_in": 3600                                           │
│  }                                                              │
│                                                                 │
│  ⚠️ 重要：Refresh Token 是 OneTimeOnly，使用後就失效！           │
│     必須儲存新的 Refresh Token 供下次使用。                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Token 過期處理

```typescript
async function fetchWithTokenRefresh(url: string, options: RequestInit) {
    let response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${getAccessToken()}`,
        },
    });

    // 如果 Token 過期
    if (response.status === 401) {
        // 嘗試更新 Token
        const newToken = await refreshToken();

        if (newToken) {
            // 用新 Token 重試
            response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`,
                },
            });
        } else {
            // 更新失敗，需要重新登入
            redirectToLogin();
        }
    }

    return response;
}
```

---

## 7. 登出實作

### 7.1 前端發起登出

```typescript
// 使用 oidc-client-ts
userManager.signoutRedirect({
    id_token_hint: user.id_token,  // 可選，但建議提供
    post_logout_redirect_uri: 'https://your-app.com/'
});
```

### 7.2 登出流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         登出流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 前端呼叫 signoutRedirect()                                  │
│                                                                 │
│  2. 重導向至 IdentityServer                                     │
│     GET /connect/endsession                                     │
│       ?id_token_hint=eyJhbGciOi...                              │
│       &post_logout_redirect_uri=https://your-app.com/           │
│                                                                 │
│  3. IdentityServer 清除 SSO Session Cookie                      │
│                                                                 │
│  4. 重導向回前端 post_logout_redirect_uri                        │
│                                                                 │
│  5. 前端清除本地儲存的 Token                                     │
│     - localStorage.removeItem('oidc.user:...')                  │
│     - sessionStorage.clear()                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. 常見問題

### Q1: CORS 錯誤

**問題**：瀏覽器顯示 `Access-Control-Allow-Origin` 錯誤

**解決**：確認您的應用程式 Origin 已加入 Client 的 `AllowedCorsOrigins`。請聯繫管理員更新設定。

---

### Q2: Token 無法取得 Refresh Token

**問題**：Token 回應中沒有 `refresh_token`

**檢查項目**：
1. 請求的 scope 是否包含 `offline_access`
2. Client 設定是否啟用 `AllowOfflineAccess`

---

### Q3: 登入後一直跳回登入頁

**問題**：登入成功後，重導向回應用程式又被要求登入

**可能原因**：
1. Cookie SameSite 問題 - 確認使用 HTTPS
2. Redirect URI 不匹配 - 大小寫敏感
3. State 驗證失敗 - 確認沒有重複的登入請求

---

### Q4: ID Token 驗證失敗

**問題**：`IDX10205: Issuer validation failed`

**解決**：確認 `authority` 設定與 Token 的 `iss` claim 完全一致，包含是否有結尾斜線。

---

### Q5: 靜默更新失敗

**問題**：`Frame window timed out` 或 `login_required`

**可能原因**：
1. SSO Session 已過期（超過 8 小時）
2. 用戶在其他地方登出
3. Third-party cookies 被瀏覽器阻擋

**解決**：捕捉錯誤後引導用戶重新登入

```typescript
userManager.events.addSilentRenewError(() => {
    // 靜默更新失敗，需要重新登入
    userManager.signinRedirect();
});
```

---

## 9. 安全性檢核清單

在上線前，請確認以下項目：

### 必要項目

- [ ] 使用 HTTPS (正式環境禁止 HTTP)
- [ ] 使用 Authorization Code + PKCE 流程
- [ ] State 參數驗證防止 CSRF
- [ ] Token 儲存安全（避免 XSS 可存取的位置）
- [ ] Redirect URI 完全匹配（無萬用字元）
- [ ] 正確處理 Token 過期

### 建議項目

- [ ] 啟用自動 Token 更新
- [ ] 實作適當的登出流程
- [ ] 監控 Token 更新失敗事件
- [ ] 設定適當的 Token 有效期
- [ ] 記錄認證相關日誌（不含敏感資訊）

### 禁止事項

- [ ] ❌ 不要在 URL 中傳遞 Token
- [ ] ❌ 不要將 Token 記錄到日誌
- [ ] ❌ 不要在前端硬編碼 Client Secret
- [ ] ❌ 不要使用 Implicit Flow
- [ ] ❌ 不要忽略 Token 驗證

---

## 聯絡資訊

如有任何問題，請聯繫：

- **技術支援**：it-support@uccapital.com.tw
- **系統管理員**：admin@uccapital.com.tw

---

*文件版本: 1.1*
*最後更新: 2025-01-06*

### 版本紀錄

| 版本 | 日期 | 說明 |
|------|------|------|
| 1.1 | 2025-01-06 | 更新正式環境 URL 為 prs.uccapital.com.tw |
| 1.0 | 2024-01-01 | 初版 |
