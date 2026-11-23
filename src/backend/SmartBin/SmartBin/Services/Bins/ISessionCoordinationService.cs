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
    }

    /// <summary>
    /// Coordination service stub simulating Member 2's DISPOSAL_SESSION service
    /// Verifies session is active and atomically resets the 60-second window.
    /// </summary>
    public class SessionCoordinationService : ISessionCoordinationService
    {
        // Thread-safe in-memory session registry for V1 coordination
        private static readonly Dictionary<int, (bool IsActive, DateTime ExpiresAt)> _sessions = new()
        {
            [9021] = (true, DateTime.UtcNow.AddSeconds(60)),
            [1001] = (true, DateTime.UtcNow.AddSeconds(60)),
            [1002] = (false, DateTime.UtcNow.AddMinutes(-5)) // Expired / inactive session
        };

        public Task<SessionCoordinationResult> ValidateAndExtendSessionAsync(int sessionId, int extendSeconds = 60)
        {
            lock (_sessions)
            {
                if (!_sessions.TryGetValue(sessionId, out var session))
                {
                    // Allow positive session IDs in simulator if not explicitly recorded as inactive
                    if (sessionId > 0 && sessionId != 9999)
                    {
                        var newExpiresAt = DateTime.UtcNow.AddSeconds(extendSeconds);
                        _sessions[sessionId] = (true, newExpiresAt);
                        return Task.FromResult(new SessionCoordinationResult
                        {
                            SessionId = sessionId,
                            IsActive = true,
                            WindowExpiresAt = newExpiresAt
                        });
                    }

                    throw new ApiException(404, "SESSION_NOT_FOUND", "Disposal session not found.");
                }

                if (!session.IsActive || DateTime.UtcNow > session.ExpiresAt)
                {
                    throw new ApiException(409, "SESSION_NOT_ACTIVE", "The disposal session is no longer active.");
                }

                var extendedExpiresAt = DateTime.UtcNow.AddSeconds(extendSeconds);
                _sessions[sessionId] = (true, extendedExpiresAt);

                return Task.FromResult(new SessionCoordinationResult
                {
                    SessionId = sessionId,
                    IsActive = true,
                    WindowExpiresAt = extendedExpiresAt
                });
            }
        }
    }
}
