namespace SmartBin.Services.Sessions
{
    public class ItemReceivedEventDto
    {
        public int ItemId { get; set; }
        public string WasteType { get; set; } = string.Empty;
        public int EstimatedPoints { get; set; }
        public DateTime WindowExpiresAt { get; set; }
    }

    public class SessionWindowUpdatedEventDto
    {
        public int SessionId { get; set; }
        public DateTime WindowExpiresAt { get; set; }
    }

    public class SessionEndedEventDto
    {
        public int SessionId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string TerminationReason { get; set; } = string.Empty;
    }

    public class SurveyReadyEventDto
    {
        public int SessionId { get; set; }
        public int SurveyId { get; set; }
    }

    public interface ISessionRealtimeNotifier
    {
        Task NotifyItemIngestedAsync(
            int sessionId,
            int itemId,
            string wasteType,
            int estimatedPoints,
            DateTime windowExpiresAt,
            CancellationToken cancellationToken = default);

        Task NotifySessionEndedAsync(
            int sessionId,
            string status,
            string terminationReason,
            int surveyId,
            CancellationToken cancellationToken = default);
    }
}
