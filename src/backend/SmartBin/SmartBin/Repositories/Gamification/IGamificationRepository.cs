using SmartBin.DTOs.Gamification;

namespace SmartBin.Repositories.Gamification
{
    public interface IGamificationRepository
    {
        Task<(List<LeaderboardEntryDto> Items, int TotalItems)> GetLeaderboardPagedAsync(
            string scope,
            DateTime? periodStartUtc,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);

        Task<List<MilestoneBadgeDto>> GetMilestoneBadgesAsync(CancellationToken cancellationToken = default);
    }
}
