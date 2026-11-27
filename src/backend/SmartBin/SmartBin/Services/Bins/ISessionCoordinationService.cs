using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Sessions;
using SmartBin.Repositories.Surveys;
using SmartBin.Services.Sessions;

namespace SmartBin.Services.Bins
{
    public class SessionCoordinationResult
    {
        public int SessionId { get; set; }
        public bool IsActive { get; set; }
        public DateTime WindowExpiresAt { get; set; }
    }

    public class ActiveSessionContext
    {
        public int SessionId { get; set; }
        public int BinId { get; set; }
        public int UserId { get; set; }
    }

    public interface ISessionCoordinationService
    {
        Task<SessionCoordinationResult> ValidateAndExtendSessionAsync(int sessionId, int extendSeconds = 60);
        Task<ActiveSessionContext> EnsureSessionActiveAsync(int sessionId, CancellationToken cancellationToken = default);
        Task<ActiveSessionContext> ResolveActiveSessionForBinAsync(int binId, CancellationToken cancellationToken = default);
        Task<DateTime> ExtendSessionWindowAsync(int sessionId, int extendSeconds = 60, CancellationToken cancellationToken = default);
        Task NotifyItemIngestedAsync(
            int sessionId,
            int itemId,
            string wasteType,
            int estimatedPoints,
            DateTime windowExpiresAt,
            CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Database-backed coordination service backed by ISessionRepository.
    /// Verifies active session locks and atomically resets the 60-second rolling window.
    /// </summary>
    public class SessionCoordinationService : ISessionCoordinationService
    {
        private readonly ISessionRepository _sessionRepository;
        private readonly ISurveyRepository _surveyRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ISessionRealtimeNotifier _realtimeNotifier;

        public SessionCoordinationService(
            ISessionRepository sessionRepository,
            ISurveyRepository surveyRepository,
            IUnitOfWork unitOfWork,
            ISessionRealtimeNotifier realtimeNotifier)
        {
            _sessionRepository = sessionRepository;
            _surveyRepository = surveyRepository;
            _unitOfWork = unitOfWork;
            _realtimeNotifier = realtimeNotifier;
        }

        public async Task<SessionCoordinationResult> ValidateAndExtendSessionAsync(int sessionId, int extendSeconds = 60)
        {
            var newExpiresAt = await ExtendSessionWindowAsync(sessionId, extendSeconds);
            return new SessionCoordinationResult
            {
                SessionId = sessionId,
                IsActive = true,
                WindowExpiresAt = newExpiresAt
            };
        }

        public async Task<ActiveSessionContext> EnsureSessionActiveAsync(int sessionId, CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;
            var session = await _sessionRepository.GetByIdAsync(sessionId, cancellationToken);

            if (session == null)
            {
                throw new ApiException(404, "SESSION_NOT_FOUND", "Disposal session not found.");
            }

            if (!string.Equals(session.Status, SessionStatus.Active, StringComparison.Ordinal) ||
                !session.WindowExpiresAt.HasValue ||
                session.WindowExpiresAt.Value <= now)
            {
                throw new ApiException(409, "SESSION_NOT_ACTIVE", "The disposal session is no longer active.");
            }

            return new ActiveSessionContext
            {
                SessionId = session.SessionId,
                BinId = session.BinId,
                UserId = session.UserId
            };
        }

        public async Task<ActiveSessionContext> ResolveActiveSessionForBinAsync(int binId, CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;
            var activeSessions = await _sessionRepository.GetActiveSessionsByBinIdAsync(binId, cancellationToken);

            foreach (var stale in activeSessions.Where(s => !s.WindowExpiresAt.HasValue || s.WindowExpiresAt.Value <= now))
            {
                var terminated = await _sessionRepository.TerminateSessionIfActiveAsync(stale.SessionId, now, cancellationToken);
                if (terminated)
                {
                    var survey = await _surveyRepository.EnsureSurveyCreatedAsync(stale.SessionId, now, cancellationToken);
                    await _unitOfWork.SaveChangesAsync(cancellationToken);
                    await _realtimeNotifier.NotifySessionEndedAsync(
                        stale.SessionId,
                        SessionStatus.Terminated,
                        SessionTerminationReason.Timeout,
                        survey.SurveyId,
                        cancellationToken);
                }
            }

            var current = activeSessions.FirstOrDefault(s => s.WindowExpiresAt.HasValue && s.WindowExpiresAt.Value > now);
            if (current == null)
            {
                throw new ApiException(
                    409,
                    "NO_ACTIVE_SESSION",
                    "No active user session is currently locked on this bin. Scan the bin QR code to start a session.");
            }

            return new ActiveSessionContext
            {
                SessionId = current.SessionId,
                BinId = current.BinId,
                UserId = current.UserId
            };
        }

        public async Task<DateTime> ExtendSessionWindowAsync(
            int sessionId,
            int extendSeconds = 60,
            CancellationToken cancellationToken = default)
        {
            var extended = await _sessionRepository.ExtendSessionWindowIfActiveAsync(sessionId, extendSeconds, cancellationToken);

            if (!extended.HasValue)
            {
                var session = await _sessionRepository.GetByIdAsync(sessionId, cancellationToken);
                if (session == null)
                {
                    throw new ApiException(404, "SESSION_NOT_FOUND", "Disposal session not found.");
                }

                throw new ApiException(409, "SESSION_NOT_ACTIVE", "The disposal session is no longer active.");
            }

            return extended.Value;
        }

        public Task NotifyItemIngestedAsync(
            int sessionId,
            int itemId,
            string wasteType,
            int estimatedPoints,
            DateTime windowExpiresAt,
            CancellationToken cancellationToken = default)
        {
            return _realtimeNotifier.NotifyItemIngestedAsync(
                sessionId,
                itemId,
                wasteType,
                estimatedPoints,
                windowExpiresAt,
                cancellationToken);
        }
    }
}
