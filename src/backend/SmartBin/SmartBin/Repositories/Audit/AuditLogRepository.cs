using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Audit;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Repositories.Audit
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly AppDbContext _context;

        public AuditLogRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(AuditLog entry, CancellationToken cancellationToken = default)
        {
            await _context.AuditLogs.AddAsync(entry, cancellationToken);
        }

        public async Task<string?> ResolveAdminDisplayNameAsync(int adminId, CancellationToken cancellationToken = default)
        {
            var user = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id == adminId)
                .Select(u => new { u.DisplayName, u.Email })
                .FirstOrDefaultAsync(cancellationToken);

            if (user == null)
            {
                return null;
            }

            return !string.IsNullOrWhiteSpace(user.DisplayName)
                ? user.DisplayName.Trim()
                : (!string.IsNullOrWhiteSpace(user.Email) ? user.Email.Trim() : null);
        }

        public async Task<(List<AdminAuditLogItemDto> Items, int TotalItems)> GetAuditLogsPagedAsync(
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
            CancellationToken cancellationToken = default)
        {
            var query = _context.AuditLogs
                .AsNoTracking()
                .AsQueryable();

            if (adminId.HasValue)
            {
                query = query.Where(a => a.AdminId == adminId.Value);
            }

            if (!string.IsNullOrWhiteSpace(actionType))
            {
                var normalizedAction = actionType.Trim().ToUpperInvariant();
                if (normalizedAction == AuditActionTypes.CatalogChange)
                {
                    query = query.Where(a =>
                        a.ActionType == AuditActionTypes.CatalogChange ||
                        a.ActionType == AuditActionTypes.RewardCreate ||
                        a.ActionType == AuditActionTypes.RewardUpdate ||
                        a.ActionType == AuditActionTypes.RewardArchive);
                }
                else
                {
                    query = query.Where(a => a.ActionType == normalizedAction);
                }
            }

            if (!string.IsNullOrWhiteSpace(resourceType))
            {
                var normalizedResourceType = resourceType.Trim().ToUpperInvariant();
                query = query.Where(a => a.ResourceType == normalizedResourceType);
            }

            if (!string.IsNullOrWhiteSpace(resourceId))
            {
                var trimmedResourceId = resourceId.Trim();
                query = query.Where(a => a.ResourceId.Contains(trimmedResourceId));
            }

            if (fromUtc.HasValue)
            {
                query = query.Where(a => a.CreatedAt >= fromUtc.Value);
            }

            if (toBoundUtc.HasValue)
            {
                query = toExclusive
                    ? query.Where(a => a.CreatedAt < toBoundUtc.Value)
                    : query.Where(a => a.CreatedAt <= toBoundUtc.Value);
            }

            var totalItems = await query.CountAsync(cancellationToken);

            var projected = query.Select(a => new
            {
                a.AuditId,
                a.CreatedAt,
                a.AdminId,
                ResolvedAdminName = !string.IsNullOrWhiteSpace(a.AdminName)
                    ? a.AdminName
                    : (a.Admin != null && !string.IsNullOrWhiteSpace(a.Admin.DisplayName)
                        ? a.Admin.DisplayName
                        : string.Empty),
                a.ActionType,
                a.ResourceType,
                a.ResourceId,
                a.Justification,
                a.IpAddress
            });

            var isDesc = !string.Equals(sortDir?.Trim(), "asc", StringComparison.OrdinalIgnoreCase);
            var normalizedSortBy = sortBy?.Trim().ToLowerInvariant();

            var orderedQuery = normalizedSortBy switch
            {
                "auditid" => isDesc
                    ? projected.OrderByDescending(x => x.AuditId)
                    : projected.OrderBy(x => x.AuditId),
                "adminname" => isDesc
                    ? projected.OrderByDescending(x => x.ResolvedAdminName).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId)
                    : projected.OrderBy(x => x.ResolvedAdminName).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId),
                "actiontype" => isDesc
                    ? projected.OrderByDescending(x => x.ActionType).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId)
                    : projected.OrderBy(x => x.ActionType).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId),
                "resourcetype" => isDesc
                    ? projected.OrderByDescending(x => x.ResourceType).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId)
                    : projected.OrderBy(x => x.ResourceType).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId),
                "resourceid" => isDesc
                    ? projected.OrderByDescending(x => x.ResourceId).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId)
                    : projected.OrderBy(x => x.ResourceId).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId),
                "ipaddress" => isDesc
                    ? projected.OrderByDescending(x => x.IpAddress).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId)
                    : projected.OrderBy(x => x.IpAddress).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId),
                "timestamp" or "createdat" => isDesc
                    ? projected.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId)
                    : projected.OrderBy(x => x.CreatedAt).ThenBy(x => x.AuditId),
                _ => projected.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId)
            };

            var rows = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            var items = rows.Select(r =>
            {
                var adminName = string.IsNullOrWhiteSpace(r.ResolvedAdminName)
                    ? $"Admin #{r.AdminId}"
                    : r.ResolvedAdminName.Trim();

                return new AdminAuditLogItemDto
                {
                    AuditId = r.AuditId,
                    Timestamp = EnsureUtc(r.CreatedAt),
                    AdminId = r.AdminId,
                    AdminName = adminName,
                    AdminInitials = BuildInitials(adminName),
                    ActionType = r.ActionType,
                    ResourceType = r.ResourceType,
                    ResourceId = r.ResourceId,
                    Justification = r.Justification,
                    IpAddress = r.IpAddress
                };
            }).ToList();

            return (items, totalItems);
        }

        private static string BuildInitials(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return "AD";
            }

            var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length == 0)
            {
                return "AD";
            }

            if (parts.Length == 1)
            {
                return parts[0].Substring(0, Math.Min(2, parts[0].Length)).ToUpperInvariant();
            }

            return string.Concat(
                char.ToUpperInvariant(parts[0][0]),
                char.ToUpperInvariant(parts[^1][0]));
        }

        private static DateTime EnsureUtc(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };
        }
    }
}
