using SmartBin.Dtos.Common;
using SmartBin.DTOs.Inspections;

namespace SmartBin.Services.Inspections
{
    public interface IAdminInspectionService
    {
        Task<(List<AdminInspectionReportListItemDto> Items, PaginationMetaDto Meta)> GetReportsAsync(
            string? status,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);

        Task<AdminInspectionSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);

        Task<AdminInspectionReportDetailDto> GetReportDetailAsync(
            int reportId,
            CancellationToken cancellationToken = default);

        Task<List<AdminWasteTypeOptionDto>> GetWasteTypesAsync(CancellationToken cancellationToken = default);

        Task<CorrectInspectionReportResponseDto> CorrectReportAsync(
            int reportId,
            int actorAdminId,
            CorrectInspectionReportRequestDto request,
            CancellationToken cancellationToken = default);

        Task<DismissInspectionReportResponseDto> DismissReportAsync(
            int reportId,
            int actorAdminId,
            DismissInspectionReportRequestDto request,
            CancellationToken cancellationToken = default);

        Task<RetrainInspectionReportResponseDto> QueueReportForRetrainingAsync(
            int reportId,
            int actorAdminId,
            CancellationToken cancellationToken = default);
    }
}
