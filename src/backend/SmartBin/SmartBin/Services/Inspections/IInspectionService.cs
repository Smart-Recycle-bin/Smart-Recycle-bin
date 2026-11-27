using SmartBin.DTOs.Common;
using SmartBin.DTOs.Inspections;

namespace SmartBin.Services.Inspections
{
    public interface IInspectionService
    {
        Task<(List<InspectionListItemDto> Items, InspectionSummaryDto Summary, PaginationMeta Meta)> ListAsync(
            string? status,
            string? search,
            string? sortBy,
            string? sortDir,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default);

        Task<InspectionDetailDto> GetAsync(
            int reportId,
            CancellationToken cancellationToken = default);

        Task<ResolveInspectionResultDto> CorrectAsync(
            int adminId,
            int reportId,
            string? wasteTypeName,
            CancellationToken cancellationToken = default);

        Task<ResolveInspectionResultDto> DismissAsync(
            int adminId,
            int reportId,
            CancellationToken cancellationToken = default);

        Task<RetrainResultDto> RetrainAsync(
            int adminId,
            int reportId,
            CancellationToken cancellationToken = default);
    }
}