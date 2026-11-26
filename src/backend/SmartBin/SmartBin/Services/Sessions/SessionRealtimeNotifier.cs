using Microsoft.AspNetCore.SignalR;
using SmartBin.Hubs;

namespace SmartBin.Services.Sessions
{
    public class SessionRealtimeNotifier : ISessionRealtimeNotifier
    {
        private readonly IHubContext<SessionHub> _hubContext;

        public SessionRealtimeNotifier(IHubContext<SessionHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task NotifyItemIngestedAsync(
            int sessionId,
            int itemId,
            string wasteType,
            int estimatedPoints,
            DateTime windowExpiresAt,
            CancellationToken cancellationToken = default)
        {
            var group = _hubContext.Clients.Group(SessionHub.GetGroupName(sessionId));

            await group.SendAsync(
                "ItemReceived",
                new ItemReceivedEventDto
                {
                    ItemId = itemId,
                    WasteType = wasteType,
                    EstimatedPoints = estimatedPoints,
                    WindowExpiresAt = windowExpiresAt
                },
                cancellationToken);

            await group.SendAsync(
                "SessionWindowUpdated",
                new SessionWindowUpdatedEventDto
                {
                    SessionId = sessionId,
                    WindowExpiresAt = windowExpiresAt
                },
                cancellationToken);
        }

        public async Task NotifySessionEndedAsync(
            int sessionId,
            string status,
            string terminationReason,
            int surveyId,
            CancellationToken cancellationToken = default)
        {
            var group = _hubContext.Clients.Group(SessionHub.GetGroupName(sessionId));

            await group.SendAsync(
                "SessionEnded",
                new SessionEndedEventDto
                {
                    SessionId = sessionId,
                    Status = status,
                    TerminationReason = terminationReason
                },
                cancellationToken);

            await group.SendAsync(
                "SurveyReady",
                new SurveyReadyEventDto
                {
                    SessionId = sessionId,
                    SurveyId = surveyId
                },
                cancellationToken);
        }
    }
}
