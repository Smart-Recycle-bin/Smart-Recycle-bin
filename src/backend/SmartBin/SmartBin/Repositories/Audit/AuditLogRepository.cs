using SmartBin.Context;
using SmartBin.Models;

namespace SmartBin.Repositories.Audit
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly AppDbContext _context;

        public AuditLogRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(AuditLog log, CancellationToken cancellationToken = default)
        {
            await _context.AuditLogs.AddAsync(log, cancellationToken);
        }
    }
}