using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SmartBin.Models.Constants;

namespace SmartBin.Models
{
    [Table("DISPOSAL_SESSION")]
    public class DisposalSession
    {
        [Key]
        public int SessionId { get; set; }

        public DateTime StartTime { get; set; }

        public DateTime? EndTime { get; set; }

        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = SessionStatus.Active;

        public int TotalPoints { get; set; } = 0;

        public int UserId { get; set; }

        public int BinId { get; set; }

        public DateTime? WindowExpiresAt { get; set; }

        [Required]
        [MaxLength(20)]
        public string PointsStatus { get; set; } = Constants.PointsStatus.Pending;

        public ApplicationUser? User { get; set; }

        public SmartBin? Bin { get; set; }

        public DisposalSurvey? Survey { get; set; }

        public ICollection<DisposalItem> Items { get; set; } = new List<DisposalItem>();

        public LedgerTransaction? LedgerTransaction { get; set; }
    }
}
