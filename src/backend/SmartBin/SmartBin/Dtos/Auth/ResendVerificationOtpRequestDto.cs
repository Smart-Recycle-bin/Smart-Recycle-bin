using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs.Auth
{
    public class ResendVerificationOtpRequestDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } 
    }
}
 