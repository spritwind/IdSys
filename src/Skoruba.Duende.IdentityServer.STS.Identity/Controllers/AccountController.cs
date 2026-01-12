// Copyright (c) Duende Software. All rights reserved.
// See LICENSE in the project root for license information.

// Original file: https://github.com/DuendeSoftware/IdentityServer.Quickstart.UI
// Modified by Jan Škoruba

using System;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Duende.IdentityServer;
using Duende.IdentityServer.Events;
using Duende.IdentityServer.Extensions;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Services;
using Duende.IdentityServer.Stores;
using IdentityModel;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Skoruba.Duende.IdentityServer.Shared.Configuration.Configuration.Identity;
using Skoruba.Duende.IdentityServer.STS.Identity.Configuration;
using Skoruba.Duende.IdentityServer.STS.Identity.Helpers;
using Skoruba.Duende.IdentityServer.STS.Identity.Helpers.Localization;
using Skoruba.Duende.IdentityServer.STS.Identity.Services;
using Skoruba.Duende.IdentityServer.STS.Identity.ViewModels.Account;

namespace Skoruba.Duende.IdentityServer.STS.Identity.Controllers
{
    [SecurityHeaders]
    [Authorize]
    public class AccountController<TUser, TKey> : Controller
        where TUser : IdentityUser<TKey>, new()
        where TKey : IEquatable<TKey>
    {
        private readonly UserResolver<TUser> _userResolver;
        private readonly UserManager<TUser> _userManager;
        private readonly ApplicationSignInManager<TUser> _signInManager;
        private readonly IIdentityServerInteractionService _interaction;
        private readonly IClientStore _clientStore;
        private readonly IAuthenticationSchemeProvider _schemeProvider;
        private readonly IEventService _events;
        private readonly IEmailSender _emailSender;
        private readonly IGenericControllerLocalizer<AccountController<TUser, TKey>> _localizer;
        private readonly LoginConfiguration _loginConfiguration;
        private readonly RegisterConfiguration _registerConfiguration;
        private readonly IdentityOptions _identityOptions;
        private readonly ILogger<AccountController<TUser, TKey>> _logger;
        private readonly IIdentityProviderStore _identityProviderStore;
        private readonly ILoginAuditService _loginAuditService;

        public AccountController(
            UserResolver<TUser> userResolver,
            UserManager<TUser> userManager,
            ApplicationSignInManager<TUser> signInManager,
            IIdentityServerInteractionService interaction,
            IClientStore clientStore,
            IAuthenticationSchemeProvider schemeProvider,
            IEventService events,
            IEmailSender emailSender,
            IGenericControllerLocalizer<AccountController<TUser, TKey>> localizer,
            LoginConfiguration loginConfiguration,
            RegisterConfiguration registerConfiguration,
            IdentityOptions identityOptions,
            ILogger<AccountController<TUser, TKey>> logger,
            IIdentityProviderStore identityProviderStore,
            ILoginAuditService loginAuditService = null)
        {
            _userResolver = userResolver;
            _userManager = userManager;
            _signInManager = signInManager;
            _interaction = interaction;
            _clientStore = clientStore;
            _schemeProvider = schemeProvider;
            _events = events;
            _emailSender = emailSender;
            _localizer = localizer;
            _loginConfiguration = loginConfiguration;
            _registerConfiguration = registerConfiguration;
            _identityOptions = identityOptions;
            _logger = logger;
            _identityProviderStore = identityProviderStore;
            _loginAuditService = loginAuditService;
        }

        /// <summary>
        /// Entry point into the login workflow
        /// 優化：自動導向 Google OAuth 以減少跳轉次數
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> Login(string returnUrl)
        {
            // build a model so we know what to show on the login page
            var vm = await BuildLoginViewModelAsync(returnUrl);

            // 檢查是否應該自動導向 Google OAuth
            var context = await _interaction.GetAuthorizationContextAsync(returnUrl);

            // 檢查 acr_values 是否指定 Google IdP
            var requestedIdp = context?.AcrValues?.FirstOrDefault(x => x.StartsWith("idp:"))?.Substring(4);
            var shouldAutoRedirectToGoogle = requestedIdp?.Equals("Google", StringComparison.OrdinalIgnoreCase) == true;

            // 如果明確指定 Google IdP，直接導向
            if (shouldAutoRedirectToGoogle)
            {
                var googleProvider = vm.ExternalProviders.FirstOrDefault(x =>
                    x.AuthenticationScheme.Equals("Google", StringComparison.OrdinalIgnoreCase));
                if (googleProvider != null)
                {
                    return ExternalLogin(googleProvider.AuthenticationScheme, returnUrl);
                }
            }

            // 如果禁用本地登入且只有一個外部提供者（通常是 Google），自動導向
            if (vm.EnableLocalLogin == false && vm.ExternalProviders.Count() == 1)
            {
                // only one option for logging in
                return ExternalLogin(vm.ExternalProviders.First().AuthenticationScheme, returnUrl);
            }

            // 新增：如果只有 Google 一個外部 IdP 且沒有本地登入，自動導向
            // 這樣可以跳過顯示登入頁面
            var googleOnlyProvider = vm.ExternalProviders.FirstOrDefault(x =>
                x.AuthenticationScheme.Equals("Google", StringComparison.OrdinalIgnoreCase));
            if (googleOnlyProvider != null && vm.ExternalProviders.Count() == 1)
            {
                // 只有 Google 一個外部提供者，直接導向
                return ExternalLogin(googleOnlyProvider.AuthenticationScheme, returnUrl);
            }

            return View(vm);
        }

        /// <summary>
        /// Handle postback from username/password login
        /// </summary>
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginInputModel model, string button)
        {
            // check if we are in the context of an authorization request
            var context = await _interaction.GetAuthorizationContextAsync(model.ReturnUrl);

            // the user clicked the "cancel" button
            if (button != "login")
            {
                if (context != null)
                {
                    // if the user cancels, send a result back into IdentityServer as if they 
                    // denied the consent (even if this client does not require consent).
                    // this will send back an access denied OIDC error response to the client.
                    await _interaction.DenyAuthorizationAsync(context, AuthorizationError.AccessDenied);

                    // we can trust model.ReturnUrl since GetAuthorizationContextAsync returned non-null
                    if (context.IsNativeClient())
                    {
                        // The client is native, so this change in how to
                        // return the response is for better UX for the end user.
                        return this.LoadingPage("Redirect", model.ReturnUrl);
                    }

                    return Redirect(model.ReturnUrl);
                }

                // since we don't have a valid context, then we just go back to the home page
                return Redirect("~/");
            }

            if (ModelState.IsValid)
            {
                var user = await _userResolver.GetUserAsync(model.Username);
                if (user != default(TUser))
                {
                    var result = await _signInManager.PasswordSignInAsync(user.UserName, model.Password, model.RememberLogin, lockoutOnFailure: true);
                    if (result.Succeeded)
                    {
                        await _events.RaiseAsync(new UserLoginSuccessEvent(user.UserName, user.Id.ToString(), user.UserName));

                        if (context != null)
                        {
                            if (context.IsNativeClient())
                            {
                                // The client is native, so this change in how to
                                // return the response is for better UX for the end user.
                                return this.LoadingPage("Redirect", model.ReturnUrl);
                            }

                            // we can trust model.ReturnUrl since GetAuthorizationContextAsync returned non-null
                            return Redirect(model.ReturnUrl);
                        }

                        // request for a local page
                        if (Url.IsLocalUrl(model.ReturnUrl))
                        {
                            return Redirect(model.ReturnUrl);
                        }

                        if (string.IsNullOrEmpty(model.ReturnUrl))
                        {
                            return Redirect("~/");
                        }

                        // user might have clicked on a malicious link - should be logged
                        throw new Exception("invalid return URL");
                    }

                    if (result.RequiresTwoFactor)
                    {
                        return RedirectToAction(nameof(LoginWith2fa), new { model.ReturnUrl, RememberMe = model.RememberLogin });
                    }

                    if (result.IsLockedOut)
                    {
                        return View("Lockout");
                    }
                }
                await _events.RaiseAsync(new UserLoginFailureEvent(model.Username, "invalid credentials", clientId: context?.Client.ClientId));
                ModelState.AddModelError(string.Empty, AccountOptions.InvalidCredentialsErrorMessage);
            }

            // something went wrong, show form with error
            var vm = await BuildLoginViewModelAsync(model);
            return View(vm);
        }


        /// <summary>
        /// Show logout page
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> Logout(string logoutId)
        {
            // build a model so the logout page knows what to display
            var vm = await BuildLogoutViewModelAsync(logoutId);

            if (vm.ShowLogoutPrompt == false)
            {
                // if the request for logout was properly authenticated from IdentityServer, then
                // we don't need to show the prompt and can just log the user out directly.
                return await Logout(vm);
            }

            return View(vm);
        }

        /// <summary>
        /// Handle logout page postback
        /// </summary>
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout(LogoutInputModel model)
        {
            // build a model so the logged out page knows what to display
            var vm = await BuildLoggedOutViewModelAsync(model.LogoutId);

            if (User?.Identity.IsAuthenticated == true)
            {
                // delete local authentication cookie
                await _signInManager.SignOutAsync();

                // raise the logout event
                await _events.RaiseAsync(new UserLogoutSuccessEvent(User.GetSubjectId(), User.GetDisplayName()));
            }

            // check if we need to trigger sign-out at an upstream identity provider
            if (vm.TriggerExternalSignout)
            {
                // build a return URL so the upstream provider will redirect back
                // to us after the user has logged out. this allows us to then
                // complete our single sign-out processing.
                string url = Url.Action("Logout", new { logoutId = vm.LogoutId });

                // this triggers a redirect to the external provider for sign-out
                return SignOut(new AuthenticationProperties { RedirectUri = url }, vm.ExternalAuthenticationScheme);
            }

            return View("LoggedOut", vm);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmEmail(string userId, string code)
        {
            if (userId == null || code == null)
            {
                return View("Error");
            }
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return View("Error");
            }

            code = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(code));

            var result = await _userManager.ConfirmEmailAsync(user, code);
            return View(result.Succeeded ? "ConfirmEmail" : "Error");
        }

        [HttpGet]
        [AllowAnonymous]
        public IActionResult ForgotPassword()
        {
            return View(new ForgotPasswordViewModel());
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordViewModel model)
        {
            if (ModelState.IsValid)
            {
                TUser user = null;
                switch (model.Policy)
                {
                    case LoginResolutionPolicy.Email:
                        try
                        {
                            user = await _userManager.FindByEmailAsync(model.Email);
                        }
                        catch (Exception ex)
                        {
                            // in case of multiple users with the same email this method would throw and reveal that the email is registered
                            _logger.LogError("Error retrieving user by email ({0}) for forgot password functionality: {1}", model.Email, ex.Message);
                            user = null;
                        }
                        break;
                    case LoginResolutionPolicy.Username:
                        try
                        {
                            user = await _userManager.FindByNameAsync(model.Username);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError("Error retrieving user by userName ({0}) for forgot password functionality: {1}", model.Username, ex.Message);
                            user = null;
                        }
                        break;
                }

                if (user == null || !await _userManager.IsEmailConfirmedAsync(user))
                {
                    // Don't reveal that the user does not exist
                    return View("ForgotPasswordConfirmation");
                }

                var code = await _userManager.GeneratePasswordResetTokenAsync(user);
                code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));
                var callbackUrl = Url.Action("ResetPassword", "Account", new { userId = user.Id, code }, HttpContext.Request.Scheme);

                await _emailSender.SendEmailAsync(user.Email, _localizer["ResetPasswordTitle"], _localizer["ResetPasswordBody", HtmlEncoder.Default.Encode(callbackUrl)]);

                return View("ForgotPasswordConfirmation");
            }

            return View(model);
        }

        [HttpGet]
        [AllowAnonymous]
        public IActionResult ResetPassword(string code = null)
        {
            return code == null ? View("Error") : View();
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResetPassword(ResetPasswordViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                // Don't reveal that the user does not exist
                return RedirectToAction(nameof(ResetPasswordConfirmation), "Account");
            }

            var code = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(model.Code));
            var result = await _userManager.ResetPasswordAsync(user, code, model.Password);

            if (result.Succeeded)
            {
                return RedirectToAction(nameof(ResetPasswordConfirmation), "Account");
            }

            AddErrors(result);

            return View();
        }

        [HttpGet]
        [AllowAnonymous]
        public IActionResult ResetPasswordConfirmation()
        {
            return View();
        }

        [HttpGet]
        [AllowAnonymous]
        public IActionResult ForgotPasswordConfirmation()
        {
            return View();
        }

        /// <summary>
        /// 處理外部登入回調
        /// 優化：直接跳回客戶端，不顯示確認頁面，並記錄審計日誌
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> ExternalLoginCallback(string returnUrl = null, string remoteError = null)
        {
            // 取得客戶端資訊用於審計日誌
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
            var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
            var context = await _interaction.GetAuthorizationContextAsync(returnUrl);
            var clientId = context?.Client?.ClientId ?? "Unknown";
            var redirectUri = context?.RedirectUri ?? returnUrl;

            if (remoteError != null)
            {
                _logger.LogWarning("External login error: {Error}", remoteError);

                // 記錄登入失敗
                if (_loginAuditService != null)
                {
                    await _loginAuditService.LogExternalLoginFailureAsync(
                        "Unknown",
                        "External",
                        $"Remote error: {remoteError}",
                        ipAddress,
                        userAgent);
                }

                ModelState.AddModelError(string.Empty, _localizer["ErrorExternalProvider", remoteError]);
                return View(nameof(Login));
            }

            var info = await _signInManager.GetExternalLoginInfoAsync();
            if (info == null)
            {
                _logger.LogWarning("External login info is null");
                return RedirectToAction(nameof(Login));
            }

            var email = info.Principal.FindFirstValue(ClaimTypes.Email);
            var displayName = info.Principal.Identity?.Name ?? email;

            // 使用 isPersistent: true 來延長 SSO Session
            var result = await _signInManager.ExternalLoginSignInAsync(
                info.LoginProvider,
                info.ProviderKey,
                isPersistent: true,  // 延長 Session 有效期
                bypassTwoFactor: true);

            if (result.Succeeded)
            {
                // 取得用戶資訊用於審計日誌
                var existingUser = await _userManager.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
                var userId = existingUser?.Id?.ToString() ?? "Unknown";

                _logger.LogInformation(
                    "External login success: User={UserId}, Provider={Provider}",
                    userId, info.LoginProvider);

                // 記錄登入成功到 AuditLog
                if (_loginAuditService != null && existingUser != null)
                {
                    await _loginAuditService.LogExternalLoginSuccessAsync(
                        userId,
                        displayName,
                        email,
                        info.LoginProvider,
                        clientId,
                        redirectUri,
                        ipAddress,
                        userAgent);
                }

                // 觸發登入成功事件
                await _events.RaiseAsync(new UserLoginSuccessEvent(
                    existingUser?.UserName,
                    userId,
                    displayName,
                    clientId: clientId));

                // 直接跳回客戶端
                return RedirectToLocal(returnUrl);
            }

            if (result.RequiresTwoFactor)
            {
                return RedirectToAction(nameof(LoginWith2fa), new { ReturnUrl = returnUrl });
            }

            if (result.IsLockedOut)
            {
                // 記錄帳號被鎖定
                if (_loginAuditService != null)
                {
                    await _loginAuditService.LogExternalLoginFailureAsync(
                        email,
                        info.LoginProvider,
                        "Account locked out",
                        ipAddress,
                        userAgent);
                }
                return View("Lockout");
            }

            // 用戶不存在，檢查是否允許自動建立帳號
            var userName = info.Principal.Identity?.Name ?? email?.Split('@')[0];
            var firstName = info.Principal.FindFirstValue(ClaimTypes.GivenName) ?? "";
            var lastName = info.Principal.FindFirstValue(ClaimTypes.Surname) ?? "";

            // 檢查 Client 是否允許自動註冊外部登入用戶
            // 可以在 Client 的 Properties 中設定 "AutoRegisterExternalUsers" = "true"
            var autoRegisterEnabled = await IsAutoRegisterEnabledForClientAsync(context);

            if (!autoRegisterEnabled)
            {
                // Client 不允許自動註冊，顯示手動確認頁面
                _logger.LogInformation(
                    "Auto registration disabled for client {ClientId}, showing confirmation page",
                    clientId);

                if (_loginAuditService != null)
                {
                    await _loginAuditService.LogExternalLoginFailureAsync(
                        email,
                        info.LoginProvider,
                        "Auto registration disabled for this client",
                        ipAddress,
                        userAgent);
                }

                ViewData["ReturnUrl"] = returnUrl;
                ViewData["LoginProvider"] = info.LoginProvider;
                return View("ExternalLoginConfirmation", new ExternalLoginConfirmationViewModel { Email = email, UserName = userName });
            }

            // 🆕 檢查 Email 網域限制（只允許 @uccapital.com.tw）
            var allowedDomain = "@uccapital.com.tw";
            if (!string.IsNullOrEmpty(email) && !email.EndsWith(allowedDomain, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning(
                    "External login rejected: Email domain not allowed. Email={Email}, Provider={Provider}",
                    email, info.LoginProvider);

                if (_loginAuditService != null)
                {
                    await _loginAuditService.LogExternalLoginFailureAsync(
                        email,
                        info.LoginProvider,
                        $"Email domain not allowed. Only {allowedDomain} is permitted.",
                        ipAddress,
                        userAgent);
                }

                ModelState.AddModelError(string.Empty, $"只允許 {allowedDomain} 網域的 Email 註冊。");
                ViewData["ReturnUrl"] = returnUrl;
                ViewData["LoginProvider"] = info.LoginProvider;
                return View("ExternalLoginConfirmation", new ExternalLoginConfirmationViewModel { Email = email, UserName = userName });
            }

            // 🆕 檢查是否已有相同 Email 的用戶（自動關聯）
            var existingUserByEmail = await _userManager.FindByEmailAsync(email);
            if (existingUserByEmail != null)
            {
                // 自動將外部登入關聯到現有用戶
                var addLoginResult = await _userManager.AddLoginAsync(existingUserByEmail, info);
                if (addLoginResult.Succeeded)
                {
                    await _signInManager.SignInAsync(existingUserByEmail, isPersistent: true);

                    _logger.LogInformation(
                        "External login linked to existing user: User={UserId}, Email={Email}, Provider={Provider}",
                        existingUserByEmail.Id, email, info.LoginProvider);

                    if (_loginAuditService != null)
                    {
                        await _loginAuditService.LogExternalLoginSuccessAsync(
                            existingUserByEmail.Id.ToString(),
                            displayName,
                            email,
                            info.LoginProvider,
                            clientId,
                            redirectUri,
                            ipAddress,
                            userAgent);
                    }

                    await _events.RaiseAsync(new UserLoginSuccessEvent(
                        existingUserByEmail.UserName,
                        existingUserByEmail.Id.ToString(),
                        displayName,
                        clientId: clientId));

                    return RedirectToLocal(returnUrl);
                }

                // 關聯失敗（可能已經存在）
                _logger.LogWarning(
                    "Failed to link external login to existing user: {Errors}",
                    string.Join(", ", addLoginResult.Errors.Select(e => e.Description)));
            }

            // 🆕 自動建立帳號（包含完整欄位）
            var user = new TUser
            {
                UserName = email, // 使用 Email 作為 UserName
                Email = email,
                EmailConfirmed = true // 外部登入的 Email 已驗證
            };

            // 🆕 設定 UserIdentity 自訂欄位（透過反射，因為 TUser 是泛型）
            SetUserIdentityProperties(user, firstName, lastName, displayName);

            var createResult = await _userManager.CreateAsync(user);
            if (createResult.Succeeded)
            {
                createResult = await _userManager.AddLoginAsync(user, info);
                if (createResult.Succeeded)
                {
                    // 使用 isPersistent: true 延長 Session
                    await _signInManager.SignInAsync(user, isPersistent: true);

                    _logger.LogInformation(
                        "New user created via external login: User={UserId}, Email={Email}, Provider={Provider}",
                        user.Id, email, info.LoginProvider);

                    // 記錄新用戶登入成功
                    if (_loginAuditService != null)
                    {
                        await _loginAuditService.LogExternalLoginSuccessAsync(
                            user.Id.ToString(),
                            displayName,
                            email,
                            info.LoginProvider,
                            clientId,
                            redirectUri,
                            ipAddress,
                            userAgent);
                    }

                    // 觸發登入成功事件
                    await _events.RaiseAsync(new UserLoginSuccessEvent(
                        user.UserName,
                        user.Id.ToString(),
                        displayName,
                        clientId: clientId));

                    // 儲存註冊成功訊息到 TempData
                    TempData["RegistrationSuccess"] = true;
                    TempData["RegistrationUserName"] = userName;
                    TempData["RegistrationEmail"] = email;
                    TempData["RegistrationProvider"] = info.LoginProvider;

                    // 直接跳轉避免 PAR 過期
                    return RedirectToLocal(returnUrl);
                }
            }

            // 記錄註冊失敗
            if (_loginAuditService != null)
            {
                var errorMessage = string.Join(", ", createResult.Errors.Select(e => e.Description));
                await _loginAuditService.LogExternalLoginFailureAsync(
                    email,
                    info.LoginProvider,
                    $"Auto registration failed: {errorMessage}",
                    ipAddress,
                    userAgent);
            }

            // 如果自動註冊失敗，回到手動確認頁面
            foreach (var error in createResult.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }
            ViewData["ReturnUrl"] = returnUrl;
            ViewData["LoginProvider"] = info.LoginProvider;
            return View("ExternalLoginConfirmation", new ExternalLoginConfirmationViewModel { Email = email, UserName = userName });
        }

        /// <summary>
        /// 設定 UserIdentity 自訂欄位
        /// 使用反射設定，以相容泛型 TUser
        /// </summary>
        private void SetUserIdentityProperties(TUser user, string firstName, string lastName, string displayName)
        {
            var userType = user.GetType();

            // 預設值
            var defaultTenantId = new Guid("72B3A6BF-EC79-4451-B223-003FA2A95340");
            var defaultOrganizationId = new Guid("1A8416C3-558A-48CC-AEB3-D10FD4F10843"); // 未分類

            // FirstName
            var firstNameProp = userType.GetProperty("FirstName");
            firstNameProp?.SetValue(user, firstName);

            // LastName
            var lastNameProp = userType.GetProperty("LastName");
            lastNameProp?.SetValue(user, lastName);

            // DisplayName (中文：姓+名，英文：名+姓)
            var displayNameProp = userType.GetProperty("DisplayName");
            var calculatedDisplayName = !string.IsNullOrEmpty(displayName)
                ? displayName
                : $"{lastName}{firstName}".Trim();
            if (string.IsNullOrEmpty(calculatedDisplayName))
            {
                calculatedDisplayName = user.Email?.Split('@')[0] ?? "User";
            }
            displayNameProp?.SetValue(user, calculatedDisplayName);

            // TenantId
            var tenantIdProp = userType.GetProperty("TenantId");
            tenantIdProp?.SetValue(user, defaultTenantId);

            // PrimaryOrganizationId
            var orgIdProp = userType.GetProperty("PrimaryOrganizationId");
            orgIdProp?.SetValue(user, defaultOrganizationId);

            // IsActive
            var isActiveProp = userType.GetProperty("IsActive");
            isActiveProp?.SetValue(user, true);

            // CreatedAt
            var createdAtProp = userType.GetProperty("CreatedAt");
            createdAtProp?.SetValue(user, DateTime.Now);
        }

        /// <summary>
        /// 檢查 Client 是否允許自動註冊外部登入用戶
        /// Client 可以在 Properties 中設定 "AutoRegisterExternalUsers" = "true" 來啟用
        /// 預設為 true（為了向後兼容）
        /// </summary>
        private async Task<bool> IsAutoRegisterEnabledForClientAsync(AuthorizationRequest context)
        {
            if (context?.Client?.ClientId == null)
            {
                // 沒有 Client 資訊，預設允許自動註冊
                return true;
            }

            var client = await _clientStore.FindEnabledClientByIdAsync(context.Client.ClientId);
            if (client?.Properties == null || !client.Properties.Any())
            {
                // 沒有設定 Properties，預設允許自動註冊
                return true;
            }

            // 檢查 AutoRegisterExternalUsers 屬性
            // 如果明確設定為 "false"，則不允許自動註冊
            if (client.Properties.TryGetValue("AutoRegisterExternalUsers", out var value))
            {
                return !string.Equals(value, "false", StringComparison.OrdinalIgnoreCase);
            }

            // 預設允許自動註冊
            return true;
        }

        [HttpPost]
        [HttpGet]
        [AllowAnonymous]
        public IActionResult ExternalLogin(string provider, string returnUrl = null)
        {
            // Request a redirect to the external login provider.
            var redirectUrl = Url.Action("ExternalLoginCallback", "Account", new { ReturnUrl = returnUrl });
            var properties = _signInManager.ConfigureExternalAuthenticationProperties(provider, redirectUrl);

            return Challenge(properties, provider);
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ExternalLoginConfirmation(ExternalLoginConfirmationViewModel model, string returnUrl = null)
        {
            returnUrl = returnUrl ?? Url.Content("~/");

            // Get the information about the user from the external login provider
            var info = await _signInManager.GetExternalLoginInfoAsync();
            if (info == null)
            {
                return View("ExternalLoginFailure");
            }

            if (ModelState.IsValid)
            {
                var user = new TUser
                {
                    UserName = model.UserName,
                    Email = model.Email
                };

                var result = await _userManager.CreateAsync(user);
                if (result.Succeeded)
                {
                    result = await _userManager.AddLoginAsync(user, info);
                    if (result.Succeeded)
                    {
                        await _signInManager.SignInAsync(user, isPersistent: false);

                        return RedirectToLocal(returnUrl);
                    }
                }

                AddErrors(result);
            }

            ViewData["LoginProvider"] = info.LoginProvider;
            ViewData["ReturnUrl"] = returnUrl;

            return View(model);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> LoginWithRecoveryCode(string returnUrl = null)
        {
            // Ensure the user has gone through the username & password screen first
            var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
            if (user == null)
            {
                throw new InvalidOperationException(_localizer["Unable2FA"]);
            }

            var model = new LoginWithRecoveryCodeViewModel()
            {
                ReturnUrl = returnUrl
            };

            return View(model);
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> LoginWithRecoveryCode(LoginWithRecoveryCodeViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
            if (user == null)
            {
                throw new InvalidOperationException(_localizer["Unable2FA"]);
            }

            var recoveryCode = model.RecoveryCode.Replace(" ", string.Empty);

            var result = await _signInManager.TwoFactorRecoveryCodeSignInAsync(recoveryCode);

            if (result.Succeeded)
            {
                await _events.RaiseAsync(new UserLoginSuccessEvent(user.UserName, user.Id.ToString(), user.UserName));
                return LocalRedirect(string.IsNullOrEmpty(model.ReturnUrl) ? "~/" : model.ReturnUrl);
            }

            if (result.IsLockedOut)
            {
                return View("Lockout");
            }

            ModelState.AddModelError(string.Empty, _localizer["InvalidRecoveryCode"]);

            return View(model);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> LoginWith2fa(bool rememberMe, string returnUrl = null)
        {
            // Ensure the user has gone through the username & password screen first
            var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();

            if (user == null)
            {
                throw new InvalidOperationException(_localizer["Unable2FA"]);
            }

            var model = new LoginWith2faViewModel()
            {
                ReturnUrl = returnUrl,
                RememberMe = rememberMe
            };

            return View(model);
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> LoginWith2fa(LoginWith2faViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
            if (user == null)
            {
                throw new InvalidOperationException(_localizer["Unable2FA"]);
            }

            var authenticatorCode = model.TwoFactorCode.Replace(" ", string.Empty).Replace("-", string.Empty);

            var result = await _signInManager.TwoFactorAuthenticatorSignInAsync(authenticatorCode, model.RememberMe, model.RememberMachine);

            if (result.Succeeded)
            {
                await _events.RaiseAsync(new UserLoginSuccessEvent(user.UserName, user.Id.ToString(), user.UserName));
                return LocalRedirect(string.IsNullOrEmpty(model.ReturnUrl) ? "~/" : model.ReturnUrl);
            }

            if (result.IsLockedOut)
            {
                return View("Lockout");
            }

            ModelState.AddModelError(string.Empty, _localizer["InvalidAuthenticatorCode"]);

            return View(model);
        }

        [HttpGet]
        [AllowAnonymous]
        public IActionResult Register(string returnUrl = null)
        {
            if (!_registerConfiguration.Enabled) return View("RegisterFailure");

            ViewData["ReturnUrl"] = returnUrl;

            return _loginConfiguration.ResolutionPolicy switch
            {
                LoginResolutionPolicy.Username => View(),
                LoginResolutionPolicy.Email => View("RegisterWithoutUsername"),
                _ => View("RegisterFailure")
            };
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Register(RegisterViewModel model, string returnUrl = null, bool IsCalledFromRegisterWithoutUsername = false)
        {
            if (!_registerConfiguration.Enabled) return View("RegisterFailure");

            returnUrl ??= Url.Content("~/");

            ViewData["ReturnUrl"] = returnUrl;

            if (!ModelState.IsValid) return View(model);

            var user = new TUser
            {
                UserName = model.UserName,
                Email = model.Email
            };

            var result = await _userManager.CreateAsync(user, model.Password);
            if (result.Succeeded)
            {
                var code = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));
                var callbackUrl = Url.Action("ConfirmEmail", "Account", new { userId = user.Id, code }, HttpContext.Request.Scheme);

                await _emailSender.SendEmailAsync(model.Email, _localizer["ConfirmEmailTitle"], _localizer["ConfirmEmailBody", HtmlEncoder.Default.Encode(callbackUrl)]);

                if (_identityOptions.SignIn.RequireConfirmedAccount)
                {
                    return View("RegisterConfirmation");
                }
                else
                {
                    await _signInManager.SignInAsync(user, isPersistent: false);
                    return LocalRedirect(returnUrl);
                }
            }

            AddErrors(result);

            // If we got this far, something failed, redisplay form
            if (IsCalledFromRegisterWithoutUsername)
            {
                var registerWithoutUsernameModel = new RegisterWithoutUsernameViewModel
                {
                    Email = model.Email,
                    Password = model.Password,
                    ConfirmPassword = model.ConfirmPassword
                };

                return View("RegisterWithoutUsername", registerWithoutUsernameModel);
            }
            else
            {
                return View(model);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RegisterWithoutUsername(RegisterWithoutUsernameViewModel model, string returnUrl = null)
        {
            var registerModel = new RegisterViewModel
            {
                UserName = model.Email,
                Email = model.Email,
                Password = model.Password,
                ConfirmPassword = model.ConfirmPassword
            };

            return await Register(registerModel, returnUrl, true);
        }

        /*****************************************/
        /* helper APIs for the AccountController */
        /*****************************************/
        private IActionResult RedirectToLocal(string returnUrl)
        {
            if (Url.IsLocalUrl(returnUrl))
            {
                return Redirect(returnUrl);
            }

            return RedirectToAction(nameof(HomeController.Index), "Home");
        }

        private void AddErrors(IdentityResult result)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }
        }

        private async Task<LoginViewModel> BuildLoginViewModelAsync(string returnUrl)
        {
            var context = await _interaction.GetAuthorizationContextAsync(returnUrl);
            if (context?.IdP != null && await _schemeProvider.GetSchemeAsync(context.IdP) != null)
            {
                var local = context.IdP == IdentityServerConstants.LocalIdentityProvider;

                // this is meant to short circuit the UI and only trigger the one external IdP
                var vm = new LoginViewModel
                {
                    EnableLocalLogin = local,
                    ReturnUrl = returnUrl,
                    Username = context?.LoginHint,
                };

                if (!local)
                {
                    vm.ExternalProviders = new[] { new ExternalProvider { AuthenticationScheme = context.IdP } };
                }

                return vm;
            }

            var schemes = await _schemeProvider.GetAllSchemesAsync();

            var providers = schemes
                .Where(x => x.DisplayName != null)
                .Select(x => new ExternalProvider
                {
                    // 將 Google 顯示名稱改為 UC SSO
                    DisplayName = x.Name.Equals("Google", StringComparison.OrdinalIgnoreCase)
                        ? "UC SSO"
                        : (x.DisplayName ?? x.Name),
                    AuthenticationScheme = x.Name
                }).ToList();

            var dynamicSchemes = (await _identityProviderStore.GetAllSchemeNamesAsync())
                .Where(x => x.Enabled)
                .Select(x => new ExternalProvider
                {
                    AuthenticationScheme = x.Scheme,
                    // 將 Google 顯示名稱改為 UC SSO
                    DisplayName = x.Scheme.Equals("Google", StringComparison.OrdinalIgnoreCase)
                        ? "UC SSO"
                        : x.DisplayName
                });

            // 去除重複的 Provider (以 AuthenticationScheme 為準)
            var existingSchemes = providers.Select(p => p.AuthenticationScheme).ToHashSet(StringComparer.OrdinalIgnoreCase);
            providers.AddRange(dynamicSchemes.Where(d => !existingSchemes.Contains(d.AuthenticationScheme)));

            var allowLocal = true;
            if (context?.Client.ClientId != null)
            {
                var client = await _clientStore.FindEnabledClientByIdAsync(context.Client.ClientId);
                if (client != null)
                {
                    allowLocal = client.EnableLocalLogin;

                    if (client.IdentityProviderRestrictions != null && client.IdentityProviderRestrictions.Any())
                    {
                        providers = providers.Where(provider => client.IdentityProviderRestrictions.Contains(provider.AuthenticationScheme)).ToList();
                    }
                }
            }

            return new LoginViewModel
            {
                AllowRememberLogin = AccountOptions.AllowRememberLogin,
                EnableLocalLogin = allowLocal && AccountOptions.AllowLocalLogin,
                ReturnUrl = returnUrl,
                Username = context?.LoginHint,
                ExternalProviders = providers.ToArray()
            };
        }

        private async Task<LoginViewModel> BuildLoginViewModelAsync(LoginInputModel model)
        {
            var vm = await BuildLoginViewModelAsync(model.ReturnUrl);
            vm.Username = model.Username;
            vm.RememberLogin = model.RememberLogin;
            return vm;
        }

        private async Task<LogoutViewModel> BuildLogoutViewModelAsync(string logoutId)
        {
            var vm = new LogoutViewModel { LogoutId = logoutId, ShowLogoutPrompt = AccountOptions.ShowLogoutPrompt };

            if (User?.Identity.IsAuthenticated != true)
            {
                // if the user is not authenticated, then just show logged out page
                vm.ShowLogoutPrompt = false;
                return vm;
            }

            var context = await _interaction.GetLogoutContextAsync(logoutId);
            if (context?.ShowSignoutPrompt == false)
            {
                // it's safe to automatically sign-out
                vm.ShowLogoutPrompt = false;
                return vm;
            }

            // show the logout prompt. this prevents attacks where the user
            // is automatically signed out by another malicious web page.
            return vm;
        }

        private async Task<LoggedOutViewModel> BuildLoggedOutViewModelAsync(string logoutId)
        {
            // get context information (client name, post logout redirect URI and iframe for federated signout)
            var logout = await _interaction.GetLogoutContextAsync(logoutId);

            var vm = new LoggedOutViewModel
            {
                AutomaticRedirectAfterSignOut = AccountOptions.AutomaticRedirectAfterSignOut,
                PostLogoutRedirectUri = logout?.PostLogoutRedirectUri,
                ClientName = string.IsNullOrEmpty(logout?.ClientName) ? logout?.ClientId : logout?.ClientName,
                SignOutIframeUrl = logout?.SignOutIFrameUrl,
                LogoutId = logoutId
            };

            if (User?.Identity.IsAuthenticated == true)
            {
                var idp = User.FindFirst(JwtClaimTypes.IdentityProvider)?.Value;
                if (idp != null && idp != IdentityServerConstants.LocalIdentityProvider)
                {
                    var providerSupportsSignout = await HttpContext.GetSchemeSupportsSignOutAsync(idp);
                    if (providerSupportsSignout)
                    {
                        if (vm.LogoutId == null)
                        {
                            // if there's no current logout context, we need to create one
                            // this captures necessary info from the current logged in user
                            // before we signout and redirect away to the external IdP for signout
                            vm.LogoutId = await _interaction.CreateLogoutContextAsync();
                        }

                        vm.ExternalAuthenticationScheme = idp;
                    }
                }
            }

            return vm;
        }
    }
}
