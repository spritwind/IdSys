using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace Skoruba.Duende.IdentityServer.STS.Identity.Controllers.Api
{
    /// <summary>
    /// OAuth 2.0 / OpenID Connect 端點文件與測試
    ///
    /// <remarks>
    /// ## 概述
    ///
    /// 此 API 提供 IdentityServer 標準 OIDC 端點的文件說明與測試功能。
    /// 實際的 OIDC 端點由 Duende IdentityServer 提供，此 Controller 僅提供：
    /// 1. 端點文件說明
    /// 2. 參數驗證範例
    /// 3. 端點測試工具
    ///
    /// ## Authorization Code Flow with PKCE 完整流程
    ///
    /// ```
    /// ┌─────────────┐      1. Authorization Request       ┌─────────────────┐
    /// │   Client    │ ─────────────────────────────────▶  │  IdentityServer │
    /// │   (SPA)     │   GET /connect/authorize            │     (STS)       │
    /// │             │   ?response_type=code               │                 │
    /// │             │   &amp;client_id=xxx                     │                 │
    /// │             │   &amp;redirect_uri=xxx                  │                 │
    /// │             │   &amp;scope=openid profile             │                 │
    /// │             │   &amp;code_challenge=xxx                │                 │
    /// │             │   &amp;code_challenge_method=S256       │                 │
    /// └─────────────┘                                     └─────────────────┘
    ///       │                                                     │
    ///       │                                                     ▼
    ///       │                                           ┌─────────────────┐
    ///       │                                           │   User Login    │
    ///       │                                           │   &amp; Consent     │
    ///       │                                           └─────────────────┘
    ///       │                                                     │
    ///       │         2. Authorization Response                   │
    ///       │ ◀──────────────────────────────────────────────────┘
    ///       │         302 Redirect to redirect_uri?code=xxx
    ///       │
    ///       ▼
    /// ┌─────────────┐      3. Token Request               ┌─────────────────┐
    /// │   Client    │ ─────────────────────────────────▶  │  IdentityServer │
    /// │             │   POST /connect/token               │                 │
    /// │             │   grant_type=authorization_code     │                 │
    /// │             │   code=xxx                          │                 │
    /// │             │   redirect_uri=xxx                  │                 │
    /// │             │   code_verifier=xxx                 │                 │
    /// │             │   client_id=xxx                     │                 │
    /// └─────────────┘                                     └─────────────────┘
    ///       │                                                     │
    ///       │         4. Token Response                           │
    ///       │ ◀──────────────────────────────────────────────────┘
    ///       │         { access_token, id_token, refresh_token }
    ///       ▼
    /// ```
    ///
    /// ## PKCE (Proof Key for Code Exchange)
    ///
    /// PKCE 用於防止授權碼攔截攻擊，特別適用於無法安全儲存 Client Secret 的公開客戶端（如 SPA）。
    ///
    /// ```
    /// 1. 產生隨機 code_verifier (43-128 字元)
    /// 2. 計算 code_challenge = BASE64URL(SHA256(code_verifier))
    /// 3. 授權: 送出 code_challenge
    /// 4. 交換: 送出 code_verifier
    /// ```
    ///
    /// ## JWT Token 無狀態特性
    ///
    /// | 驗證方式 | 速度 | 可偵測撤銷 | 適用場景 |
    /// |----------|------|------------|----------|
    /// | 本地 (JWKS) | 快 | 否 | 短效 Token、效能優先 |
    /// | 遠端 (Introspection) | 慢 | 是 | 需即時檢查撤銷狀態 |
    /// </remarks>
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class OidcDocumentationController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public OidcDocumentationController(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        #region Discovery

        /// <summary>
        /// 取得 OpenID Connect Discovery Document
        /// </summary>
        /// <remarks>
        /// ## 說明
        /// Discovery Document 包含 IdentityServer 的所有端點與功能設定。
        ///
        /// ## 原生端點
        /// `GET /.well-known/openid-configuration`
        ///
        /// ## 回傳內容
        /// - `issuer`: 發行者識別
        /// - `authorization_endpoint`: 授權端點
        /// - `token_endpoint`: Token 交換端點
        /// - `userinfo_endpoint`: 使用者資訊端點
        /// - `jwks_uri`: JSON Web Key Set 端點
        /// - `scopes_supported`: 支援的 Scopes
        /// - `response_types_supported`: 支援的 Response Types
        /// - `grant_types_supported`: 支援的 Grant Types
        ///
        /// ## 使用範例
        /// ```javascript
        /// const response = await fetch('https://identity.example.com/.well-known/openid-configuration');
        /// const config = await response.json();
        /// console.log(config.authorization_endpoint);
        /// ```
        /// </remarks>
        /// <returns>OpenID Connect Discovery Document</returns>
        /// <response code="200">成功取得 Discovery Document</response>
        [HttpGet("discovery")]
        [ProducesResponseType(typeof(DiscoveryDocumentResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetDiscoveryDocument()
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var response = await client.GetAsync($"{baseUrl}/.well-known/openid-configuration");

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var document = JsonSerializer.Deserialize<JsonElement>(content);
                    return Ok(document);
                }

                return StatusCode((int)response.StatusCode, new { error = "Failed to fetch discovery document" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// 取得 JSON Web Key Set (JWKS)
        /// </summary>
        /// <remarks>
        /// ## 說明
        /// JWKS 包含用於驗證 JWT Token 簽章的公鑰。
        ///
        /// ## 原生端點
        /// `GET /.well-known/openid-configuration/jwks`
        ///
        /// ## 回傳內容
        /// - `keys`: 公鑰陣列
        ///   - `kty`: Key Type (RSA, EC)
        ///   - `use`: Key Usage (sig = 簽章)
        ///   - `kid`: Key ID
        ///   - `n`: RSA Modulus (Base64URL)
        ///   - `e`: RSA Exponent (Base64URL)
        ///
        /// ## 使用範例
        /// ```javascript
        /// // 使用 jose 函式庫驗證 JWT
        /// import * as jose from 'jose';
        ///
        /// const JWKS = jose.createRemoteJWKSet(
        ///     new URL('https://identity.example.com/.well-known/openid-configuration/jwks')
        /// );
        ///
        /// const { payload } = await jose.jwtVerify(token, JWKS, {
        ///     issuer: 'https://identity.example.com',
        ///     audience: 'your-client-id'
        /// });
        /// ```
        /// </remarks>
        /// <returns>JSON Web Key Set</returns>
        /// <response code="200">成功取得 JWKS</response>
        [HttpGet("jwks")]
        [ProducesResponseType(typeof(JwksResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetJwks()
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var response = await client.GetAsync($"{baseUrl}/.well-known/openid-configuration/jwks");

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var jwks = JsonSerializer.Deserialize<JsonElement>(content);
                    return Ok(jwks);
                }

                return StatusCode((int)response.StatusCode, new { error = "Failed to fetch JWKS" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        #endregion

        #region Authorization

        /// <summary>
        /// 產生授權 URL (Authorization Code Flow with PKCE)
        /// </summary>
        /// <remarks>
        /// ## 說明
        /// 產生用於啟動 Authorization Code Flow 的授權 URL。
        ///
        /// ## 原生端點
        /// `GET /connect/authorize`
        ///
        /// ## 必要參數
        /// | 參數 | 說明 | 範例 |
        /// |------|------|------|
        /// | client_id | 已註冊的 Client ID | `spa-client` |
        /// | redirect_uri | 授權後重導向的 URI | `https://app.example.com/callback` |
        /// | response_type | 回應類型 | `code` |
        /// | scope | 請求的權限範圍 | `openid profile email` |
        /// | code_challenge | PKCE Code Challenge | `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM` |
        /// | code_challenge_method | PKCE 方法 | `S256` |
        ///
        /// ## 選填參數
        /// | 參數 | 說明 | 範例 |
        /// |------|------|------|
        /// | state | 防止 CSRF 攻擊的隨機值 | `abc123` |
        /// | nonce | 防止重放攻擊的隨機值 | `xyz789` |
        /// | prompt | 登入提示 | `login`, `consent`, `none` |
        /// | login_hint | 預填使用者名稱 | `user@example.com` |
        /// | acr_values | 認證等級 | `mfa` |
        ///
        /// ## PKCE 產生方式
        /// ```javascript
        /// // 1. 產生 code_verifier (43-128 字元的隨機字串)
        /// function generateCodeVerifier() {
        ///     const array = new Uint8Array(32);
        ///     crypto.getRandomValues(array);
        ///     return base64UrlEncode(array);
        /// }
        ///
        /// // 2. 計算 code_challenge
        /// async function generateCodeChallenge(verifier) {
        ///     const encoder = new TextEncoder();
        ///     const data = encoder.encode(verifier);
        ///     const digest = await crypto.subtle.digest('SHA-256', data);
        ///     return base64UrlEncode(new Uint8Array(digest));
        /// }
        /// ```
        /// </remarks>
        /// <param name="request">授權請求參數</param>
        /// <returns>授權 URL</returns>
        /// <response code="200">成功產生授權 URL</response>
        /// <response code="400">參數驗證失敗</response>
        [HttpPost("authorize/generate-url")]
        [ProducesResponseType(typeof(AuthorizeUrlResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        public IActionResult GenerateAuthorizeUrl([FromBody] AuthorizeRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var queryParams = new List<string>
            {
                $"client_id={Uri.EscapeDataString(request.ClientId)}",
                $"redirect_uri={Uri.EscapeDataString(request.RedirectUri)}",
                $"response_type={Uri.EscapeDataString(request.ResponseType)}",
                $"scope={Uri.EscapeDataString(request.Scope)}",
                $"code_challenge={Uri.EscapeDataString(request.CodeChallenge)}",
                $"code_challenge_method={Uri.EscapeDataString(request.CodeChallengeMethod)}"
            };

            if (!string.IsNullOrEmpty(request.State))
                queryParams.Add($"state={Uri.EscapeDataString(request.State)}");
            if (!string.IsNullOrEmpty(request.Nonce))
                queryParams.Add($"nonce={Uri.EscapeDataString(request.Nonce)}");
            if (!string.IsNullOrEmpty(request.Prompt))
                queryParams.Add($"prompt={Uri.EscapeDataString(request.Prompt)}");
            if (!string.IsNullOrEmpty(request.LoginHint))
                queryParams.Add($"login_hint={Uri.EscapeDataString(request.LoginHint)}");
            if (!string.IsNullOrEmpty(request.AcrValues))
                queryParams.Add($"acr_values={Uri.EscapeDataString(request.AcrValues)}");

            var url = $"{baseUrl}/connect/authorize?{string.Join("&", queryParams)}";

            return Ok(new AuthorizeUrlResponse
            {
                Url = url,
                Message = "請將使用者導向此 URL 進行授權",
                Parameters = new AuthorizeUrlParameters
                {
                    ClientId = request.ClientId,
                    RedirectUri = request.RedirectUri,
                    ResponseType = request.ResponseType,
                    Scope = request.Scope,
                    CodeChallenge = request.CodeChallenge,
                    CodeChallengeMethod = request.CodeChallengeMethod,
                    State = request.State,
                    Nonce = request.Nonce
                }
            });
        }

        #endregion

        #region Token

        /// <summary>
        /// Token 交換端點說明
        /// </summary>
        /// <remarks>
        /// ## 說明
        /// 此端點說明如何使用 Token 端點交換各種 Grant Type 的 Token。
        ///
        /// ## 原生端點
        /// `POST /connect/token`
        ///
        /// ## Content-Type
        /// `application/x-www-form-urlencoded`
        ///
        /// ## Authorization Code Grant (換取 Token)
        ///
        /// ### 參數
        /// | 參數 | 必填 | 說明 |
        /// |------|------|------|
        /// | grant_type | 是 | `authorization_code` |
        /// | code | 是 | 授權碼 |
        /// | redirect_uri | 是 | 與授權請求相同的 redirect_uri |
        /// | client_id | 是 | Client ID |
        /// | code_verifier | 是 | PKCE Code Verifier |
        ///
        /// ### 範例
        /// ```bash
        /// curl -X POST https://identity.example.com/connect/token \
        ///   -H "Content-Type: application/x-www-form-urlencoded" \
        ///   -d "grant_type=authorization_code" \
        ///   -d "code=授權碼" \
        ///   -d "redirect_uri=https://app.example.com/callback" \
        ///   -d "client_id=spa-client" \
        ///   -d "code_verifier=原始的code_verifier"
        /// ```
        ///
        /// ## Client Credentials Grant (Machine-to-Machine)
        ///
        /// ### 參數
        /// | 參數 | 必填 | 說明 |
        /// |------|------|------|
        /// | grant_type | 是 | `client_credentials` |
        /// | client_id | 是 | Client ID |
        /// | client_secret | 是 | Client Secret |
        /// | scope | 否 | 請求的權限範圍 |
        ///
        /// ### 範例
        /// ```bash
        /// curl -X POST https://identity.example.com/connect/token \
        ///   -H "Content-Type: application/x-www-form-urlencoded" \
        ///   -d "grant_type=client_credentials" \
        ///   -d "client_id=service-client" \
        ///   -d "client_secret=secret" \
        ///   -d "scope=api1"
        /// ```
        ///
        /// ## Refresh Token Grant (更新 Token)
        ///
        /// ### 參數
        /// | 參數 | 必填 | 說明 |
        /// |------|------|------|
        /// | grant_type | 是 | `refresh_token` |
        /// | refresh_token | 是 | Refresh Token |
        /// | client_id | 是 | Client ID |
        /// | scope | 否 | 可選擇減少 scope |
        ///
        /// ### 範例
        /// ```bash
        /// curl -X POST https://identity.example.com/connect/token \
        ///   -H "Content-Type: application/x-www-form-urlencoded" \
        ///   -d "grant_type=refresh_token" \
        ///   -d "refresh_token=refresh_token_value" \
        ///   -d "client_id=spa-client"
        /// ```
        ///
        /// ## 回應格式
        /// ```json
        /// {
        ///   "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
        ///   "token_type": "Bearer",
        ///   "expires_in": 3600,
        ///   "refresh_token": "CfDJ8NyxwT...",
        ///   "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
        ///   "scope": "openid profile email"
        /// }
        /// ```
        /// </remarks>
        /// <returns>Token 端點使用說明</returns>
        [HttpGet("token/documentation")]
        [ProducesResponseType(typeof(TokenDocumentation), StatusCodes.Status200OK)]
        public IActionResult GetTokenDocumentation()
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            return Ok(new TokenDocumentation
            {
                Endpoint = $"{baseUrl}/connect/token",
                ContentType = "application/x-www-form-urlencoded",
                SupportedGrantTypes = new[]
                {
                    new GrantTypeInfo
                    {
                        GrantType = "authorization_code",
                        Description = "Authorization Code Flow - 用於 SPA/Mobile 應用程式",
                        RequiredParameters = new[] { "grant_type", "code", "redirect_uri", "client_id", "code_verifier" }
                    },
                    new GrantTypeInfo
                    {
                        GrantType = "client_credentials",
                        Description = "Client Credentials Flow - 用於 Machine-to-Machine 通訊",
                        RequiredParameters = new[] { "grant_type", "client_id", "client_secret" }
                    },
                    new GrantTypeInfo
                    {
                        GrantType = "refresh_token",
                        Description = "Refresh Token Flow - 用於更新 Access Token",
                        RequiredParameters = new[] { "grant_type", "refresh_token", "client_id" }
                    }
                }
            });
        }

        /// <summary>
        /// 執行 Token 交換請求
        /// </summary>
        /// <remarks>
        /// ## 說明
        /// 實際執行 Token 交換請求。此端點會轉發請求到 `/connect/token`。
        ///
        /// ## 注意事項
        /// - 此端點用於測試目的
        /// - 正式環境應直接呼叫 `/connect/token`
        /// - Client Secret 不應在前端暴露
        /// </remarks>
        /// <param name="request">Token 請求參數</param>
        /// <returns>Token 回應</returns>
        /// <response code="200">成功取得 Token</response>
        /// <response code="400">Token 請求失敗</response>
        [HttpPost("token/exchange")]
        [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(TokenErrorResponse), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ExchangeToken([FromBody] TokenRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                var baseUrl = $"{Request.Scheme}://{Request.Host}";

                var formData = new Dictionary<string, string>
                {
                    { "grant_type", request.GrantType },
                    { "client_id", request.ClientId }
                };

                if (!string.IsNullOrEmpty(request.ClientSecret))
                    formData["client_secret"] = request.ClientSecret;
                if (!string.IsNullOrEmpty(request.Code))
                    formData["code"] = request.Code;
                if (!string.IsNullOrEmpty(request.RedirectUri))
                    formData["redirect_uri"] = request.RedirectUri;
                if (!string.IsNullOrEmpty(request.CodeVerifier))
                    formData["code_verifier"] = request.CodeVerifier;
                if (!string.IsNullOrEmpty(request.RefreshToken))
                    formData["refresh_token"] = request.RefreshToken;
                if (!string.IsNullOrEmpty(request.Scope))
                    formData["scope"] = request.Scope;

                var content = new FormUrlEncodedContent(formData);
                var response = await client.PostAsync($"{baseUrl}/connect/token", content);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var tokenResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    return Ok(tokenResponse);
                }
                else
                {
                    var errorResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    return BadRequest(errorResponse);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        #endregion

        #region UserInfo

        /// <summary>
        /// 取得使用者資訊
        /// </summary>
        /// <remarks>
        /// ## 說明
        /// 使用 Access Token 取得使用者資訊。
        ///
        /// ## 原生端點
        /// `GET /connect/userinfo`
        ///
        /// ## 請求標頭
        /// ```
        /// Authorization: Bearer {access_token}
        /// ```
        ///
        /// ## 回傳內容 (依據請求的 scope)
        /// - `sub`: Subject Identifier (使用者唯一識別)
        /// - `name`: 使用者名稱 (需要 profile scope)
        /// - `email`: Email (需要 email scope)
        /// - `email_verified`: Email 是否已驗證
        /// - 其他 Claims...
        ///
        /// ## 使用範例
        /// ```javascript
        /// const response = await fetch('https://identity.example.com/connect/userinfo', {
        ///     headers: {
        ///         'Authorization': `Bearer ${accessToken}`
        ///     }
        /// });
        /// const userInfo = await response.json();
        /// ```
        /// </remarks>
        /// <param name="accessToken">Access Token (Bearer token in Authorization header)</param>
        /// <returns>使用者資訊</returns>
        /// <response code="200">成功取得使用者資訊</response>
        /// <response code="401">未授權 - Token 無效或已過期</response>
        [HttpGet("userinfo")]
        [ProducesResponseType(typeof(UserInfoResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetUserInfo([FromHeader(Name = "Authorization")] string? accessToken)
        {
            if (string.IsNullOrEmpty(accessToken))
            {
                return Unauthorized(new { error = "missing_token", error_description = "請在 Authorization header 提供 Bearer token" });
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                var baseUrl = $"{Request.Scheme}://{Request.Host}";

                var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/connect/userinfo");
                request.Headers.Add("Authorization", accessToken);

                var response = await client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var userInfo = JsonSerializer.Deserialize<JsonElement>(content);
                    return Ok(userInfo);
                }
                else
                {
                    return StatusCode((int)response.StatusCode, new { error = "userinfo_failed", content });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        #endregion

        #region Token Introspection

        /// <summary>
        /// Token 檢驗 (Introspection)
        /// </summary>
        /// <remarks>
        /// ## 說明
        /// 驗證 Token 是否有效並取得 Token 相關資訊。
        ///
        /// ## 原生端點
        /// `POST /connect/introspect`
        ///
        /// ## Content-Type
        /// `application/x-www-form-urlencoded`
        ///
        /// ## 認證方式
        /// 使用 API Resource 的 Credentials (Basic Auth 或 Post Body)
        ///
        /// ## 參數
        /// | 參數 | 必填 | 說明 |
        /// |------|------|------|
        /// | token | 是 | 要檢驗的 Token |
        /// | token_type_hint | 否 | Token 類型提示 (`access_token`, `refresh_token`) |
        /// | client_id | 是 | API Resource 的 Client ID |
        /// | client_secret | 是 | API Resource 的 Secret |
        ///
        /// ## 回應格式
        /// ```json
        /// {
        ///   "active": true,
        ///   "sub": "user-id",
        ///   "client_id": "client-id",
        ///   "scope": "openid profile",
        ///   "exp": 1700000000,
        ///   "iat": 1699996400,
        ///   "iss": "https://identity.example.com"
        /// }
        /// ```
        ///
        /// ## 使用場景
        /// - 驗證 JWT Token 是否已被撤銷
        /// - 取得 Token 的詳細資訊
        /// - 後端服務驗證 Token 有效性
        /// </remarks>
        /// <param name="request">Introspection 請求</param>
        /// <returns>Token 檢驗結果</returns>
        /// <response code="200">檢驗完成</response>
        /// <response code="400">請求格式錯誤</response>
        [HttpPost("introspect")]
        [ProducesResponseType(typeof(IntrospectionResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> IntrospectToken([FromBody] IntrospectionRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                var baseUrl = $"{Request.Scheme}://{Request.Host}";

                var formData = new Dictionary<string, string>
                {
                    { "token", request.Token },
                    { "client_id", request.ClientId },
                    { "client_secret", request.ClientSecret }
                };

                if (!string.IsNullOrEmpty(request.TokenTypeHint))
                    formData["token_type_hint"] = request.TokenTypeHint;

                var content = new FormUrlEncodedContent(formData);
                var response = await client.PostAsync($"{baseUrl}/connect/introspect", content);
                var responseContent = await response.Content.ReadAsStringAsync();

                var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        #endregion

        #region Token Revocation

        /// <summary>
        /// Token 撤銷
        /// </summary>
        /// <remarks>
        /// ## 說明
        /// 撤銷 Access Token 或 Refresh Token，使其立即失效。
        ///
        /// ## 原生端點
        /// `POST /connect/revocation`
        ///
        /// ## Content-Type
        /// `application/x-www-form-urlencoded`
        ///
        /// ## 參數
        /// | 參數 | 必填 | 說明 |
        /// |------|------|------|
        /// | token | 是 | 要撤銷的 Token |
        /// | token_type_hint | 否 | Token 類型提示 (`access_token`, `refresh_token`) |
        /// | client_id | 是 | Client ID |
        /// | client_secret | 條件 | Confidential Client 需要 |
        ///
        /// ## 注意事項
        /// - JWT Access Token 本身是無狀態的，撤銷後需透過 Introspection 才能檢測
        /// - Reference Token 撤銷後立即失效
        /// - Refresh Token 撤銷後，關聯的 Access Token 仍有效直到過期
        ///
        /// ## 使用範例
        /// ```bash
        /// curl -X POST https://identity.example.com/connect/revocation \
        ///   -H "Content-Type: application/x-www-form-urlencoded" \
        ///   -d "token=refresh_token_value" \
        ///   -d "token_type_hint=refresh_token" \
        ///   -d "client_id=spa-client"
        /// ```
        /// </remarks>
        /// <param name="request">撤銷請求</param>
        /// <returns>撤銷結果</returns>
        /// <response code="200">撤銷成功</response>
        /// <response code="400">請求格式錯誤</response>
        [HttpPost("revoke")]
        [ProducesResponseType(typeof(RevocationResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> RevokeToken([FromBody] RevocationRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                var baseUrl = $"{Request.Scheme}://{Request.Host}";

                var formData = new Dictionary<string, string>
                {
                    { "token", request.Token },
                    { "client_id", request.ClientId }
                };

                if (!string.IsNullOrEmpty(request.TokenTypeHint))
                    formData["token_type_hint"] = request.TokenTypeHint;
                if (!string.IsNullOrEmpty(request.ClientSecret))
                    formData["client_secret"] = request.ClientSecret;

                var content = new FormUrlEncodedContent(formData);
                var response = await client.PostAsync($"{baseUrl}/connect/revocation", content);

                if (response.IsSuccessStatusCode)
                {
                    return Ok(new RevocationResponse
                    {
                        Success = true,
                        Message = "Token 已成功撤銷"
                    });
                }
                else
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    return BadRequest(new { error = "revocation_failed", details = responseContent });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        #endregion

        #region End Session

        /// <summary>
        /// 產生登出 URL
        /// </summary>
        /// <remarks>
        /// ## 說明
        /// 產生用於執行 OIDC 登出的 URL。
        ///
        /// ## 原生端點
        /// `GET /connect/endsession`
        ///
        /// ## 參數
        /// | 參數 | 必填 | 說明 |
        /// |------|------|------|
        /// | id_token_hint | 建議 | 使用者的 ID Token，用於識別要登出的 Session |
        /// | post_logout_redirect_uri | 否 | 登出後重導向的 URI (需已註冊) |
        /// | state | 否 | 傳遞給重導向 URI 的狀態值 |
        ///
        /// ## 登出流程
        /// 1. Client 將使用者導向 End Session URL
        /// 2. IdentityServer 清除使用者 Session
        /// 3. 通知其他已登入的 Client (Front-Channel/Back-Channel Logout)
        /// 4. 重導向到 post_logout_redirect_uri
        ///
        /// ## 使用範例
        /// ```javascript
        /// function logout(idToken) {
        ///     const endSessionUrl = new URL('https://identity.example.com/connect/endsession');
        ///     endSessionUrl.searchParams.set('id_token_hint', idToken);
        ///     endSessionUrl.searchParams.set('post_logout_redirect_uri', 'https://app.example.com');
        ///     window.location.href = endSessionUrl.toString();
        /// }
        /// ```
        /// </remarks>
        /// <param name="request">登出請求參數</param>
        /// <returns>登出 URL</returns>
        /// <response code="200">成功產生登出 URL</response>
        [HttpPost("endsession/generate-url")]
        [ProducesResponseType(typeof(EndSessionUrlResponse), StatusCodes.Status200OK)]
        public IActionResult GenerateEndSessionUrl([FromBody] EndSessionRequest request)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var queryParams = new List<string>();

            if (!string.IsNullOrEmpty(request.IdTokenHint))
                queryParams.Add($"id_token_hint={Uri.EscapeDataString(request.IdTokenHint)}");
            if (!string.IsNullOrEmpty(request.PostLogoutRedirectUri))
                queryParams.Add($"post_logout_redirect_uri={Uri.EscapeDataString(request.PostLogoutRedirectUri)}");
            if (!string.IsNullOrEmpty(request.State))
                queryParams.Add($"state={Uri.EscapeDataString(request.State)}");

            var url = $"{baseUrl}/connect/endsession";
            if (queryParams.Count > 0)
                url += "?" + string.Join("&", queryParams);

            return Ok(new EndSessionUrlResponse
            {
                Url = url,
                Message = "將使用者導向此 URL 進行登出"
            });
        }

        #endregion
    }

    #region Request/Response Models

    /// <summary>
    /// Discovery Document 回應
    /// </summary>
    public class DiscoveryDocumentResponse
    {
        /// <summary>發行者識別</summary>
        /// <example>https://identity.example.com</example>
        public string Issuer { get; set; } = string.Empty;

        /// <summary>授權端點</summary>
        /// <example>https://identity.example.com/connect/authorize</example>
        public string AuthorizationEndpoint { get; set; } = string.Empty;

        /// <summary>Token 端點</summary>
        /// <example>https://identity.example.com/connect/token</example>
        public string TokenEndpoint { get; set; } = string.Empty;

        /// <summary>UserInfo 端點</summary>
        /// <example>https://identity.example.com/connect/userinfo</example>
        public string UserinfoEndpoint { get; set; } = string.Empty;

        /// <summary>JWKS 端點</summary>
        /// <example>https://identity.example.com/.well-known/openid-configuration/jwks</example>
        public string JwksUri { get; set; } = string.Empty;
    }

    /// <summary>
    /// JWKS 回應
    /// </summary>
    public class JwksResponse
    {
        /// <summary>公鑰陣列</summary>
        public JsonWebKey[] Keys { get; set; } = Array.Empty<JsonWebKey>();
    }

    /// <summary>
    /// JSON Web Key
    /// </summary>
    public class JsonWebKey
    {
        /// <summary>Key Type</summary>
        /// <example>RSA</example>
        public string Kty { get; set; } = string.Empty;

        /// <summary>Key Use</summary>
        /// <example>sig</example>
        public string Use { get; set; } = string.Empty;

        /// <summary>Key ID</summary>
        /// <example>ABC123</example>
        public string Kid { get; set; } = string.Empty;

        /// <summary>RSA Modulus (Base64URL)</summary>
        public string N { get; set; } = string.Empty;

        /// <summary>RSA Exponent (Base64URL)</summary>
        /// <example>AQAB</example>
        public string E { get; set; } = string.Empty;
    }

    /// <summary>
    /// 授權請求
    /// </summary>
    public class AuthorizeRequest
    {
        /// <summary>Client ID</summary>
        /// <example>spa-client</example>
        [Required(ErrorMessage = "client_id 為必填")]
        public string ClientId { get; set; } = string.Empty;

        /// <summary>重導向 URI</summary>
        /// <example>https://app.example.com/callback</example>
        [Required(ErrorMessage = "redirect_uri 為必填")]
        [Url(ErrorMessage = "redirect_uri 必須是有效的 URL")]
        public string RedirectUri { get; set; } = string.Empty;

        /// <summary>回應類型</summary>
        /// <example>code</example>
        [Required(ErrorMessage = "response_type 為必填")]
        public string ResponseType { get; set; } = "code";

        /// <summary>權限範圍</summary>
        /// <example>openid profile email</example>
        [Required(ErrorMessage = "scope 為必填")]
        public string Scope { get; set; } = "openid profile";

        /// <summary>PKCE Code Challenge</summary>
        /// <example>E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM</example>
        [Required(ErrorMessage = "code_challenge 為必填 (PKCE)")]
        [MinLength(43, ErrorMessage = "code_challenge 長度必須至少 43 字元")]
        public string CodeChallenge { get; set; } = string.Empty;

        /// <summary>PKCE 方法</summary>
        /// <example>S256</example>
        [Required(ErrorMessage = "code_challenge_method 為必填")]
        [RegularExpression("^(S256|plain)$", ErrorMessage = "code_challenge_method 必須是 S256 或 plain")]
        public string CodeChallengeMethod { get; set; } = "S256";

        /// <summary>防 CSRF 狀態值 (建議填寫)</summary>
        /// <example>abc123xyz</example>
        public string? State { get; set; }

        /// <summary>防重放攻擊的隨機值 (建議填寫)</summary>
        /// <example>n-0S6_WzA2Mj</example>
        public string? Nonce { get; set; }

        /// <summary>登入提示</summary>
        /// <example>login</example>
        public string? Prompt { get; set; }

        /// <summary>預填使用者名稱</summary>
        /// <example>user@example.com</example>
        public string? LoginHint { get; set; }

        /// <summary>認證等級要求</summary>
        /// <example>mfa</example>
        public string? AcrValues { get; set; }
    }

    /// <summary>
    /// 授權 URL 回應
    /// </summary>
    public class AuthorizeUrlResponse
    {
        /// <summary>授權 URL</summary>
        public string Url { get; set; } = string.Empty;

        /// <summary>說明訊息</summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>請求參數</summary>
        public AuthorizeUrlParameters? Parameters { get; set; }
    }

    /// <summary>
    /// 授權 URL 參數
    /// </summary>
    public class AuthorizeUrlParameters
    {
        public string ClientId { get; set; } = string.Empty;
        public string RedirectUri { get; set; } = string.Empty;
        public string ResponseType { get; set; } = string.Empty;
        public string Scope { get; set; } = string.Empty;
        public string CodeChallenge { get; set; } = string.Empty;
        public string CodeChallengeMethod { get; set; } = string.Empty;
        public string? State { get; set; }
        public string? Nonce { get; set; }
    }

    /// <summary>
    /// Token 端點文件
    /// </summary>
    public class TokenDocumentation
    {
        /// <summary>Token 端點 URL</summary>
        public string Endpoint { get; set; } = string.Empty;

        /// <summary>Content-Type</summary>
        public string ContentType { get; set; } = string.Empty;

        /// <summary>支援的 Grant Types</summary>
        public GrantTypeInfo[] SupportedGrantTypes { get; set; } = Array.Empty<GrantTypeInfo>();
    }

    /// <summary>
    /// Grant Type 資訊
    /// </summary>
    public class GrantTypeInfo
    {
        /// <summary>Grant Type</summary>
        public string GrantType { get; set; } = string.Empty;

        /// <summary>說明</summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>必要參數</summary>
        public string[] RequiredParameters { get; set; } = Array.Empty<string>();
    }

    /// <summary>
    /// Token 請求
    /// </summary>
    public class TokenRequest
    {
        /// <summary>Grant Type</summary>
        /// <example>authorization_code</example>
        [Required(ErrorMessage = "grant_type 為必填")]
        public string GrantType { get; set; } = string.Empty;

        /// <summary>Client ID</summary>
        /// <example>spa-client</example>
        [Required(ErrorMessage = "client_id 為必填")]
        public string ClientId { get; set; } = string.Empty;

        /// <summary>Client Secret (Confidential Client)</summary>
        public string? ClientSecret { get; set; }

        /// <summary>授權碼 (authorization_code grant)</summary>
        public string? Code { get; set; }

        /// <summary>重導向 URI (authorization_code grant)</summary>
        public string? RedirectUri { get; set; }

        /// <summary>PKCE Code Verifier (authorization_code grant)</summary>
        public string? CodeVerifier { get; set; }

        /// <summary>Refresh Token (refresh_token grant)</summary>
        public string? RefreshToken { get; set; }

        /// <summary>權限範圍</summary>
        public string? Scope { get; set; }
    }

    /// <summary>
    /// Token 回應
    /// </summary>
    public class TokenResponse
    {
        /// <summary>Access Token</summary>
        public string AccessToken { get; set; } = string.Empty;

        /// <summary>Token 類型</summary>
        /// <example>Bearer</example>
        public string TokenType { get; set; } = "Bearer";

        /// <summary>過期秒數</summary>
        /// <example>3600</example>
        public int ExpiresIn { get; set; }

        /// <summary>Refresh Token</summary>
        public string? RefreshToken { get; set; }

        /// <summary>ID Token</summary>
        public string? IdToken { get; set; }

        /// <summary>權限範圍</summary>
        public string? Scope { get; set; }
    }

    /// <summary>
    /// Token 錯誤回應
    /// </summary>
    public class TokenErrorResponse
    {
        /// <summary>錯誤代碼</summary>
        /// <example>invalid_grant</example>
        public string Error { get; set; } = string.Empty;

        /// <summary>錯誤描述</summary>
        public string? ErrorDescription { get; set; }
    }

    /// <summary>
    /// UserInfo 回應
    /// </summary>
    public class UserInfoResponse
    {
        /// <summary>Subject Identifier</summary>
        /// <example>user-123</example>
        public string Sub { get; set; } = string.Empty;

        /// <summary>使用者名稱</summary>
        /// <example>John Doe</example>
        public string? Name { get; set; }

        /// <summary>Email</summary>
        /// <example>john@example.com</example>
        public string? Email { get; set; }

        /// <summary>Email 是否已驗證</summary>
        public bool? EmailVerified { get; set; }
    }

    /// <summary>
    /// Introspection 請求
    /// </summary>
    public class IntrospectionRequest
    {
        /// <summary>要檢驗的 Token</summary>
        [Required(ErrorMessage = "token 為必填")]
        public string Token { get; set; } = string.Empty;

        /// <summary>Token 類型提示</summary>
        /// <example>access_token</example>
        public string? TokenTypeHint { get; set; }

        /// <summary>API Resource Client ID</summary>
        [Required(ErrorMessage = "client_id 為必填")]
        public string ClientId { get; set; } = string.Empty;

        /// <summary>API Resource Secret</summary>
        [Required(ErrorMessage = "client_secret 為必填")]
        public string ClientSecret { get; set; } = string.Empty;
    }

    /// <summary>
    /// Introspection 回應
    /// </summary>
    public class IntrospectionResponse
    {
        /// <summary>Token 是否有效</summary>
        public bool Active { get; set; }

        /// <summary>Subject Identifier</summary>
        public string? Sub { get; set; }

        /// <summary>Client ID</summary>
        public string? ClientId { get; set; }

        /// <summary>權限範圍</summary>
        public string? Scope { get; set; }

        /// <summary>過期時間 (Unix Timestamp)</summary>
        public long? Exp { get; set; }

        /// <summary>簽發時間 (Unix Timestamp)</summary>
        public long? Iat { get; set; }

        /// <summary>發行者</summary>
        public string? Iss { get; set; }
    }

    /// <summary>
    /// 撤銷請求
    /// </summary>
    public class RevocationRequest
    {
        /// <summary>要撤銷的 Token</summary>
        [Required(ErrorMessage = "token 為必填")]
        public string Token { get; set; } = string.Empty;

        /// <summary>Token 類型提示</summary>
        /// <example>refresh_token</example>
        public string? TokenTypeHint { get; set; }

        /// <summary>Client ID</summary>
        [Required(ErrorMessage = "client_id 為必填")]
        public string ClientId { get; set; } = string.Empty;

        /// <summary>Client Secret (Confidential Client)</summary>
        public string? ClientSecret { get; set; }
    }

    /// <summary>
    /// 撤銷回應
    /// </summary>
    public class RevocationResponse
    {
        /// <summary>是否成功</summary>
        public bool Success { get; set; }

        /// <summary>訊息</summary>
        public string Message { get; set; } = string.Empty;
    }

    /// <summary>
    /// 登出請求
    /// </summary>
    public class EndSessionRequest
    {
        /// <summary>ID Token (用於識別 Session)</summary>
        public string? IdTokenHint { get; set; }

        /// <summary>登出後重導向 URI</summary>
        /// <example>https://app.example.com</example>
        public string? PostLogoutRedirectUri { get; set; }

        /// <summary>狀態值</summary>
        public string? State { get; set; }
    }

    /// <summary>
    /// 登出 URL 回應
    /// </summary>
    public class EndSessionUrlResponse
    {
        /// <summary>登出 URL</summary>
        public string Url { get; set; } = string.Empty;

        /// <summary>說明訊息</summary>
        public string Message { get; set; } = string.Empty;
    }

    #endregion
}
