using SmartBin.DTOs.Collectors;

namespace SmartBin.Repositories.Collectors
{
    public interface IAdminCollectorRepository
    {
        Task<(List<AdminCollectorDto> Items, int TotalItems)> GetCollectorsPagedAsync(
            string? search,
            string? district,
            string? status,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);

        Task<(List<AdminAssignedBinDto> Items, int TotalItems)> GetAssignedBinsPagedAsync(
            int collectorId,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default);

        Task<int> CountAssignedBinsAsync(
            int collectorId,
            CancellationToken cancellationToken = default);
    }
}
