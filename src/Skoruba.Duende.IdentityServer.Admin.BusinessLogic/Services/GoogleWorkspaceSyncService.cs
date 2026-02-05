// UC Capital - Google Workspace Sync Service Implementation
// Google Workspace 組織架構同步服務實作

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Google.Apis.Admin.Directory.directory_v1;
using Google.Apis.Admin.Directory.directory_v1.Data;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.GoogleSync;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities.GoogleSync;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services
{
    /// <summary>
    /// Google Workspace 組織架構同步服務實作
    /// </summary>
    public class GoogleWorkspaceSyncService : IGoogleWorkspaceSyncService
    {
        private const string AppName = "UCCapital-OrgSync";

        private readonly IGoogleSyncRepository _repository;
        private readonly GoogleWorkspaceSettings _settings;
        private readonly ILogger<GoogleWorkspaceSyncService> _logger;

        public GoogleWorkspaceSyncService(
            IGoogleSyncRepository repository,
            IOptions<GoogleWorkspaceSettings> settings,
            ILogger<GoogleWorkspaceSyncService> logger)
        {
            _repository = repository;
            _settings = settings.Value;
            _logger = logger;
        }

        #region Public Methods

        /// <inheritdoc/>
        public async Task<GoogleSyncPreviewDto> PreviewSyncAsync(
            Guid? tenantId = null,
            string[]? targetEmails = null,
            CancellationToken cancellationToken = default)
        {
            var effectiveTenantId = tenantId ?? _settings.DefaultTenantId;
            _logger.LogInformation("Starting Google Workspace sync preview for TenantId={TenantId}", effectiveTenantId);

            try
            {
                var bundle = await FetchGoogleDataAsync(effectiveTenantId, targetEmails?.ToList(), cancellationToken);

                var existingStats = await _repository.GetExistingStatsAsync(effectiveTenantId, cancellationToken);

                return new GoogleSyncPreviewDto
                {
                    OrganizationsFromGoogle = bundle.Organizations.Count,
                    MembersFromGoogle = bundle.Members.Count,
                    MembersWithMissingOrg = bundle.MembersMissingOrg.Count,
                    ExistingOrganizations = existingStats.organizationCount,
                    ExistingMembers = existingStats.memberCount,
                    OrganizationPaths = bundle.Organizations.Select(o => o.Path).OrderBy(p => p).ToList(),
                    Warnings = bundle.MembersMissingOrg.Select(m => $"User {m.UserId} missing org: {m.OrganizationId}").ToList(),
                    PreviewedAt = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to preview Google Workspace sync");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<GoogleSyncResultDto> SyncOrganizationsAsync(
            Guid? tenantId = null,
            CancellationToken cancellationToken = default)
        {
            var sw = Stopwatch.StartNew();
            var effectiveTenantId = tenantId ?? _settings.DefaultTenantId;
            _logger.LogInformation("Starting Google Workspace organizations sync for TenantId={TenantId}", effectiveTenantId);

            try
            {
                var bundle = await FetchGoogleDataAsync(effectiveTenantId, null, cancellationToken);

                var entities = bundle.Organizations.Select(MapToEntity).ToList();
                var result = await _repository.UpsertOrganizationsAsync(entities, effectiveTenantId, cancellationToken);

                sw.Stop();
                _logger.LogInformation(
                    "Organizations sync completed: Created={Created}, Updated={Updated}, Disabled={Disabled}, Duration={Duration}ms",
                    result.created, result.updated, result.disabled, sw.ElapsedMilliseconds);

                return new GoogleSyncResultDto
                {
                    Success = true,
                    Message = $"組織架構同步完成",
                    OrganizationsCreated = result.created,
                    OrganizationsUpdated = result.updated,
                    OrganizationsDisabled = result.disabled,
                    SyncedAt = DateTime.UtcNow,
                    DurationMs = sw.ElapsedMilliseconds
                };
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "Failed to sync organizations");
                return new GoogleSyncResultDto
                {
                    Success = false,
                    Message = $"同步失敗: {ex.Message}",
                    SyncedAt = DateTime.UtcNow,
                    DurationMs = sw.ElapsedMilliseconds
                };
            }
        }

        /// <inheritdoc/>
        public async Task<GoogleSyncResultDto> SyncMembersAsync(
            Guid? tenantId = null,
            string[]? targetEmails = null,
            CancellationToken cancellationToken = default)
        {
            var sw = Stopwatch.StartNew();
            var effectiveTenantId = tenantId ?? _settings.DefaultTenantId;
            _logger.LogInformation("Starting Google Workspace members sync for TenantId={TenantId}", effectiveTenantId);

            try
            {
                var bundle = await FetchGoogleDataAsync(effectiveTenantId, targetEmails?.ToList(), cancellationToken);

                var memberEntities = bundle.Members.Select(MapToEntity).ToList();
                var result = await _repository.SyncMembersAsync(memberEntities, effectiveTenantId, cancellationToken);

                sw.Stop();
                _logger.LogInformation(
                    "Members sync completed: Synced={Synced}, Failed={Failed}, Duration={Duration}ms",
                    result.synced, result.failed, sw.ElapsedMilliseconds);

                return new GoogleSyncResultDto
                {
                    Success = result.failed == 0,
                    Message = result.failed == 0 ? "人員對應同步完成" : $"同步完成，但有 {result.failed} 筆失敗",
                    MembersSynced = result.synced,
                    MembersFailed = result.failed,
                    FailedEmails = result.failedEmails,
                    Warnings = bundle.MembersMissingOrg.Select(m => $"User {m.UserId} missing org").ToList(),
                    SyncedAt = DateTime.UtcNow,
                    DurationMs = sw.ElapsedMilliseconds
                };
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "Failed to sync members");
                return new GoogleSyncResultDto
                {
                    Success = false,
                    Message = $"同步失敗: {ex.Message}",
                    SyncedAt = DateTime.UtcNow,
                    DurationMs = sw.ElapsedMilliseconds
                };
            }
        }

        /// <inheritdoc/>
        public async Task<GoogleSyncResultDto> FullSyncAsync(
            GoogleSyncRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var sw = Stopwatch.StartNew();
            var effectiveTenantId = request.TenantId ?? _settings.DefaultTenantId;
            _logger.LogInformation(
                "Starting Google Workspace full sync for TenantId={TenantId}, SyncOrgs={SyncOrgs}, SyncMembers={SyncMembers}, DryRun={DryRun}",
                effectiveTenantId, request.SyncOrganizations, request.SyncMembers, request.DryRun);

            var result = new GoogleSyncResultDto
            {
                SyncedAt = DateTime.UtcNow
            };

            try
            {
                var bundle = await FetchGoogleDataAsync(effectiveTenantId, request.TargetEmails, cancellationToken);

                if (request.DryRun)
                {
                    sw.Stop();
                    return new GoogleSyncResultDto
                    {
                        Success = true,
                        Message = $"[試執行] 將同步 {bundle.Organizations.Count} 個組織、{bundle.Members.Count} 個人員對應",
                        OrganizationsCreated = bundle.Organizations.Count,
                        MembersSynced = bundle.Members.Count,
                        MembersFailed = bundle.MembersMissingOrg.Count,
                        FailedEmails = bundle.MembersMissingOrg.Select(m => m.UserId).ToList(),
                        DurationMs = sw.ElapsedMilliseconds
                    };
                }

                // Step 1: 同步組織架構
                if (request.SyncOrganizations)
                {
                    var orgEntities = bundle.Organizations.Select(MapToEntity).ToList();
                    var orgResult = await _repository.UpsertOrganizationsAsync(orgEntities, effectiveTenantId, cancellationToken);
                    result.OrganizationsCreated = orgResult.created;
                    result.OrganizationsUpdated = orgResult.updated;
                    result.OrganizationsDisabled = orgResult.disabled;
                }

                // Step 2: 同步人員對應
                if (request.SyncMembers)
                {
                    var memberEntities = bundle.Members.Select(MapToEntity).ToList();
                    var memberResult = await _repository.SyncMembersAsync(memberEntities, effectiveTenantId, cancellationToken);
                    result.MembersSynced = memberResult.synced;
                    result.MembersFailed = memberResult.failed;
                    result.FailedEmails = memberResult.failedEmails;
                }

                result.Warnings = bundle.MembersMissingOrg.Select(m => $"User {m.UserId} missing org").ToList();

                sw.Stop();
                result.Success = true;
                result.Message = $"完整同步完成";
                result.DurationMs = sw.ElapsedMilliseconds;

                _logger.LogInformation(
                    "Full sync completed: OrgsCreated={OrgsCreated}, OrgsUpdated={OrgsUpdated}, MembersSynced={MembersSynced}, Duration={Duration}ms",
                    result.OrganizationsCreated, result.OrganizationsUpdated, result.MembersSynced, sw.ElapsedMilliseconds);

                return result;
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "Failed to complete full sync");
                result.Success = false;
                result.Message = $"同步失敗: {ex.Message}";
                result.DurationMs = sw.ElapsedMilliseconds;
                return result;
            }
        }

        #endregion

        #region Private Methods - Google API

        private async Task<GoogleSyncDataBundle> FetchGoogleDataAsync(
            Guid tenantId,
            List<string>? targetEmails,
            CancellationToken cancellationToken)
        {
            var credential = await GetGoogleCredentialAsync();
            var dirService = await CreateDirectoryServiceAsync(credential);
            var bundle = new GoogleSyncDataBundle();
            var systemNow = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ").ToTaipeiTime();

            // 1. 取得所有組織單位
            var allOrgDetails = await FetchAllOrganizationUnitsAsync(dirService);
            _logger.LogInformation("Fetched {Count} organization units from Google", allOrgDetails.Count);

            // 2. 取得人員資料
            var personnelDict = await FetchUsersAsync(dirService, targetEmails);
            _logger.LogInformation("Fetched {Count} users from Google", personnelDict.Count);

            // 3. 產生組織樹編碼
            var codeMap = GenerateTreeCodes(allOrgDetails.Values.Select(o => o.OrgPath).ToList());

            // 4. 建立組織 GUID 對照表
            var orgGuidLookup = new Dictionary<string, Guid>();

            foreach (var orgDetail in allOrgDetails.Values.Where(o => !string.IsNullOrEmpty(o.OrgUnitId)))
            {
                var newOrgId = Guid.NewGuid();
                orgGuidLookup[orgDetail.OrgUnitId] = newOrgId;

                bundle.Organizations.Add(new SyncOrganizationDto
                {
                    Id = newOrgId,
                    Id_104 = orgDetail.OrgUnitId,
                    TenantId = tenantId,
                    Name = orgDetail.OrgPath.Split('/', StringSplitOptions.RemoveEmptyEntries).LastOrDefault() ?? "Root",
                    Code = codeMap.GetValueOrDefault(orgDetail.OrgPath, "001"),
                    Path = orgDetail.OrgPath,
                    ParentId_104 = orgDetail.ParentOrgUnitId,
                    Description = orgDetail.Description,
                    InheritParentPermissions = orgDetail.InheritParentPermissions,
                    Depth = orgDetail.OrgPath.Split('/', StringSplitOptions.RemoveEmptyEntries).Length,
                    IsEnabled = true,
                    SortOrder = 0,
                    CreatedAt = systemNow,
                    UpdatedAt = systemNow
                });
            }

            // 5. 建立人員對應
            foreach (var (email, person) in personnelDict)
            {
                var orgPath = NormalizePath(person.OrgPath);
                var orgDetail = allOrgDetails.GetValueOrDefault(orgPath);

                var memberEntity = new SyncOrganizationMemberDto
                {
                    Id = Guid.NewGuid(),
                    UserId = email,
                    TempPositionName = person.CustomFields.GetValueOrDefault("1000.7051"),
                    IsPrimary = true,
                    MemberRole = "Member",
                    JoinedAt = !string.IsNullOrEmpty(person.CreationTime) ? person.CreationTime : systemNow
                };

                if (orgDetail != null && !string.IsNullOrEmpty(orgDetail.OrgUnitId) &&
                    orgGuidLookup.TryGetValue(orgDetail.OrgUnitId, out var linkedGuid))
                {
                    memberEntity.OrganizationId = orgDetail.OrgUnitId; // 使用 Id_104
                    bundle.Members.Add(memberEntity);
                }
                else
                {
                    memberEntity.OrganizationId = $"MISSING: {orgDetail?.OrgUnitId ?? "NULL"}";
                    bundle.MembersMissingOrg.Add(memberEntity);
                }
            }

            return bundle;
        }

        private async Task<GoogleCredential> GetGoogleCredentialAsync()
        {
            GoogleCredential credential;

            if (!string.IsNullOrEmpty(_settings.ServiceAccountKeyJson))
            {
                credential = GoogleCredential.FromJson(_settings.ServiceAccountKeyJson);
            }
            else if (!string.IsNullOrEmpty(_settings.ServiceAccountKeyPath))
            {
                credential = await GoogleCredential.FromFileAsync(_settings.ServiceAccountKeyPath, CancellationToken.None);
            }
            else
            {
                throw new InvalidOperationException("Google Service Account key not configured. Set either ServiceAccountKeyJson or ServiceAccountKeyPath.");
            }

            return credential;
        }

        private async Task<DirectoryService> CreateDirectoryServiceAsync(GoogleCredential credential)
        {
            var scopes = new[]
            {
                "https://www.googleapis.com/auth/admin.directory.user.readonly",
                "https://www.googleapis.com/auth/admin.directory.orgunit.readonly",
                "https://www.googleapis.com/auth/admin.directory.group.readonly"
            };

            var delegatedCredential = credential.CreateScoped(scopes).CreateWithUser(_settings.AdminEmail);

            return new DirectoryService(new BaseClientService.Initializer
            {
                HttpClientInitializer = delegatedCredential,
                ApplicationName = AppName
            });
        }

        private async Task<Dictionary<string, GoogleOrgDetailDto>> FetchAllOrganizationUnitsAsync(DirectoryService dirService)
        {
            var req = dirService.Orgunits.List("my_customer");
            req.Type = OrgunitsResource.ListRequest.TypeEnum.All;
            var response = await req.ExecuteAsync();
            var rawOrgs = response.OrganizationUnits ?? new List<OrgUnit>();

            var orgMap = rawOrgs.ToDictionary(
                o => NormalizePath(o.OrgUnitPath),
                o => new GoogleOrgDetailDto
                {
                    OrgUnitId = o.OrgUnitId,
                    OrgPath = NormalizePath(o.OrgUnitPath),
                    ParentPath = NormalizePath(o.ParentOrgUnitPath),
                    ParentOrgUnitId = o.ParentOrgUnitId,
                    Description = o.Description,
                    InheritParentPermissions = !(o.BlockInheritance ?? false),
                    ETag = o.ETag
                });

            // 確保根節點存在
            if (!orgMap.ContainsKey("/"))
            {
                try
                {
                    var rootRes = await dirService.Orgunits.Get("my_customer", "/").ExecuteAsync();
                    orgMap["/"] = new GoogleOrgDetailDto
                    {
                        OrgUnitId = rootRes.OrgUnitId,
                        OrgPath = "/",
                        ParentPath = null,
                        InheritParentPermissions = true
                    };
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to fetch root organization unit");
                }
            }

            return orgMap;
        }

        private async Task<Dictionary<string, GoogleEmployeeDto>> FetchUsersAsync(
            DirectoryService dirService,
            List<string>? targetEmails)
        {
            var users = new List<User>();

            if (targetEmails != null && targetEmails.Count > 0)
            {
                foreach (var email in targetEmails)
                {
                    try
                    {
                        var req = dirService.Users.Get(email);
                        req.Projection = UsersResource.GetRequest.ProjectionEnum.Full;
                        users.Add(await req.ExecuteAsync());
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to fetch user {Email}", email);
                    }
                }
            }
            else
            {
                string? pageToken = null;
                do
                {
                    var req = dirService.Users.List();
                    req.Customer = "my_customer";
                    req.Projection = UsersResource.ListRequest.ProjectionEnum.Full;
                    req.MaxResults = 500;
                    req.PageToken = pageToken;
                    var response = await req.ExecuteAsync();
                    if (response.UsersValue != null)
                        users.AddRange(response.UsersValue);
                    pageToken = response.NextPageToken;
                } while (pageToken != null);
            }

            return users.ToDictionary(
                u => u.PrimaryEmail.ToLower(),
                u => new GoogleEmployeeDto
                {
                    GoogleUserId = u.Id,
                    CompanyEmail = u.PrimaryEmail.ToLower(),
                    ChineseName = u.Name?.FullName ?? string.Empty,
                    AccountStatus = (u.Suspended ?? false) ? 0 : 1,
                    OrgPath = u.OrgUnitPath ?? string.Empty,
                    CreationTime = u.CreationTimeRaw.ToTaipeiTime(),
                    CustomFields = u.CustomSchemas?.SelectMany(s => s.Value.Select(f =>
                        new { Key = $"{s.Key}.{f.Key}", Val = f.Value?.ToString() ?? "" }))
                        .ToDictionary(x => x.Key, x => x.Val) ?? new Dictionary<string, string>()
                });
        }

        #endregion

        #region Private Methods - Helpers

        private static string NormalizePath(string? path)
        {
            if (string.IsNullOrWhiteSpace(path) || path == "/")
                return "/";
            return "/" + path.TrimStart('/').TrimEnd('/');
        }

        private static Dictionary<string, string> GenerateTreeCodes(List<string> paths)
        {
            var map = new Dictionary<string, string>();
            var counters = new Dictionary<string, int>();

            map["/"] = "001";

            foreach (var path in paths.OrderBy(p => p.Length).ThenBy(p => p))
            {
                if (path == "/" || map.ContainsKey(path))
                    continue;

                var parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
                var parentKey = parts.Length <= 1 ? "/" : "/" + string.Join("/", parts.Take(parts.Length - 1));

                if (!counters.ContainsKey(parentKey))
                    counters[parentKey] = 1;

                var seq = counters[parentKey]++;
                var parentCode = map.GetValueOrDefault(parentKey, "001");
                map[path] = $"{parentCode}-{seq:D2}";
            }

            return map;
        }

        private static SyncOrganization MapToEntity(SyncOrganizationDto dto) => new()
        {
            Id = dto.Id,
            Id_104 = dto.Id_104,
            Name = dto.Name,
            Code = dto.Code,
            Path = dto.Path,
            Depth = dto.Depth,
            ParentId_104 = dto.ParentId_104,
            Description = dto.Description,
            InheritParentPermissions = dto.InheritParentPermissions,
            ChineseName = dto.ChineseName,
            EnglishName = dto.EnglishName,
            GroupType = dto.GroupType,
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt
        };

        private static SyncOrganizationMember MapToEntity(SyncOrganizationMemberDto dto) => new()
        {
            Id = dto.Id,
            UserId = dto.UserId,
            OrganizationId = dto.OrganizationId,
            TempPositionName = dto.TempPositionName,
            MemberRole = dto.MemberRole,
            IsPrimary = dto.IsPrimary,
            JoinedAt = dto.JoinedAt
        };

        #endregion
    }

    /// <summary>
    /// 時區轉換擴充方法
    /// </summary>
    internal static class GoogleSyncExtensions
    {
        internal static string ToTaipeiTime(this string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return string.Empty;

            return DateTimeOffset.TryParse(raw, out var dto)
                ? dto.ToOffset(TimeSpan.FromHours(8)).ToString("yyyy-MM-dd HH:mm:ss")
                : raw;
        }
    }
}
