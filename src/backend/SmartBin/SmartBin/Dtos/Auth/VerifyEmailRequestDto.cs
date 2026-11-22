
using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs.Auth
{
    public class VerifyEmailRequestDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } 

        [Required]
        [RegularExpression(@"^\d{5}$",
            ErrorMessage = "OTP must contain exactly 5 digits.")]
        public string Otp { get; set; }
    }
}

