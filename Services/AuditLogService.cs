using depi_project.Data.Entities;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using System.Threading;
using System;

namespace EcoBin.Api;

public class AuditLogService(EcoBinDbContext db, IHttpContextAccessor http) : IAuditLogService
{
    public async Task LogAsync(int adminId, string actionType, string resourceType, int resourceId,
        string? reason = null, CancellationToken ct = default)
    {
        db.AuditLogs.Add(new AuditLog
        {
            AdminId = adminId,
            ActionType = actionType,
            ResourceType = resourceType,
            ResourceId = resourceId,
            Reason = reason,
            IpAddress = http.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            Timestamp = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);
    }
}
