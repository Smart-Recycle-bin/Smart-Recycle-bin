using SmartBin.Models.Constants;
using SmartBin.Repositories.Sessions;
using SmartBin.Services.Sessions;

namespace SmartBin.Services.Bins
{
    public class SessionCoordinationResult
    {
        public int SessionId { get; set; }
        public bool IsActive { get; set; }
        public DateTime WindowExpiresAt { get; set; }
    }

    public interface ISessionCoordinationService
    {
        Task<SessionCoordinationResult> ValidateAndExtendSessionAsync(int sessionId, int extendSeconds = 60);
        Task EnsureSessionActiveAsync(int sessionId, CancellationToken cancellationToken = default);
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
    /// Verifies session is active and atomically resets the 60-second rolling window.
    /// </summary>
    public class SessionCoordinationService : ISessionCoordinationService
    {
        private readonly ISessionRepository _sessionRepository;
        private readonly ISessionRealtimeNotifier _realtimeNotifier;

        public SessionCoordinationService(
            ISessionRepository sessionRepository,
            ISessionRealtimeNotifier realtimeNotifier)
        {
            _sessionRepository = sessionRepository;
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

        public async Task EnsureSessionActiveAsync(int sessionId, CancellationToken cancellationToken = default)
        {
            var isActive = await _sessionRepository.IsSessionActiveAsync(sessionId, DateTime.UtcNow, cancellationToken);

            if (!isActive)
            {
                var session = await _sessionRepository.GetByIdAsync(sessionId, cancellationToken);
                if (session == null)
                {
                    throw new ApiException(404, "SESSION_NOT_FOUND", "Disposal session not found.");
                }

                throw new ApiException(409, "SESSION_NOT_ACTIVE", "The disposal session is no longer active.");
            }
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
