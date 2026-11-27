using SmartBin.DTOs.Inspections;
using SmartBin.Models;

namespace SmartBin.Repositories.Inspections
{
    public interface IAdminInspectionRepository
    {
        Task<(List<AdminInspectionReportListItemDto> Items, int TotalItems)> GetReportsPagedAsync(
            string? status,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);

        Task<AdminInspectionSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);

        Task<AdminInspectionReportDetailDto?> GetReportDetailAsync(
            int reportId,
            CancellationToken cancellationToken = default);

        Task<List<AdminWasteTypeOptionDto>> GetWasteTypesAsync(CancellationToken cancellationToken = default);

        Task<WasteType?> GetWasteTypeByIdAsync(int wasteTypeId, CancellationToken cancellationToken = default);

        Task<InspectionReport?> GetReportStateAsync(int reportId, CancellationToken cancellationToken = default);

        Task<bool> TryResolvePendingReportAsync(
            int reportId,
            string status,
            string reviewDecision,
            int? confirmedWasteTypeId,
            string adminJustification,
            int actorAdminId,
            DateTime reviewedAt,
            CancellationToken cancellationToken = default);

        Task<bool> TryQueueReportForRetrainingAsync(
            int reportId,
            int actorAdminId,
            DateTime requestedAt,
            CancellationToken cancellationToken = default);

        Task<(int PointsDelta, int TransactionId)?> GetSessionAwardLedgerAsync(
            int sessionId,
            CancellationToken cancellationToken = default);
    }
}
