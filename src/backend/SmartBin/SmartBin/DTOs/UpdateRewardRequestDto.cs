using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs
{
    public class UpdateRewardRequestDto
    {
        public string? Title { get; set; }

        public string? Description { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "CategoryId must be greater than 0.")]
        public int? CategoryId { get; set; }

        public string? VoucherCodeType { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "PointsCost must be at least 1.")]
        public int? PointsCost { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Stock cannot be negative.")]
        public int? Stock { get; set; }

        public string? ImageUrl { get; set; }

        public DateTime? ValidFrom { get; set; }

        public DateTime? ValidUntil { get; set; }
    }
}
