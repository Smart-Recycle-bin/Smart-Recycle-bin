using System.ComponentModel.DataAnnotations;

namespace SmartBin.Dtos.Auth
{
    public class RegisterRequestDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }

        [Required]
        [StringLength(50, MinimumLength = 3)]
        public string DisplayName { get; set; }
    }
}
 