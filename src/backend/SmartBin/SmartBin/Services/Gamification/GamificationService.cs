using SmartBin.Dtos.Common;
using SmartBin.DTOs.Gamification;
using SmartBin.Repositories.Gamification;

namespace SmartBin.Services.Gamification
{
    public class GamificationService : IGamificationService
    {
        private static readonly HashSet<string> AllowedScopes = new(StringComparer.OrdinalIgnoreCase)
        {
            "weekly",
            "monthly",
            "all-time"
        };

        private static readonly HashSet<string> AllowedSortFields = new(StringComparer.OrdinalIgnoreCase)
        {
            "rank",
            "displayName",
            "userName",
            "lifetimePoints",
            "points",
            "recyclingVolumeKg"
        };

        private readonly IGamificationRepository _gamificationRepository;

        public GamificationService(IGamificationRepository gamificationRepository)
        {
            _gamificationRepository = gamificationRepository;
        }

        public async Task<(List<LeaderboardEntryDto> Items, PaginationMetaDto Meta)> GetLeaderboardAsync(
            string? scope,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            var normalizedScope = string.IsNullOrWhiteSpace(scope)
                ? "weekly"
                : scope.Trim().ToLowerInvariant();

            if (!AllowedScopes.Contains(normalizedScope))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid scope.",
                    new[] { new { field = "scope", message = "Must be weekly, monthly or all-time." } });
            }

            if (page < 1)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid pagination values.",
                    new[] { new { field = "page", message = "page must be greater than or equal to 1." } });
            }

            if (pageSize < 1 || pageSize > 100)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid pagination values.",
                    new[] { new { field = "pageSize", message = "pageSize must be between 1 and 100." } });
            }

            string? normalizedSortBy = null;
            if (!string.IsNullOrWhiteSpace(sortBy))
            {
                normalizedSortBy = sortBy.Trim();
                if (!AllowedSortFields.Contains(normalizedSortBy))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid sortBy value.",
                        new[]
                        {
                            new
                            {
                                field = "sortBy",
                                message = "Must be one of rank, displayName, userName, lifetimePoints, points, recyclingVolumeKg."
                            }
                        });
                }
            }

            string? normalizedSortDir = null;
            if (!string.IsNullOrWhiteSpace(sortDir))
            {
                normalizedSortDir = sortDir.Trim().ToLowerInvariant();
                if (normalizedSortDir != "asc" && normalizedSortDir != "desc")
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid sortDir value.",
                        new[] { new { field = "sortDir", message = "Must be asc or desc." } });
                }
            }

            DateTime? periodStartUtc = normalizedScope switch
            {
                "weekly" => DateTime.UtcNow.AddDays(-7),
                "monthly" => DateTime.UtcNow.AddDays(-30),
                _ => null
            };

            var (items, totalItems) = await _gamificationRepository.GetLeaderboardPagedAsync(
                normalizedScope,
                periodStartUtc,
                page,
                pageSize,
                normalizedSortBy,
                normalizedSortDir,
                cancellationToken);

            var meta = new PaginationMetaDto
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)pageSize)
            };

            return (items, meta);
        }

        public Task<List<MilestoneBadgeDto>> GetMilestoneBadgesAsync(CancellationToken cancellationToken = default)
        {
            return _gamificationRepository.GetMilestoneBadgesAsync(cancellationToken);
        }
    }
}
