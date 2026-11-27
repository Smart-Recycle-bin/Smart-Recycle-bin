using SmartBin.Dtos.Common;
using SmartBin.DTOs.Gamification;

namespace SmartBin.Services.Gamification
{
    public interface IGamificationService
    {
        Task<(List<LeaderboardEntryDto> Items, PaginationMetaDto Meta)> GetLeaderboardAsync(
            string? scope,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);

        Task<List<MilestoneBadgeDto>> GetMilestoneBadgesAsync(CancellationToken cancellationToken = default);
    }
}
