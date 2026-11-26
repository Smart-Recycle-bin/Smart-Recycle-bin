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

        [Required]
        public int SurveyId { get; set; }

        [Required]
        public int DisposalItemId { get; set; }

        [MaxLength(1000)]
        public string? Feedback { get; set; }

        [Required, MaxLength(20)]
        public string ReviewDecision { get; set; } = InspectionReviewDecision.Pending;

        [Required, MaxLength(20)]
        public string RetrainingStatus { get; set; } = Constants.RetrainingStatus.NotSent;

        [Required]
        public DateTime CreatedAt { get; set; }

        public DateTime? ReviewedAt { get; set; }

        public int? ReviewedByAdminId { get; set; }

        public int? CorrectedWasteTypeId { get; set; }
    }
}