using SmartBin.DTOs.Audit;
using SmartBin.Models;

namespace SmartBin.Repositories.Audit
{
    public interface IAuditLogRepository
    {
        Task AddAsync(AuditLog entry, CancellationToken cancellationToken = default);

        Task<string?> ResolveAdminDisplayNameAsync(int adminId, CancellationToken cancellationToken = default);

        Task<(List<AdminAuditLogItemDto> Items, int TotalItems)> GetAuditLogsPagedAsync(
            int? adminId,
            string? actionType,
            string? resourceType,
            string? resourceId,
            DateTime? fromUtc,
            DateTime? toBoundUtc,
            bool toExclusive,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);
    }
}
