using System.ComponentModel.DataAnnotations;
using SmartBin.DTOs.Sessions;

namespace SmartBin.DTOs.Surveys
{
    public class SessionSurveyResponseDto
    {
        public int SurveyId { get; set; }
        public int SessionId { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<SessionItemDto> Items { get; set; } = new();
        public int TotalPoints { get; set; }
    }

    public class ConfirmSurveyResponseDto
    {
        public int SessionId { get; set; }
        public string SurveyStatus { get; set; } = string.Empty;
        public string Outcome { get; set; } = string.Empty;
        public string PointsStatus { get; set; } = string.Empty;
        public int PointsAwarded { get; set; }
        public int NewAvailablePoints { get; set; }
        public int NewLifetimePoints { get; set; }
    }

    public class MySurveyItemDto
    {
        public int SurveyId { get; set; }
        public int SurveyNumber { get; set; }
        public int SessionId { get; set; }
        public int BinId { get; set; }
        public string BinName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Outcome { get; set; }
        public string PointsStatus { get; set; } = string.Empty;
        public int EstimatedPoints { get; set; }
        public int Points => EstimatedPoints;
        public int? PointsAwarded { get; set; }
        public DateTime CreatedAt { get; set; }
        public string TimeAgo => CreatedAt > DateTime.UtcNow.AddHours(-1)
            ? $"{(int)Math.Max(1, (DateTime.UtcNow - CreatedAt).TotalMinutes)} min ago"
            : CreatedAt.ToString("MMM dd, h:mm tt");
        public List<SurveyDetailItemDto> Items { get; set; } = new();
    }

    public class SurveyPaginationMetaDto
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
        public int PendingPoints { get; set; }
    }

    public class PagedSurveysResponseDto
    {
        public bool Success { get; set; } = true;
        public List<MySurveyItemDto> Data { get; set; } = new();
        public SurveyPaginationMetaDto Meta { get; set; } = new();
    }

    public class SubmitSurveyCorrectionItemDto
    {
        [Required(ErrorMessage = "itemId is required.")]
        public int ItemId { get; set; }

        [Required(ErrorMessage = "confirmedWasteType is required.")]
        public string ConfirmedWasteType { get; set; } = string.Empty;
    }

    public class SubmitSurveyCorrectionsRequestDto
    {
        [Required(ErrorMessage = "aiRating is required.")]
        [Range(1, 5, ErrorMessage = "aiRating must be between 1 and 5.")]
        public int? AiRating { get; set; }

        [Required(ErrorMessage = "items is required.")]
        public List<SubmitSurveyCorrectionItemDto>? Items { get; set; }
    }

    public class SubmitSurveyCorrectionsResponseDto
    {
        public int SurveyId { get; set; }
        public int SessionId { get; set; }
        public string SurveyStatus { get; set; } = string.Empty;
        public string Outcome { get; set; } = string.Empty;
        public string PointsStatus { get; set; } = string.Empty;
        public int? PointsAwarded { get; set; }
        public int TotalPointsAwarded => PointsAwarded ?? 0;
        public List<int> FlaggedReportIds { get; set; } = new();
    }

    public class SurveyDetailItemDto
    {
        public int ItemId { get; set; }
        public string DetectedWasteType { get; set; } = string.Empty;
        public string ConfirmedWasteType { get; set; } = string.Empty;
        public int Points { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsCorrected { get; set; }
    }

    public class SurveyDetailResponseDto
    {
        public int SurveyId { get; set; }
        public int SurveyNumber { get; set; }
        public int SessionId { get; set; }
        public int BinId { get; set; }
        public string BinName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int Points { get; set; }
        public string TimeAgo { get; set; } = string.Empty;
        public List<SurveyDetailItemDto> Items { get; set; } = new();
    }
}
