// UC Capital - Token Management DTOs
// Token 管理資料傳輸物件

using System;
using System.Collections.Generic;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.TokenManagement
{
    /// <summary>
    /// 撤銷 Token DTO
    /// </summary>
    public class RevokedTokenDto
    {
        /// <summary>
        /// 主鍵
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// JWT Token ID (jti claim)
        /// </summary>
        public string Jti { get; set; } = string.Empty;

        /// <summary>
        /// Token 主體 (sub claim)
        /// </summary>
        public string? SubjectId { get; set; }

        /// <summary>
        /// 使用者名稱（顯示用）
        /// </summary>
        public string? UserName { get; set; }

        /// <summary>
        /// 客戶端 ID
        /// </summary>
        public string ClientId { get; set; } = string.Empty;

        /// <summary>
        /// 客戶端名稱（顯示用）
        /// </summary>
        public string? ClientName { get; set; }

        /// <summary>
        /// Token 類型
        /// </summary>
        public string TokenType { get; set; } = "access_token";

        /// <summary>
        /// Token 原始過期時間 (UTC)
        /// </summary>
        public DateTime? ExpirationTime { get; set; }

        /// <summary>
        /// 撤銷時間 (UTC)
        /// </summary>
        public DateTime RevokedAt { get; set; }

        /// <summary>
        /// 撤銷原因
        /// </summary>
        public string? Reason { get; set; }

        /// <summary>
        /// 撤銷者
        /// </summary>
        public string? RevokedBy { get; set; }
    }

    /// <summary>
    /// 活躍 Token DTO（從 PersistedGrants 取得）
    /// </summary>
    public class ActiveTokenDto
    {
        /// <summary>
        /// Grant Key
        /// </summary>
        public string Key { get; set; } = string.Empty;

        /// <summary>
        /// Token 類型
        /// </summary>
        public string Type { get; set; } = string.Empty;

        /// <summary>
        /// 使用者 ID
        /// </summary>
        public string? SubjectId { get; set; }

        /// <summary>
        /// 使用者名稱
        /// </summary>
        public string? UserName { get; set; }

        /// <summary>
        /// Session ID
        /// </summary>
        public string? SessionId { get; set; }

        /// <summary>
        /// 客戶端 ID
        /// </summary>
        public string ClientId { get; set; } = string.Empty;

        /// <summary>
        /// 客戶端名稱
        /// </summary>
        public string? ClientName { get; set; }

        /// <summary>
        /// 建立時間
        /// </summary>
        public DateTime CreationTime { get; set; }

        /// <summary>
        /// 過期時間
        /// </summary>
        public DateTime? Expiration { get; set; }

        /// <summary>
        /// 剩餘時間（秒）
        /// </summary>
        public int? RemainingSeconds { get; set; }

        /// <summary>
        /// 剩餘時間（格式化）
        /// </summary>
        public string? RemainingTimeFormatted { get; set; }

        /// <summary>
        /// 是否已過期
        /// </summary>
        public bool IsExpired { get; set; }

        /// <summary>
        /// 是否已撤銷
        /// </summary>
        public bool IsRevoked { get; set; }

        /// <summary>
        /// 撤銷時間
        /// </summary>
        public DateTime? RevokedAt { get; set; }

        /// <summary>
        /// 授權範圍
        /// </summary>
        public string? Scopes { get; set; }

        /// <summary>
        /// 身分提供者
        /// </summary>
        public string? IdentityProvider { get; set; }
    }

    /// <summary>
    /// 撤銷 Token 請求
    /// </summary>
    public class RevokeTokenRequest
    {
        /// <summary>
        /// JWT Token ID (jti claim)
        /// </summary>
        public string Jti { get; set; } = string.Empty;

        /// <summary>
        /// Token 主體
        /// </summary>
        public string? SubjectId { get; set; }

        /// <summary>
        /// 客戶端 ID
        /// </summary>
        public string ClientId { get; set; } = string.Empty;

        /// <summary>
        /// Token 類型
        /// </summary>
        public string TokenType { get; set; } = "access_token";

        /// <summary>
        /// 過期時間
        /// </summary>
        public DateTime? ExpirationTime { get; set; }

        /// <summary>
        /// 撤銷原因
        /// </summary>
        public string? Reason { get; set; }
    }

    /// <summary>
    /// Token 清單響應
    /// </summary>
    /// <typeparam name="T">Token DTO 類型</typeparam>
    public class TokenListResponse<T>
    {
        /// <summary>
        /// Token 清單
        /// </summary>
        public IEnumerable<T> Items { get; set; } = new List<T>();

        /// <summary>
        /// 總筆數
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// 目前頁碼
        /// </summary>
        public int Page { get; set; }

        /// <summary>
        /// 每頁筆數
        /// </summary>
        public int PageSize { get; set; }

        /// <summary>
        /// 總頁數
        /// </summary>
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    }

    /// <summary>
    /// Token 統計資訊
    /// </summary>
    public class TokenStatistics
    {
        /// <summary>
        /// 活躍 Token 數量
        /// </summary>
        public int ActiveTokens { get; set; }

        /// <summary>
        /// 已撤銷 Token 數量
        /// </summary>
        public int RevokedTokens { get; set; }

        /// <summary>
        /// 即將過期的 Token 數量（24 小時內）
        /// </summary>
        public int ExpiringSoon { get; set; }

        /// <summary>
        /// 過期的 Token 數量
        /// </summary>
        public int ExpiredTokens { get; set; }

        /// <summary>
        /// 活躍使用者數
        /// </summary>
        public int ActiveUsers { get; set; }

        /// <summary>
        /// 活躍客戶端數
        /// </summary>
        public int ActiveClients { get; set; }
    }
}
