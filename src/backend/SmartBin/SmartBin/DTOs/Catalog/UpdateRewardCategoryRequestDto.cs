using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs
{
    public class UpdateRewardCategoryRequestDto
    {
        [Required]
        public string Name { get; set; } = null!;

        public string? LogoUrl { get; set; }
    }
}
