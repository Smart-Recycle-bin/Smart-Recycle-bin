using SmartBin.Dtos.Bins;
using SmartBin.Dtos.Common;

namespace SmartBin.Services.Bins
{
    public interface IBinService
    {
        Task<List<CitizenBinDto>> GetNearbyBinsAsync(double? lat, double? lng, double? radiusKm);
        Task<BinDetailsDto> GetBinDetailsAsync(int binId, string userRole);
        Task<List<SearchBinDto>> SearchBinsAsync(string query, double? lat, double? lng, int limit);
        Task<(List<AdminBinDto> Items, PaginationMetaDto Meta)> GetAdminBinsAsync(
            string? search, string? district, string? status, int? collectorId,
            int page, int pageSize, string? sortBy, string? sortDir);
        Task<(List<BinMapItemDto> Items, BinMapMetaDto Meta)> GetMapBinsAsync(
            string? region, string? status, string? bbox);
        Task<RegisterBinResponseDto> RegisterBinAsync(RegisterBinRequestDto request, int actorAdminId, CancellationToken cancellationToken = default);
        Task<UpdateBinMetadataResponseDto> UpdateBinMetadataAsync(int binId, UpdateBinMetadataRequestDto request, int actorAdminId, CancellationToken cancellationToken = default);
        Task<AssignBinResponseDto> AssignCollectorAsync(int binId, AssignBinRequestDto request, int actorAdminId, CancellationToken cancellationToken = default);
    }

    public interface IIngestionService
    {
        Task<IngestItemResponseDto> IngestItemAsync(int sessionId, IngestItemRequestDto request, string? deviceKey);
    }
}
