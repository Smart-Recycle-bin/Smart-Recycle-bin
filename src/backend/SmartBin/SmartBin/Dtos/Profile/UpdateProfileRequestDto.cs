
using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs.Profile
{
    public class UpdateProfileRequestDto
    {
        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string DisplayName { get; set; } 

        [Phone]
        [StringLength(20)]
        public string? PhoneNumber { get; set; }
    }
}
  