// UC Capital - React SPA API Configuration
// React SPA API 認證與 CORS 配置

namespace Skoruba.Duende.IdentityServer.Admin.Configuration
{
    /// <summary>
    /// React SPA API 配置
    /// 支持 React 前端使用 JWT Bearer 認證呼叫 Admin API
    /// </summary>
    public class ReactSpaApiConfiguration
    {
        /// <summary>
        /// 是否啟用 React SPA API 支持
        /// </summary>
        public bool Enabled { get; set; } = true;

        /// <summary>
        /// API 名稱（對應 IdentityServer 的 ApiResource）
        /// </summary>
        public string ApiName { get; set; } = "uc_capital_admin_api";

        /// <summary>
        /// 允許的 CORS 來源
        /// </summary>
        public string[] CorsOrigins { get; set; } = new[] { "http://localhost:5173" };

        /// <summary>
        /// 是否要求 HTTPS 元數據
        /// </summary>
        public bool RequireHttpsMetadata { get; set; } = true;
    }
}
