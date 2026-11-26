using SmartBin.Models;
using SmartBin.Repositories;
using SmartBin.Repositories.Audit;

namespace SmartBin.Services.Audit
{
    public class AuditLogService : IAuditLogService
    {
        private readonly IAuditLogRepository _auditLogRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AuditLogService(
            IAuditLogRepository auditLogRepository,
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _auditLogRepository = auditLogRepository;
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task LogAsync(
            int adminId,
            string actionType,
            string resourceType,
            int resourceId,
            string? reason = null,
            CancellationToken cancellationToken = default)
        {
            var entry = new AuditLog
            {
                AdminId = adminId,
                ActionType = actionType,
                ResourceType = resourceType,
                ResourceId = resourceId,
                Reason = reason,
                IpAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString(),
                Timestamp = DateTime.UtcNow
            };

            await _auditLogRepository.AddAsync(entry, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }
}