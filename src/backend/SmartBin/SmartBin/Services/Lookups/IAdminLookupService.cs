using SmartBin.DTOs.Lookups;

namespace SmartBin.Services.Lookups
{
    public interface IAdminLookupService
    {
        Task<List<AdminLookupItemDto>> GetAdminsAsync(CancellationToken cancellationToken = default);
        Task<List<CollectorLookupItemDto>> GetCollectorsAsync(CancellationToken cancellationToken = default);
        Task<List<DistrictLookupItemDto>> GetDistrictsAsync(CancellationToken cancellationToken = default);
    }
}
