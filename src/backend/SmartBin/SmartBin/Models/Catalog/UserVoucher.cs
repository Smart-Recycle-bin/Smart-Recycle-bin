using System.ComponentModel.DataAnnotations;

namespace SmartBin.Models
{
    public class UserVoucher
    {
        public int VoucherId { get; set; }

        public int UserId { get; set; }

        public int RewardId { get; set; }

        [Required]
        [MaxLength(32)]
        public string VoucherCode { get; set; } = null!;

        public int PointsDeducted { get; set; }

        public int DenominationEgp { get; set; }

        public bool IsUsed { get; set; } = false;

        public DateTime RedeemedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ApplicationUser? User { get; set; }
        public Reward? Reward { get; set; }
    }
}
