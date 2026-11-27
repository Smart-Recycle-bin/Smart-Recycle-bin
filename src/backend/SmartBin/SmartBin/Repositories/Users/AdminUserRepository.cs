using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Users;

namespace SmartBin.Repositories.Users
{
    public class AdminUserRepository : IAdminUserRepository
    {
        private const string CitizenRoleName = "USER_CITIZEN";
        private readonly AppDbContext _context;

        public AdminUserRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(List<AdminRecyclerDto> Items, int TotalItems)> GetRecyclersPagedAsync(
            string? search,
            string? status,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            var citizenRoleId = await _context.Roles
                .AsNoTracking()
                .Where(r => r.Name == CitizenRoleName)
                .Select(r => (int?)r.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (!citizenRoleId.HasValue)
            {
                return (new List<AdminRecyclerDto>(), 0);
            }

            var citizenUserIds = _context.UserRoles
                .AsNoTracking()
                .Where(ur => ur.RoleId == citizenRoleId.Value)
                .Select(ur => ur.UserId);

            var query = _context.Users
                .AsNoTracking()
                .Where(u => citizenUserIds.Contains(u.Id));

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                var hasId = int.TryParse(s, out var parsedId);
                query = query.Where(u =>
                    (hasId && u.Id == parsedId) ||
                    u.DisplayName.Contains(s) ||
                    (u.Email != null && u.Email.Contains(s)) ||
                    (u.PhoneNumber != null && u.PhoneNumber.Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToLower();
                query = query.Where(u => u.AccountStatus.ToLower() == normalizedStatus);
            }

            int totalItems = await query.CountAsync(cancellationToken);

            var projected = query.Select(u => new AdminRecyclerDto
            {
                UserId = u.Id,
                Name = u.DisplayName,
                Email = u.Email ?? string.Empty,
                Phone = u.PhoneNumber,
                AvailablePoints = _context.Wallets
                    .Where(w => w.UserId == u.Id)
                    .Select(w => (int?)w.AvailablePoints)
                    .FirstOrDefault() ?? 0,
                LifetimePoints = _context.Wallets
                    .Where(w => w.UserId == u.Id)
                    .Select(w => (int?)w.LifetimeEarnedPoints)
                    .FirstOrDefault() ?? 0,
                TotalSessions = _context.DisposalSessions
                    .Count(ds => ds.UserId == u.Id),
                Status = u.AccountStatus,
                JoinedAt = u.CreatedAt
            });

            bool isDesc = string.Equals(sortDir?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);
            var normalizedSortBy = sortBy?.Trim().ToLowerInvariant();

            IOrderedQueryable<AdminRecyclerDto> orderedQuery = normalizedSortBy switch
            {
                "name" => isDesc
                    ? projected.OrderByDescending(x => x.Name).ThenByDescending(x => x.UserId)
                    : projected.OrderBy(x => x.Name).ThenBy(x => x.UserId),
                "email" => isDesc
                    ? projected.OrderByDescending(x => x.Email).ThenByDescending(x => x.UserId)
                    : projected.OrderBy(x => x.Email).ThenBy(x => x.UserId),
                "availablepoints" => isDesc
                    ? projected.OrderByDescending(x => x.AvailablePoints).ThenByDescending(x => x.UserId)
                    : projected.OrderBy(x => x.AvailablePoints).ThenBy(x => x.UserId),
                "lifetimepoints" => isDesc
                    ? projected.OrderByDescending(x => x.LifetimePoints).ThenByDescending(x => x.UserId)
                    : projected.OrderBy(x => x.LifetimePoints).ThenBy(x => x.UserId),
                "totalsessions" => isDesc
                    ? projected.OrderByDescending(x => x.TotalSessions).ThenByDescending(x => x.UserId)
                    : projected.OrderBy(x => x.TotalSessions).ThenBy(x => x.UserId),
                "status" => isDesc
                    ? projected.OrderByDescending(x => x.Status).ThenByDescending(x => x.UserId)
                    : projected.OrderBy(x => x.Status).ThenBy(x => x.UserId),
                "joinedat" => isDesc
                    ? projected.OrderByDescending(x => x.JoinedAt).ThenByDescending(x => x.UserId)
                    : projected.OrderBy(x => x.JoinedAt).ThenBy(x => x.UserId),
                _ => projected.OrderByDescending(x => x.JoinedAt).ThenByDescending(x => x.UserId)
            };

            var items = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return (items, totalItems);
        }
    }
}
