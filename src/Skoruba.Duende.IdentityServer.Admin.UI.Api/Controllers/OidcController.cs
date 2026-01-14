// UC Capital - OIDC API Controller
// OAuth 2.0 / OpenID Connect 端點包裝器
// 提供 Swagger 文件讓開發者測試 OAuth 流程

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Controllers
{
    /// <summary>
    /// OAuth 2.0 / OpenID Connect 端點 API
    /// </summary>
    /// <remarks>
    /// ## 概述
    ///
    /// 此 API 包裝 IdentityServer 的標準 OIDC 端點，提供 Swagger 測試介面，
    /// 方便開發者測試與串接 OAuth 2.0 / OpenID Connect 流程。
    ///
    /// ## Authorization Code Flow with PKCE 完整流程
    ///
    /// ```
    /// ┌─────────────┐      1. Authorization Request       ┌─────────────────┐
    /// │   Client    │ ─────────────────────────────────▶  │  IdentityServer │
    /// │   (前端)    │   client_id, redirect_uri, scope    │     (STS)       │
    /// │             │   state, code_challenge             │                 │
    /// │             │                                     │                 │
    /// │             │      2. User Login                  │                 │
    /// │             │ ◀────────────────────────────────── │  顯示登入頁面   │
    /// │             │                                     │                 │
    /// │             │      3. Authorization Response      │                 │
    /// │             │ ◀────────────────────────────────── │  驗證成功       │
    /// │             │   code, state                       │                 │
    /// │             │                                     │                 │
    /// │             │      4. Token Request               │                 │
    /// │             │ ─────────────────────────────────▶  │                 │
    /// │             │   code, code_verifier               │                 │
    /// │             │                                     │                 │
    /// │             │      5. Token Response              │                 │
    /// │             │ ◀────────────────────────────────── │                 │
    /// │             │   access_token, refresh_token       │                 │
    /// └─────────────┘   id_token                          └─────────────────┘
    /// ```
    ///
    /// ## JWT Token 無狀態 (Stateless) 特性
    ///
    /// **重要概念：**
    /// - JWT Token 是「自包含」的，所有資訊都編碼在 Token 內
    /// - 本地驗證只需公鑰即可驗證簽章，不需查詢資料庫
    /// - **撤銷問題**：Token 一旦發行，在過期前本地驗證都會通過，即使已撤銷
    ///
    /// ## Token 驗證方式比較
    ///
    /// | 特性       | 本地驗證 (JWKS)          | 遠端驗證 (Introspection)    |
    /// |------------|--------------------------|------------------------------|
    /// | 驗證方式   | 使用 JWKS 公鑰驗證簽章   | 呼叫 /connect/introspect     |
    /// | 網路請求   | 不需要 (僅首次取 JWKS)   | 每次驗證都需要               |
    /// | 驗證速度   | 極快 (毫秒級)            | 較慢 (網路延遲)              |
    /// | 偵測撤銷   | ❌ 無法偵測              | ✅ 可以偵測                  |
    /// | 適用場景   | 一般 API、微服務         | 高安全性需求 (如金融)        |
    ///
    /// ## PKCE (Proof Key for Code Exchange)
    ///
    /// PKCE 用於防止授權碼攔截攻擊，特別適用於無法安全儲存 Client Secret 的公開客戶端。
    ///
    /// ```
    /// 1. 產生: code_verifier = random(43~128 chars)
    /// 2. 雜湊: code_challenge = BASE64URL(SHA256(code_verifier))
    /// 3. 授權: 送出 code_challenge
    /// 4. 交換: 送出 code_verifier
    /// ```
    ///
    /// 授權伺服器會驗證 `SHA256(code_verifier) === code_challenge`，確保是同一個客戶端發起的請求。
    /// </remarks>
    [ApiController]
    [Produces("application/json")]
    public class OidcController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly string _authority;

        public OidcController(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _authority = configuration["AdminApiConfiguration:IdentityServerBaseUrl"]
                ?? "https://localhost:44310";
        }

        /// <summary>
        /// Discovery Document - 取得 OIDC 設定文件
        /// </summary>
        /// <remarks>
        /// ## 用途
        ///
        /// 取得 IdentityServer 的 OpenID Connect Discovery Document，
        /// 這是 OIDC 流程的起點，客戶端應用會先讀取此文件來取得各端點位置。
        ///
        /// ## STS 原生路徑
        ///
        /// `GET /.well-known/openid-configuration`
        ///
        /// ## 回傳內容
        ///
        /// | 欄位                          | 說明                           |
        /// |-------------------------------|--------------------------------|
        /// | issuer                        | 授權伺服器識別碼               |
        /// | authorization_endpoint        | 授權端點 URL                   |
        /// | token_endpoint                | Token 端點 URL                 |
        /// | userinfo_endpoint             | 使用者資訊端點 URL             |
        /// | introspection_endpoint        | Token 內省端點 URL             |
        /// | revocation_endpoint           | Token 撤銷端點 URL             |
        /// | end_session_endpoint          | 登出端點 URL                   |
        /// | jwks_uri                      | JWKS 公鑰 URL                  |
        /// | scopes_supported              | 支援的 Scope 列表              |
        /// | response_types_supported      | 支援的回應類型                 |
        /// | grant_types_supported         | 支援的授權類型                 |
        ///
        /// ## 使用範例 (JavaScript)
        ///
        /// ```javascript
        /// const response = await fetch('/.well-known/openid-configuration');
        /// const config = await response.json();
        /// console.log('授權端點:', config.authorization_endpoint);
        /// console.log('Token 端點:', config.token_endpoint);
        /// ```
        /// </remarks>
        /// <returns>Discovery Document JSON</returns>
        [HttpGet(".well-known/openid-configuration")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> GetDiscoveryDocument()
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.GetAsync($"{_authority}/.well-known/openid-configuration");

            if (!response.IsSuccessStatusCode)
            {
                return BadRequest(new { error = "Failed to get discovery document" });
            }

            var content = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(content);
            return Ok(doc.RootElement);
        }

        /// <summary>
        /// Authorization Endpoint - 取得授權 URL
        /// </summary>
        /// <remarks>
        /// ## 用途
        ///
        /// 產生 OAuth 2.0 授權 URL，這是 Authorization Code Flow 的第一步。
        /// 將使用者重導向至此 URL 進行身份驗證。
        ///
        /// ## STS 原生路徑
        ///
        /// `GET /connect/authorize` (瀏覽器重導向)
        ///
        /// ## 參數說明
        ///
        /// | 參數                 | 必填 | 說明                                                     |
        /// |----------------------|------|----------------------------------------------------------|
        /// | client_id            | ✅   | 客戶端識別碼，在 IdentityServer 註冊時取得               |
        /// | redirect_uri         | ✅   | 授權完成後的回調 URL，必須與註冊時設定的一致             |
        /// | scope                | ✅   | 請求的權限範圍，如 `openid profile email roles`          |
        /// | state                | 建議 | 防止 CSRF 攻擊的隨機字串，回調時會原封不動回傳           |
        /// | code_challenge       | 建議 | PKCE 驗證碼，由 code_verifier 經 SHA256 後 Base64URL 編碼|
        /// | idp                  | 選填 | 指定身份提供者 (如 Google)，會加入 `acr_values=idp:xxx`  |
        /// | forceLogin           | 選填 | 若為 true，加入 `prompt=login` 強制顯示登入畫面          |
        ///
        /// ## 完整流程
        ///
        /// ```
        /// 步驟 1: 呼叫此 API 取得 authorize URL
        /// 步驟 2: 將使用者重導向至該 URL
        /// 步驟 3: 使用者在 IdentityServer 登入
        /// 步驟 4: IdentityServer 重導向回 redirect_uri?code=xxx&amp;state=xxx
        /// 步驟 5: 使用 code 呼叫 /connect/token 交換 Token
        /// ```
        ///
        /// ## prompt 參數說明
        ///
        /// | 值      | 說明                                                   |
        /// |---------|--------------------------------------------------------|
        /// | login   | 強制顯示登入畫面，即使已有 SSO Session                 |
        /// | consent | 強制顯示同意畫面                                       |
        /// | none    | 靜默驗證，若未登入則直接回傳錯誤                       |
        ///
        /// ## 使用範例 (JavaScript)
        ///
        /// ```javascript
        /// // 產生 PKCE
        /// const codeVerifier = generateRandomString(43);
        /// const codeChallenge = await sha256Base64Url(codeVerifier);
        /// sessionStorage.setItem('code_verifier', codeVerifier);
        ///
        /// // 取得授權 URL
        /// const response = await fetch('/api/connect/authorize-url', {
        ///   method: 'POST',
        ///   headers: { 'Content-Type': 'application/json' },
        ///   body: JSON.stringify({
        ///     clientId: 'my-spa-client',
        ///     redirectUri: 'https://myapp.com/callback',
        ///     scope: 'openid profile email',
        ///     state: generateRandomString(16),
        ///     codeChallenge: codeChallenge,
        ///     forceLogin: true
        ///   })
        /// });
        ///
        /// const { url } = await response.json();
        /// window.location.href = url; // 導向登入頁面
        /// ```
        /// </remarks>
        /// <param name="request">授權請求參數</param>
        /// <returns>授權 URL</returns>
        [HttpPost("connect/authorize-url")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(AuthorizeUrlResponse), 200)]
        public IActionResult GetAuthorizeUrl([FromBody] AuthorizeUrlRequest request)
        {
            var url = $"{_authority}/connect/authorize?" +
                $"client_id={Uri.EscapeDataString(request.ClientId)}&" +
                $"redirect_uri={Uri.EscapeDataString(request.RedirectUri)}&" +
                $"response_type=code&" +
                $"scope={Uri.EscapeDataString(request.Scope)}";

            if (!string.IsNullOrEmpty(request.State))
            {
                url += $"&state={Uri.EscapeDataString(request.State)}";
            }

            if (!string.IsNullOrEmpty(request.CodeChallenge))
            {
                url += $"&code_challenge={Uri.EscapeDataString(request.CodeChallenge)}&code_challenge_method=S256";
            }

            if (!string.IsNullOrEmpty(request.Idp))
            {
                url += $"&acr_values=idp:{Uri.EscapeDataString(request.Idp)}";
            }

            if (request.ForceLogin)
            {
                url += "&prompt=login";
            }

            return Ok(new AuthorizeUrlResponse { Url = url });
        }

        /// <summary>
        /// Token Endpoint - 授權碼交換 Token
        /// </summary>
        /// <remarks>
        /// ## 用途
        ///
        /// 使用授權碼 (authorization code) 交換 access_token、id_token 和 refresh_token。
        /// 這是 Authorization Code Flow 的第二步，必須在後端執行以保護 Client Secret。
        ///
        /// ## STS 原生路徑
        ///
        /// `POST /connect/token` (grant_type=authorization_code)
        ///
        /// ## 參數說明
        ///
        /// | 參數           | 必填 | 說明                                                   |
        /// |----------------|------|--------------------------------------------------------|
        /// | code           | ✅   | 從授權端點取得的授權碼，只能使用一次                   |
        /// | redirect_uri   | ✅   | 必須與授權請求時的 redirect_uri 完全一致               |
        /// | client_id      | ✅   | 客戶端識別碼                                           |
        /// | client_secret  | ✅   | 客戶端密鑰（機密客戶端必填）                           |
        /// | code_verifier  | 視情況| PKCE 原始驗證碼，用於驗證 code_challenge               |
        ///
        /// ## 回傳內容
        ///
        /// | 欄位           | 說明                                                   |
        /// |----------------|--------------------------------------------------------|
        /// | access_token   | JWT 格式的存取權杖，用於存取受保護的 API               |
        /// | token_type     | 固定為 "Bearer"                                        |
        /// | expires_in     | access_token 的有效秒數                                |
        /// | refresh_token  | 用於取得新 access_token（需有 offline_access scope）   |
        /// | id_token       | JWT 格式的身份權杖，包含使用者身份資訊                 |
        /// | scope          | 實際授權的 scope                                       |
        ///
        /// ## ⚠️ 重要注意事項
        ///
        /// - **授權碼只能使用一次**：重複使用會導致錯誤
        /// - **PKCE 驗證**：若授權時使用了 code_challenge，交換時必須提供 code_verifier
        /// - **Client Secret 保護**：此 API 應在後端呼叫，避免在前端暴露 Client Secret
        ///
        /// ## 使用範例 (JavaScript)
        ///
        /// ```javascript
        /// // 從回調 URL 取得授權碼
        /// const urlParams = new URLSearchParams(window.location.search);
        /// const code = urlParams.get('code');
        /// const codeVerifier = sessionStorage.getItem('code_verifier');
        ///
        /// // 交換 Token（應在後端執行）
        /// const response = await fetch('/api/connect/token', {
        ///   method: 'POST',
        ///   headers: { 'Content-Type': 'application/json' },
        ///   body: JSON.stringify({
        ///     code: code,
        ///     redirectUri: 'https://myapp.com/callback',
        ///     clientId: 'my-spa-client',
        ///     clientSecret: 'my-secret',
        ///     codeVerifier: codeVerifier
        ///   })
        /// });
        ///
        /// const tokens = await response.json();
        /// // tokens.access_token, tokens.refresh_token, tokens.id_token
        /// ```
        /// </remarks>
        /// <param name="request">Token 請求</param>
        /// <returns>Token Response</returns>
        [HttpPost("connect/token")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> ExchangeToken([FromBody] TokenRequest request)
        {
            var parameters = new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["code"] = request.Code,
                ["redirect_uri"] = request.RedirectUri,
                ["client_id"] = request.ClientId,
                ["client_secret"] = request.ClientSecret
            };

            if (!string.IsNullOrEmpty(request.CodeVerifier))
            {
                parameters["code_verifier"] = request.CodeVerifier;
            }

            return await PostToTokenEndpoint(parameters);
        }

        /// <summary>
        /// Token Refresh - 刷新 Access Token
        /// </summary>
        /// <remarks>
        /// ## 用途
        ///
        /// 使用 refresh_token 取得新的 access_token，讓使用者不需重新登入即可延長存取權限。
        /// Refresh Token 通常有較長的有效期（例如 30 天）。
        ///
        /// ## STS 原生路徑
        ///
        /// `POST /connect/token` (grant_type=refresh_token)
        ///
        /// ## 參數說明
        ///
        /// | 參數           | 必填 | 說明                                                   |
        /// |----------------|------|--------------------------------------------------------|
        /// | refresh_token  | ✅   | 之前取得的 Refresh Token                               |
        /// | client_id      | ✅   | 客戶端識別碼                                           |
        /// | client_secret  | ✅   | 客戶端密鑰                                             |
        ///
        /// ## 回傳內容
        ///
        /// 回傳新的 Token 組合，格式與初次交換相同。
        ///
        /// ## 使用時機
        ///
        /// - access_token 即將過期或已過期時
        /// - 建議在 access_token 過期前 1-2 分鐘刷新
        /// - 可設定定時任務在背景自動刷新
        ///
        /// ## ⚠️ 重要注意事項
        ///
        /// - 刷新後可能會取得新的 refresh_token（視 Client 設定）
        /// - 若 refresh_token 已過期或被撤銷，需重新登入
        /// - 建議實作 refresh_token 輪換機制增加安全性
        ///
        /// ## 使用範例 (JavaScript)
        ///
        /// ```javascript
        /// // 定期刷新 Token
        /// async function refreshTokens() {
        ///   const response = await fetch('/api/connect/token/refresh', {
        ///     method: 'POST',
        ///     headers: { 'Content-Type': 'application/json' },
        ///     body: JSON.stringify({
        ///       refreshToken: storedRefreshToken,
        ///       clientId: 'my-spa-client',
        ///       clientSecret: 'my-secret'
        ///     })
        ///   });
        ///
        ///   if (response.ok) {
        ///     const tokens = await response.json();
        ///     storedAccessToken = tokens.access_token;
        ///     if (tokens.refresh_token) {
        ///       storedRefreshToken = tokens.refresh_token;
        ///     }
        ///   } else {
        ///     // Refresh Token 已失效，導向重新登入
        ///     redirectToLogin();
        ///   }
        /// }
        /// ```
        /// </remarks>
        /// <param name="request">刷新請求</param>
        /// <returns>Token Response</returns>
        [HttpPost("connect/token/refresh")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            var parameters = new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = request.RefreshToken,
                ["client_id"] = request.ClientId,
                ["client_secret"] = request.ClientSecret
            };

            return await PostToTokenEndpoint(parameters);
        }

        /// <summary>
        /// Client Credentials - 機器對機器認證
        /// </summary>
        /// <remarks>
        /// ## 用途
        ///
        /// 使用 Client Credentials Grant 取得 access_token。
        /// 適用於 Machine-to-Machine (M2M) 通訊，不涉及使用者。
        ///
        /// ## STS 原生路徑
        ///
        /// `POST /connect/token` (grant_type=client_credentials)
        ///
        /// ## 參數說明
        ///
        /// | 參數           | 必填 | 說明                                                   |
        /// |----------------|------|--------------------------------------------------------|
        /// | client_id      | ✅   | 客戶端識別碼                                           |
        /// | client_secret  | ✅   | 客戶端密鑰                                             |
        /// | scope          | 選填 | 請求的 API scope                                       |
        ///
        /// ## 適用情境
        ///
        /// - 後端服務對後端服務的 API 呼叫
        /// - 排程任務、背景工作
        /// - 系統整合、資料同步
        /// - 不需要代表特定使用者的操作
        ///
        /// ## ⚠️ 重要注意事項
        ///
        /// - **不會取得 refresh_token**：每次需要時重新請求
        /// - **不會取得 id_token**：沒有使用者身份資訊
        /// - **Token 不包含 sub claim**：無法識別特定使用者
        /// - **Client Secret 必須保密**：只在受信任的後端使用
        ///
        /// ## 使用範例 (C#)
        ///
        /// ```csharp
        /// // 使用 IdentityModel 套件
        /// var client = new HttpClient();
        /// var disco = await client.GetDiscoveryDocumentAsync("https://identity.example.com");
        ///
        /// var tokenResponse = await client.RequestClientCredentialsTokenAsync(
        ///     new ClientCredentialsTokenRequest
        ///     {
        ///         Address = disco.TokenEndpoint,
        ///         ClientId = "my-backend-service",
        ///         ClientSecret = "service-secret",
        ///         Scope = "api1 api2"
        ///     });
        ///
        /// if (!tokenResponse.IsError)
        /// {
        ///     var accessToken = tokenResponse.AccessToken;
        ///     // 使用 accessToken 呼叫其他 API
        /// }
        /// ```
        /// </remarks>
        /// <param name="request">Client Credentials 請求</param>
        /// <returns>Token Response</returns>
        [HttpPost("connect/token/client-credentials")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> GetClientCredentialsToken([FromBody] ClientCredentialsRequest request)
        {
            var parameters = new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = request.ClientId,
                ["client_secret"] = request.ClientSecret
            };

            if (!string.IsNullOrEmpty(request.Scope))
            {
                parameters["scope"] = request.Scope;
            }

            return await PostToTokenEndpoint(parameters);
        }

        /// <summary>
        /// Introspection Endpoint - Token 內省（遠端驗證）
        /// </summary>
        /// <remarks>
        /// ## 用途
        ///
        /// 向授權伺服器查詢 Token 狀態。這是「遠端驗證」方式，
        /// 可以偵測已撤銷的 Token，但每次驗證都需要網路請求。
        ///
        /// ## STS 原生路徑
        ///
        /// `POST /connect/introspect`
        ///
        /// ## 參數說明
        ///
        /// | 參數           | 必填 | 說明                                                   |
        /// |----------------|------|--------------------------------------------------------|
        /// | token          | ✅   | 要檢查的 Token（access_token 或 refresh_token）        |
        /// | client_id      | ✅   | 客戶端識別碼                                           |
        /// | client_secret  | ✅   | 客戶端密鑰                                             |
        ///
        /// ## 回傳內容
        ///
        /// | 欄位       | 說明                                                       |
        /// |------------|------------------------------------------------------------|
        /// | active     | **最重要** - true 表示有效，false 表示無效或已撤銷         |
        /// | sub        | 使用者識別碼 (Subject)                                     |
        /// | client_id  | 客戶端識別碼                                               |
        /// | scope      | Token 被授權的 scope                                       |
        /// | iss        | 發行者 (Issuer)                                            |
        /// | exp        | 過期時間 (Unix timestamp)                                  |
        /// | iat        | 發行時間 (Issued At)                                       |
        /// | nbf        | 生效時間 (Not Before)                                      |
        /// | jti        | JWT ID - Token 的唯一識別碼                                |
        /// | auth_time  | 使用者完成登入的時間                                       |
        /// | idp        | 身份提供者（如 Google、local 等）                          |
        /// | sid        | Session ID                                                 |
        ///
        /// ## 🔍 與本地驗證 (JWKS) 的比較
        ///
        /// | 特性       | Introspection (遠端)     | 本地驗證 (JWKS)                |
        /// |------------|--------------------------|--------------------------------|
        /// | 網路請求   | 每次都需要               | 僅首次取 JWKS                  |
        /// | 速度       | 較慢（網路延遲）         | 極快（毫秒級）                 |
        /// | 偵測撤銷   | ✅ **可以偵測**          | ❌ 無法偵測                    |
        /// | 適用場景   | 高安全性需求             | 一般 API                       |
        ///
        /// ## ⚠️ JWT Token 撤銷的重要說明
        ///
        /// JWT Token 是「無狀態」(Stateless) 的：
        /// - Token 被撤銷後，本地 JWKS 驗證仍會通過（因為簽章仍有效）
        /// - 只有透過 Introspection 才能確認 Token 是否被撤銷
        /// - 對於高安全性需求（如金融系統），建議使用 Introspection
        ///
        /// ## 使用範例 (JavaScript)
        ///
        /// ```javascript
        /// // 驗證 Token 是否仍然有效
        /// const response = await fetch('/api/connect/introspect', {
        ///   method: 'POST',
        ///   headers: { 'Content-Type': 'application/json' },
        ///   body: JSON.stringify({
        ///     token: accessToken,
        ///     clientId: 'my-api-client',
        ///     clientSecret: 'api-secret'
        ///   })
        /// });
        ///
        /// const result = await response.json();
        /// if (result.active) {
        ///   console.log('Token 有效，使用者:', result.sub);
        /// } else {
        ///   console.log('Token 無效或已被撤銷');
        /// }
        /// ```
        /// </remarks>
        /// <param name="request">內省請求</param>
        /// <returns>Token 資訊</returns>
        [HttpPost("connect/introspect")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> IntrospectToken([FromBody] IntrospectRequest request)
        {
            var parameters = new Dictionary<string, string>
            {
                ["token"] = request.Token,
                ["client_id"] = request.ClientId,
                ["client_secret"] = request.ClientSecret
            };

            var client = _httpClientFactory.CreateClient();
            var content = new FormUrlEncodedContent(parameters);
            var response = await client.PostAsync($"{_authority}/connect/introspect", content);

            var responseContent = await response.Content.ReadAsStringAsync();

            try
            {
                var doc = JsonDocument.Parse(responseContent);
                return Ok(doc.RootElement);
            }
            catch
            {
                return BadRequest(new { error = "Introspection failed", details = responseContent });
            }
        }

        /// <summary>
        /// Revocation Endpoint - Token 撤銷
        /// </summary>
        /// <remarks>
        /// ## 用途
        ///
        /// 撤銷 Token，用於主動使 Token 失效。
        /// 當使用者登出或需要強制終止存取權時使用。
        ///
        /// ## STS 原生路徑
        ///
        /// `POST /connect/revocation`
        ///
        /// ## 參數說明
        ///
        /// | 參數            | 必填 | 說明                                                  |
        /// |-----------------|------|-------------------------------------------------------|
        /// | token           | ✅   | 要撤銷的 Token                                        |
        /// | token_type_hint | 選填 | Token 類型提示：`access_token` 或 `refresh_token`    |
        /// | client_id       | ✅   | 客戶端識別碼                                          |
        /// | client_secret   | ✅   | 客戶端密鑰                                            |
        ///
        /// ## 撤銷策略
        ///
        /// | 撤銷類型        | 效果                                                   |
        /// |-----------------|--------------------------------------------------------|
        /// | access_token    | 該 Token 在 Introspection 時會回傳 active=false        |
        /// | refresh_token   | 該 Token 無法再用於取得新的 access_token               |
        ///
        /// ## ⚠️ JWT Token 撤銷的重要說明
        ///
        /// JWT Token 是「無狀態」(Stateless) 的，撤銷後：
        ///
        /// | 驗證方式              | 撤銷後結果           |
        /// |-----------------------|----------------------|
        /// | 本地驗證 (JWKS 公鑰)  | ❌ 仍會通過          |
        /// | 遠端驗證 (Introspect) | ✅ 會回傳 active=false|
        ///
        /// **建議做法**：
        /// - 若需要即時撤銷效果，API 端應使用 Introspection 驗證
        /// - 或者設定較短的 access_token 有效期（如 5 分鐘）
        /// - 撤銷 refresh_token 可以防止取得新的 access_token
        ///
        /// ## 使用時機
        ///
        /// - 使用者主動登出
        /// - 管理員強制終止使用者 Session
        /// - 偵測到可疑活動時
        /// - 使用者變更密碼後
        ///
        /// ## 使用範例 (JavaScript)
        ///
        /// ```javascript
        /// // 使用者登出時撤銷 Token
        /// async function logout() {
        ///   // 撤銷 refresh_token（防止繼續取得新的 access_token）
        ///   await fetch('/api/connect/revocation', {
        ///     method: 'POST',
        ///     headers: { 'Content-Type': 'application/json' },
        ///     body: JSON.stringify({
        ///       token: refreshToken,
        ///       tokenTypeHint: 'refresh_token',
        ///       clientId: 'my-spa-client',
        ///       clientSecret: 'my-secret'
        ///     })
        ///   });
        ///
        ///   // 撤銷 access_token
        ///   await fetch('/api/connect/revocation', {
        ///     method: 'POST',
        ///     headers: { 'Content-Type': 'application/json' },
        ///     body: JSON.stringify({
        ///       token: accessToken,
        ///       tokenTypeHint: 'access_token',
        ///       clientId: 'my-spa-client',
        ///       clientSecret: 'my-secret'
        ///     })
        ///   });
        ///
        ///   // 清除本地儲存的 Token
        ///   localStorage.removeItem('access_token');
        ///   localStorage.removeItem('refresh_token');
        /// }
        /// ```
        /// </remarks>
        /// <param name="request">撤銷請求</param>
        /// <returns>撤銷結果</returns>
        [HttpPost("connect/revocation")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(RevokeResponse), 200)]
        public async Task<IActionResult> RevokeToken([FromBody] RevokeRequest request)
        {
            var parameters = new Dictionary<string, string>
            {
                ["token"] = request.Token,
                ["token_type_hint"] = request.TokenTypeHint ?? "access_token",
                ["client_id"] = request.ClientId,
                ["client_secret"] = request.ClientSecret
            };

            var client = _httpClientFactory.CreateClient();
            var content = new FormUrlEncodedContent(parameters);
            var response = await client.PostAsync($"{_authority}/connect/revocation", content);

            return Ok(new RevokeResponse { Success = response.IsSuccessStatusCode });
        }

        /// <summary>
        /// UserInfo Endpoint - 取得使用者資訊
        /// </summary>
        /// <remarks>
        /// ## 用途
        ///
        /// 使用 access_token 取得已登入使用者的身份資訊（如姓名、Email、角色等）。
        /// 回傳的欄位取決於請求的 scope。
        ///
        /// ## STS 原生路徑
        ///
        /// `GET /connect/userinfo`
        /// Header: `Authorization: Bearer {access_token}`
        ///
        /// ## Scope 與回傳欄位對應
        ///
        /// | Scope     | 回傳欄位                                               |
        /// |-----------|--------------------------------------------------------|
        /// | openid    | sub (使用者識別碼)                                     |
        /// | profile   | name, family_name, given_name, nickname, picture 等    |
        /// | email     | email, email_verified                                  |
        /// | phone     | phone_number, phone_number_verified                    |
        /// | address   | address                                                |
        /// | roles     | role (自訂，包含使用者角色)                            |
        ///
        /// ## 回傳範例
        ///
        /// ```json
        /// {
        ///   "sub": "d58a6b5f-89e4-4c2a-9f61-7b8c1d4e5f6a",
        ///   "name": "王小明",
        ///   "given_name": "小明",
        ///   "family_name": "王",
        ///   "email": "xiaoming.wang@example.com",
        ///   "email_verified": true,
        ///   "role": ["Admin", "User"],
        ///   "idp": "Google",
        ///   "auth_time": 1704067200
        /// }
        /// ```
        ///
        /// ## 使用範例 (JavaScript)
        ///
        /// ```javascript
        /// // 取得使用者資訊
        /// const response = await fetch('/api/connect/userinfo?accessToken=' + accessToken);
        /// const userInfo = await response.json();
        ///
        /// console.log('使用者名稱:', userInfo.name);
        /// console.log('Email:', userInfo.email);
        /// console.log('角色:', userInfo.role);
        /// ```
        ///
        /// ## 原生呼叫方式
        ///
        /// ```javascript
        /// // 直接呼叫 STS 的 userinfo 端點
        /// const response = await fetch('https://identity.example.com/connect/userinfo', {
        ///   headers: {
        ///     'Authorization': 'Bearer ' + accessToken
        ///   }
        /// });
        /// ```
        /// </remarks>
        /// <param name="accessToken">Access Token</param>
        /// <returns>使用者資訊</returns>
        [HttpGet("connect/userinfo")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> GetUserInfo([FromQuery] string accessToken)
        {
            var client = _httpClientFactory.CreateClient();
            var request = new HttpRequestMessage(HttpMethod.Get, $"{_authority}/connect/userinfo");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                return BadRequest(new { error = "Failed to get user info" });
            }

            var content = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(content);
            return Ok(doc.RootElement);
        }

        /// <summary>
        /// End Session Endpoint - 取得登出 URL
        /// </summary>
        /// <remarks>
        /// ## 用途
        ///
        /// 產生 OpenID Connect End Session URL，結束使用者在授權伺服器的 Session。
        /// 支援 Single Sign-Out，可同時登出所有使用相同 Session 的應用程式。
        ///
        /// ## STS 原生路徑
        ///
        /// `GET /connect/endsession` (瀏覽器重導向)
        ///
        /// ## 參數說明
        ///
        /// | 參數                    | 必填 | 說明                                           |
        /// |-------------------------|------|------------------------------------------------|
        /// | id_token_hint           | 建議 | ID Token，用於識別要登出的使用者               |
        /// | post_logout_redirect_uri| 選填 | 登出後重導向的 URL（需在 Client 設定中註冊）   |
        ///
        /// ## 登出流程
        ///
        /// ```
        /// 1. 呼叫此 API 取得登出 URL
        /// 2. 清除本地儲存的 Token
        /// 3. 將使用者導向登出 URL
        /// 4. IdentityServer 清除 Session Cookie
        /// 5. 重導向回 post_logout_redirect_uri
        /// ```
        ///
        /// ## Single Sign-Out (SSO)
        ///
        /// 若有設定，IdentityServer 會通知所有使用相同 Session 的客戶端：
        /// - Front-channel Logout：透過 iframe 通知
        /// - Back-channel Logout：透過 HTTP POST 通知
        ///
        /// ## 使用範例 (JavaScript)
        ///
        /// ```javascript
        /// async function logout() {
        ///   // 1. 取得登出 URL
        ///   const response = await fetch('/api/connect/endsession-url', {
        ///     method: 'POST',
        ///     headers: { 'Content-Type': 'application/json' },
        ///     body: JSON.stringify({
        ///       idTokenHint: idToken,
        ///       postLogoutRedirectUri: 'https://myapp.com'
        ///     })
        ///   });
        ///
        ///   const { url } = await response.json();
        ///
        ///   // 2. 清除本地 Token
        ///   localStorage.removeItem('access_token');
        ///   localStorage.removeItem('refresh_token');
        ///   localStorage.removeItem('id_token');
        ///
        ///   // 3. 導向登出 URL
        ///   window.location.href = url;
        /// }
        /// ```
        ///
        /// ## ⚠️ 注意事項
        ///
        /// - 建議同時撤銷 Token（呼叫 Revocation 端點）
        /// - `post_logout_redirect_uri` 必須在 Client 的 `PostLogoutRedirectUris` 中註冊
        /// - 若不提供 `id_token_hint`，可能需要使用者確認登出
        /// </remarks>
        /// <param name="request">登出請求</param>
        /// <returns>登出 URL</returns>
        [HttpPost("connect/endsession-url")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(LogoutUrlResponse), 200)]
        public IActionResult GetLogoutUrl([FromBody] LogoutUrlRequest request)
        {
            var url = $"{_authority}/connect/endsession";
            var queryParams = new List<string>();

            if (!string.IsNullOrEmpty(request.IdTokenHint))
            {
                queryParams.Add($"id_token_hint={Uri.EscapeDataString(request.IdTokenHint)}");
            }

            if (!string.IsNullOrEmpty(request.PostLogoutRedirectUri))
            {
                queryParams.Add($"post_logout_redirect_uri={Uri.EscapeDataString(request.PostLogoutRedirectUri)}");
            }

            if (queryParams.Count > 0)
            {
                url += "?" + string.Join("&", queryParams);
            }

            return Ok(new LogoutUrlResponse { Url = url });
        }

        private async Task<IActionResult> PostToTokenEndpoint(Dictionary<string, string> parameters)
        {
            var client = _httpClientFactory.CreateClient();
            var content = new FormUrlEncodedContent(parameters);
            var response = await client.PostAsync($"{_authority}/connect/token", content);

            var responseContent = await response.Content.ReadAsStringAsync();

            try
            {
                var doc = JsonDocument.Parse(responseContent);

                if (!response.IsSuccessStatusCode)
                {
                    return BadRequest(doc.RootElement);
                }

                return Ok(doc.RootElement);
            }
            catch
            {
                return BadRequest(new { error = "Token request failed", details = responseContent });
            }
        }
    }

    #region Request/Response Models

    /// <summary>
    /// 授權 URL 請求 - 用於產生 OAuth 2.0 授權 URL
    /// </summary>
    /// <remarks>
    /// Authorization Code Flow 的第一步參數，用於導向使用者至登入頁面。
    /// </remarks>
    public class AuthorizeUrlRequest
    {
        /// <summary>
        /// 客戶端 ID（必填）
        /// </summary>
        /// <remarks>在 IdentityServer 註冊客戶端時取得的唯一識別碼</remarks>
        /// <example>my-spa-client</example>
        public string ClientId { get; set; } = string.Empty;

        /// <summary>
        /// 重導向 URI（必填）
        /// </summary>
        /// <remarks>授權完成後的回調 URL，必須與 Client 設定中註冊的完全一致</remarks>
        /// <example>https://myapp.com/callback</example>
        public string RedirectUri { get; set; } = string.Empty;

        /// <summary>
        /// 請求的 Scope（空格分隔）
        /// </summary>
        /// <remarks>
        /// 常用 Scope：
        /// - openid：必填，取得使用者識別碼
        /// - profile：取得使用者基本資料
        /// - email：取得 Email
        /// - roles：取得使用者角色
        /// - offline_access：取得 refresh_token
        /// </remarks>
        /// <example>openid profile email roles offline_access</example>
        public string Scope { get; set; } = "openid profile";

        /// <summary>
        /// State 參數（強烈建議）
        /// </summary>
        /// <remarks>
        /// 隨機字串，用於防止 CSRF 攻擊。
        /// 回調時會原封不動回傳，應在前端驗證是否與發送時一致。
        /// </remarks>
        /// <example>abc123xyz789</example>
        public string? State { get; set; }

        /// <summary>
        /// PKCE Code Challenge（建議使用）
        /// </summary>
        /// <remarks>
        /// PKCE 驗證碼，由 code_verifier 經 SHA256 後 Base64URL 編碼產生。
        /// 公式：code_challenge = BASE64URL(SHA256(code_verifier))
        /// </remarks>
        /// <example>E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM</example>
        public string? CodeChallenge { get; set; }

        /// <summary>
        /// 指定身分提供者
        /// </summary>
        /// <remarks>
        /// 若指定，會加入 acr_values=idp:{Idp} 參數，
        /// 直接導向該身分提供者（如 Google）而非顯示選擇頁面
        /// </remarks>
        /// <example>Google</example>
        public string? Idp { get; set; }

        /// <summary>
        /// 強制顯示登入畫面
        /// </summary>
        /// <remarks>
        /// 若為 true，會加入 prompt=login 參數，
        /// 即使使用者已有 SSO Session 也會顯示登入畫面
        /// </remarks>
        /// <example>true</example>
        public bool ForceLogin { get; set; }
    }

    /// <summary>
    /// 授權 URL 回應
    /// </summary>
    public class AuthorizeUrlResponse
    {
        /// <summary>
        /// 產生的授權 URL
        /// </summary>
        /// <remarks>將使用者重導向至此 URL 進行登入</remarks>
        /// <example>https://identity.example.com/connect/authorize?client_id=xxx&amp;redirect_uri=xxx&amp;...</example>
        public string Url { get; set; } = string.Empty;
    }

    /// <summary>
    /// Token 請求 - 用於授權碼交換 Token
    /// </summary>
    /// <remarks>
    /// Authorization Code Flow 的第二步，使用授權碼交換 Token。
    /// 此請求應在後端執行以保護 Client Secret。
    /// </remarks>
    public class TokenRequest
    {
        /// <summary>
        /// 授權碼（必填）
        /// </summary>
        /// <remarks>
        /// 從授權端點回調取得的 code 參數。
        /// ⚠️ 注意：授權碼只能使用一次！
        /// </remarks>
        /// <example>n8F3dXyZ9KqR7Lm2</example>
        public string Code { get; set; } = string.Empty;

        /// <summary>
        /// 重導向 URI（必填）
        /// </summary>
        /// <remarks>必須與授權請求時的 redirect_uri 完全一致</remarks>
        /// <example>https://myapp.com/callback</example>
        public string RedirectUri { get; set; } = string.Empty;

        /// <summary>
        /// 客戶端 ID（必填）
        /// </summary>
        /// <example>my-spa-client</example>
        public string ClientId { get; set; } = string.Empty;

        /// <summary>
        /// 客戶端密鑰（機密客戶端必填）
        /// </summary>
        /// <remarks>⚠️ 此值應保密，只在後端使用</remarks>
        /// <example>my-secret-key</example>
        public string ClientSecret { get; set; } = string.Empty;

        /// <summary>
        /// PKCE Code Verifier
        /// </summary>
        /// <remarks>
        /// 若授權時使用了 code_challenge，則此欄位必填。
        /// 伺服器會驗證 SHA256(code_verifier) === code_challenge
        /// </remarks>
        /// <example>dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk</example>
        public string? CodeVerifier { get; set; }
    }

    /// <summary>
    /// 刷新 Token 請求 - 用於取得新的 Access Token
    /// </summary>
    public class RefreshTokenRequest
    {
        /// <summary>
        /// Refresh Token（必填）
        /// </summary>
        /// <remarks>之前取得的 refresh_token，需有 offline_access scope</remarks>
        /// <example>eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...</example>
        public string RefreshToken { get; set; } = string.Empty;

        /// <summary>
        /// 客戶端 ID（必填）
        /// </summary>
        /// <example>my-spa-client</example>
        public string ClientId { get; set; } = string.Empty;

        /// <summary>
        /// 客戶端密鑰（機密客戶端必填）
        /// </summary>
        /// <example>my-secret-key</example>
        public string ClientSecret { get; set; } = string.Empty;
    }

    /// <summary>
    /// Client Credentials 請求 - 用於機器對機器認證
    /// </summary>
    /// <remarks>
    /// 適用於不涉及使用者的後端服務對後端服務通訊。
    /// </remarks>
    public class ClientCredentialsRequest
    {
        /// <summary>
        /// 客戶端 ID（必填）
        /// </summary>
        /// <example>my-backend-service</example>
        public string ClientId { get; set; } = string.Empty;

        /// <summary>
        /// 客戶端密鑰（必填）
        /// </summary>
        /// <example>service-secret-key</example>
        public string ClientSecret { get; set; } = string.Empty;

        /// <summary>
        /// 請求的 Scope
        /// </summary>
        /// <remarks>指定要存取的 API scope</remarks>
        /// <example>api1 api2</example>
        public string? Scope { get; set; }
    }

    /// <summary>
    /// Token 內省請求 - 用於驗證 Token 是否有效
    /// </summary>
    /// <remarks>
    /// 這是「遠端驗證」方式，可偵測已撤銷的 Token。
    /// </remarks>
    public class IntrospectRequest
    {
        /// <summary>
        /// 要檢查的 Token（必填）
        /// </summary>
        /// <remarks>可以是 access_token 或 refresh_token</remarks>
        /// <example>eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...</example>
        public string Token { get; set; } = string.Empty;

        /// <summary>
        /// 客戶端 ID（必填）
        /// </summary>
        /// <remarks>需要有 Introspection 權限的 Client</remarks>
        /// <example>my-api-client</example>
        public string ClientId { get; set; } = string.Empty;

        /// <summary>
        /// 客戶端密鑰（必填）
        /// </summary>
        /// <example>api-secret-key</example>
        public string ClientSecret { get; set; } = string.Empty;
    }

    /// <summary>
    /// 撤銷 Token 請求 - 用於使 Token 失效
    /// </summary>
    /// <remarks>
    /// ⚠️ JWT Token 撤銷後，本地驗證仍會通過！
    /// 只有 Introspection 才能偵測到已撤銷的 Token。
    /// </remarks>
    public class RevokeRequest
    {
        /// <summary>
        /// 要撤銷的 Token（必填）
        /// </summary>
        /// <example>eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...</example>
        public string Token { get; set; } = string.Empty;

        /// <summary>
        /// Token 類型提示
        /// </summary>
        /// <remarks>
        /// 可選值：
        /// - access_token（預設）
        /// - refresh_token
        /// </remarks>
        /// <example>access_token</example>
        public string? TokenTypeHint { get; set; } = "access_token";

        /// <summary>
        /// 客戶端 ID（必填）
        /// </summary>
        /// <example>my-spa-client</example>
        public string ClientId { get; set; } = string.Empty;

        /// <summary>
        /// 客戶端密鑰（機密客戶端必填）
        /// </summary>
        /// <example>my-secret-key</example>
        public string ClientSecret { get; set; } = string.Empty;
    }

    /// <summary>
    /// 撤銷回應
    /// </summary>
    public class RevokeResponse
    {
        /// <summary>
        /// 是否成功
        /// </summary>
        /// <remarks>
        /// true 表示撤銷請求已成功處理。
        /// 注意：即使 Token 不存在或已過期，也可能回傳 true。
        /// </remarks>
        /// <example>true</example>
        public bool Success { get; set; }
    }

    /// <summary>
    /// 登出 URL 請求 - 用於產生登出 URL
    /// </summary>
    public class LogoutUrlRequest
    {
        /// <summary>
        /// ID Token（建議提供）
        /// </summary>
        /// <remarks>
        /// 用於識別要登出的使用者。
        /// 若不提供，可能需要使用者在登出頁面確認。
        /// </remarks>
        /// <example>eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...</example>
        public string? IdTokenHint { get; set; }

        /// <summary>
        /// 登出後重導向 URI
        /// </summary>
        /// <remarks>
        /// 登出完成後重導向的 URL。
        /// ⚠️ 必須在 Client 的 PostLogoutRedirectUris 中註冊。
        /// </remarks>
        /// <example>https://myapp.com</example>
        public string? PostLogoutRedirectUri { get; set; }
    }

    /// <summary>
    /// 登出 URL 回應
    /// </summary>
    public class LogoutUrlResponse
    {
        /// <summary>
        /// 登出 URL
        /// </summary>
        /// <remarks>將使用者重導向至此 URL 進行登出</remarks>
        /// <example>https://identity.example.com/connect/endsession?id_token_hint=xxx&amp;post_logout_redirect_uri=xxx</example>
        public string Url { get; set; } = string.Empty;
    }

    #endregion
}
