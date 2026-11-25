using SmartBin.DTOs.Sessions;
using SmartBin.Models;

namespace SmartBin.Repositories.Sessions
{
    public interface ISessionRepository
    {
        Task<DisposalSession?> GetByIdAsync(int sessionId, CancellationToken cancellationToken = default);
        Task<DisposalSession?> GetByIdWithItemsAsync(int sessionId, CancellationToken cancellationToken = default);
        Task<ApplicationUser?> GetUserAsync(int userId, CancellationToken cancellationToken = default);
        Task<SessionStatusResponseDto?> GetSessionStatusDtoAsync(int sessionId, CancellationToken cancellationToken = default);
        Task<bool> AddAsync(DisposalSession session, CancellationToken cancellationToken = default);
        Task<bool> TerminateSessionIfActiveAsync(int sessionId, DateTime endTime, CancellationToken cancellationToken = default);
        Task<List<int>> GetExpiredActiveSessionIdsAsync(DateTime threshold, CancellationToken cancellationToken = default);
        Task<DateTime?> ExtendSessionWindowIfActiveAsync(int sessionId, int extendSeconds, CancellationToken cancellationToken = default);
        Task<bool> IsSessionActiveAsync(int sessionId, DateTime now, CancellationToken cancellationToken = default);
    }
}
