using SmartBin.DTOs.Lookups;

namespace SmartBin.Repositories.Lookups
{
    public interface IAdminLookupRepository
    {
        Task<List<AdminLookupItemDto>> GetAdminLookupsAsync(CancellationToken cancellationToken = default);
        Task<List<CollectorLookupItemDto>> GetActiveCollectorLookupsAsync(CancellationToken cancellationToken = default);
        Task<List<string>> GetDistinctDistrictsAsync(CancellationToken cancellationToken = default);
    }
}
