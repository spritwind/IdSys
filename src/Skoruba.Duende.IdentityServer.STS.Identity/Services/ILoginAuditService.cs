// Copyright (c) Jan Skoruba. All Rights Reserved.
// Licensed under the Apache License, Version 2.0.

using System.Threading.Tasks;

namespace Skoruba.Duende.IdentityServer.STS.Identity.Services
{
    /// <summary>
    /// 登入審計服務接口
    /// 用於記錄外部登入事件到 AuditLog 表
    /// </summary>
    public interface ILoginAuditService
    {
        /// <summary>
        /// 記錄外部登入成功事件
        /// </summary>
        /// <param name="userId">用戶 ID</param>
        /// <param name="displayName">顯示名稱</param>
        /// <param name="email">Email</param>
        /// <param name="provider">外部提供者名稱 (如 Google)</param>
        /// <param name="clientId">客戶端 ID</param>
        /// <param name="redirectUri">重定向 URI</param>
        /// <param name="ipAddress">IP 地址</param>
        /// <param name="userAgent">User Agent</param>
        Task LogExternalLoginSuccessAsync(
            string userId,
            string displayName,
            string email,
            string provider,
            string clientId,
            string redirectUri,
            string ipAddress,
            string userAgent);

        /// <summary>
        /// 記錄外部登入失敗事件
        /// </summary>
        /// <param name="email">嘗試登入的 Email</param>
        /// <param name="provider">外部提供者名稱</param>
        /// <param name="reason">失敗原因</param>
        /// <param name="ipAddress">IP 地址</param>
        /// <param name="userAgent">User Agent</param>
        Task LogExternalLoginFailureAsync(
            string email,
            string provider,
            string reason,
            string ipAddress,
            string userAgent);
    }
}
