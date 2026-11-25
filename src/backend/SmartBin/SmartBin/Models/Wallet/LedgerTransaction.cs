using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartBin.Models
{
    [Table("LEDGER_TRANSACTION")]
    public class LedgerTransaction
    {
        [Key]
        public int TransactionId { get; set; }

        public int WalletId { get; set; }

        public int? SessionId { get; set; }

        public int? VoucherId { get; set; }

        [Required]
        [MaxLength(20)]
        public string TransactionType { get; set; } = string.Empty;

        public int PointsDelta { get; set; }

        public int RunningBalance { get; set; }

        [Required]
        [MaxLength(40)]
        public string Source { get; set; } = string.Empty;

        public int? CreatedByAdminId { get; set; }

        [MaxLength(100)]
        public string? ReasonCode { get; set; }

        [MaxLength(500)]
        public string? ReasonNote { get; set; }

        public DateTime CreatedAt { get; set; }

        public Wallet? Wallet { get; set; }

        public DisposalSession? Session { get; set; }

        public ApplicationUser? CreatedByAdmin { get; set; }
    }
}
