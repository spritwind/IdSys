# UC Capital STS API 指南

本文件說明安全性權杖服務 (Security Token Service, STS) 提供的所有 API 端點。

**STS 服務位址**: `https://localhost:44310` (開發環境)

---

## 一、OIDC 標準端點

這些是 OpenID Connect 規範定義的標準端點，用於身份驗證與授權流程。

### 1.1 探索端點 (Discovery)

| 端點 | 說明 |
|------|------|
| `/.well-known/openid-configuration` | OpenID Connect 探索文件，包含所有端點資訊 |
| `/.well-known/jwks` | JSON Web Key Set，公開金鑰用於驗證 Token 簽章 |

**應用情境**：
- 客戶端應用程式啟動時取得 IdentityServer 設定
- 驗證 JWT Token 簽章時取得公鑰

**範例**：
```bash
curl https://localhost:44310/.well-known/openid-configuration
```

---

### 1.2 授權端點 (Authorization)

| 端點 | 方法 | 說明 |
|------|------|------|
| `/connect/authorize` | GET | 啟動授權流程 |
| `/connect/authorize/callback` | GET | 授權回調處理 |

**應用情境**：
- 網頁應用程式透過瀏覽器重導向進行登入
- Authorization Code Flow 起始點
- Implicit Flow 起始點 (不建議使用)

**必要參數**：
| 參數 | 說明 |
|------|------|
| `client_id` | 客戶端識別碼 |
| `redirect_uri` | 授權完成後的回調 URI |
| `response_type` | `code` (Authorization Code) 或 `token` (Implicit) |
| `scope` | 請求的權限範圍 (如 `openid profile email`) |
| `state` | 防止 CSRF 攻擊的隨機值 |
| `code_challenge` | PKCE 挑戰碼 (建議使用) |
| `code_challenge_method` | PKCE 方法，通常為 `S256` |

---

### 1.3 Token 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/connect/token` | POST | 交換或刷新 Token |

**應用情境**：
- 用 Authorization Code 交換 Access Token
- 用 Refresh Token 取得新的 Access Token
- Client Credentials 流程取得 Token
- Device Code 流程取得 Token

**支援的 Grant Types**：

| Grant Type | 說明 |
|------------|------|
| `authorization_code` | 標準授權碼流程 |
| `client_credentials` | 服務對服務驗證 |
| `refresh_token` | 刷新 Token |
| `urn:ietf:params:oauth:grant-type:device_code` | 裝置授權流程 |
| `password` | 資源擁有者密碼 (不建議) |

**範例 - Authorization Code 交換**：
```bash
curl -X POST https://localhost:44310/connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "redirect_uri=https://your-app.com/callback" \
  -d "client_id=your-client-id" \
  -d "client_secret=your-client-secret" \
  -d "code_verifier=YOUR_PKCE_VERIFIER"
```

**範例 - Client Credentials**：
```bash
curl -X POST https://localhost:44310/connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=your-client-id" \
  -d "client_secret=your-client-secret" \
  -d "scope=api1"
```

---

### 1.4 UserInfo 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/connect/userinfo` | GET/POST | 取得使用者資訊 |

**應用情境**：
- 前端應用程式取得目前登入使用者的基本資料
- 驗證使用者身份後取得 Claims

**範例**：
```bash
curl https://localhost:44310/connect/userinfo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**回應範例**：
```json
{
  "sub": "user-guid",
  "name": "張三",
  "email": "zhangsan@example.com",
  "email_verified": true
}
```

---

### 1.5 Token 驗證端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/connect/introspect` | POST | Token 內省 (驗證) |
| `/connect/revocation` | POST | Token 撤銷 |

#### Token 內省 (Introspection)

**應用情境**：
- API 服務驗證收到的 Access Token 是否有效
- Reference Token 驗證 (不含自我驗證資訊的 Token)
- 取得 Token 的詳細資訊 (claims, 過期時間等)

**範例**：
```bash
curl -X POST https://localhost:44310/connect/introspect \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "api-resource-name:api-resource-secret" \
  -d "token=THE_ACCESS_TOKEN"
```

**回應範例**：
```json
{
  "active": true,
  "sub": "user-guid",
  "client_id": "my-app",
  "scope": "openid profile api1",
  "exp": 1704067200,
  "iat": 1704063600
}
```

#### Token 撤銷 (Revocation)

**應用情境**：
- 使用者登出時撤銷其 Refresh Token
- 安全事件發生時撤銷所有相關 Token

**範例**：
```bash
curl -X POST https://localhost:44310/connect/revocation \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=your-client-id" \
  -d "client_secret=your-client-secret" \
  -d "token=THE_REFRESH_TOKEN" \
  -d "token_type_hint=refresh_token"
```

---

### 1.6 登出端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/connect/endsession` | GET | 結束 SSO 會話 |
| `/connect/endsession/callback` | GET | 登出回調 |

**應用情境**：
- 實作單一登出 (Single Sign-Out)
- 清除 IdentityServer 的 Cookie 會話

**參數**：
| 參數 | 說明 |
|------|------|
| `id_token_hint` | 用戶的 ID Token |
| `post_logout_redirect_uri` | 登出後重導向 URI |
| `state` | 狀態值 |

---

### 1.7 裝置授權端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/connect/deviceauthorization` | POST | 裝置授權請求 |

**應用情境**：
- 智慧電視、IoT 裝置等無瀏覽器設備的登入
- 命令列工具的授權

**流程**：
1. 裝置向此端點請求取得 `device_code` 和 `user_code`
2. 裝置顯示 `user_code` 給使用者
3. 使用者在另一裝置 (如手機) 輸入 `user_code` 完成驗證
4. 裝置輪詢 `/connect/token` 取得 Token

---

## 二、帳戶管理端點 (Account Controller)

這些是使用者帳戶相關的 MVC 端點。

### 2.1 登入/登出

| 端點 | 方法 | 說明 |
|------|------|------|
| `/Account/Login` | GET/POST | 使用者登入頁面 |
| `/Account/Logout` | GET/POST | 使用者登出 |
| `/Account/LoggedOut` | GET | 登出完成頁面 |
| `/Account/ExternalLogin` | POST | 外部登入 (如 Google) |
| `/Account/ExternalLoginCallback` | GET | 外部登入回調 |

### 2.2 註冊

| 端點 | 方法 | 說明 |
|------|------|------|
| `/Account/Register` | GET/POST | 使用者註冊 |
| `/Account/ConfirmEmail` | GET | 確認電子郵件 |
| `/Account/RegisterSuccess` | GET | 註冊成功頁面 |

### 2.3 密碼重設

| 端點 | 方法 | 說明 |
|------|------|------|
| `/Account/ForgotPassword` | GET/POST | 忘記密碼 |
| `/Account/ForgotPasswordConfirmation` | GET | 重設連結已發送 |
| `/Account/ResetPassword` | GET/POST | 重設密碼 |
| `/Account/ResetPasswordConfirmation` | GET | 重設完成 |

### 2.4 雙因素認證

| 端點 | 方法 | 說明 |
|------|------|------|
| `/Account/LoginWith2fa` | GET/POST | 雙因素認證登入 |
| `/Account/LoginWithRecoveryCode` | GET/POST | 使用復原碼登入 |

### 2.5 其他

| 端點 | 方法 | 說明 |
|------|------|------|
| `/Account/AccessDenied` | GET | 存取被拒頁面 |
| `/Account/Lockout` | GET | 帳戶鎖定頁面 |

---

## 三、個人管理端點 (Manage Controller)

登入使用者管理自己帳戶的端點。

### 3.1 個人資料

| 端點 | 方法 | 說明 |
|------|------|------|
| `/Manage/Index` | GET/POST | 個人資料頁面 |
| `/Manage/ChangePassword` | GET/POST | 變更密碼 |
| `/Manage/SetPassword` | GET/POST | 設定密碼 (外部登入使用者) |

### 3.2 雙因素認證管理

| 端點 | 方法 | 說明 |
|------|------|------|
| `/Manage/TwoFactorAuthentication` | GET/POST | 2FA 設定頁面 |
| `/Manage/EnableAuthenticator` | GET/POST | 啟用驗證器 App |
| `/Manage/ResetAuthenticator` | GET/POST | 重設驗證器 |
| `/Manage/GenerateRecoveryCodes` | GET/POST | 產生復原碼 |
| `/Manage/Disable2faWarning` | GET | 停用 2FA 警告 |
| `/Manage/Disable2fa` | POST | 停用 2FA |

### 3.3 外部登入管理

| 端點 | 方法 | 說明 |
|------|------|------|
| `/Manage/ExternalLogins` | GET | 外部登入列表 |
| `/Manage/LinkLogin` | POST | 連結外部帳戶 |
| `/Manage/LinkLoginCallback` | GET | 連結外部帳戶回調 |
| `/Manage/RemoveLogin` | POST | 移除外部帳戶連結 |

### 3.4 個人資料下載

| 端點 | 方法 | 說明 |
|------|------|------|
| `/Manage/PersonalData` | GET | 個人資料管理頁面 |
| `/Manage/DownloadPersonalData` | POST | 下載個人資料 (GDPR) |
| `/Manage/DeletePersonalData` | GET/POST | 刪除個人資料 |

---

## 四、同意授權端點 (Consent Controller)

| 端點 | 方法 | 說明 |
|------|------|------|
| `/Consent` | GET | 顯示同意授權頁面 |
| `/Consent` | POST | 處理同意授權決定 |

**應用情境**：
- 當客戶端請求存取使用者資源時，顯示授權同意頁面
- 使用者可選擇允許或拒絕各項權限

---

## 五、診斷端點 (僅開發環境)

| 端點 | 方法 | 說明 |
|------|------|------|
| `/Diagnostics` | GET | 顯示目前認證資訊 |

**應用情境**：
- 開發除錯時查看目前的 Claims 和 Token 資訊

---

## 六、常見整合情境

### 情境一：Web 應用程式整合

```
1. 使用者點擊登入
2. 重導向至 /connect/authorize (Authorization Code + PKCE)
3. 使用者在 STS 完成登入
4. STS 重導向回應用程式，帶著 authorization_code
5. 應用程式用 code 向 /connect/token 交換 access_token
6. 應用程式用 access_token 呼叫 API
```

### 情境二：服務對服務 (M2M)

```
1. 服務 A 用 client_credentials 向 /connect/token 請求 Token
2. 服務 A 用取得的 Token 呼叫服務 B 的 API
3. 服務 B 用 /connect/introspect 驗證 Token (Reference Token)
   或直接驗證 JWT 簽章 (Self-contained Token)
```

### 情境三：行動應用程式

```
1. App 開啟系統瀏覽器到 /connect/authorize (Authorization Code + PKCE)
2. 使用者完成登入
3. 透過 Custom URL Scheme 回到 App
4. App 用 code 交換 Token
5. 儲存 Refresh Token 安全地在 Keychain/Keystore
6. 定期用 Refresh Token 更新 Access Token
```

### 情境四：IoT 裝置

```
1. 裝置向 /connect/deviceauthorization 請求 device_code
2. 裝置顯示 user_code 給使用者
3. 使用者在手機/電腦輸入 user_code 並授權
4. 裝置輪詢 /connect/token 直到取得 Token
```

---

## 七、安全建議

1. **永遠使用 HTTPS**：所有端點都應透過 HTTPS 存取

2. **使用 PKCE**：Authorization Code Flow 必須搭配 PKCE

3. **最小權限原則**：只請求必要的 scope

4. **安全儲存 Token**：
   - Web：HttpOnly Secure Cookie
   - Mobile：Keychain (iOS) / Keystore (Android)
   - 永不儲存在 localStorage

5. **Token 生命週期**：
   - Access Token：短期 (5-15 分鐘)
   - Refresh Token：長期但要能撤銷

6. **驗證 Token**：
   - JWT：驗證簽章、issuer、audience、expiration
   - Reference：使用 introspection 端點

---

## 八、錯誤代碼

| 錯誤代碼 | 說明 |
|----------|------|
| `invalid_request` | 請求格式錯誤 |
| `invalid_client` | 客戶端驗證失敗 |
| `invalid_grant` | 授權碼或 Refresh Token 無效 |
| `unauthorized_client` | 客戶端無權使用此 grant type |
| `unsupported_grant_type` | 不支援的 grant type |
| `invalid_scope` | 請求的 scope 無效 |
| `access_denied` | 使用者拒絕授權 |
| `login_required` | 需要使用者登入 |
| `consent_required` | 需要使用者同意 |

---

*文件版本：1.0*
*最後更新：2026-01-06*
*UC Capital Identity Admin*
