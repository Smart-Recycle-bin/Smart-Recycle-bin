using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Services.Audit;

namespace SmartBin.Controllers.Audit
{
    [ApiController]
    [Route("api/v1/admin/audit-logs")]
    [Authorize(Roles = "SYS_ADMIN")]
    public class AdminAuditLogsController : ControllerBase
    {
        private readonly IAuditLogService _auditLogService;

        public AdminAuditLogsController(IAuditLogService auditLogService)
        {
            _auditLogService = auditLogService;
        }

        /// <summary>
        /// E74 — Read-only paginated administrative audit log trail
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAuditLogs(
            [FromQuery] int? adminId = null,
            [FromQuery] string? actionType = null,
            [FromQuery] string? resourceType = null,
            [FromQuery] string? resourceId = null,
            [FromQuery] string? from = null,
            [FromQuery] string? to = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = "timestamp",
            [FromQuery] string? sortDir = "desc",
            CancellationToken cancellationToken = default)
        {
            var (items, meta) = await _auditLogService.GetAuditLogsAsync(
                adminId,
                actionType,
                resourceType,
                resourceId,
                from,
                to,
                page,
                pageSize,
                sortBy,
                sortDir,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = items,
                meta
            });
        }
    }
}
