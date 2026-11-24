using SmartBin.Dtos.Bins;
using SmartBin.Dtos.Common;

namespace SmartBin.Services.Bins
{
    public interface IBinService
    {
        Task<List<CitizenBinDto>> GetNearbyBinsAsync(double? lat, double? lng, double? radiusKm);
        Task<BinDetailsDto> GetBinDetailsAsync(int binId, string userRole);
        Task<List<SearchBinDto>> SearchBinsAsync(string query, double? lat, double? lng, int limit);
        Task<(List<AdminBinDto> Items, PaginationMetaDto Meta, AdminBinSummaryDto Summary)> GetAdminBinsAsync(
            string? search, string? district, string? status, int? collectorId,
            int page, int pageSize, string? sortBy, string? sortDir);
        Task<RegisterBinResponseDto> RegisterBinAsync(RegisterBinRequestDto request);
        Task<UpdateBinMetadataResponseDto> UpdateBinMetadataAsync(int binId, UpdateBinMetadataRequestDto request);
    }

    public interface IIngestionService
    {
        Task<IngestItemResponseDto> IngestItemAsync(int sessionId, IngestItemRequestDto request, string? deviceKey);
    }
}
