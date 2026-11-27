namespace SmartBin.Services.Audit
{
    public interface IAuditLogService
    {
        Task LogAsync(
            int adminId,
            string actionType,
            string resourceType,
            int resourceId,
            string? reason = null,
            CancellationToken cancellationToken = default);
    }
}