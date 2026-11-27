using SmartBin.DTOs.Analytics;

namespace SmartBin.Repositories.Analytics
{
    public interface IAdminAnalyticsRepository
    {
        Task<AdminOverviewAnalyticsDto> GetOverviewAnalyticsAsync(
            DateTime fromUtc,
            DateTime toBoundUtc,
            bool toExclusive,
            CancellationToken cancellationToken = default);
    }
}
