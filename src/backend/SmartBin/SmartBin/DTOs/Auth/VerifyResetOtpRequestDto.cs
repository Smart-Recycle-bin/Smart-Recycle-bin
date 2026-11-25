using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs.Auth
{
    public class VerifyResetOtpRequestDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(10, MinimumLength = 4)]
        public string Otp { get; set; } = string.Empty;
    }
}
