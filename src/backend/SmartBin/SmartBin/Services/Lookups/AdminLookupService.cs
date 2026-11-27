using SmartBin.DTOs.Lookups;
using SmartBin.Repositories.Lookups;

namespace SmartBin.Services.Lookups
{
    public class AdminLookupService : IAdminLookupService
    {
        private readonly IAdminLookupRepository _lookupRepository;

        public AdminLookupService(IAdminLookupRepository lookupRepository)
        {
            _lookupRepository = lookupRepository;
        }

        public Task<List<AdminLookupItemDto>> GetAdminsAsync(CancellationToken cancellationToken = default)
        {
            return _lookupRepository.GetAdminLookupsAsync(cancellationToken);
        }

        public Task<List<CollectorLookupItemDto>> GetCollectorsAsync(CancellationToken cancellationToken = default)
        {
            return _lookupRepository.GetActiveCollectorLookupsAsync(cancellationToken);
        }

        public async Task<List<DistrictLookupItemDto>> GetDistrictsAsync(CancellationToken cancellationToken = default)
        {
            var districts = await _lookupRepository.GetDistinctDistrictsAsync(cancellationToken);

            // Region is not currently stored as a distinct domain column in SQL; keep explicit null rather than inventing geography.
            return districts
                .Select(name => new DistrictLookupItemDto
                {
                    Name = name,
                    Region = null
                })
                .ToList();
        }
    }
}
