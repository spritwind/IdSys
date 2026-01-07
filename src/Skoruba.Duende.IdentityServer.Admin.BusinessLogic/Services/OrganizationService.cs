// UC Capital - Organization Service
// 組織架構服務實作
// 重構：從 Keycloak 表遷移至 Organizations 表

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.Organization;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Repositories.Interfaces;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services
{
    public class OrganizationService : IOrganizationService
    {
        protected readonly IOrganizationRepository OrganizationRepository;

        // 預設租戶 ID（單一租戶模式）
        private static readonly Guid DefaultTenantId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        public OrganizationService(IOrganizationRepository organizationRepository)
        {
            OrganizationRepository = organizationRepository;
        }

        #region 查詢方法

        public async Task<List<OrganizationGroupDto>> GetAllGroupsAsync(CancellationToken cancellationToken = default)
        {
            var organizations = await OrganizationRepository.GetAllGroupsAsync(cancellationToken);
            return organizations.Select(MapToDto).ToList();
        }

        public async Task<List<OrganizationTreeDto>> GetOrganizationTreeAsync(CancellationToken cancellationToken = default)
        {
            var allOrganizations = await OrganizationRepository.GetAllGroupsAsync(cancellationToken);

            // 建立樹狀結構（使用 Guid 作為 key）
            var orgDict = allOrganizations.ToDictionary(o => o.Id, o => MapToTreeDto(o));
            var rootNodes = new List<OrganizationTreeDto>();

            foreach (var org in allOrganizations)
            {
                var treeNode = orgDict[org.Id];

                if (org.ParentId != null && orgDict.TryGetValue(org.ParentId.Value, out var parentNode))
                {
                    parentNode.Children.Add(treeNode);
                }
                else
                {
                    rootNodes.Add(treeNode);
                }
            }

            // 批次取得所有組織的成員數量（單一查詢，避免 N+1 問題和並發問題）
            var memberCountDict = await OrganizationRepository.GetAllMemberCountsAsync(cancellationToken);

            // 填入各組織的 MemberCount
            foreach (var org in allOrganizations)
            {
                if (orgDict.TryGetValue(org.Id, out var treeNode))
                {
                    treeNode.MemberCount = memberCountDict.TryGetValue(org.Id, out var count) ? count : 0;
                }
            }

            // 計算 TotalMemberCount（遞迴計算含子孫組織的成員總數）
            CalculateTotalMemberCount(rootNodes);

            // 排序子節點
            SortTreeChildren(rootNodes);

            return rootNodes;
        }

        /// <summary>
        /// 遞迴計算各節點的 TotalMemberCount（含所有子孫組織成員）
        /// </summary>
        private static int CalculateTotalMemberCount(List<OrganizationTreeDto> nodes)
        {
            var total = 0;
            foreach (var node in nodes)
            {
                // 先計算子節點的總數
                var childrenTotal = CalculateTotalMemberCount(node.Children);
                // 該節點的 TotalMemberCount = 自身成員 + 子孫成員
                node.TotalMemberCount = node.MemberCount + childrenTotal;
                total += node.TotalMemberCount;
            }
            return total;
        }

        public async Task<OrganizationGroupDto> GetGroupByIdAsync(string id, CancellationToken cancellationToken = default)
        {
            var organization = await OrganizationRepository.GetGroupByIdAsync(id, cancellationToken);
            return organization != null ? MapToDto(organization) : null;
        }

        public async Task<OrganizationStatsDto> GetOrganizationStatsAsync(CancellationToken cancellationToken = default)
        {
            var stats = await OrganizationRepository.GetOrganizationStatsAsync(cancellationToken);

            return new OrganizationStatsDto
            {
                TotalGroups = stats.totalGroups,
                TotalRootGroups = stats.rootGroups,
                MaxDepth = stats.maxDepth,
                GroupsWithManagers = stats.withManagers
            };
        }

        public async Task<DeleteConfirmationDto> GetDeleteConfirmationAsync(string id, CancellationToken cancellationToken = default)
        {
            var organization = await OrganizationRepository.GetGroupByIdAsync(id, cancellationToken);
            if (organization == null)
            {
                return null;
            }

            var descendants = await OrganizationRepository.GetAllDescendantsAsync(id, cancellationToken);

            return new DeleteConfirmationDto
            {
                Group = MapToDto(organization),
                Descendants = descendants.Select(MapToDto).ToList()
            };
        }

        public async Task<bool> CanInsertGroupAsync(string name, string parentId, string excludeId = null, CancellationToken cancellationToken = default)
        {
            var exists = await OrganizationRepository.ExistsAsync(name, parentId, excludeId, cancellationToken);
            return !exists;
        }

        public async Task<List<GroupMemberDto>> GetGroupMembersAsync(string groupId, CancellationToken cancellationToken = default)
        {
            var members = await OrganizationRepository.GetGroupMembersAsync(groupId, cancellationToken);
            return members.Select(MapToMemberDto).ToList();
        }

        #endregion

        #region 新增/修改/刪除方法

        public async Task<OrganizationGroupDto> CreateGroupAsync(CreateOrganizationGroupDto dto, CancellationToken cancellationToken = default)
        {
            // 驗證名稱是否重複
            var canInsert = await CanInsertGroupAsync(dto.Name, dto.ParentId, null, cancellationToken);
            if (!canInsert)
            {
                throw new InvalidOperationException($"同層級已存在名稱為「{dto.Name}」的群組");
            }

            // 如果有父群組，驗證其存在
            if (!string.IsNullOrEmpty(dto.ParentId))
            {
                var parentOrg = await OrganizationRepository.GetGroupByIdAsync(dto.ParentId, cancellationToken);
                if (parentOrg == null)
                {
                    throw new InvalidOperationException($"找不到父群組 (ID: {dto.ParentId})");
                }
            }

            // 解析父群組 ID
            Guid? parentGuid = null;
            if (!string.IsNullOrEmpty(dto.ParentId) && Guid.TryParse(dto.ParentId, out var parsedParentId))
            {
                parentGuid = parsedParentId;
            }

            var entity = new Organization
            {
                TenantId = DefaultTenantId,
                Name = dto.Name,
                ParentId = parentGuid,
                Code = dto.DeptCode,
                ChineseName = dto.DeptZhName,
                EnglishName = dto.DeptEName,
                ManagerUserId = dto.Manager, // 注意：舊系統用 username，新系統應改用 UserId
                Description = dto.Description
            };

            var created = await OrganizationRepository.CreateAsync(entity, cancellationToken);
            return MapToDto(created);
        }

        public async Task<OrganizationGroupDto> UpdateGroupAsync(string id, UpdateOrganizationGroupDto dto, CancellationToken cancellationToken = default)
        {
            // 驗證群組存在
            var existingOrg = await OrganizationRepository.GetGroupByIdAsync(id, cancellationToken);
            if (existingOrg == null)
            {
                throw new InvalidOperationException($"找不到 ID 為 {id} 的群組");
            }

            // 驗證名稱是否重複（排除自己）
            var canInsert = await CanInsertGroupAsync(dto.Name, dto.ParentId, id, cancellationToken);
            if (!canInsert)
            {
                throw new InvalidOperationException($"同層級已存在名稱為「{dto.Name}」的群組");
            }

            // 如果有父群組，驗證其存在且不是自己的子孫
            if (!string.IsNullOrEmpty(dto.ParentId))
            {
                if (dto.ParentId == id)
                {
                    throw new InvalidOperationException("不能將群組設為自己的子群組");
                }

                var parentOrg = await OrganizationRepository.GetGroupByIdAsync(dto.ParentId, cancellationToken);
                if (parentOrg == null)
                {
                    throw new InvalidOperationException($"找不到父群組 (ID: {dto.ParentId})");
                }

                // 檢查是否要設為自己子孫的子群組（會造成循環）
                var descendants = await OrganizationRepository.GetAllDescendantsAsync(id, cancellationToken);
                if (descendants.Any(d => d.Id.ToString().Equals(dto.ParentId, StringComparison.OrdinalIgnoreCase)))
                {
                    throw new InvalidOperationException("不能將群組設為自己子群組的子群組，這會造成循環參照");
                }
            }

            // 解析 ID 和父群組 ID
            if (!Guid.TryParse(id, out var orgGuid))
            {
                throw new InvalidOperationException($"無效的群組 ID 格式: {id}");
            }

            Guid? parentGuid = null;
            if (!string.IsNullOrEmpty(dto.ParentId) && Guid.TryParse(dto.ParentId, out var parsedParentId))
            {
                parentGuid = parsedParentId;
            }

            var entity = new Organization
            {
                Id = orgGuid,
                Name = dto.Name,
                ParentId = parentGuid,
                Code = dto.DeptCode,
                ChineseName = dto.DeptZhName,
                EnglishName = dto.DeptEName,
                ManagerUserId = dto.Manager,
                Description = dto.Description
            };

            var updated = await OrganizationRepository.UpdateAsync(entity, cancellationToken);
            return MapToDto(updated);
        }

        public async Task<DeleteResultDto> DeleteGroupAsync(string id, CancellationToken cancellationToken = default)
        {
            var organization = await OrganizationRepository.GetGroupByIdAsync(id, cancellationToken);
            if (organization == null)
            {
                return new DeleteResultDto
                {
                    Success = false,
                    DeletedCount = 0,
                    Message = $"找不到 ID 為 {id} 的群組"
                };
            }

            var deletedCount = await OrganizationRepository.DeleteWithDescendantsAsync(id, cancellationToken);

            return new DeleteResultDto
            {
                Success = true,
                DeletedCount = deletedCount,
                Message = deletedCount > 1
                    ? $"已成功刪除 {deletedCount} 個群組（含子群組）"
                    : "已成功刪除群組"
            };
        }

        #endregion

        #region 私有輔助方法

        /// <summary>
        /// 將 Organization 實體映射為 DTO
        /// </summary>
        private static OrganizationGroupDto MapToDto(Organization org)
        {
            return new OrganizationGroupDto
            {
                Id = org.Id.ToString(),
                Name = org.Name,
                Path = org.Path,
                ParentId = org.ParentId?.ToString(),
                Description = org.Description,
                SubGroupCount = 0, // Organizations 表沒有此欄位，需要另外計算
                Depth = org.Depth,
                DeptCode = org.Code,
                DeptEName = org.EnglishName,
                DeptZhName = org.ChineseName,
                Manager = org.ManagerUserId,
                Enabled = org.IsEnabled,
                InsDate = org.CreatedAt,
                UpdDate = org.UpdatedAt
            };
        }

        /// <summary>
        /// 將 Organization 實體映射為樹狀 DTO
        /// </summary>
        private static OrganizationTreeDto MapToTreeDto(Organization org)
        {
            var node = new OrganizationTreeDto
            {
                Id = org.Id.ToString(),
                Name = org.Name,
                ParentId = org.ParentId?.ToString(),
                DeptCode = org.Code,
                DeptEName = org.EnglishName,
                DeptZhName = org.ChineseName,
                Manager = org.ManagerUserId,
                Description = org.Description,
                Depth = org.Depth,
                Children = new List<OrganizationTreeDto>()
            };

            // 設定 IsCeo 標記（後端計算，前端無需再判斷）
            node.IsCeo = IsCeoNode(node);

            return node;
        }

        /// <summary>
        /// 排序樹狀節點：CEO/最高層級優先，其次按部門代碼排序
        /// </summary>
        private static void SortTreeChildren(List<OrganizationTreeDto> nodes)
        {
            nodes.Sort((a, b) =>
            {
                // 1. CEO/最高層級節點優先（放在最前面，使用已計算的 IsCeo 屬性）
                if (a.IsCeo && !b.IsCeo) return -1;
                if (!a.IsCeo && b.IsCeo) return 1;

                // 2. 有部門代碼的優先
                var aHasCode = !string.IsNullOrEmpty(a.DeptCode);
                var bHasCode = !string.IsNullOrEmpty(b.DeptCode);
                if (aHasCode && !bHasCode) return -1;
                if (!aHasCode && bHasCode) return 1;

                // 3. 按部門代碼排序（如果都有）
                if (aHasCode && bHasCode)
                {
                    var codeCompare = string.Compare(a.DeptCode, b.DeptCode, StringComparison.OrdinalIgnoreCase);
                    if (codeCompare != 0) return codeCompare;
                }

                // 4. 最後按中文名稱或名稱排序
                var aName = a.DeptZhName ?? a.Name ?? "";
                var bName = b.DeptZhName ?? b.Name ?? "";
                return string.Compare(aName, bName, StringComparison.OrdinalIgnoreCase);
            });

            // 遞迴排序子節點
            foreach (var node in nodes)
            {
                if (node.Children.Count > 0)
                {
                    SortTreeChildren(node.Children);
                }
            }
        }

        /// <summary>
        /// 判斷是否為 CEO/最高層級節點
        /// </summary>
        private static bool IsCeoNode(OrganizationTreeDto node)
        {
            // CEO 關鍵字列表（優先順序）
            var ceoKeywords = new[]
            {
                "CEO", "執行長", "總裁", "董事長", "總經理",
                "Chief Executive", "President", "Chairman"
            };

            var name = node.Name?.ToUpperInvariant() ?? "";
            var zhName = node.DeptZhName ?? "";
            var eName = node.DeptEName?.ToUpperInvariant() ?? "";
            var code = node.DeptCode?.ToUpperInvariant() ?? "";

            return ceoKeywords.Any(keyword =>
                name.Contains(keyword.ToUpperInvariant()) ||
                zhName.Contains(keyword) ||
                eName.Contains(keyword.ToUpperInvariant()) ||
                code.Contains(keyword.ToUpperInvariant()));
        }

        /// <summary>
        /// 將 OrganizationMemberWithUser 映射為 GroupMemberDto
        /// </summary>
        private static GroupMemberDto MapToMemberDto(OrganizationMemberWithUser member)
        {
            return new GroupMemberDto
            {
                GroupId = member.OrganizationId,
                UserId = member.UserId,
                UserName = member.UserName,
                DisplayName = member.DisplayName,
                Email = member.Email,
                GroupName = member.OrganizationName,
                GroupPath = member.OrganizationPath,
                JoinedAt = member.JoinedAt
            };
        }

        #endregion
    }
}
