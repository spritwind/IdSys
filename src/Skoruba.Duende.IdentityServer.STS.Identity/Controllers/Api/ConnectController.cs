using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Skoruba.Duende.IdentityServer.STS.Identity.Controllers.Api
{
    /// <summary>
    /// OAuth 2.0 / OpenID Connect 標準端點
    /// </summary>
    /// <remarks>
    /// ## 概述
    /// 這些是 Duende IdentityServer 的標準 OIDC 端點。
    ///
    /// **注意**: 這些端點由 IdentityServer middleware 處理，Swagger 的 "Try it out" 功能可能無法正常運作。
    /// 請使用 Postman、curl 或前端應用程式直接呼叫這些端點。
    ///
    /// ## Authorization Code Flow with PKCE (推薦)
    ///
    /// ```
    /// ┌──────────┐                                    ┌───────────────┐
    /// │  Client  │  1. GET /connect/authorize         │ IdentityServer│
    /// │  (SPA)   │ ──────────────────────────────────▶│               │
    /// │          │    ?response_type=code             │               │
    /// │          │    &amp;client_id=xxx                  │               │
    /// │          │    &amp;redirect_uri=xxx               │               │
    /// │          │    &amp;scope=openid profile           │               │
    /// │          │    &amp;code_challenge=xxx             │               │
    /// │          │    &amp;code_challenge_method=S256     │               │
    /// │          │                                    │               │
    /// │          │  2. 使用者登入並同意               │               │
    /// │          │                                    │               │
    /// │          │  3. 302 Redirect                   │               │
    /// │          │◀──────────────────────────────────│               │
    /// │          │    ?code=授權碼&amp;state=xxx          │               │
    /// │          │                                    │               │
    /// │          │  4. POST /connect/token            │               │
    /// │          │ ──────────────────────────────────▶│               │
    /// │          │    grant_type=authorization_code   │               │
    /// │          │    code=授權碼                     │               │
    /// │          │    code_verifier=xxx               │               │
    /// │          │                                    │               │
    /// │          │  5. Token Response                 │               │
    /// │          │◀──────────────────────────────────│               │
    /// │          │    { access_token, id_token, ... } │               │
    /// └──────────┘                                    └───────────────┘
    /// ```
    /// </remarks>
    [ApiController]
    [Route("connect")]
    [Produces("application/json")]
    public class ConnectController : ControllerBase
    {
        #region /connect/authorize

        /// <summary>
        /// 授權端點 (Authorization Endpoint)
        /// </summary>
        /// <remarks>
        /// ## 端點路徑
        /// `GET /connect/authorize`
        ///
        /// ## 說明
        /// 啟動 OAuth 2.0 / OIDC 授權流程。使用者將被重導向至登入頁面。
        ///
        /// ## 必要參數
        /// | 參數 | 類型 | 說明 | 範例 |
        /// |------|------|------|------|
        /// | client_id | string | 已註冊的 Client ID | `spa-client` |
        /// | redirect_uri | string | 授權後重導向 URI (需已註冊) | `https://app.example.com/callback` |
        /// | response_type | string | 固定為 `code` | `code` |
        /// | scope | string | 權限範圍，空格分隔 | `openid profile email` |
        /// | code_challenge | string | PKCE Challenge (Base64URL SHA256) | `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM` |
        /// | code_challenge_method | string | PKCE 方法 | `S256` |
        ///
        /// ## 選填參數
        /// | 參數 | 類型 | 說明 | 範例 |
        /// |------|------|------|------|
        /// | state | string | 防 CSRF，將原樣回傳 | `abc123` |
        /// | nonce | string | 防重放，包含於 ID Token | `xyz789` |
        /// | prompt | string | 登入提示 | `login`, `consent`, `none` |
        /// | login_hint | string | 預填使用者名稱 | `user@example.com` |
        /// | acr_values | string | 認證等級要求 | `mfa` |
        /// | ui_locales | string | 介面語言 | `zh-TW` |
        /// | max_age | int | 最大認證時間(秒) | `3600` |
        ///
        /// ## PKCE 產生方式 (JavaScript)
        /// ```javascript
        /// // 1. 產生 code_verifier (43-128 字元隨機字串)
        /// function generateCodeVerifier() {
        ///     const array = new Uint8Array(32);
        ///     crypto.getRandomValues(array);
        ///     return btoa(String.fromCharCode(...array))
        ///         .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        /// }
        ///
        /// // 2. 計算 code_challenge
        /// async function generateCodeChallenge(verifier) {
        ///     const encoder = new TextEncoder();
        ///     const data = encoder.encode(verifier);
        ///     const hash = await crypto.subtle.digest('SHA-256', data);
        ///     return btoa(String.fromCharCode(...new Uint8Array(hash)))
        ///         .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        /// }
        /// ```
        ///
        /// ## 完整範例 URL
        /// ```
        /// GET /connect/authorize
        ///   ?client_id=spa-client
        ///   &amp;redirect_uri=https://app.example.com/callback
        ///   &amp;response_type=code
        ///   &amp;scope=openid profile email offline_access
        ///   &amp;code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
        ///   &amp;code_challenge_method=S256
        ///   &amp;state=abc123
        ///   &amp;nonce=xyz789
        /// ```
        ///
        /// ## 成功回應
        /// 重導向至 redirect_uri：
        /// ```
        /// HTTP/1.1 302 Found
        /// Location: https://app.example.com/callback?code=授權碼&amp;state=abc123
        /// ```
        ///
        /// ## 錯誤回應
        /// ```
        /// HTTP/1.1 302 Found
        /// Location: https://app.example.com/callback?error=access_denied&amp;error_description=...
        /// ```
        /// </remarks>
        /// <param name="client_id">已註冊的 Client ID</param>
        /// <param name="redirect_uri">授權後重導向 URI</param>
        /// <param name="response_type">回應類型，固定為 "code"</param>
        /// <param name="scope">權限範圍 (openid profile email offline_access)</param>
        /// <param name="code_challenge">PKCE Code Challenge</param>
        /// <param name="code_challenge_method">PKCE 方法 (S256)</param>
        /// <param name="state">防 CSRF 狀態值</param>
        /// <param name="nonce">防重放隨機值</param>
        /// <param name="prompt">登入提示 (login/consent/none)</param>
        /// <param name="login_hint">預填使用者名稱</param>
        /// <param name="acr_values">認證等級要求</param>
        /// <param name="ui_locales">介面語言</param>
        /// <param name="max_age">最大認證時間(秒)</param>
        /// <response code="302">重導向至登入頁面或 redirect_uri</response>
        [HttpGet("authorize")]
        [ProducesResponseType(StatusCodes.Status302Found)]
        public IActionResult Authorize(
            [FromQuery][Required] string client_id,
            [FromQuery][Required] string redirect_uri,
            [FromQuery][Required] string response_type,
            [FromQuery][Required] string scope,
            [FromQuery][Required] string code_challenge,
            [FromQuery][Required] string code_challenge_method,
            [FromQuery] string? state,
            [FromQuery] string? nonce,
            [FromQuery] string? prompt,
            [FromQuery] string? login_hint,
            [FromQuery] string? acr_values,
            [FromQuery] string? ui_locales,
            [FromQuery] int? max_age)
        {
            // 此端點由 IdentityServer middleware 處理
            // 文件用途，實際不會執行到這裡
            return StatusCode(StatusCodes.Status302Found);
        }

        #endregion

        #region /connect/token

        /// <summary>
        /// Token 端點 (Token Endpoint)
        /// </summary>
        /// <remarks>
        /// ## 端點路徑
        /// `POST /connect/token`
        ///
        /// ## Content-Type
        /// `application/x-www-form-urlencoded`
        ///
        /// ---
        ///
        /// ## 1. Authorization Code Grant
        ///
        /// 使用授權碼交換 Token。
        ///
        /// | 參數 | 必填 | 說明 |
        /// |------|------|------|
        /// | grant_type | ✓ | `authorization_code` |
        /// | client_id | ✓ | Client ID |
        /// | code | ✓ | 授權碼 |
        /// | redirect_uri | ✓ | 與授權請求相同 |
        /// | code_verifier | ✓ | PKCE 原始值 |
        ///
        /// ```bash
        /// curl -X POST https://identity.example.com/connect/token \
        ///   -H "Content-Type: application/x-www-form-urlencoded" \
        ///   -d "grant_type=authorization_code" \
        ///   -d "client_id=spa-client" \
        ///   -d "code=授權碼" \
        ///   -d "redirect_uri=https://app.example.com/callback" \
        ///   -d "code_verifier=原始code_verifier值"
        /// ```
        ///
        /// ---
        ///
        /// ## 2. Client Credentials Grant
        ///
        /// Machine-to-Machine 取得 Token。
        ///
        /// | 參數 | 必填 | 說明 |
        /// |------|------|------|
        /// | grant_type | ✓ | `client_credentials` |
        /// | client_id | ✓ | Client ID |
        /// | client_secret | ✓ | Client Secret |
        /// | scope | | 權限範圍 |
        ///
        /// ```bash
        /// curl -X POST https://identity.example.com/connect/token \
        ///   -H "Content-Type: application/x-www-form-urlencoded" \
        ///   -d "grant_type=client_credentials" \
        ///   -d "client_id=service-client" \
        ///   -d "client_secret=secret" \
        ///   -d "scope=api1 api2"
        /// ```
        ///
        /// ---
        ///
        /// ## 3. Refresh Token Grant
        ///
        /// 使用 Refresh Token 更新 Access Token。
        ///
        /// | 參數 | 必填 | 說明 |
        /// |------|------|------|
        /// | grant_type | ✓ | `refresh_token` |
        /// | client_id | ✓ | Client ID |
        /// | refresh_token | ✓ | Refresh Token |
        /// | scope | | 可縮減範圍 |
        ///
        /// ```bash
        /// curl -X POST https://identity.example.com/connect/token \
        ///   -H "Content-Type: application/x-www-form-urlencoded" \
        ///   -d "grant_type=refresh_token" \
        ///   -d "client_id=spa-client" \
        ///   -d "refresh_token=CfDJ8Nyxw..."
        /// ```
        ///
        /// ---
        ///
        /// ## 成功回應 (HTTP 200)
        /// ```json
        /// {
        ///   "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
        ///   "token_type": "Bearer",
        ///   "expires_in": 3600,
        ///   "refresh_token": "CfDJ8Nyxw...",
        ///   "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
        ///   "scope": "openid profile email"
        /// }
        /// ```
        ///
        /// ## 錯誤回應 (HTTP 400)
        /// ```json
        /// {
        ///   "error": "invalid_grant",
        ///   "error_description": "授權碼無效或已過期"
        /// }
        /// ```
        /// </remarks>
        /// <param name="grant_type">Grant 類型</param>
        /// <param name="client_id">Client ID</param>
        /// <param name="client_secret">Client Secret (Confidential Client)</param>
        /// <param name="code">授權碼 (authorization_code grant)</param>
        /// <param name="redirect_uri">重導向 URI (authorization_code grant)</param>
        /// <param name="code_verifier">PKCE Code Verifier (authorization_code grant)</param>
        /// <param name="refresh_token">Refresh Token (refresh_token grant)</param>
        /// <param name="scope">權限範圍</param>
        /// <response code="200">成功取得 Token</response>
        /// <response code="400">請求錯誤</response>
        [HttpPost("token")]
        [Consumes("application/x-www-form-urlencoded")]
        [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
        public IActionResult Token(
            [FromForm][Required] string grant_type,
            [FromForm] string? client_id,
            [FromForm] string? client_secret,
            [FromForm] string? code,
            [FromForm] string? redirect_uri,
            [FromForm] string? code_verifier,
            [FromForm] string? refresh_token,
            [FromForm] string? scope)
        {
            // 此端點由 IdentityServer middleware 處理
            return Ok();
        }

        #endregion

        #region /connect/userinfo

        /// <summary>
        /// UserInfo 端點 (UserInfo Endpoint)
        /// </summary>
        /// <remarks>
        /// ## 端點路徑
        /// `GET /connect/userinfo` 或 `POST /connect/userinfo`
        ///
        /// ## 認證方式
        /// ```
        /// Authorization: Bearer {access_token}
        /// ```
        ///
        /// ## 回傳 Claims (依據 scope)
        /// | Scope | Claims |
        /// |-------|--------|
        /// | openid | sub |
        /// | profile | name, family_name, given_name, nickname, picture, gender, birthdate, locale, updated_at |
        /// | email | email, email_verified |
        /// | phone | phone_number, phone_number_verified |
        /// | address | address |
        ///
        /// ## 範例請求
        /// ```bash
        /// curl -X GET https://identity.example.com/connect/userinfo \
        ///   -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..."
        /// ```
        ///
        /// ## 成功回應 (HTTP 200)
        /// ```json
        /// {
        ///   "sub": "user-123",
        ///   "name": "John Doe",
        ///   "given_name": "John",
        ///   "family_name": "Doe",
        ///   "email": "john@example.com",
        ///   "email_verified": true
        /// }
        /// ```
        ///
        /// ## 錯誤回應 (HTTP 401)
        /// ```json
        /// {
        ///   "error": "invalid_token",
        ///   "error_description": "Token 無效或已過期"
        /// }
        /// ```
        /// </remarks>
        /// <response code="200">成功取得使用者資訊</response>
        /// <response code="401">Token 無效或已過期</response>
        [HttpGet("userinfo")]
        [ProducesResponseType(typeof(UserInfoResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
        public IActionResult UserInfo()
        {
            // 此端點由 IdentityServer middleware 處理
            return Ok();
        }

        #endregion

        #region /connect/introspect

        /// <summary>
        /// Token 檢驗端點 (Introspection Endpoint)
        /// </summary>
        /// <remarks>
        /// ## 端點路徑
        /// `POST /connect/introspect`
        ///
        /// ## Content-Type
        /// `application/x-www-form-urlencoded`
        ///
        /// ## 認證方式
        /// 使用 API Resource credentials：
        /// - Basic Auth: `Authorization: Basic base64(client_id:client_secret)`
        /// - 或在 body 提供 client_id + client_secret
        ///
        /// ## 參數
        /// | 參數 | 必填 | 說明 |
        /// |------|------|------|
        /// | token | ✓ | 要檢驗的 Token |
        /// | token_type_hint | | `access_token` 或 `refresh_token` |
        /// | client_id | ✓ | API Resource 的 Client ID |
        /// | client_secret | ✓ | API Resource 的 Secret |
        ///
        /// ## 範例請求
        /// ```bash
        /// curl -X POST https://identity.example.com/connect/introspect \
        ///   -H "Content-Type: application/x-www-form-urlencoded" \
        ///   -d "token=eyJhbGciOiJSUzI1NiIs..." \
        ///   -d "client_id=api-resource" \
        ///   -d "client_secret=secret"
        /// ```
        ///
        /// ## Token 有效回應 (HTTP 200)
        /// ```json
        /// {
        ///   "active": true,
        ///   "sub": "user-123",
        ///   "client_id": "spa-client",
        ///   "scope": "openid profile email",
        ///   "token_type": "access_token",
        ///   "exp": 1700000000,
        ///   "iat": 1699996400,
        ///   "nbf": 1699996400,
        ///   "iss": "https://identity.example.com",
        ///   "aud": "api1"
        /// }
        /// ```
        ///
        /// ## Token 無效/已撤銷回應 (HTTP 200)
        /// ```json
        /// {
        ///   "active": false
        /// }
        /// ```
        ///
        /// ## 重要說明
        /// - JWT Token 是無狀態的，撤銷後需透過此端點確認
        /// - 此端點可用於檢查 Token 是否已被撤銷
        /// </remarks>
        /// <param name="token">要檢驗的 Token</param>
        /// <param name="token_type_hint">Token 類型提示</param>
        /// <param name="client_id">API Resource Client ID</param>
        /// <param name="client_secret">API Resource Secret</param>
        /// <response code="200">檢驗完成 (查看 active 欄位)</response>
        /// <response code="401">認證失敗</response>
        [HttpPost("introspect")]
        [Consumes("application/x-www-form-urlencoded")]
        [ProducesResponseType(typeof(IntrospectionResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
        public IActionResult Introspect(
            [FromForm][Required] string token,
            [FromForm] string? token_type_hint,
            [FromForm] string? client_id,
            [FromForm] string? client_secret)
        {
            // 此端點由 IdentityServer middleware 處理
            return Ok();
        }

        #endregion

        #region /connect/revocation

        /// <summary>
        /// Token 撤銷端點 (Revocation Endpoint)
        /// </summary>
        /// <remarks>
        /// ## 端點路徑
        /// `POST /connect/revocation`
        ///
        /// ## Content-Type
        /// `application/x-www-form-urlencoded`
        ///
        /// ## 參數
        /// | 參數 | 必填 | 說明 |
        /// |------|------|------|
        /// | token | ✓ | 要撤銷的 Token |
        /// | token_type_hint | | `access_token` 或 `refresh_token` |
        /// | client_id | ✓ | Client ID |
        /// | client_secret | | Confidential Client 需要 |
        ///
        /// ## 範例請求
        /// ```bash
        /// # 撤銷 Refresh Token
        /// curl -X POST https://identity.example.com/connect/revocation \
        ///   -H "Content-Type: application/x-www-form-urlencoded" \
        ///   -d "token=CfDJ8Nyxw..." \
        ///   -d "token_type_hint=refresh_token" \
        ///   -d "client_id=spa-client"
        ///
        /// # 撤銷 Access Token (JWT)
        /// curl -X POST https://identity.example.com/connect/revocation \
        ///   -H "Content-Type: application/x-www-form-urlencoded" \
        ///   -d "token=eyJhbGciOiJSUzI1NiIs..." \
        ///   -d "token_type_hint=access_token" \
        ///   -d "client_id=spa-client"
        /// ```
        ///
        /// ## 成功回應 (HTTP 200)
        /// 無內容，HTTP 200 表示撤銷成功
        ///
        /// ## 重要說明
        /// - **JWT Token 是無狀態的**
        /// - 撤銷後，使用本地驗證 (JWKS) 的服務**無法偵測**撤銷
        /// - 必須使用 Introspection 端點才能確認是否已撤銷
        /// - Refresh Token 撤銷後，已發出的 Access Token 仍有效直到過期
        /// </remarks>
        /// <param name="token">要撤銷的 Token</param>
        /// <param name="token_type_hint">Token 類型提示</param>
        /// <param name="client_id">Client ID</param>
        /// <param name="client_secret">Client Secret</param>
        /// <response code="200">撤銷成功</response>
        /// <response code="400">請求錯誤</response>
        [HttpPost("revocation")]
        [Consumes("application/x-www-form-urlencoded")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
        public IActionResult Revocation(
            [FromForm][Required] string token,
            [FromForm] string? token_type_hint,
            [FromForm] string? client_id,
            [FromForm] string? client_secret)
        {
            // 此端點由 IdentityServer middleware 處理
            return Ok();
        }

        #endregion

        #region /connect/endsession

        /// <summary>
        /// 登出端點 (End Session Endpoint)
        /// </summary>
        /// <remarks>
        /// ## 端點路徑
        /// `GET /connect/endsession`
        ///
        /// ## 說明
        /// 執行 OIDC 登出，清除使用者在 IdentityServer 的 Session。
        ///
        /// ## 參數
        /// | 參數 | 必填 | 說明 |
        /// |------|------|------|
        /// | id_token_hint | 建議 | ID Token，用於識別 Session |
        /// | post_logout_redirect_uri | | 登出後重導向 URI (需已註冊) |
        /// | state | | 傳遞給重導向 URI 的狀態值 |
        /// | client_id | | 如果沒有 id_token_hint，需提供此參數 |
        ///
        /// ## 範例 URL
        /// ```
        /// GET /connect/endsession
        ///   ?id_token_hint=eyJhbGciOiJSUzI1NiIs...
        ///   &amp;post_logout_redirect_uri=https://app.example.com
        ///   &amp;state=logout123
        /// ```
        ///
        /// ## JavaScript 範例
        /// ```javascript
        /// function logout(idToken) {
        ///     const params = new URLSearchParams({
        ///         id_token_hint: idToken,
        ///         post_logout_redirect_uri: window.location.origin,
        ///         state: crypto.randomUUID()
        ///     });
        ///     window.location.href =
        ///         `https://identity.example.com/connect/endsession?${params}`;
        /// }
        /// ```
        ///
        /// ## 登出流程
        /// 1. Client 將使用者重導向至此端點
        /// 2. IdentityServer 顯示登出確認頁面
        /// 3. 清除使用者 Session
        /// 4. 執行 Front-Channel / Back-Channel Logout (通知其他 Client)
        /// 5. 重導向至 post_logout_redirect_uri
        /// </remarks>
        /// <param name="id_token_hint">ID Token</param>
        /// <param name="post_logout_redirect_uri">登出後重導向 URI</param>
        /// <param name="state">狀態值</param>
        /// <param name="client_id">Client ID</param>
        /// <response code="302">重導向至登出確認或 post_logout_redirect_uri</response>
        [HttpGet("endsession")]
        [ProducesResponseType(StatusCodes.Status302Found)]
        public IActionResult EndSession(
            [FromQuery] string? id_token_hint,
            [FromQuery] string? post_logout_redirect_uri,
            [FromQuery] string? state,
            [FromQuery] string? client_id)
        {
            // 此端點由 IdentityServer middleware 處理
            return StatusCode(StatusCodes.Status302Found);
        }

        #endregion
    }

    #region Response Models

    /// <summary>
    /// Token 回應
    /// </summary>
    public class TokenResponse
    {
        /// <summary>Access Token</summary>
        /// <example>eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...</example>
        public string access_token { get; set; } = string.Empty;

        /// <summary>Token 類型</summary>
        /// <example>Bearer</example>
        public string token_type { get; set; } = "Bearer";

        /// <summary>過期時間 (秒)</summary>
        /// <example>3600</example>
        public int expires_in { get; set; }

        /// <summary>Refresh Token (需要 offline_access scope)</summary>
        /// <example>CfDJ8Nyxw...</example>
        public string? refresh_token { get; set; }

        /// <summary>ID Token (需要 openid scope)</summary>
        /// <example>eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...</example>
        public string? id_token { get; set; }

        /// <summary>實際授權的 scope</summary>
        /// <example>openid profile email</example>
        public string? scope { get; set; }
    }

    /// <summary>
    /// UserInfo 回應
    /// </summary>
    public class UserInfoResponse
    {
        /// <summary>Subject Identifier</summary>
        /// <example>user-123</example>
        public string sub { get; set; } = string.Empty;

        /// <summary>使用者名稱</summary>
        /// <example>John Doe</example>
        public string? name { get; set; }

        /// <summary>名</summary>
        /// <example>John</example>
        public string? given_name { get; set; }

        /// <summary>姓</summary>
        /// <example>Doe</example>
        public string? family_name { get; set; }

        /// <summary>Email</summary>
        /// <example>john@example.com</example>
        public string? email { get; set; }

        /// <summary>Email 是否已驗證</summary>
        /// <example>true</example>
        public bool? email_verified { get; set; }

        /// <summary>頭像 URL</summary>
        /// <example>https://example.com/avatar.jpg</example>
        public string? picture { get; set; }
    }

    /// <summary>
    /// Introspection 回應
    /// </summary>
    public class IntrospectionResponse
    {
        /// <summary>Token 是否有效</summary>
        /// <example>true</example>
        public bool active { get; set; }

        /// <summary>Subject Identifier</summary>
        /// <example>user-123</example>
        public string? sub { get; set; }

        /// <summary>Client ID</summary>
        /// <example>spa-client</example>
        public string? client_id { get; set; }

        /// <summary>權限範圍</summary>
        /// <example>openid profile</example>
        public string? scope { get; set; }

        /// <summary>Token 類型</summary>
        /// <example>access_token</example>
        public string? token_type { get; set; }

        /// <summary>過期時間 (Unix Timestamp)</summary>
        /// <example>1700000000</example>
        public long? exp { get; set; }

        /// <summary>簽發時間 (Unix Timestamp)</summary>
        /// <example>1699996400</example>
        public long? iat { get; set; }

        /// <summary>生效時間 (Unix Timestamp)</summary>
        /// <example>1699996400</example>
        public long? nbf { get; set; }

        /// <summary>發行者</summary>
        /// <example>https://identity.example.com</example>
        public string? iss { get; set; }

        /// <summary>目標受眾</summary>
        /// <example>api1</example>
        public string? aud { get; set; }
    }

    /// <summary>
    /// 錯誤回應
    /// </summary>
    public class ErrorResponse
    {
        /// <summary>錯誤代碼</summary>
        /// <example>invalid_grant</example>
        public string error { get; set; } = string.Empty;

        /// <summary>錯誤描述</summary>
        /// <example>授權碼無效或已過期</example>
        public string? error_description { get; set; }
    }

    #endregion
}
