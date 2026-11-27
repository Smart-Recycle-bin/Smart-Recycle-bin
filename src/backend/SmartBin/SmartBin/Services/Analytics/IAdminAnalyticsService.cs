using SmartBin.DTOs.Analytics;

namespace SmartBin.Services.Analytics
{
    public interface IAdminAnalyticsService
    {
        Task<AdminOverviewAnalyticsDto> GetOverviewAnalyticsAsync(
            string? period,
            string? from,
            string? to,
            CancellationToken cancellationToken = default);
    }
}
