using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SmartBin.Models.Constants;

namespace SmartBin.Models
{
    [Table("INSPECTION_REPORT")]
    public class InspectionReport
    {
        [Key]
        public int ReportId { get; set; }

        public int ItemId { get; set; }

        public int SurveyId { get; set; }

        public int SessionId { get; set; }

        public int UserId { get; set; }

        public int BinId { get; set; }

        public int PredictedWasteTypeId { get; set; }

        public int UserSelectedWasteTypeId { get; set; }

        [Column(TypeName = "decimal(5, 4)")]
        public decimal? PredictedConfidence { get; set; }

        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        public int? AiRating { get; set; }

        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = InspectionReportStatus.Pending;

        [MaxLength(30)]
        public string? ReviewDecision { get; set; }

        public int? ConfirmedWasteTypeId { get; set; }

        [MaxLength(500)]
        public string? AdminJustification { get; set; }

        public int? ReviewedByAdminId { get; set; }

        public DateTime? ReviewedAt { get; set; }

        [Required]
        [MaxLength(30)]
        public string RetrainingStatus { get; set; } = InspectionRetrainingStatus.NotSent;

        public DateTime? RetrainingRequestedAt { get; set; }

        public int? RetrainingRequestedByAdminId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DisposalItem? Item { get; set; }

        public DisposalSurvey? Survey { get; set; }

        public DisposalSession? Session { get; set; }

        public ApplicationUser? User { get; set; }

        public SmartBin? Bin { get; set; }

        public WasteType? PredictedWasteType { get; set; }

        public WasteType? UserSelectedWasteType { get; set; }

        public WasteType? ConfirmedWasteType { get; set; }
    }
}
