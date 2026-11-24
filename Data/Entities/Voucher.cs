using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EcoBin.Api;

namespace depi_project.Data.Entities
{
    [Table("VOUCHER")]
    public class Voucher
    {
        [Key]
        public int VoucherId { get; set; }

        [Required]
        public int RedemptionId { get; set; }

        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        public int UserId { get; set; }

        [Required]
        public int RewardId { get; set; }

        [Required]
        public DateTime IssuedAt { get; set; }

        [Required]
        public DateTime RedeemedAt { get; set; }

        public DateTime? ExpiryDate { get; set; }

        [Required, MaxLength(20)]
        public string Status { get; set; } = "unused"; // unused | used | expired

        [Required]
        public int PointsSpent { get; set; }

        [Required, Column(TypeName = "decimal(18,2)")]
        public decimal ValueEgpAtRedemption { get; set; }

        [ForeignKey(nameof(RewardId))]
        public Reward Reward { get; set; } = null!;
    }
}