// UC Capital - Permission Query Service Interface
// 權限查詢服務介面

using System.Threading.Tasks;
using Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Dtos.PermissionQuery;

namespace Skoruba.Duende.IdentityServer.Admin.BusinessLogic.Services.Interfaces
{
    /// <summary>
    /// 權限查詢服務介面
    /// </summary>
    public interface IPermissionQueryService
    {
        /// <summary>
        /// 查詢使用者權限
        /// </summary>
        /// <param name="request">權限查詢請求</param>
        /// <returns>權限查詢結果</returns>
        Task<PermissionQueryResult> QueryPermissionsAsync(PermissionQueryRequest request);

        /// <summary>
        /// 檢查使用者是否具有特定資源的權限
        /// </summary>
        /// <param name="request">權限檢查請求</param>
        /// <param name="ipAddress">來源 IP 位址 (可選)</param>
        /// <param name="userAgent">User Agent (可選)</param>
        /// <returns>權限檢查結果</returns>
        Task<PermissionCheckResult> CheckPermissionAsync(PermissionCheckRequest request, string? ipAddress = null, string? userAgent = null);
    }

    /// <summary>
    /// 權限查詢結果
    /// </summary>
    public class PermissionQueryResult
    {
        /// <summary>
        /// 是否成功
        /// </summary>
        public bool IsSuccess { get; set; }

        /// <summary>
        /// 錯誤代碼 (失敗時)
        /// </summary>
        public string? ErrorCode { get; set; }

        /// <summary>
        /// 錯誤描述 (失敗時)
        /// </summary>
        public string? ErrorDescription { get; set; }

        /// <summary>
        /// 權限回應資料 (成功時)
        /// </summary>
        public PermissionQueryResponse? Data { get; set; }

        /// <summary>
        /// 建立成功結果
        /// </summary>
        public static PermissionQueryResult Success(PermissionQueryResponse data) => new()
        {
            IsSuccess = true,
            Data = data
        };

        /// <summary>
        /// 建立失敗結果
        /// </summary>
        public static PermissionQueryResult Failure(string errorCode, string errorDescription) => new()
        {
            IsSuccess = false,
            ErrorCode = errorCode,
            ErrorDescription = errorDescription
        };
    }
}
