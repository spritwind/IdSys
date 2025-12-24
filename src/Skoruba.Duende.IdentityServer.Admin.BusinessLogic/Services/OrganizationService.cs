// UC Capital - Organization Service
// 組織架構服務實作

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

        public OrganizationService(IOrganizationRepository organizationRepository)
        {
            OrganizationRepository = organizationRepository;
        }

        #region 查詢方法

        public async Task<List<OrganizationGroupDto>> GetAllGroupsAsync(CancellationToken cancellationToken = default)
        {
            var groups = await OrganizationRepository.GetAllGroupsAsync(cancellationToken);
            return groups.Select(MapToDto).ToList();
        }

        public async Task<List<OrganizationTreeDto>> GetOrganizationTreeAsync(CancellationToken cancellationToken = default)
        {
            var allGroups = await OrganizationRepository.GetAllGroupsAsync(cancellationToken);

            // 建立樹狀結構
            var groupDict = allGroups.ToDictionary(g => g.Id, g => MapToTreeDto(g));
            var rootNodes = new List<OrganizationTreeDto>();

            foreach (var group in allGroups)
            {
                var treeNode = groupDict[group.Id];

                if (!string.IsNullOrEmpty(group.ParentId) && groupDict.TryGetValue(group.ParentId, out var parentNode))
                {
                    parentNode.Children.Add(treeNode);
                }
                else
                {
                    rootNodes.Add(treeNode);
                }
            }

            // 排序子節點
            SortTreeChildren(rootNodes);

            return rootNodes;
        }

        public async Task<OrganizationGroupDto> GetGroupByIdAsync(string id, CancellationToken cancellationToken = default)
        {
            var group = await OrganizationRepository.GetGroupByIdAsync(id, cancellationToken);
            return group != null ? MapToDto(group) : null;
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
            var group = await OrganizationRepository.GetGroupByIdAsync(id, cancellationToken);
            if (group == null)
            {
                return null;
            }

            var descendants = await OrganizationRepository.GetAllDescendantsAsync(id, cancellationToken);

            return new DeleteConfirmationDto
            {
                Group = MapToDto(group),
                Descendants = descendants.Select(MapToDto).ToList()
            };
        }

        public async Task<bool> CanInsertGroupAsync(string name, string parentId, string excludeId = null, CancellationToken cancellationToken = default)
        {
            var exists = await OrganizationRepository.ExistsAsync(name, parentId, excludeId, cancellationToken);
            return !exists;
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
                var parentGroup = await OrganizationRepository.GetGroupByIdAsync(dto.ParentId, cancellationToken);
                if (parentGroup == null)
                {
                    throw new InvalidOperationException($"找不到父群組 (ID: {dto.ParentId})");
                }
            }

            var entity = new KeycloakGroup
            {
                Name = dto.Name,
                ParentId = dto.ParentId,
                DeptCode = dto.DeptCode,
                DeptZhName = dto.DeptZhName,
                DeptEName = dto.DeptEName,
                Manager = dto.Manager,
                Description = dto.Description
            };

            var created = await OrganizationRepository.CreateAsync(entity, cancellationToken);
            return MapToDto(created);
        }

        public async Task<OrganizationGroupDto> UpdateGroupAsync(string id, UpdateOrganizationGroupDto dto, CancellationToken cancellationToken = default)
        {
            // 驗證群組存在
            var existingGroup = await OrganizationRepository.GetGroupByIdAsync(id, cancellationToken);
            if (existingGroup == null)
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

                var parentGroup = await OrganizationRepository.GetGroupByIdAsync(dto.ParentId, cancellationToken);
                if (parentGroup == null)
                {
                    throw new InvalidOperationException($"找不到父群組 (ID: {dto.ParentId})");
                }

                // 檢查是否要設為自己子孫的子群組（會造成循環）
                var descendants = await OrganizationRepository.GetAllDescendantsAsync(id, cancellationToken);
                if (descendants.Any(d => d.Id == dto.ParentId))
                {
                    throw new InvalidOperationException("不能將群組設為自己子群組的子群組，這會造成循環參照");
                }
            }

            var entity = new KeycloakGroup
            {
                Id = id,
                Name = dto.Name,
                ParentId = dto.ParentId,
                DeptCode = dto.DeptCode,
                DeptZhName = dto.DeptZhName,
                DeptEName = dto.DeptEName,
                Manager = dto.Manager,
                Description = dto.Description
            };

            var updated = await OrganizationRepository.UpdateAsync(entity, cancellationToken);
            return MapToDto(updated);
        }

        public async Task<DeleteResultDto> DeleteGroupAsync(string id, CancellationToken cancellationToken = default)
        {
            var group = await OrganizationRepository.GetGroupByIdAsync(id, cancellationToken);
            if (group == null)
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

        private static OrganizationGroupDto MapToDto(KeycloakGroup group)
        {
            return new OrganizationGroupDto
            {
                Id = group.Id,
                Name = group.Name,
                Path = group.Path,
                ParentId = group.ParentId,
                Description = group.Description,
                SubGroupCount = group.SubGroupCount ?? 0,
                Depth = group.Depth ?? 0,
                DeptCode = group.DeptCode,
                DeptEName = group.DeptEName,
                DeptZhName = group.DeptZhName,
                Manager = group.Manager,
                Enabled = group.Enabled ?? true,
                InsDate = group.InsDate,
                UpdDate = group.UpdDate
            };
        }

        private static OrganizationTreeDto MapToTreeDto(KeycloakGroup group)
        {
            var node = new OrganizationTreeDto
            {
                Id = group.Id,
                Name = group.Name,
                ParentId = group.ParentId,
                DeptCode = group.DeptCode,
                DeptEName = group.DeptEName,
                DeptZhName = group.DeptZhName,
                Manager = group.Manager,
                Description = group.Description,
                Depth = group.Depth ?? 0,
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
        /// 計算節點的排序優先級（數字越小越優先）
        /// </summary>
        private static int GetNodePriority(OrganizationTreeDto node)
        {
            if (IsCeoNode(node)) return 0;
            if (node.Depth == 0) return 1;
            return 10 + node.Depth;
        }

        #endregion
    }
}
