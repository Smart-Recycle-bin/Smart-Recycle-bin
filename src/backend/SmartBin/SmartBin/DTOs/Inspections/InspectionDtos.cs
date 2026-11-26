using System.Text.Json.Serialization;

namespace SmartBin.DTOs.Inspections
{
    public class InspectionListItemDto
    {
        public int ReportId { get; set; }
        public int SessionId { get; set; }
        public int BinId { get; set; }
        public string BinName { get; set; } = string.Empty;
        public string ImageThumbnailUrl { get; set; } = string.Empty;
        public string MlPredictedWasteType { get; set; } = string.Empty;
        public decimal MlConfidence { get; set; }
        public string? UserFeedback { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ReviewDecision { get; set; }
        public string RetrainingStatus { get; set; } = string.Empty;
    }

    public class InspectionSummaryDto
    {
        public int LabelledImages { get; set; }
        public int PendingReviews { get; set; }
        public int ReviewedReports { get; set; }
        public int ImagesUntilNextRetraining { get; set; }
        public int NextRetrainingThreshold { get; set; }
    }

    public class InspectionDetailDto
    {
        public int ReportId { get; set; }
        public int SessionId { get; set; }
        public int BinId { get; set; }
        public int RecyclerId { get; set; }
        public string RecyclerName { get; set; } = string.Empty;
        public string? UserFeedback { get; set; }
        public string MlPredictedWasteType { get; set; } = string.Empty;
        public int EstimatedPoints { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public string? ReviewDecision { get; set; }
        public string RetrainingStatus { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class ResolveInspectionResultDto
    {
        public int ReportId { get; set; }
        public string ReviewDecision { get; set; } = string.Empty;

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ConfirmedWasteType { get; set; }

        public bool SessionPointsFinalized { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? PointsAwarded { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? TransactionId { get; set; }
    }

    public class RetrainResultDto
    {
        public int ReportId { get; set; }
        public string RetrainingStatus { get; set; } = string.Empty;
    }

    public class CorrectInspectionRequestDto
    {
        public string? WasteTypeId { get; set; }
    }
}