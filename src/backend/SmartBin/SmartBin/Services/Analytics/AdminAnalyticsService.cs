using System.Globalization;
using SmartBin.DTOs.Analytics;
using SmartBin.Repositories.Analytics;

namespace SmartBin.Services.Analytics
{
    public class AdminAnalyticsService : IAdminAnalyticsService
    {
        private const int MaxRangeDays = 366;

        private static readonly HashSet<string> AllowedPeriods = new(StringComparer.OrdinalIgnoreCase)
        {
            "today",
            "7d",
            "30d",
            "custom"
        };

        private readonly IAdminAnalyticsRepository _analyticsRepository;

        public AdminAnalyticsService(IAdminAnalyticsRepository analyticsRepository)
        {
            _analyticsRepository = analyticsRepository;
        }

        public Task<AdminOverviewAnalyticsDto> GetOverviewAnalyticsAsync(
            string? period,
            string? from,
            string? to,
            CancellationToken cancellationToken = default)
        {
            var (fromUtc, toBoundUtc, toExclusive) = ResolveDateWindow(period, from, to);

            return _analyticsRepository.GetOverviewAnalyticsAsync(
                fromUtc,
                toBoundUtc,
                toExclusive,
                cancellationToken);
        }

        private static (DateTime FromUtc, DateTime ToBoundUtc, bool ToExclusive) ResolveDateWindow(
            string? period,
            string? from,
            string? to)
        {
            string? normalizedPeriod = null;
            if (!string.IsNullOrWhiteSpace(period))
            {
                normalizedPeriod = period.Trim().ToLowerInvariant();
                if (!AllowedPeriods.Contains(normalizedPeriod))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid period parameter.",
                        new[] { new { field = "period", message = "Must be today, 7d, 30d, or custom." } });
                }
            }

            var hasFrom = !string.IsNullOrWhiteSpace(from);
            var hasTo = !string.IsNullOrWhiteSpace(to);

            DateTime? parsedFromUtc = null;
            DateTime? parsedToBoundUtc = null;
            DateTime? parsedToCompareUtc = null;
            bool toExclusive = false;

            if (hasFrom)
            {
                if (!TryParseUtcQueryDate(from!, isUpperBound: false, out var fromVal, out _, out _))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid date range.",
                        new[] { new { field = "from", message = "Must be a valid ISO date (YYYY-MM-DD) or timestamp." } });
                }

                parsedFromUtc = fromVal;
            }

            if (hasTo)
            {
                if (!TryParseUtcQueryDate(to!, isUpperBound: true, out var toBoundVal, out var toCompareVal, out var exclusive))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid date range.",
                        new[] { new { field = "to", message = "Must be a valid ISO date (YYYY-MM-DD) or timestamp." } });
                }

                parsedToBoundUtc = toBoundVal;
                parsedToCompareUtc = toCompareVal;
                toExclusive = exclusive;
            }

            if (parsedFromUtc.HasValue && parsedToCompareUtc.HasValue && parsedFromUtc.Value > parsedToCompareUtc.Value)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid date range.",
                    new[] { new { field = "to", message = "Must be on or after 'from'." } });
            }

            var utcTodayStart = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
            var utcTomorrowStart = utcTodayStart.AddDays(1);

            DateTime finalFrom;
            DateTime finalToBound;
            bool finalToExclusive;

            if (hasFrom || hasTo)
            {
                if (hasFrom && hasTo)
                {
                    finalFrom = parsedFromUtc!.Value;
                    finalToBound = parsedToBoundUtc!.Value;
                    finalToExclusive = toExclusive;
                }
                else if (hasFrom)
                {
                    finalFrom = parsedFromUtc!.Value;
                    finalToBound = finalFrom > utcTodayStart ? finalFrom.AddDays(1) : utcTomorrowStart;
                    finalToExclusive = true;
                }
                else
                {
                    finalToBound = parsedToBoundUtc!.Value;
                    finalFrom = parsedToCompareUtc!.Value.AddDays(-6);
                    finalToExclusive = toExclusive;
                }
            }
            else
            {
                finalFrom = normalizedPeriod switch
                {
                    "today" => utcTodayStart,
                    "30d" => utcTodayStart.AddDays(-29),
                    _ => utcTodayStart.AddDays(-6) // "7d", "custom" without dates yet, or omitted
                };
                finalToBound = utcTomorrowStart;
                finalToExclusive = true;
            }

            if ((finalToBound - finalFrom).TotalDays > MaxRangeDays)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Date range exceeds maximum allowed window.",
                    new[] { new { field = "to", message = $"Date range cannot exceed {MaxRangeDays} days." } });
            }

            return (finalFrom, finalToBound, finalToExclusive);
        }

        private static bool TryParseUtcQueryDate(
            string rawValue,
            bool isUpperBound,
            out DateTime boundUtc,
            out DateTime comparableStartUtc,
            out bool isExclusive)
        {
            var trimmed = rawValue.Trim();

            if (DateOnly.TryParseExact(trimmed, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateOnly))
            {
                var dayStartUtc = DateTime.SpecifyKind(dateOnly.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
                comparableStartUtc = dayStartUtc;
                if (isUpperBound)
                {
                    boundUtc = dayStartUtc.AddDays(1);
                    isExclusive = true;
                }
                else
                {
                    boundUtc = dayStartUtc;
                    isExclusive = false;
                }
                return true;
            }

            if (DateTimeOffset.TryParse(
                trimmed,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var dto))
            {
                var utc = DateTime.SpecifyKind(dto.UtcDateTime, DateTimeKind.Utc);
                comparableStartUtc = utc;
                boundUtc = utc;
                isExclusive = false;
                return true;
            }

            boundUtc = default;
            comparableStartUtc = default;
            isExclusive = false;
            return false;
        }
    }
}
