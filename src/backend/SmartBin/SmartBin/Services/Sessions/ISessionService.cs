using SmartBin.DTOs.Sessions;

namespace SmartBin.Services.Sessions
{
    public interface ISessionService
    {
        Task<StartSessionResponseDto> StartSessionAsync(
            int userId,
            int binId,
            StartSessionRequestDto request,
            CancellationToken cancellationToken = default);

        Task<SessionStatusResponseDto> GetSessionStatusAsync(
            int userId,
            int sessionId,
            CancellationToken cancellationToken = default);

        Task<EndSessionResponseDto> EndSessionAsync(
            int userId,
            int sessionId,
            CancellationToken cancellationToken = default);

        Task<int> ProcessExpiredSessionsAsync(CancellationToken cancellationToken = default);
    }
}
