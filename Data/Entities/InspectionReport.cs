using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System;

namespace depi_project.Data.Entities
{
    [Table("INSPECTION_REPORT")]
    public class InspectionReport
    {
        [Key]
        public int ReportId { get; set; }

        [Required]
        public int SurveyId { get; set; }

        [Required]
        public int DisposalItemId { get; set; } // Unique per item

        [MaxLength(1000)]
        public string? Feedback { get; set; }

        [Required, MaxLength(20)]
        public string ReviewDecision { get; set; } = "pending"; // pending | approved | rejected

        [Required, MaxLength(20)]
        public string RetrainingStatus { get; set; } = "not_sent"; // not_sent | queued | sent | failed

        [Required]
        public DateTime CreatedAt { get; set; }

        public DateTime? ReviewedAt { get; set; }

        public int? ReviewedByAdminId { get; set; }

        public int? CorrectedWasteTypeId { get; set; }
    }
}
