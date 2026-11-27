using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Lookups;

namespace SmartBin.Repositories.Lookups
{
    public class AdminLookupRepository : IAdminLookupRepository
    {
        private const string AdminRoleName = "SYS_ADMIN";
        private const string CollectorRoleName = "OPS_COLLECTOR";
        private readonly AppDbContext _context;

        public AdminLookupRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<AdminLookupItemDto>> GetAdminLookupsAsync(CancellationToken cancellationToken = default)
        {
            var adminRoleId = await _context.Roles
                .AsNoTracking()
                .Where(r => r.Name == AdminRoleName)
                .Select(r => (int?)r.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (!adminRoleId.HasValue)
            {
                return new List<AdminLookupItemDto>();
            }

            var adminUserIds = _context.UserRoles
                .AsNoTracking()
                .Where(ur => ur.RoleId == adminRoleId.Value)
                .Select(ur => ur.UserId);

            var admins = await _context.Users
                .AsNoTracking()
                .Where(u => adminUserIds.Contains(u.Id))
                .Select(u => new
                {
                    u.Id,
                    u.DisplayName,
                    u.Email
                })
                .ToListAsync(cancellationToken);

            return admins
                .Select(u => new AdminLookupItemDto
                {
                    AdminId = u.Id,
                    DisplayName = FormatDisplayName(u.DisplayName, u.Email, "Admin", u.Id)
                })
                .OrderBy(a => a.DisplayName, StringComparer.OrdinalIgnoreCase)
                .ThenBy(a => a.DisplayName, StringComparer.Ordinal)
                .ThenBy(a => a.AdminId)
                .ToList();
        }

        public async Task<List<CollectorLookupItemDto>> GetActiveCollectorLookupsAsync(CancellationToken cancellationToken = default)
        {
            var collectorRoleId = await _context.Roles
                .AsNoTracking()
                .Where(r => r.Name == CollectorRoleName)
                .Select(r => (int?)r.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (!collectorRoleId.HasValue)
            {
                return new List<CollectorLookupItemDto>();
            }

            var now = DateTimeOffset.UtcNow;

            var collectorUserIds = _context.UserRoles
                .AsNoTracking()
                .Where(ur => ur.RoleId == collectorRoleId.Value)
                .Select(ur => ur.UserId);

            var collectors = await _context.Users
                .AsNoTracking()
                .Where(u =>
                    collectorUserIds.Contains(u.Id) &&
                    u.AccountStatus != null &&
                    u.AccountStatus.Trim().ToLower() == "active" &&
                    !(u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd.Value > now))
                .Select(u => new
                {
                    u.Id,
                    u.DisplayName,
                    u.Email
                })
                .ToListAsync(cancellationToken);

            return collectors
                .Select(u => new CollectorLookupItemDto
                {
                    CollectorId = u.Id,
                    DisplayName = FormatDisplayName(u.DisplayName, u.Email, "Collector", u.Id)
                })
                .OrderBy(c => c.DisplayName, StringComparer.OrdinalIgnoreCase)
                .ThenBy(c => c.DisplayName, StringComparer.Ordinal)
                .ThenBy(c => c.CollectorId)
                .ToList();
        }

        private static string FormatDisplayName(string? displayName, string? email, string fallbackPrefix, int id)
        {
            if (!string.IsNullOrWhiteSpace(displayName))
            {
                return displayName.Trim();
            }

            if (!string.IsNullOrWhiteSpace(email))
            {
                return email.Trim();
            }

            return $"{fallbackPrefix} #{id}";
        }

        public async Task<List<string>> GetDistinctDistrictsAsync(CancellationToken cancellationToken = default)
        {
            var binDistricts = await _context.SmartBins
                .AsNoTracking()
                .Where(b => b.District != null && b.District.Trim() != string.Empty)
                .Select(b => b.District!)
                .Distinct()
                .ToListAsync(cancellationToken);

            var collectorRoleId = await _context.Roles
                .AsNoTracking()
                .Where(r => r.Name == CollectorRoleName)
                .Select(r => (int?)r.Id)
                .FirstOrDefaultAsync(cancellationToken);

            List<string> collectorDistricts = new();
            if (collectorRoleId.HasValue)
            {
                var collectorUserIds = _context.UserRoles
                    .AsNoTracking()
                    .Where(ur => ur.RoleId == collectorRoleId.Value)
                    .Select(ur => ur.UserId);

                collectorDistricts = await _context.Users
                    .AsNoTracking()
                    .Where(u =>
                        collectorUserIds.Contains(u.Id) &&
                        u.District != null &&
                        u.District.Trim() != string.Empty)
                    .Select(u => u.District!)
                    .Distinct()
                    .ToListAsync(cancellationToken);
            }

            var unique = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var raw in binDistricts.Concat(collectorDistricts))
            {
                var trimmed = raw.Trim();
                if (!string.IsNullOrEmpty(trimmed))
                {
                    unique.Add(trimmed);
                }
            }

            return unique
                .OrderBy(d => d, StringComparer.OrdinalIgnoreCase)
                .ThenBy(d => d, StringComparer.Ordinal)
                .ToList();
        }
    }
}
