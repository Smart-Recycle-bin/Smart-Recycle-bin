
using System.ComponentModel.DataAnnotations;

namespace SmartBin.Models
{
    public class Reward
    {
        public int RewardId { get; set; }

        [Required]
        public string Name { get; set; } = null!;

        public string? Description { get; set; }

        public int CategoryId { get; set; }

        public RewardCategory Category { get; set; } = null!;

        public int PointsCost { get; set; }

        public int StockQuantity { get; set; } = 0;

        public string? ImageUrl { get; set; }

        public string? VoucherCodeType { get; set; }

        public DateTime? ValidFrom { get; set; }

        public DateTime? ValidUntil { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; }
    }
}
