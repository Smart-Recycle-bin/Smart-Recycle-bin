using SmartBin.Models;

namespace SmartBin.Repositories.Audit
{
    public interface IAuditLogRepository
    {
        Task AddAsync(AuditLog log, CancellationToken cancellationToken = default);
    }
}