// UC Capital - Organization API Mappers
// 組織架構 API 映射擴充方法

using AutoMapper;

namespace Skoruba.Duende.IdentityServer.Admin.UI.Api.Mappers
{
    public static class OrganizationApiMappers
    {
        static OrganizationApiMappers()
        {
            Mapper = new MapperConfiguration(cfg => cfg.AddProfile<OrganizationApiMapperProfile>())
                .CreateMapper();
        }

        internal static IMapper Mapper { get; }

        public static T ToOrganizationApiModel<T>(this object source)
        {
            return Mapper.Map<T>(source);
        }
    }
}
