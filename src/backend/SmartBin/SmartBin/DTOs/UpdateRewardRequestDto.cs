
using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs
{
    public class UpdateRewardRequestDto
    {
        [Required]
        public string Title { get; set; } = null!;

        public string? Description { get; set; }

        [Range(1, int.MaxValue)]
        public int CategoryId { get; set; }

        public string? VoucherCodeType { get; set; }

        [Range(1, int.MaxValue)]
        public int PointsCost { get; set; }

        [Range(0, int.MaxValue)]
        public int Stock { get; set; }

        public string? ImageUrl { get; set; }

        public DateTime? ValidFrom { get; set; }

        public DateTime? ValidUntil { get; set; }
    }
}
