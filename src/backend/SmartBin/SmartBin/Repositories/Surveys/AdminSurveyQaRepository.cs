using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Surveys;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Repositories.Surveys
{
    public class AdminSurveyQaRepository : IAdminSurveyQaRepository
    {
        private readonly AppDbContext _context;

        public AdminSurveyQaRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<SurveyQaSummaryResponseDto> GetSummaryAsync(
            DateTime? fromUtc,
            DateTime? toBoundUtc,
            bool toExclusive,
            CancellationToken cancellationToken = default)
        {
            var filteredSurveys = BuildFilteredSurveysQuery(fromUtc, toBoundUtc, toExclusive);

            var dailyRows = await filteredSurveys
                .Select(s => new
                {
                    Timestamp = s.SubmittedAt ?? s.CreatedAt,
                    IsRejected = s.Outcome != SurveyOutcome.Confirmed
                })
                .GroupBy(x => new { x.Timestamp.Year, x.Timestamp.Month, x.Timestamp.Day })
                .Select(g => new
                {
                    g.Key.Year,
                    g.Key.Month,
                    g.Key.Day,
                    TotalCount = g.Count(),
                    RejectedCount = g.Count(x => x.IsRejected)
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ThenBy(x => x.Day)
                .ToListAsync(cancellationToken);

            var totalSurveys = dailyRows.Sum(r => r.TotalCount);
            var rejectedCount = dailyRows.Sum(r => r.RejectedCount);
            var confirmedCount = totalSurveys - rejectedCount;

            var confirmRate = totalSurveys > 0 ? Math.Round(confirmedCount * 100.0 / totalSurveys, 1) : 0.0;
            var rejectRate = totalSurveys > 0 ? Math.Round(rejectedCount * 100.0 / totalSurveys, 1) : 0.0;

            double? confirmRateDeltaPp = null;
            double? rejectRateDeltaPp = null;

            if (fromUtc.HasValue && toBoundUtc.HasValue && toBoundUtc.Value > fromUtc.Value)
            {
                var window = toBoundUtc.Value - fromUtc.Value;
                var prevFrom = fromUtc.Value - window;
                var prevTo = fromUtc.Value;

                var prevSurveys = BuildFilteredSurveysQuery(prevFrom, prevTo, toExclusive: true);
                var prevStats = await prevSurveys
                    .GroupBy(_ => 1)
                    .Select(g => new
                    {
                        TotalCount = g.Count(),
                        RejectedCount = g.Count(s => s.Outcome != SurveyOutcome.Confirmed)
                    })
                    .FirstOrDefaultAsync(cancellationToken);

                if (prevStats != null && prevStats.TotalCount > 0)
                {
                    var prevConfirmedCount = prevStats.TotalCount - prevStats.RejectedCount;
                    var prevConfirmRate = Math.Round(prevConfirmedCount * 100.0 / prevStats.TotalCount, 1);
                    var prevRejectRate = Math.Round(prevStats.RejectedCount * 100.0 / prevStats.TotalCount, 1);

                    confirmRateDeltaPp = Math.Round(confirmRate - prevConfirmRate, 1);
                    rejectRateDeltaPp = Math.Round(rejectRate - prevRejectRate, 1);
                }
            }

            var reportQuery = _context.InspectionReports
                .AsNoTracking()
                .Where(r => r.Survey != null &&
                            r.Survey.Status == SurveyStatus.Done &&
                            r.Survey.Outcome != null);

            if (fromUtc.HasValue)
            {
                var start = fromUtc.Value;
                reportQuery = reportQuery.Where(r => (r.Survey!.SubmittedAt ?? r.Survey.CreatedAt) >= start);
            }

            if (toBoundUtc.HasValue)
            {
                var end = toBoundUtc.Value;
                reportQuery = toExclusive
                    ? reportQuery.Where(r => (r.Survey!.SubmittedAt ?? r.Survey.CreatedAt) < end)
                    : reportQuery.Where(r => (r.Survey!.SubmittedAt ?? r.Survey.CreatedAt) <= end);
            }

            var flaggedToAiQueue = await reportQuery.CountAsync(cancellationToken);

            var rejectionTrend = dailyRows
                .Select(r => new RejectionRateTrendPointDto
                {
                    Date = new DateOnly(r.Year, r.Month, r.Day).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    TotalCount = r.TotalCount,
                    RejectedCount = r.RejectedCount,
                    RejectionRate = r.TotalCount > 0 ? Math.Round(r.RejectedCount * 100.0 / r.TotalCount, 1) : 0.0
                })
                .ToList();

            var binRows = await filteredSurveys
                .Select(s => new
                {
                    s.Session!.BinId,
                    BinName = s.Session.Bin != null ? s.Session.Bin.Name : null,
                    IsRejected = s.Outcome != SurveyOutcome.Confirmed
                })
                .GroupBy(x => new { x.BinId, x.BinName })
                .Select(g => new
                {
                    g.Key.BinId,
                    g.Key.BinName,
                    TotalCount = g.Count(),
                    RejectedCount = g.Count(x => x.IsRejected)
                })
                .Where(x => x.RejectedCount > 0)
                .OrderByDescending(x => (double)x.RejectedCount / x.TotalCount)
                .ThenByDescending(x => x.RejectedCount)
                .ThenBy(x => x.BinId)
                .Take(6)
                .ToListAsync(cancellationToken);

            var highestRejectionBins = binRows
                .Select(b => new BinRejectionRateDto
                {
                    BinId = b.BinId,
                    BinName = string.IsNullOrWhiteSpace(b.BinName) ? $"Bin#{b.BinId:D3}" : b.BinName,
                    TotalCount = b.TotalCount,
                    RejectedCount = b.RejectedCount,
                    RejectionRate = b.TotalCount > 0 ? Math.Round(b.RejectedCount * 100.0 / b.TotalCount, 1) : 0.0
                })
                .ToList();

            var categoryRows = await (
                from di in _context.DisposalItems.AsNoTracking()
                join s in filteredSurveys on di.SessionId equals s.SessionId
                join wt in _context.WasteTypes.AsNoTracking() on di.WasteTypeId equals wt.WasteTypeId
                join sr in _context.SurveyResponses.AsNoTracking() on di.ItemId equals sr.ItemId into srGroup
                from sr in srGroup.DefaultIfEmpty()
                select new
                {
                    Category = wt.Name,
                    IsRejected = sr != null && !sr.IsCorrect
                })
                .GroupBy(x => x.Category)
                .Select(g => new
                {
                    Category = g.Key,
                    TotalCount = g.Count(),
                    RejectedCount = g.Count(x => x.IsRejected)
                })
                .Where(x => x.RejectedCount > 0)
                .OrderByDescending(x => (double)x.RejectedCount / x.TotalCount)
                .ThenByDescending(x => x.RejectedCount)
                .ThenBy(x => x.Category)
                .ToListAsync(cancellationToken);

            var rejectionByCategory = categoryRows
                .Select(c => new WasteCategoryRejectionRateDto
                {
                    Category = c.Category,
                    TotalCount = c.TotalCount,
                    RejectedCount = c.RejectedCount,
                    RejectionRate = c.TotalCount > 0 ? Math.Round(c.RejectedCount * 100.0 / c.TotalCount, 1) : 0.0
                })
                .ToList();

            return new SurveyQaSummaryResponseDto
            {
                Kpis = new SurveyQaKpiSummaryDto
                {
                    TotalSurveys = totalSurveys,
                    ConfirmedCount = confirmedCount,
                    RejectedCount = rejectedCount,
                    ConfirmRate = confirmRate,
                    RejectRate = rejectRate,
                    ConfirmRateDeltaPp = confirmRateDeltaPp,
                    RejectRateDeltaPp = rejectRateDeltaPp,
                    FlaggedToAiQueue = flaggedToAiQueue,
                    AverageAiRating = null
                },
                ConfirmCount = confirmedCount,
                RejectCount = rejectedCount,
                Split = new SurveyQaSplitDto
                {
                    Confirmed = confirmedCount,
                    Rejected = rejectedCount
                },
                RejectionTrend = rejectionTrend,
                HighestRejectionBins = highestRejectionBins,
                RejectionByCategory = rejectionByCategory
            };
        }

        public async Task<(List<RecentSurveyOutcomeDto> Items, int TotalItems)> GetRecentSurveysPagedAsync(
            DateTime? fromUtc,
            DateTime? toBoundUtc,
            bool toExclusive,
            string? outcome,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            var query = BuildFilteredSurveysQuery(fromUtc, toBoundUtc, toExclusive);

            if (string.Equals(outcome, "confirmed", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(s => s.Outcome == SurveyOutcome.Confirmed);
            }
            else if (string.Equals(outcome, "rejected", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(s => s.Outcome != SurveyOutcome.Confirmed);
            }

            var totalItems = await query.CountAsync(cancellationToken);

            var projected = query.Select(s => new
            {
                s.SurveyId,
                s.SessionId,
                UserId = s.Session!.UserId,
                UserName = s.Session.User != null
                    ? (!string.IsNullOrWhiteSpace(s.Session.User.DisplayName)
                        ? s.Session.User.DisplayName
                        : (s.Session.User.Email ?? $"Citizen #{s.Session.UserId}"))
                    : $"Citizen #{s.Session.UserId}",
                Points = s.Session.PointsStatus == PointsStatus.Awarded ? s.Session.TotalPoints : 0,
                Result = s.Outcome == SurveyOutcome.Confirmed ? "confirmed" : "rejected",
                Timestamp = s.SubmittedAt ?? s.CreatedAt
            });

            bool isDesc = string.Equals(sortDir?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);
            var normalizedSortBy = sortBy?.Trim().ToLowerInvariant();

            var orderedQuery = normalizedSortBy switch
            {
                "sessionid" => isDesc
                    ? projected.OrderByDescending(x => x.SessionId)
                    : projected.OrderBy(x => x.SessionId),
                "username" => isDesc
                    ? projected.OrderByDescending(x => x.UserName).ThenByDescending(x => x.Timestamp).ThenByDescending(x => x.SessionId)
                    : projected.OrderBy(x => x.UserName).ThenBy(x => x.Timestamp).ThenBy(x => x.SessionId),
                "points" or "pointsawarded" => isDesc
                    ? projected.OrderByDescending(x => x.Points).ThenByDescending(x => x.Timestamp).ThenByDescending(x => x.SessionId)
                    : projected.OrderBy(x => x.Points).ThenBy(x => x.Timestamp).ThenBy(x => x.SessionId),
                "result" or "outcome" => isDesc
                    ? projected.OrderByDescending(x => x.Result).ThenByDescending(x => x.Timestamp).ThenByDescending(x => x.SessionId)
                    : projected.OrderBy(x => x.Result).ThenBy(x => x.Timestamp).ThenBy(x => x.SessionId),
                "timestamp" or "createdat" => isDesc
                    ? projected.OrderByDescending(x => x.Timestamp).ThenByDescending(x => x.SessionId)
                    : projected.OrderBy(x => x.Timestamp).ThenBy(x => x.SessionId),
                _ => projected.OrderByDescending(x => x.Timestamp).ThenByDescending(x => x.SessionId)
            };

            var rows = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            var sessionIds = rows.Select(r => r.SessionId).Distinct().ToList();
            var sessionItems = sessionIds.Count == 0
                ? new List<(int SessionId, string WasteTypeName)>()
                : (await _context.DisposalItems
                    .AsNoTracking()
                    .Where(di => sessionIds.Contains(di.SessionId))
                    .Select(di => new
                    {
                        di.SessionId,
                        WasteTypeName = di.WasteType != null ? di.WasteType.Name : "Unknown"
                    })
                    .ToListAsync(cancellationToken))
                    .Select(x => (x.SessionId, x.WasteTypeName))
                    .ToList();

            var itemsSummaryBySession = sessionItems
                .GroupBy(i => i.SessionId)
                .ToDictionary(
                    g => g.Key,
                    g => string.Join(", ", g
                        .GroupBy(x => x.WasteTypeName)
                        .OrderByDescending(wg => wg.Count())
                        .ThenBy(wg => wg.Key, StringComparer.OrdinalIgnoreCase)
                        .Select(wg => $"{wg.Count()}× {wg.Key}")));

            var items = rows.Select(r => new RecentSurveyOutcomeDto
            {
                SurveyId = r.SurveyId,
                SessionId = r.SessionId,
                UserId = r.UserId,
                UserName = r.UserName,
                ItemsSummary = itemsSummaryBySession.TryGetValue(r.SessionId, out var summaryText) && !string.IsNullOrWhiteSpace(summaryText)
                    ? summaryText
                    : "No items recorded",
                Points = r.Points,
                PointsAwarded = r.Points,
                Result = r.Result,
                Outcome = r.Result,
                Timestamp = EnsureUtc(r.Timestamp)
            }).ToList();

            return (items, totalItems);
        }

        private IQueryable<DisposalSurvey> BuildFilteredSurveysQuery(
            DateTime? fromUtc,
            DateTime? toBoundUtc,
            bool toExclusive)
        {
            var query = _context.DisposalSurveys
                .AsNoTracking()
                .Where(s => s.Status == SurveyStatus.Done &&
                            s.Outcome != null &&
                            s.Session != null);

            if (fromUtc.HasValue)
            {
                var start = fromUtc.Value;
                query = query.Where(s => (s.SubmittedAt ?? s.CreatedAt) >= start);
            }

            if (toBoundUtc.HasValue)
            {
                var end = toBoundUtc.Value;
                query = toExclusive
                    ? query.Where(s => (s.SubmittedAt ?? s.CreatedAt) < end)
                    : query.Where(s => (s.SubmittedAt ?? s.CreatedAt) <= end);
            }

            return query;
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
