using SmartBin.Dtos.Common;
using SmartBin.DTOs.Audit;

namespace SmartBin.Services.Audit
{
    public interface IAuditLogService
    {
        Task RecordAsync(
            int actorAdminId,
            string actionType,
            string resourceType,
            string resourceId,
            string justification,
            CancellationToken cancellationToken = default);

        Task<(List<AdminAuditLogItemDto> Items, PaginationMetaDto Meta)> GetAuditLogsAsync(
            int? adminId,
            string? actionType,
            string? resourceType,
            string? resourceId,
            string? from,
            string? to,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);
    }
}
