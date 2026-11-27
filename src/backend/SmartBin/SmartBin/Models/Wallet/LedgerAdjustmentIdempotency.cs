using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartBin.Models
{
    [Table("LEDGER_ADJUSTMENT_IDEMPOTENCY")]
    public class LedgerAdjustmentIdempotency
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(128)]
        public string IdempotencyKey { get; set; } = string.Empty;

        [Required]
        [MaxLength(64)]
        public string RequestHash { get; set; } = string.Empty;

        public int AdminUserId { get; set; }

        public int TransactionId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ApplicationUser? AdminUser { get; set; }

        public LedgerTransaction? Transaction { get; set; }
    }
}
