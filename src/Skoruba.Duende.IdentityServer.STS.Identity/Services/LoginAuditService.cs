// Copyright (c) Jan Skoruba. All Rights Reserved.
// Licensed under the Apache License, Version 2.0.

using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Skoruba.AuditLogging.EntityFramework.DbContexts;
using Skoruba.AuditLogging.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.STS.Identity.Services
{
    /// <summary>
    /// 登入審計服務實現
    /// 將登入事件寫入 AuditLog 表
    /// </summary>
    public class LoginAuditService : ILoginAuditService
    {
        private readonly IAuditLoggingDbContext<AuditLog> _auditDbContext;
        private readonly ILogger<LoginAuditService> _logger;

        public LoginAuditService(
            IAuditLoggingDbContext<AuditLog> auditDbContext,
            ILogger<LoginAuditService> logger)
        {
            _auditDbContext = auditDbContext;
            _logger = logger;
        }

        public async Task LogExternalLoginSuccessAsync(
            string userId,
            string displayName,
            string email,
            string provider,
            string clientId,
            string redirectUri,
            string ipAddress,
            string userAgent)
        {
            try
            {
                var additionalData = JsonSerializer.Serialize(new
                {
                    IpAddress = ipAddress,
                    UserAgent = userAgent
                });

                var loginDetails = JsonSerializer.Serialize(new
                {
                    ClientId = clientId,
                    RedirectUri = redirectUri,
                    Email = email,
                    Provider = provider,
                    LoginTime = DateTime.Now
                });

                var auditLog = new AuditLog
                {
                    Event = "ExternalLoginSuccess",
                    Source = provider,
                    Category = "Authentication",
                    SubjectIdentifier = userId,
                    SubjectName = displayName ?? email,
                    SubjectType = "User",
                    SubjectAdditionalData = additionalData,
                    Action = "Login",
                    Data = loginDetails,
                    Created = DateTime.Now
                };

                _auditDbContext.AuditLog.Add(auditLog);
                await _auditDbContext.SaveChangesAsync();

                _logger.LogInformation(
                    "External login success logged: User={UserId}, Provider={Provider}, ClientId={ClientId}",
                    userId, provider, clientId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to log external login success for user {UserId}", userId);
            }
        }

        public async Task LogExternalLoginFailureAsync(
            string email,
            string provider,
            string reason,
            string ipAddress,
            string userAgent)
        {
            try
            {
                var additionalData = JsonSerializer.Serialize(new
                {
                    IpAddress = ipAddress,
                    UserAgent = userAgent
                });

                var failureDetails = JsonSerializer.Serialize(new
                {
                    Email = email,
                    Provider = provider,
                    Reason = reason,
                    AttemptTime = DateTime.Now
                });

                var auditLog = new AuditLog
                {
                    Event = "ExternalLoginFailure",
                    Source = provider,
                    Category = "Authentication",
                    SubjectIdentifier = email,
                    SubjectName = email,
                    SubjectType = "User",
                    SubjectAdditionalData = additionalData,
                    Action = "LoginFailed",
                    Data = failureDetails,
                    Created = DateTime.Now
                };

                _auditDbContext.AuditLog.Add(auditLog);
                await _auditDbContext.SaveChangesAsync();

                _logger.LogWarning(
                    "External login failure logged: Email={Email}, Provider={Provider}, Reason={Reason}",
                    email, provider, reason);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to log external login failure for email {Email}", email);
            }
        }
    }
}
