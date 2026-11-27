using SmartBin.DTOs.Inspections;
using SmartBin.Models;
using SmartBin.Services.Surveys;

namespace SmartBin.Repositories.Inspections
{
    public interface IInspectionRepository
    {
        Task<(List<InspectionListItemDto> Items, int TotalItems)> ListPagedAsync(
            string? status,
            string? search,
            string? sortBy,
            string? sortDir,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default);

        Task<InspectionSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
        Task<InspectionDetailDto?> GetDetailAsync(int reportId, CancellationToken cancellationToken = default);
        Task<InspectionReport?> GetByIdAsync(int reportId, CancellationToken cancellationToken = default);
        Task<int?> GetSessionIdByReportIdAsync(int reportId, CancellationToken cancellationToken = default);
        Task AcquireSessionLockAsync(int sessionId, CancellationToken cancellationToken = default);
        Task<bool> HasPendingReportsForSessionAsync(int sessionId, CancellationToken cancellationToken = default);
        Task<(int? PointsAwarded, int? TransactionId)> GetSessionFinalizationInfoAsync(int sessionId, CancellationToken cancellationToken = default);
        Task AddRangeAsync(IEnumerable<InspectionReport> reports, CancellationToken cancellationToken = default);
        Task<HashSet<int>> GetExistingReportItemIdsAsync(IEnumerable<int> itemIds, CancellationToken cancellationToken = default);
        Task<List<SessionInspectionReportStatusDto>> GetSessionReportsForFinalizationAsync(int sessionId, CancellationToken cancellationToken = default);
    }
}