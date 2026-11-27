using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs.Inspections
{
    public class AdminInspectionReportListItemDto
    {
        public int ReportId { get; set; }
        public string? AirId { get; set; }
        public int SessionId { get; set; }
        public int BinId { get; set; }
        public string? BinName { get; set; }
        public string? ImageThumbnailUrl { get; set; }
        public string MlPredictedWasteType { get; set; } = string.Empty;
        public decimal? MlConfidence { get; set; }
        public string UserSelectedWasteType { get; set; } = string.Empty;
        public string UserFeedback { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ReviewDecision { get; set; }
        public string RetrainingStatus { get; set; } = string.Empty;
    }

    public class AdminInspectionReportDetailDto
    {
        public int ReportId { get; set; }
        public string? AirId { get; set; }
        public int SessionId { get; set; }
        public int BinId { get; set; }
        public string? BinName { get; set; }
        public string UserName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<string> CapturedFrames { get; set; } = new();
        public string UserFeedback { get; set; } = string.Empty;
        public string UserSelectedWasteType { get; set; } = string.Empty;
        public int? AiRating { get; set; }
        public string? MlModelVersion { get; set; }
        public string PredictedWasteType { get; set; } = string.Empty;
        public decimal? PredictedConfidence { get; set; }
        public int EstimatedPoints { get; set; }
        public Dictionary<string, decimal>? ClassConfidences { get; set; }
        public string? ReviewDecision { get; set; }
        public string? ConfirmedWasteType { get; set; }
        public string? AdminJustification { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string RetrainingStatus { get; set; } = string.Empty;
    }

    public class AdminInspectionSummaryDto
    {
        public int? LabelledImagesCount { get; set; }
        public int? TargetImagesThreshold { get; set; }
        public int? RemainingUntilRetrain { get; set; }
        public int PendingReviewCount { get; set; }
        public int ReviewedCount { get; set; }
        public int SentToRetrainingCount { get; set; }
    }

    public class AdminWasteTypeOptionDto
    {
        public int WasteTypeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int BasePoints { get; set; }
    }

    public class CorrectInspectionReportRequestDto
    {
        [Required(ErrorMessage = "wasteTypeId is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "wasteTypeId must be a positive integer.")]
        public int? WasteTypeId { get; set; }

        [Required(ErrorMessage = "adminJustification is required.")]
        [MaxLength(500, ErrorMessage = "adminJustification cannot exceed 500 characters.")]
        public string AdminJustification { get; set; } = string.Empty;
    }

    public class DismissInspectionReportRequestDto
    {
        [Required(ErrorMessage = "adminJustification is required.")]
        [MaxLength(500, ErrorMessage = "adminJustification cannot exceed 500 characters.")]
        public string AdminJustification { get; set; } = string.Empty;
    }

    public class CorrectInspectionReportResponseDto
    {
        public int ReportId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string ReviewDecision { get; set; } = string.Empty;
        public string ConfirmedWasteType { get; set; } = string.Empty;
        public int PointsCredited { get; set; }
        public int? TransactionId { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime ResolvedAt { get; set; }
    }

    public class DismissInspectionReportResponseDto
    {
        public int ReportId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string ReviewDecision { get; set; } = string.Empty;
        public int PointsCredited { get; set; }
        public int? TransactionId { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime ResolvedAt { get; set; }
    }

    public class RetrainInspectionReportResponseDto
    {
        public int ReportId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string RetrainingStatus { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime ResolvedAt { get; set; }
    }
}
