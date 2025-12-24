# UC Capital SSO 整合指南

## 快速回答

| 問題 | 答案 |
|------|------|
| Callback URL | `/auth/callback` (獨立頁面) |
| Token 儲存 | `localStorage` (持久保存) |
| 權限 API | 自行開發，格式: `GET /api/permissions/{userId}` |

## 認證流程

```
1. 用戶訪問 Web App
2. Web App 導向 IdentityServer 登入
3. 用戶透過 Google 登入
4. IdentityServer 發送 JWT Token 回 Web App
5. Web App 從 Token 取出 User ID / Email
6. Web App 呼叫自己的權限 API 檢查該用戶權限
```

## IdentityServer 資訊

- **Authority**: `https://prs.uccapital.com.tw/sts`
- **Discovery**: `https://prs.uccapital.com.tw/sts/.well-known/openid-configuration`

## 已註冊的 Client

### 本機開發 (localhost)

| Client ID | URL |
|-----------|-----|
| `uc_localhost_3000` | http://localhost:3000 |
| `uc_localhost_5173` | http://localhost:5173 (Vite) |
| `uc_localhost_5174` | http://localhost:5174 |

### 正式環境

| Client ID | URL |
|-----------|-----|
| `uc_web_68_16_3800` | http://172.16.68.16:3800 |
| `uc_web_68_16_3500` | http://172.16.68.16:3500 |
| `uc_web_68_16_3168` | http://172.16.68.16:3168 |
| `uc_web_38_11_3500` | http://172.16.38.11:3500 |
| `uc_web_68_6_3500` | http://172.16.68.6:3500 |

## React 整合 (最簡版本)

### 1. 安裝

```bash
npm install oidc-client-ts
```

### 2. 認證服務 `src/auth.ts`

```typescript
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const APP_URL = window.location.origin;

// Client ID 對照表
const CLIENT_MAP: Record<string, string> = {
  // 本機開發
  'http://localhost:3000': 'uc_localhost_3000',
  'http://localhost:5173': 'uc_localhost_5173',
  'http://localhost:5174': 'uc_localhost_5174',
  // 正式環境
  'http://172.16.68.16:3800': 'uc_web_68_16_3800',
  'http://172.16.68.16:3500': 'uc_web_68_16_3500',
  'http://172.16.68.16:3168': 'uc_web_68_16_3168',
  'http://172.16.38.11:3500': 'uc_web_38_11_3500',
  'http://172.16.68.6:3500': 'uc_web_68_6_3500',
};

const userManager = new UserManager({
  authority: 'https://prs.uccapital.com.tw/sts',
  client_id: CLIENT_MAP[APP_URL] || 'uc_localhost_5173',
  redirect_uri: `${APP_URL}/auth/callback`,
  post_logout_redirect_uri: `${APP_URL}/`,
  response_type: 'code',
  scope: 'openid profile email',
  // 使用 localStorage 持久保存 Token
  userStore: new WebStorageStateStore({ store: window.localStorage }),
});

// 登入
export const login = () => userManager.signinRedirect();

// 登出
export const logout = () => userManager.signoutRedirect();

// 處理登入回調
export const handleCallback = () => userManager.signinRedirectCallback();

// 取得目前用戶
export const getUser = () => userManager.getUser();

// 取得用戶資訊 (用於呼叫權限 API)
export const getUserInfo = async () => {
  const user = await userManager.getUser();
  if (!user) return null;

  return {
    userId: user.profile.sub,           // 用戶 ID
    email: user.profile.email,          // Email
    name: user.profile.name,            // 名稱
    accessToken: user.access_token,     // Token (如需傳給後端)
  };
};

// 檢查是否已登入
export const isLoggedIn = async () => {
  const user = await userManager.getUser();
  return !!user && !user.expired;
};
```

### 3. 登入回調頁面 `src/pages/AuthCallback.tsx`

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleCallback } from '../auth';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    handleCallback()
      .then(() => navigate('/'))
      .catch((err) => {
        console.error('登入失敗:', err);
        navigate('/login-error');
      });
  }, [navigate]);

  return <div>登入處理中...</div>;
}
```

### 4. 使用範例 - 取得用戶並檢查權限

```tsx
import { useEffect, useState } from 'react';
import { getUserInfo, login, isLoggedIn } from '../auth';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      // 檢查是否已登入
      if (!await isLoggedIn()) {
        login(); // 未登入則導向登入
        return;
      }

      // 取得用戶資訊
      const userInfo = await getUserInfo();
      setUser(userInfo);

      // 用 userId 或 email 呼叫你的權限 API
      if (userInfo) {
        const perms = await fetchPermissions(userInfo.userId);
        setPermissions(perms);
      }
    };
    init();
  }, []);

  if (!user) return <div>載入中...</div>;

  return (
    <div>
      <h1>歡迎 {user.name}</h1>
      <p>Email: {user.email}</p>
      <p>User ID: {user.userId}</p>
      <h2>權限</h2>
      <ul>
        {permissions.map(p => <li key={p}>{p}</li>)}
      </ul>
    </div>
  );
}

// 呼叫你自己的權限 API
async function fetchPermissions(userId: string): Promise<string[]> {
  const response = await fetch(`/api/permissions/${userId}`);
  return response.json();
}
```

### 5. 路由設定

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import AuthCallback from './pages/AuthCallback';

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## JWT Token 內容

登入成功後，Token 包含：

```json
{
  "sub": "abc123-user-id",     // 用戶 ID (用這個去查權限)
  "email": "user@example.com", // Email
  "name": "用戶名稱",
  "iss": "https://prs.uccapital.com.tw/sts",
  "exp": 1234567890
}
```

## 權限 API (需自行開發)

權限 API 不在 IdentityServer，需要你們自行開發。

### 建議格式

```
GET /api/permissions/{userId}
或
GET /api/permissions?email={email}

Response:
{
  "userId": "abc123",
  "email": "user@example.com",
  "permissions": ["read", "write", "admin"],
  "roles": ["manager", "viewer"],
  "menus": ["dashboard", "settings", "reports"]
}
```

### 前端使用

```typescript
// 登入成功後，用 userId 或 email 查權限
const userInfo = await getUserInfo();
const response = await fetch(`/api/permissions/${userInfo.userId}`);
const { permissions, roles, menus } = await response.json();

// 根據權限顯示功能
if (permissions.includes('admin')) {
  // 顯示管理功能
}
```

## 新增 Client SQL

如需新增其他應用程式的 Client：

```sql
-- 替換 YOUR_APP_URL 和 YOUR_CLIENT_ID
DECLARE @ClientId INT
DECLARE @AppUrl NVARCHAR(500) = 'http://YOUR_IP:PORT'
DECLARE @ClientIdName NVARCHAR(200) = 'your_client_id'

INSERT INTO [Clients] (
    [Enabled], [ClientId], [ProtocolType], [RequireClientSecret],
    [ClientName], [ClientUri], [RequireConsent], [AllowRememberConsent],
    [RequirePkce], [AllowPlainTextPkce], [RequireRequestObject],
    [AllowAccessTokensViaBrowser], [RequireDPoP], [DPoPValidationMode], [DPoPClockSkew],
    [FrontChannelLogoutSessionRequired], [BackChannelLogoutSessionRequired],
    [AllowOfflineAccess], [AlwaysIncludeUserClaimsInIdToken],
    [IdentityTokenLifetime], [AccessTokenLifetime], [AuthorizationCodeLifetime],
    [AbsoluteRefreshTokenLifetime], [SlidingRefreshTokenLifetime],
    [RefreshTokenUsage], [RefreshTokenExpiration], [UpdateAccessTokenClaimsOnRefresh],
    [AccessTokenType], [EnableLocalLogin], [IncludeJwtId],
    [AlwaysSendClientClaims], [ClientClaimsPrefix], [Created], [DeviceCodeLifetime],
    [NonEditable], [RequirePushedAuthorization]
)
VALUES (
    1, @ClientIdName, 'oidc', 0,
    N'Web App', @AppUrl, 0, 1,
    1, 0, 0, 1, 0, 0, '00:05:00', 1, 0, 1, 0,
    300, 3600, 300, 86400, 43200, 1, 1, 0, 0, 1, 0, 0, 'client_', GETUTCDATE(), 300, 0, 0
)
SET @ClientId = SCOPE_IDENTITY()

INSERT INTO [ClientGrantTypes] ([GrantType], [ClientId]) VALUES ('authorization_code', @ClientId)
INSERT INTO [ClientRedirectUris] ([RedirectUri], [ClientId]) VALUES (@AppUrl + '/auth/callback', @ClientId)
INSERT INTO [ClientPostLogoutRedirectUris] ([PostLogoutRedirectUri], [ClientId]) VALUES (@AppUrl + '/', @ClientId)
INSERT INTO [ClientCorsOrigins] ([Origin], [ClientId]) VALUES (@AppUrl, @ClientId)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('openid', @ClientId)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('profile', @ClientId)
INSERT INTO [ClientScopes] ([Scope], [ClientId]) VALUES ('email', @ClientId)
```
