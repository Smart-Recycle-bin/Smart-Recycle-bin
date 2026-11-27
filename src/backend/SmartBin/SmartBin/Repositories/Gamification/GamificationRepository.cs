using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Gamification;
using SmartBin.Models.Constants;

namespace SmartBin.Repositories.Gamification
{
    public class GamificationRepository : IGamificationRepository
    {
        private const string CitizenRoleName = "USER_CITIZEN";

        private readonly AppDbContext _context;

        public GamificationRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(List<LeaderboardEntryDto> Items, int TotalItems)> GetLeaderboardPagedAsync(
            string scope,
            DateTime? periodStartUtc,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            var citizenUsers =
                from u in _context.Users.AsNoTracking()
                join ur in _context.UserRoles.AsNoTracking() on u.Id equals ur.UserId
                join r in _context.Roles.AsNoTracking() on ur.RoleId equals r.Id
                where r.Name == CitizenRoleName
                select u;

            IQueryable<UserScoreRow> scoresQuery;

            if (periodStartUtc.HasValue)
            {
                var cutoff = periodStartUtc.Value;
                scoresQuery = citizenUsers
                    .Select(u => new UserScoreRow
                    {
                        UserId = u.Id,
                        DisplayName = !string.IsNullOrWhiteSpace(u.DisplayName)
                            ? u.DisplayName
                            : (u.Email ?? $"Citizen #{u.Id}"),
                        Score = _context.LedgerTransactions
                            .AsNoTracking()
                            .Where(lt => lt.Wallet != null &&
                                         lt.Wallet.UserId == u.Id &&
                                         lt.CreatedAt >= cutoff &&
                                         (lt.TransactionType == LedgerTransactionType.Credit || lt.PointsDelta > 0))
                            .Sum(lt => (int?)(lt.PointsDelta >= 0 ? lt.PointsDelta : -lt.PointsDelta)) ?? 0
                    });
            }
            else
            {
                scoresQuery =
                    from u in citizenUsers
                    join w in _context.Wallets.AsNoTracking() on u.Id equals w.UserId into walletGroup
                    from w in walletGroup.DefaultIfEmpty()
                    select new UserScoreRow
                    {
                        UserId = u.Id,
                        DisplayName = !string.IsNullOrWhiteSpace(u.DisplayName)
                            ? u.DisplayName
                            : (u.Email ?? $"Citizen #{u.Id}"),
                        Score = w != null ? w.LifetimeEarnedPoints : 0
                    };
            }

            var totalItems = await scoresQuery.CountAsync(cancellationToken);

            var normalizedSortBy = sortBy?.Trim().ToLowerInvariant();
            bool hasSortDir = !string.IsNullOrWhiteSpace(sortDir);
            bool isDesc = hasSortDir
                ? string.Equals(sortDir!.Trim(), "desc", StringComparison.OrdinalIgnoreCase)
                : normalizedSortBy switch
                {
                    "rank" => false, // default rank order is 1, 2, 3...
                    "displayname" or "username" => false,
                    _ => true
                };

            IOrderedQueryable<UserScoreRow> orderedQuery = normalizedSortBy switch
            {
                "rank" => isDesc
                    ? scoresQuery.OrderBy(x => x.Score).ThenByDescending(x => x.UserId)
                    : scoresQuery.OrderByDescending(x => x.Score).ThenBy(x => x.UserId),
                "displayname" or "username" => isDesc
                    ? scoresQuery.OrderByDescending(x => x.DisplayName).ThenByDescending(x => x.Score).ThenBy(x => x.UserId)
                    : scoresQuery.OrderBy(x => x.DisplayName).ThenByDescending(x => x.Score).ThenBy(x => x.UserId),
                "lifetimepoints" or "points" => isDesc
                    ? scoresQuery.OrderByDescending(x => x.Score).ThenBy(x => x.UserId)
                    : scoresQuery.OrderBy(x => x.Score).ThenByDescending(x => x.UserId),
                _ => scoresQuery.OrderByDescending(x => x.Score).ThenBy(x => x.UserId)
            };

            var pageRows = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            var items = new List<LeaderboardEntryDto>(pageRows.Count);
            bool isNaturalRankAscOrder =
                string.IsNullOrEmpty(normalizedSortBy) ||
                normalizedSortBy == "recyclingvolumekg" ||
                (normalizedSortBy == "rank" && !isDesc) ||
                ((normalizedSortBy == "lifetimepoints" || normalizedSortBy == "points") && isDesc);

            bool isNaturalRankDescOrder =
                (normalizedSortBy == "rank" && isDesc) ||
                ((normalizedSortBy == "lifetimepoints" || normalizedSortBy == "points") && !isDesc);

            for (var i = 0; i < pageRows.Count; i++)
            {
                var row = pageRows[i];
                int rank;

                if (isNaturalRankAscOrder)
                {
                    rank = (page - 1) * pageSize + i + 1;
                }
                else if (isNaturalRankDescOrder)
                {
                    rank = totalItems - ((page - 1) * pageSize + i);
                }
                else
                {
                    var aheadCount = await scoresQuery.CountAsync(
                        x => x.Score > row.Score || (x.Score == row.Score && x.UserId < row.UserId),
                        cancellationToken);
                    rank = aheadCount + 1;
                }

                items.Add(new LeaderboardEntryDto
                {
                    Rank = rank,
                    UserId = row.UserId,
                    DisplayName = row.DisplayName,
                    UserName = row.DisplayName,
                    Initials = BuildInitials(row.DisplayName),
                    LifetimePoints = row.Score,
                    Points = row.Score,
                    Scope = scope,
                    RecyclingVolumeKg = null
                });
            }

            return (items, totalItems);
        }

        public async Task<List<MilestoneBadgeDto>> GetMilestoneBadgesAsync(CancellationToken cancellationToken = default)
        {
            var definitions = await _context.BadgeDefinitions
                .AsNoTracking()
                .Where(b => b.IsActive)
                .OrderBy(b => b.DisplayOrder)
                .ThenBy(b => b.RequiredPoints)
                .ThenBy(b => b.BadgeId)
                .ToListAsync(cancellationToken);

            var citizenWallets =
                from w in _context.Wallets.AsNoTracking()
                join ur in _context.UserRoles.AsNoTracking() on w.UserId equals ur.UserId
                join r in _context.Roles.AsNoTracking() on ur.RoleId equals r.Id
                where r.Name == CitizenRoleName
                select w;

            var result = new List<MilestoneBadgeDto>(definitions.Count);
            foreach (var def in definitions)
            {
                var earnedCount = await citizenWallets.CountAsync(
                    w => w.LifetimeEarnedPoints >= def.RequiredPoints,
                    cancellationToken);

                result.Add(new MilestoneBadgeDto
                {
                    BadgeId = def.BadgeId,
                    Name = def.Name,
                    RequiredPoints = def.RequiredPoints,
                    Description = def.Description,
                    ThresholdText = $"{def.RequiredPoints.ToString("N0", CultureInfo.InvariantCulture)} lifetime points",
                    EarnedCount = earnedCount,
                    Icon = def.Icon
                });
            }

            return result;
        }

        private sealed class UserScoreRow
        {
            public int UserId { get; set; }
            public string DisplayName { get; set; } = string.Empty;
            public int Score { get; set; }
        }

        private static string BuildInitials(string displayName)
        {
            if (string.IsNullOrWhiteSpace(displayName))
            {
                return "?";
            }

            var parts = displayName.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length == 0)
            {
                return "?";
            }

            if (parts.Length == 1)
            {
                return parts[0].Substring(0, Math.Min(2, parts[0].Length)).ToUpperInvariant();
            }

            return string.Concat(
                char.ToUpperInvariant(parts[0][0]),
                char.ToUpperInvariant(parts[^1][0]));
        }
    }
}
