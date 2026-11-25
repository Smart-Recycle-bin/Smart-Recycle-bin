namespace SmartBin.Services.Surveys
{
    public class CreateDisputedReportItemDto
    {
        public int ItemId { get; set; }
        public int AiWasteTypeId { get; set; }
        public int UserSelectedWasteTypeId { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public decimal? AiConfidence { get; set; }
    }

    public class CreateInspectionReportsRequestDto
    {
        public int SessionId { get; set; }
        public int SurveyId { get; set; }
        public int UserId { get; set; }
        public int AiRating { get; set; }
        public List<CreateDisputedReportItemDto> DisputedItems { get; set; } = new();
    }

    public class SessionInspectionReportStatusDto
    {
        public int ReportId { get; set; }
        public int ItemId { get; set; }
        public bool IsResolved { get; set; }
        public bool IsAccepted { get; set; }
        public int? AdminConfirmedWasteTypeId { get; set; }
    }

    public interface IMember5InspectionService
    {
        Task<List<int>> CreateInspectionReportsAsync(
            CreateInspectionReportsRequestDto request,
            CancellationToken cancellationToken = default);

        Task<List<SessionInspectionReportStatusDto>> GetSessionReportsAsync(
            int sessionId,
            CancellationToken cancellationToken = default);
    }
}
