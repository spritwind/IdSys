// UC Capital - Organization API Mapper Profile
// 組織架構 API 映射設定

using AutoMapper;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.Organization;
using Skoruba.Duende.IdentityServer.Admin.UI.Api.Dtos.Organization;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Mappers
{
    public class OrganizationApiMapperProfile : Profile
    {
        public OrganizationApiMapperProfile()
        {
            // 組織群組 DTO 映射
            CreateMap<OrganizationGroupDto, OrganizationGroupApiDto>(MemberList.Destination)
                .ReverseMap();

            // 組織樹狀結構 DTO 映射
            CreateMap<OrganizationTreeDto, OrganizationTreeApiDto>(MemberList.Destination)
                .ForMember(dest => dest.IsRoot, opt => opt.MapFrom(src => string.IsNullOrEmpty(src.ParentId)))
                .ForMember(dest => dest.ChildCount, opt => opt.MapFrom(src => src.Children != null ? src.Children.Count : 0))
                .ForMember(dest => dest.MemberCount, opt => opt.MapFrom(src => src.MemberCount))
                .ForMember(dest => dest.TotalMemberCount, opt => opt.MapFrom(src => src.TotalMemberCount))
                .ReverseMap();

            // 組織統計 DTO 映射
            CreateMap<OrganizationStatsDto, OrganizationStatsApiDto>(MemberList.Destination)
                .ReverseMap();

            // 新增組織群組 DTO 映射
            CreateMap<CreateOrganizationGroupApiDto, CreateOrganizationGroupDto>(MemberList.Destination)
                .ReverseMap();

            // 更新組織群組 DTO 映射
            CreateMap<UpdateOrganizationGroupApiDto, UpdateOrganizationGroupDto>(MemberList.Destination)
                .ReverseMap();

            // 刪除確認 DTO 映射
            CreateMap<DeleteConfirmationDto, DeleteConfirmationApiDto>(MemberList.Destination)
                .ForMember(dest => dest.TotalCount, opt => opt.MapFrom(src => 1 + (src.Descendants != null ? src.Descendants.Count : 0)))
                .ForMember(dest => dest.HasDescendants, opt => opt.MapFrom(src => src.Descendants != null && src.Descendants.Count > 0))
                .ReverseMap();

            // 刪除結果 DTO 映射
            CreateMap<DeleteResultDto, DeleteResultApiDto>(MemberList.Destination)
                .ReverseMap();

            // 群組成員 DTO 映射
            CreateMap<GroupMemberDto, GroupMemberApiDto>(MemberList.Destination)
                .ReverseMap();
        }
    }
}
