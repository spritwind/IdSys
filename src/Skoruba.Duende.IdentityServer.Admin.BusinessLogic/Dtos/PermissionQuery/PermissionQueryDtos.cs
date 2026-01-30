// UC Capital - Permission Query DTOs
// 權限查詢資料傳輸物件

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.PermissionQuery
{
    /// <summary>
    /// 權限查詢請求
    /// </summary>
    public class PermissionQueryRequest
    {
        /// <summary>
        /// 客戶端 ID
        /// </summary>
        [JsonPropertyName("clientId")]
        public string ClientId { get; set; } = string.Empty;

        /// <summary>
        /// 客戶端密鑰
        /// </summary>
        [JsonPropertyName("clientSecret")]
        public string ClientSecret { get; set; } = string.Empty;

        /// <summary>
        /// ID Token (JWT)
        /// </summary>
        [JsonPropertyName("idToken")]
        public string IdToken { get; set; } = string.Empty;

        /// <summary>
        /// Access Token (JWT)
        /// </summary>
        [JsonPropertyName("accessToken")]
        public string AccessToken { get; set; } = string.Empty;

        /// <summary>
        /// 系統 ID (可選，用於篩選特定系統的權限)
        /// </summary>
        [JsonPropertyName("systemId")]
        public string? SystemId { get; set; }
    }

    /// <summary>
    /// 權限查詢回應
    /// </summary>
    public class PermissionQueryResponse
    {
        /// <summary>
        /// 使用者 ID (OAuth sub claim)
        /// </summary>
        [JsonPropertyName("userId")]
        public string? UserId { get; set; }

        /// <summary>
        /// 使用者中文姓名
        /// </summary>
        [JsonPropertyName("userName")]
        public string? UserName { get; set; }

        /// <summary>
        /// 使用者英文姓名
        /// </summary>
        [JsonPropertyName("userEnglishName")]
        public string? UserEnglishName { get; set; }

        /// <summary>
        /// 權限清單 (依系統分組)
        /// </summary>
        [JsonPropertyName("permissions")]
        public List<SystemPermissionDto> Permissions { get; set; } = new();
    }

    /// <summary>
    /// 系統權限 DTO
    /// </summary>
    public class SystemPermissionDto
    {
        /// <summary>
        /// 系統 ID
        /// </summary>
        [JsonPropertyName("systemId")]
        public string? SystemId { get; set; }

        /// <summary>
        /// 系統名稱
        /// </summary>
        [JsonPropertyName("systemName")]
        public string? SystemName { get; set; }

        /// <summary>
        /// 資源權限清單
        /// </summary>
        [JsonPropertyName("resources")]
        public List<ResourcePermissionDto> Resources { get; set; } = new();
    }

    /// <summary>
    /// 資源權限 DTO
    /// </summary>
    public class ResourcePermissionDto
    {
        /// <summary>
        /// 資源 ID
        /// </summary>
        [JsonPropertyName("resourceId")]
        public int ResourceId { get; set; }

        /// <summary>
        /// 資源代碼
        /// </summary>
        [JsonPropertyName("resourceCode")]
        public string ResourceCode { get; set; } = string.Empty;

        /// <summary>
        /// 權限範圍清單
        /// </summary>
        [JsonPropertyName("scopes")]
        public List<ScopeDto> Scopes { get; set; } = new();
    }

    /// <summary>
    /// 權限範圍 DTO
    /// </summary>
    public class ScopeDto
    {
        /// <summary>
        /// 權限代碼
        /// </summary>
        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        /// <summary>
        /// 權限名稱
        /// </summary>
        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }

    /// <summary>
    /// 權限查詢錯誤回應
    /// </summary>
    public class PermissionQueryErrorResponse
    {
        /// <summary>
        /// 錯誤代碼
        /// </summary>
        [JsonPropertyName("error")]
        public string Error { get; set; } = string.Empty;

        /// <summary>
        /// 錯誤描述
        /// </summary>
        [JsonPropertyName("errorDescription")]
        public string? ErrorDescription { get; set; }
    }

    #region Permission Check DTOs

    /// <summary>
    /// 權限檢查請求
    /// </summary>
    public class PermissionCheckRequest
    {
        /// <summary>
        /// 客戶端 ID
        /// </summary>
        [JsonPropertyName("clientId")]
        public string ClientId { get; set; } = string.Empty;

        /// <summary>
        /// 客戶端密鑰
        /// </summary>
        [JsonPropertyName("clientSecret")]
        public string ClientSecret { get; set; } = string.Empty;

        /// <summary>
        /// ID Token (JWT)
        /// </summary>
        [JsonPropertyName("idToken")]
        public string IdToken { get; set; } = string.Empty;

        /// <summary>
        /// Access Token (JWT)
        /// </summary>
        [JsonPropertyName("accessToken")]
        public string AccessToken { get; set; } = string.Empty;

        /// <summary>
        /// 資源代碼 (模組名稱，如: module_login)
        /// </summary>
        [JsonPropertyName("resource")]
        public string Resource { get; set; } = string.Empty;

        /// <summary>
        /// 權限範圍 (動作，如: @r@e, @r@c@u@d)
        /// 若為 null 或空白，則檢查所有標準權限 (@r@c@u@d@e)
        /// </summary>
        [JsonPropertyName("scopes")]
        public string? Scopes { get; set; }
    }

    /// <summary>
    /// 單一權限範圍檢查結果 (用於 API 回應)
    /// 成功時只回傳 allowed，錯誤時回傳 error 資訊
    /// </summary>
    public class ScopeCheckResultDto
    {
        /// <summary>
        /// 是否有權限
        /// </summary>
        [JsonPropertyName("allowed")]
        public bool Allowed { get; set; }

        /// <summary>
        /// 錯誤代碼 (僅錯誤時回傳)
        /// </summary>
        [JsonPropertyName("error")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Error { get; set; }

        /// <summary>
        /// 錯誤描述 (僅錯誤時回傳)
        /// </summary>
        [JsonPropertyName("errorDescription")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ErrorDescription { get; set; }

        /// <summary>
        /// 建立成功結果
        /// </summary>
        public static ScopeCheckResultDto Success(bool allowed) => new()
        {
            Allowed = allowed
        };

        /// <summary>
        /// 建立錯誤結果
        /// </summary>
        public static ScopeCheckResultDto Failure(string error, string errorDescription) => new()
        {
            Allowed = false,
            Error = error,
            ErrorDescription = errorDescription
        };
    }

    /// <summary>
    /// 權限檢查結果 (Service 層使用)
    /// </summary>
    public class PermissionCheckResult
    {
        /// <summary>
        /// 是否成功 (無驗證錯誤)
        /// </summary>
        public bool IsSuccess { get; set; }

        /// <summary>
        /// 使用者 ID
        /// </summary>
        public string? UserId { get; set; }

        /// <summary>
        /// 使用者名稱
        /// </summary>
        public string? UserName { get; set; }

        /// <summary>
        /// 各權限範圍的檢查結果 (key: @r, @c, @u, @d, @e)
        /// </summary>
        public Dictionary<string, bool> ScopeResults { get; set; } = new();

        /// <summary>
        /// 錯誤代碼 (若驗證失敗)
        /// </summary>
        public string? ErrorCode { get; set; }

        /// <summary>
        /// 錯誤描述 (若驗證失敗)
        /// </summary>
        public string? ErrorDescription { get; set; }

        /// <summary>
        /// 所有標準權限範圍
        /// </summary>
        public static readonly string[] AllStandardScopes = new[] { "@r", "@c", "@u", "@d", "@e" };

        /// <summary>
        /// 建立成功結果
        /// </summary>
        public static PermissionCheckResult Success(string? userId, string? userName, Dictionary<string, bool> scopeResults) => new()
        {
            IsSuccess = true,
            UserId = userId,
            UserName = userName,
            ScopeResults = scopeResults
        };

        /// <summary>
        /// 建立錯誤結果
        /// </summary>
        public static PermissionCheckResult Failure(string errorCode, string errorDescription) => new()
        {
            IsSuccess = false,
            ErrorCode = errorCode,
            ErrorDescription = errorDescription
        };
    }

    #endregion
}
