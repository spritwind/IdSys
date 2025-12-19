using System.ComponentModel.DataAnnotations;

namespace Skoruba.Duende.IdentityServer.STS.Identity.ViewModels.Account
{
    public class ExternalLoginConfirmationViewModel
    {
        [Required]
        [RegularExpression(@"^[a-zA-Z0-9_@\-\.\+\u4e00-\u9fa5]+$")]
        public string UserName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }
    }
}
