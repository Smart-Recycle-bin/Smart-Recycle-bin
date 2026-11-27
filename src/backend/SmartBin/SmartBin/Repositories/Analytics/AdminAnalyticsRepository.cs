using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Analytics;
using SmartBin.Models.Constants;

namespace SmartBin.Repositories.Analytics
{
    public class AdminAnalyticsRepository : IAdminAnalyticsRepository
    {
        private readonly AppDbContext _context;

        public AdminAnalyticsRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AdminOverviewAnalyticsDto> GetOverviewAnalyticsAsync(
            DateTime fromUtc,
            DateTime toBoundUtc,
            bool toExclusive,
            CancellationToken cancellationToken = default)
        {
            // 1. Ledger points issued vs redeemed & daily time-series (bounded by <= 366 day window)
            var ledgerQuery = _context.LedgerTransactions
                .AsNoTracking()
                .Where(lt => lt.CreatedAt >= fromUtc);

            ledgerQuery = toExclusive
                ? ledgerQuery.Where(lt => lt.CreatedAt < toBoundUtc)
                : ledgerQuery.Where(lt => lt.CreatedAt <= toBoundUtc);

            var ledgerDailyRows = await ledgerQuery
                .Select(lt => new
                {
                    lt.CreatedAt,
                    IssuedDelta = (lt.TransactionType == LedgerTransactionType.Credit || lt.PointsDelta > 0)
                        ? (lt.PointsDelta >= 0 ? lt.PointsDelta : -lt.PointsDelta)
                        : 0,
                    RedeemedDelta = (lt.TransactionType == LedgerTransactionType.Debit || lt.PointsDelta < 0)
                        ? (lt.PointsDelta < 0 ? -lt.PointsDelta : lt.PointsDelta)
                        : 0
                })
                .GroupBy(x => new { x.CreatedAt.Year, x.CreatedAt.Month, x.CreatedAt.Day })
                .Select(g => new
                {
                    g.Key.Year,
                    g.Key.Month,
                    g.Key.Day,
                    Issued = g.Sum(x => x.IssuedDelta),
                    Redeemed = g.Sum(x => x.RedeemedDelta)
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ThenBy(x => x.Day)
                .ToListAsync(cancellationToken);

            var totalPointsIssued = ledgerDailyRows.Sum(r => r.Issued);
            var totalPointsRedeemed = ledgerDailyRows.Sum(r => r.Redeemed);

            var ledgerByDay = ledgerDailyRows.ToDictionary(
                r => new DateOnly(r.Year, r.Month, r.Day),
                r => (r.Issued, r.Redeemed));

            var startDate = DateOnly.FromDateTime(fromUtc);
            var endDate = DateOnly.FromDateTime(toExclusive ? toBoundUtc.AddTicks(-1) : toBoundUtc);
            if (endDate < startDate)
            {
                endDate = startDate;
            }

            var pointsComparisonSeries = new List<PointsTimeSeriesPointDto>();
            for (var day = startDate; day <= endDate; day = day.AddDays(1))
            {
                ledgerByDay.TryGetValue(day, out var dayTotals);
                pointsComparisonSeries.Add(new PointsTimeSeriesPointDto
                {
                    Date = day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Issued = dayTotals.Issued,
                    Redeemed = dayTotals.Redeemed
                });
            }

            // Prior period comparison for Ledger and Survey contamination
            double? pointsIssuedDeltaPct = null;
            bool? pointsIssuedTrendPos = null;
            double? pointsRedeemedDeltaPct = null;
            bool? pointsRedeemedTrendPos = null;

            double? prevContaminationRate = null;

            if (toBoundUtc > fromUtc)
            {
                var window = toBoundUtc - fromUtc;
                var prevFrom = fromUtc - window;
                var prevToExclusive = fromUtc;

                var prevLedger = await _context.LedgerTransactions
                    .AsNoTracking()
                    .Where(lt => lt.CreatedAt >= prevFrom && lt.CreatedAt < prevToExclusive)
                    .GroupBy(_ => 1)
                    .Select(g => new
                    {
                        Issued = g.Sum(lt => (lt.TransactionType == LedgerTransactionType.Credit || lt.PointsDelta > 0)
                            ? (lt.PointsDelta >= 0 ? lt.PointsDelta : -lt.PointsDelta)
                            : 0),
                        Redeemed = g.Sum(lt => (lt.TransactionType == LedgerTransactionType.Debit || lt.PointsDelta < 0)
                            ? (lt.PointsDelta < 0 ? -lt.PointsDelta : lt.PointsDelta)
                            : 0)
                    })
                    .FirstOrDefaultAsync(cancellationToken);

                if (prevLedger != null)
                {
                    if (prevLedger.Issued > 0)
                    {
                        pointsIssuedDeltaPct = Math.Round((totalPointsIssued - prevLedger.Issued) * 100.0 / prevLedger.Issued, 1);
                        pointsIssuedTrendPos = totalPointsIssued >= prevLedger.Issued;
                    }

                    if (prevLedger.Redeemed > 0)
                    {
                        pointsRedeemedDeltaPct = Math.Round((totalPointsRedeemed - prevLedger.Redeemed) * 100.0 / prevLedger.Redeemed, 1);
                        pointsRedeemedTrendPos = totalPointsRedeemed >= prevLedger.Redeemed;
                    }
                }

                var prevSurveys = await _context.DisposalSurveys
                    .AsNoTracking()
                    .Where(s => s.Status == SurveyStatus.Done &&
                                s.Outcome != null &&
                                s.Session != null &&
                                (s.SubmittedAt ?? s.CreatedAt) >= prevFrom &&
                                (s.SubmittedAt ?? s.CreatedAt) < prevToExclusive)
                    .GroupBy(_ => 1)
                    .Select(g => new
                    {
                        TotalCount = g.Count(),
                        RejectedCount = g.Count(s => s.Outcome != SurveyOutcome.Confirmed)
                    })
                    .FirstOrDefaultAsync(cancellationToken);

                if (prevSurveys != null && prevSurveys.TotalCount > 0)
                {
                    prevContaminationRate = Math.Round(prevSurveys.RejectedCount * 100.0 / prevSurveys.TotalCount, 1);
                }
            }

            // 2. Fleet health & urgent bins (live fleet state)
            var fleetGroups = await _context.SmartBins
                .AsNoTracking()
                .GroupBy(b => b.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var fleetHealth = new FleetHealthBreakdownDto();
            foreach (var grp in fleetGroups)
            {
                fleetHealth.TotalBins += grp.Count;
                if (string.Equals(grp.Status, SmartBinStatus.Available, StringComparison.OrdinalIgnoreCase))
                {
                    fleetHealth.Available += grp.Count;
                }
                else if (string.Equals(grp.Status, SmartBinStatus.Full80, StringComparison.OrdinalIgnoreCase))
                {
                    fleetHealth.EightyPercentFull += grp.Count;
                }
                else if (string.Equals(grp.Status, SmartBinStatus.NeedsService95, StringComparison.OrdinalIgnoreCase))
                {
                    fleetHealth.NeedsServicing += grp.Count;
                }
                else if (string.Equals(grp.Status, SmartBinStatus.Offline, StringComparison.OrdinalIgnoreCase))
                {
                    fleetHealth.Offline += grp.Count;
                }
            }

            var urgentBinRows = await _context.SmartBins
                .AsNoTracking()
                .Where(b => b.Status == SmartBinStatus.NeedsService95)
                .OrderByDescending(b => b.FillLevel)
                .ThenBy(b => b.BinId)
                .Take(6)
                .Select(b => new
                {
                    b.BinId,
                    b.Name,
                    b.Area,
                    b.District,
                    b.FillLevel,
                    b.Status
                })
                .ToListAsync(cancellationToken);

            var urgentBins = urgentBinRows.Select(b => new BinNeedingAttentionItemDto
            {
                BinId = b.BinId,
                Name = !string.IsNullOrWhiteSpace(b.Name) ? b.Name : $"Bin#{b.BinId:D3}",
                Area = !string.IsNullOrWhiteSpace(b.Area) ? b.Area : (b.District ?? "Unspecified"),
                FillLevel = b.FillLevel,
                Status = b.Status
            }).ToList();

            // 3. Item counts by waste type from DisposalItems (no fabricated tonnage/weight)
            var itemsQuery = _context.DisposalItems
                .AsNoTracking()
                .Where(di => di.DetectedAt >= fromUtc);

            itemsQuery = toExclusive
                ? itemsQuery.Where(di => di.DetectedAt < toBoundUtc)
                : itemsQuery.Where(di => di.DetectedAt <= toBoundUtc);

            var materialGroups = await itemsQuery
                .Join(
                    _context.WasteTypes.AsNoTracking(),
                    di => di.WasteTypeId,
                    wt => wt.WasteTypeId,
                    (di, wt) => wt.Name)
                .GroupBy(name => name)
                .Select(g => new
                {
                    Material = g.Key,
                    ItemCount = g.Count()
                })
                .OrderByDescending(x => x.ItemCount)
                .ThenBy(x => x.Material)
                .ToListAsync(cancellationToken);

            var totalDisposalItems = materialGroups.Sum(x => x.ItemCount);
            var materialShares = materialGroups
                .Select(x => new MaterialVolumeShareDto
                {
                    Material = x.Material,
                    ItemCount = x.ItemCount,
                    Percentage = totalDisposalItems > 0
                        ? Math.Round(x.ItemCount * 100.0 / totalDisposalItems, 1)
                        : 0.0,
                    Tonnage = null
                })
                .ToList();

            var recyclingVolumeByType = materialGroups.ToDictionary(x => x.Material, x => x.ItemCount);

            // 4. Survey rejection / contamination rate & trend & category hotspots
            var filteredSurveys = _context.DisposalSurveys
                .AsNoTracking()
                .Where(s => s.Status == SurveyStatus.Done &&
                            s.Outcome != null &&
                            s.Session != null &&
                            (s.SubmittedAt ?? s.CreatedAt) >= fromUtc);

            filteredSurveys = toExclusive
                ? filteredSurveys.Where(s => (s.SubmittedAt ?? s.CreatedAt) < toBoundUtc)
                : filteredSurveys.Where(s => (s.SubmittedAt ?? s.CreatedAt) <= toBoundUtc);

            var surveyDailyRows = await filteredSurveys
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

            var totalSurveys = surveyDailyRows.Sum(r => r.TotalCount);
            var rejectedSurveys = surveyDailyRows.Sum(r => r.RejectedCount);

            double? currentContaminationRate = totalSurveys > 0
                ? Math.Round(rejectedSurveys * 100.0 / totalSurveys, 1)
                : null;

            double? contaminationDeltaPp = null;
            bool? contaminationTrendPositive = null;

            if (currentContaminationRate.HasValue && prevContaminationRate.HasValue)
            {
                contaminationDeltaPp = Math.Round(currentContaminationRate.Value - prevContaminationRate.Value, 1);
                // Falling contamination is positive
                contaminationTrendPositive = currentContaminationRate.Value <= prevContaminationRate.Value;
            }

            var contaminationTrend = surveyDailyRows
                .Select(r => new MetricTrendPointDto
                {
                    Date = new DateOnly(r.Year, r.Month, r.Day).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Value = r.TotalCount > 0 ? Math.Round(r.RejectedCount * 100.0 / r.TotalCount, 1) : 0.0
                })
                .ToList();

            var hotspotGroups = await (
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
                .Take(6)
                .ToListAsync(cancellationToken);

            var topContaminationHotspots = hotspotGroups
                .Select(h => new ContaminationHotspotDto
                {
                    Category = h.Category,
                    RejectionRate = h.TotalCount > 0 ? Math.Round(h.RejectedCount * 100.0 / h.TotalCount, 1) : 0.0
                })
                .ToList();

            // 5. Pending AI verification reviews from local INSPECTION_REPORT store
            var pendingAiReviewsCount = await _context.InspectionReports
                .AsNoTracking()
                .CountAsync(r => r.Status == InspectionReportStatus.Pending, cancellationToken);

            var urgentReviewRows = await _context.InspectionReports
                .AsNoTracking()
                .Where(r => r.Status == InspectionReportStatus.Pending)
                .OrderByDescending(r => r.CreatedAt)
                .ThenByDescending(r => r.ReportId)
                .Take(5)
                .Select(r => new
                {
                    r.ReportId,
                    PredictedType = r.PredictedWasteType != null ? r.PredictedWasteType.Name : string.Empty,
                    SelectedType = r.UserSelectedWasteType != null ? r.UserSelectedWasteType.Name : string.Empty,
                    r.PredictedConfidence
                })
                .ToListAsync(cancellationToken);

            var urgentReviews = urgentReviewRows
                .Select(r => new PendingAiReviewItemDto
                {
                    ReportId = r.ReportId,
                    PredictedType = r.PredictedType,
                    Confidence = r.PredictedConfidence,
                    Feedback = !string.IsNullOrWhiteSpace(r.SelectedType)
                        ? $"User selected {r.SelectedType} instead of {r.PredictedType}"
                        : "Classification disputed during survey"
                })
                .ToList();

            return new AdminOverviewAnalyticsDto
            {
                DailyActiveUsers = new OverviewKpiCardDto
                {
                    // LastActiveAt is a mutable snapshot, not a historical event stream
                    Value = null,
                    DeltaPercent = null,
                    TrendPositive = null
                },
                PointsIssued = new OverviewKpiCardDto
                {
                    Value = totalPointsIssued,
                    DeltaPercent = pointsIssuedDeltaPct,
                    TrendPositive = pointsIssuedTrendPos
                },
                PointsRedeemed = new OverviewKpiCardDto
                {
                    Value = totalPointsRedeemed,
                    DeltaPercent = pointsRedeemedDeltaPct,
                    TrendPositive = pointsRedeemedTrendPos
                },
                ContaminationRate = new OverviewKpiCardDto
                {
                    Value = currentContaminationRate,
                    DeltaPp = contaminationDeltaPp,
                    TrendPositive = contaminationTrendPositive
                },
                BinsNeedingServiceCount = fleetHealth.NeedsServicing,
                PendingAiReviewsCount = pendingAiReviewsCount,
                PointsComparisonSeries = pointsComparisonSeries,
                FleetHealth = fleetHealth,
                // No scale or weight column exists on DisposalItem or SmartBin
                TotalRecycledTonnage = null,
                TotalDisposalItems = totalDisposalItems,
                MaterialShares = materialShares,
                RecyclingVolumeByType = recyclingVolumeByType,
                ContaminationTrend = contaminationTrend,
                // Historical DAU stream is not persisted
                DauTrend = null,
                UrgentBins = urgentBins,
                UrgentReviews = urgentReviews,
                TopContaminationHotspots = topContaminationHotspots
            };
        }
    }
}
