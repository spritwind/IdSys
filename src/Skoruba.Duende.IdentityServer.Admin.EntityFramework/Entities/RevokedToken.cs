using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

/// <summary>
/// 撤銷的 Token 實體
/// 用於追蹤被撤銷的 JWT Access Token (透過 JTI 識別)
/// </summary>
[Table("RevokedTokens")]
public class RevokedToken
{
    /// <summary>
    /// 主鍵
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// JWT Token ID (jti claim)
    /// 用於唯一識別被撤銷的 Token
    /// </summary>
    [Required]
    [StringLength(200)]
    public string Jti { get; set; } = string.Empty;

    /// <summary>
    /// Token 主體 (sub claim)
    /// 使用者的唯一識別碼
    /// </summary>
    [StringLength(200)]
    public string? SubjectId { get; set; }

    /// <summary>
    /// 客戶端 ID
    /// 發行此 Token 的客戶端應用程式
    /// </summary>
    [Required]
    [StringLength(200)]
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// Token 類型
    /// access_token, refresh_token, id_token
    /// </summary>
    [Required]
    [StringLength(50)]
    public string TokenType { get; set; } = "access_token";

    /// <summary>
    /// Token 原始過期時間 (UTC)
    /// 用於清理過期的撤銷記錄
    /// </summary>
    public DateTime? ExpirationTime { get; set; }

    /// <summary>
    /// 撤銷時間 (UTC)
    /// </summary>
    [Required]
    public DateTime RevokedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 撤銷原因
    /// </summary>
    [StringLength(500)]
    public string? Reason { get; set; }

    /// <summary>
    /// 撤銷者 (可能是使用者本人或管理員)
    /// </summary>
    [StringLength(200)]
    public string? RevokedBy { get; set; }

    /// <summary>
    /// 建立索引用的 Hash 值 (由 Jti 產生)
    /// </summary>
    [StringLength(64)]
    public string? JtiHash { get; set; }
}
