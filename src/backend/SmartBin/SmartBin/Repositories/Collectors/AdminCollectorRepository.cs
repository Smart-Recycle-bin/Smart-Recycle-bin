using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Collectors;

namespace SmartBin.Repositories.Collectors
{
    public class AdminCollectorRepository : IAdminCollectorRepository
    {
        private const string CollectorRoleName = "OPS_COLLECTOR";
        private readonly AppDbContext _context;

        public AdminCollectorRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(List<AdminCollectorDto> Items, int TotalItems)> GetCollectorsPagedAsync(
            string? search,
            string? district,
            string? status,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            var collectorRoleId = await _context.Roles
                .AsNoTracking()
                .Where(r => r.Name == CollectorRoleName)
                .Select(r => (int?)r.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (!collectorRoleId.HasValue)
            {
                return (new List<AdminCollectorDto>(), 0);
            }

            var collectorUserIds = _context.UserRoles
                .AsNoTracking()
                .Where(ur => ur.RoleId == collectorRoleId.Value)
                .Select(ur => ur.UserId);

            var query = _context.Users
                .AsNoTracking()
                .Where(u => collectorUserIds.Contains(u.Id));

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                var hasId = int.TryParse(s, out var parsedId);
                query = query.Where(u =>
                    (hasId && u.Id == parsedId) ||
                    u.DisplayName.Contains(s) ||
                    (u.Email != null && u.Email.Contains(s)) ||
                    (u.PhoneNumber != null && u.PhoneNumber.Contains(s)) ||
                    (u.District != null && u.District.Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(district))
            {
                var normalizedDistrict = district.Trim().ToLower();
                query = query.Where(u => u.District != null && u.District.ToLower() == normalizedDistrict);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToLower();
                query = query.Where(u => u.AccountStatus.ToLower() == normalizedStatus);
            }

            int totalItems = await query.CountAsync(cancellationToken);

            var projected = query.Select(u => new
            {
                CollectorId = u.Id,
                Name = u.DisplayName,
                Email = u.Email ?? string.Empty,
                Phone = u.PhoneNumber ?? string.Empty,
                District = u.District ?? string.Empty,
                AssignedBinsCount = _context.SmartBins.Count(b => b.CollectorId == u.Id),
                Status = u.AccountStatus,
                u.LastActiveAt,
                u.CreatedAt
            });

            bool isDesc = string.Equals(sortDir?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);
            var normalizedSortBy = sortBy?.Trim().ToLowerInvariant();

            var orderedQuery = normalizedSortBy switch
            {
                "name" => isDesc
                    ? projected.OrderByDescending(x => x.Name).ThenByDescending(x => x.CollectorId)
                    : projected.OrderBy(x => x.Name).ThenBy(x => x.CollectorId),
                "email" => isDesc
                    ? projected.OrderByDescending(x => x.Email).ThenByDescending(x => x.CollectorId)
                    : projected.OrderBy(x => x.Email).ThenBy(x => x.CollectorId),
                "phone" => isDesc
                    ? projected.OrderByDescending(x => x.Phone).ThenByDescending(x => x.CollectorId)
                    : projected.OrderBy(x => x.Phone).ThenBy(x => x.CollectorId),
                "district" => isDesc
                    ? projected.OrderByDescending(x => x.District).ThenByDescending(x => x.CollectorId)
                    : projected.OrderBy(x => x.District).ThenBy(x => x.CollectorId),
                "assignedbinscount" => isDesc
                    ? projected.OrderByDescending(x => x.AssignedBinsCount).ThenByDescending(x => x.CollectorId)
                    : projected.OrderBy(x => x.AssignedBinsCount).ThenBy(x => x.CollectorId),
                "status" => isDesc
                    ? projected.OrderByDescending(x => x.Status).ThenByDescending(x => x.CollectorId)
                    : projected.OrderBy(x => x.Status).ThenBy(x => x.CollectorId),
                "lastactiveat" => isDesc
                    ? projected.OrderByDescending(x => x.LastActiveAt).ThenByDescending(x => x.CollectorId)
                    : projected.OrderBy(x => x.LastActiveAt).ThenBy(x => x.CollectorId),
                "createdat" => isDesc
                    ? projected.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.CollectorId)
                    : projected.OrderBy(x => x.CreatedAt).ThenBy(x => x.CollectorId),
                _ => projected.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.CollectorId)
            };

            var rows = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            var items = rows.Select(x => new AdminCollectorDto
            {
                CollectorId = x.CollectorId,
                Name = x.Name,
                Email = x.Email,
                Phone = x.Phone,
                District = x.District,
                AssignedBinsCount = x.AssignedBinsCount,
                Status = x.Status,
                LastActiveAt = x.LastActiveAt
            }).ToList();

            return (items, totalItems);
        }

        public async Task<(List<AdminAssignedBinDto> Items, int TotalItems)> GetAssignedBinsPagedAsync(
            int collectorId,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var query = _context.SmartBins
                .AsNoTracking()
                .Where(b => b.CollectorId == collectorId);

            int totalItems = await query.CountAsync(cancellationToken);

            var rows = await query
                .OrderByDescending(b => b.FillLevel)
                .ThenBy(b => b.BinId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new
                {
                    b.BinId,
                    b.Name,
                    b.Area,
                    b.District,
                    b.FillLevel,
                    b.Status,
                    LastServicedAt = b.ServiceRecords.Max(sr => (DateTime?)sr.ServicedAt)
                })
                .ToListAsync(cancellationToken);

            var items = rows.Select(b => new AdminAssignedBinDto
            {
                BinId = b.BinId,
                Name = string.IsNullOrWhiteSpace(b.Name) ? $"Bin#{b.BinId:D3}" : b.Name,
                Area = b.Area ?? string.Empty,
                District = b.District ?? string.Empty,
                FillLevel = b.FillLevel,
                Status = b.Status,
                LastServicedAt = b.LastServicedAt
            }).ToList();

            return (items, totalItems);
        }

        public async Task<int> CountAssignedBinsAsync(
            int collectorId,
            CancellationToken cancellationToken = default)
        {
            return await _context.SmartBins
                .AsNoTracking()
                .CountAsync(b => b.CollectorId == collectorId, cancellationToken);
        }
    }
}
