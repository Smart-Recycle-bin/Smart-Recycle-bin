
namespace SmartBin.DTOs
{
    public class RewardResponseDto
    {
        public int ItemId { get; set; }

        public string Title { get; set; } = null!;

        public string? Description { get; set; }

        public int CategoryId { get; set; }

        public string CategoryName { get; set; } = null!;

        public string? VoucherCodeType { get; set; }

        public int PointsCost { get; set; }

        public int Stock { get; set; }

        public string Status { get; set; } = null!;

        public string? ImageUrl { get; set; }

        public DateTime? ValidFrom { get; set; }

        public DateTime? ValidUntil { get; set; }
    }
}
