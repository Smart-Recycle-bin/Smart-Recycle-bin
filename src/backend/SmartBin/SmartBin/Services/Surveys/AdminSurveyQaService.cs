using System.Globalization;
using SmartBin.Dtos.Common;
using SmartBin.DTOs.Surveys;
using SmartBin.Repositories.Surveys;

namespace SmartBin.Services.Surveys
{
    public class AdminSurveyQaService : IAdminSurveyQaService
    {
        private static readonly HashSet<string> AllowedOutcomes = new(StringComparer.OrdinalIgnoreCase)
        {
            "confirmed",
            "rejected"
        };

        private static readonly HashSet<string> AllowedSortFields = new(StringComparer.OrdinalIgnoreCase)
        {
            "sessionId",
            "userName",
            "points",
            "pointsAwarded",
            "result",
            "outcome",
            "timestamp",
            "createdAt"
        };

        private readonly IAdminSurveyQaRepository _surveyQaRepository;

        public AdminSurveyQaService(IAdminSurveyQaRepository surveyQaRepository)
        {
            _surveyQaRepository = surveyQaRepository;
        }

        public Task<SurveyQaSummaryResponseDto> GetSummaryAsync(
            string? from,
            string? to,
            CancellationToken cancellationToken = default)
        {
            var (fromUtc, toBoundUtc, toExclusive) = ParseDateRange(from, to);

            return _surveyQaRepository.GetSummaryAsync(
                fromUtc,
                toBoundUtc,
                toExclusive,
                cancellationToken);
        }

        public async Task<(List<RecentSurveyOutcomeDto> Items, PaginationMetaDto Meta)> GetRecentSurveysAsync(
            string? from,
            string? to,
            string? outcome,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            var (fromUtc, toBoundUtc, toExclusive) = ParseDateRange(from, to);

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

            string? normalizedOutcome = null;
            if (!string.IsNullOrWhiteSpace(outcome))
            {
                normalizedOutcome = outcome.Trim().ToLowerInvariant();
                if (!AllowedOutcomes.Contains(normalizedOutcome))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid outcome filter.",
                        new[] { new { field = "outcome", message = "Must be confirmed or rejected." } });
                }
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
                                message = "Must be one of sessionId, userName, points, pointsAwarded, result, outcome, timestamp, createdAt."
                            }
                        });
                }
            }

            var normalizedSortDir = string.IsNullOrWhiteSpace(sortDir) ? "desc" : sortDir.Trim().ToLowerInvariant();
            if (normalizedSortDir != "asc" && normalizedSortDir != "desc")
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid sortDir value.",
                    new[] { new { field = "sortDir", message = "Must be asc or desc." } });
            }

            var (items, totalItems) = await _surveyQaRepository.GetRecentSurveysPagedAsync(
                fromUtc,
                toBoundUtc,
                toExclusive,
                normalizedOutcome,
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

        private static (DateTime? FromUtc, DateTime? ToBoundUtc, bool ToExclusive) ParseDateRange(string? from, string? to)
        {
            DateTime? fromUtc = null;
            DateTime? toCompareUtc = null;
            DateTime? toBoundUtc = null;
            bool toExclusive = false;

            if (!string.IsNullOrWhiteSpace(from))
            {
                if (!TryParseUtcQueryDate(from, isUpperBound: false, out var parsedFrom, out var fromCompare, out _))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid date range.",
                        new[] { new { field = "from", message = "Must be a valid ISO date (YYYY-MM-DD) or timestamp." } });
                }

                fromUtc = parsedFrom;
                _ = fromCompare;
            }

            if (!string.IsNullOrWhiteSpace(to))
            {
                if (!TryParseUtcQueryDate(to, isUpperBound: true, out var parsedToBound, out var parsedToCompare, out var exclusive))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid date range.",
                        new[] { new { field = "to", message = "Must be a valid ISO date (YYYY-MM-DD) or timestamp." } });
                }

                toBoundUtc = parsedToBound;
                toCompareUtc = parsedToCompare;
                toExclusive = exclusive;
            }

            if (fromUtc.HasValue && toCompareUtc.HasValue && fromUtc.Value > toCompareUtc.Value)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid date range.",
                    new[] { new { field = "from", message = "Must be before 'to'." } });
            }

            return (fromUtc, toBoundUtc, toExclusive);
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
