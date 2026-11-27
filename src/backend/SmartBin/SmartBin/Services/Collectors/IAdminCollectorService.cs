using SmartBin.Dtos.Common;
using SmartBin.DTOs.Collectors;

namespace SmartBin.Services.Collectors
{
    public interface IAdminCollectorService
    {
        Task<(List<AdminCollectorDto> Items, PaginationMetaDto Meta)> GetCollectorsAsync(
            string? search,
            string? district,
            string? status,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);

        Task<CreateCollectorResponseDto> CreateCollectorAsync(
            int actorAdminId,
            CreateCollectorRequestDto request,
            CancellationToken cancellationToken = default);

        Task<AdminCollectorDto> UpdateCollectorAsync(
            int collectorId,
            int actorAdminId,
            UpdateCollectorRequestDto request,
            CancellationToken cancellationToken = default);

        Task<(List<AdminAssignedBinDto> Items, PaginationMetaDto Meta)> GetAssignedBinsAsync(
            int collectorId,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default);

        Task<DeactivateCollectorResponseDto> DeactivateCollectorAsync(
            int collectorId,
            int actorAdminId,
            CancellationToken cancellationToken = default);
    }
}
