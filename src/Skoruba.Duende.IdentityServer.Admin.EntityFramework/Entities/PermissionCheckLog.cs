// UC Capital - Permission Check Log Entity
// 權限檢查記錄實體

using System;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities
{
    /// <summary>
    /// 權限檢查記錄實體
    /// 記錄每次權限驗證的結果
    /// </summary>
    public class PermissionCheckLog
    {
        /// <summary>
        /// 記錄 ID
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// 檢查時間
        /// </summary>
        public DateTime CheckedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// 客戶端 ID
        /// </summary>
        public string ClientId { get; set; } = string.Empty;

        /// <summary>
        /// 使用者 Subject ID
        /// </summary>
        public string? SubjectId { get; set; }

        /// <summary>
        /// 使用者名稱
        /// </summary>
        public string? UserName { get; set; }

        /// <summary>
        /// 檢查的資源代碼
        /// </summary>
        public string Resource { get; set; } = string.Empty;

        /// <summary>
        /// 請求的權限範圍
        /// </summary>
        public string RequestedScopes { get; set; } = string.Empty;

        /// <summary>
        /// 使用者實際擁有的權限範圍
        /// </summary>
        public string? GrantedScopes { get; set; }

        /// <summary>
        /// 是否允許存取
        /// </summary>
        public bool Allowed { get; set; }

        /// <summary>
        /// 是否成功 (驗證是否完成，不論結果)
        /// </summary>
        public bool IsSuccess { get; set; }

        /// <summary>
        /// 錯誤代碼 (如果有)
        /// </summary>
        public string? ErrorCode { get; set; }

        /// <summary>
        /// 錯誤描述 (如果有)
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// 來源 IP 位址
        /// </summary>
        public string? IpAddress { get; set; }

        /// <summary>
        /// User Agent
        /// </summary>
        public string? UserAgent { get; set; }

        /// <summary>
        /// 處理時間 (毫秒)
        /// </summary>
        public int? ProcessingTimeMs { get; set; }
    }
}
