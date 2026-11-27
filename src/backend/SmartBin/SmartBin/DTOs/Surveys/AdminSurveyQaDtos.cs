namespace SmartBin.DTOs.Surveys
{
    public class SurveyQaKpiSummaryDto
    {
        public int TotalSurveys { get; set; }
        public int ConfirmedCount { get; set; }
        public int RejectedCount { get; set; }
        public double ConfirmRate { get; set; }
        public double RejectRate { get; set; }
        public double? ConfirmRateDeltaPp { get; set; }
        public double? RejectRateDeltaPp { get; set; }
        public int FlaggedToAiQueue { get; set; }
        public decimal? AverageAiRating { get; set; }
    }

    public class SurveyQaSplitDto
    {
        public int Confirmed { get; set; }
        public int Rejected { get; set; }
    }

    public class RejectionRateTrendPointDto
    {
        public string Date { get; set; } = string.Empty;
        public double RejectionRate { get; set; }
        public int TotalCount { get; set; }
        public int RejectedCount { get; set; }
    }

    public class BinRejectionRateDto
    {
        public int BinId { get; set; }
        public string BinName { get; set; } = string.Empty;
        public double RejectionRate { get; set; }
        public int RejectedCount { get; set; }
        public int TotalCount { get; set; }
    }

    public class WasteCategoryRejectionRateDto
    {
        public string Category { get; set; } = string.Empty;
        public double RejectionRate { get; set; }
        public int RejectedCount { get; set; }
        public int TotalCount { get; set; }
    }

    public class SurveyQaSummaryResponseDto
    {
        public SurveyQaKpiSummaryDto Kpis { get; set; } = new();
        public int ConfirmCount { get; set; }
        public int RejectCount { get; set; }
        public SurveyQaSplitDto Split { get; set; } = new();
        public List<RejectionRateTrendPointDto> RejectionTrend { get; set; } = new();
        public List<BinRejectionRateDto> HighestRejectionBins { get; set; } = new();
        public List<WasteCategoryRejectionRateDto> RejectionByCategory { get; set; } = new();
    }

    public class RecentSurveyOutcomeDto
    {
        public int SurveyId { get; set; }
        public int SessionId { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string ItemsSummary { get; set; } = string.Empty;
        public int Points { get; set; }
        public int PointsAwarded { get; set; }
        public string Result { get; set; } = string.Empty;
        public string Outcome { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }
}
