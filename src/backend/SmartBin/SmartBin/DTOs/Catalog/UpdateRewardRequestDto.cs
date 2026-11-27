using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs
{
    public class UpdateRewardRequestDto
    {
        [MaxLength(100, ErrorMessage = "Title must not exceed 100 characters.")]
        public string? Title { get; set; }

        [MaxLength(500, ErrorMessage = "Description must not exceed 500 characters.")]
        public string? Description { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "CategoryId must be greater than 0.")]
        public int? CategoryId { get; set; }

        [MaxLength(50, ErrorMessage = "VoucherCodeType must not exceed 50 characters.")]
        public string? VoucherCodeType { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "PointsCost must be at least 1.")]
        public int? PointsCost { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Stock cannot be negative.")]
        public int? Stock { get; set; }

        [MaxLength(1000, ErrorMessage = "ImageUrl must not exceed 1000 characters.")]
        public string? ImageUrl { get; set; }

        public DateTime? ValidFrom { get; set; }

        public DateTime? ValidUntil { get; set; }
    }
}
