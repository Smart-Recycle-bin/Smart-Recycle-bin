using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Inspections;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Services.Surveys;

namespace SmartBin.Repositories.Inspections
{
    public class InspectionRepository : IInspectionRepository
    {
        private readonly AppDbContext _context;

        public InspectionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(List<InspectionListItemDto> Items, int TotalItems)> ListPagedAsync(
            string? status,
            string? search,
            string? sortBy,
            string? sortDir,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var query = from r in _context.InspectionReports.AsNoTracking()
                        join s in _context.DisposalSurveys on r.SurveyId equals s.SurveyId
                        join session in _context.DisposalSessions on s.SessionId equals session.SessionId
                        join item in _context.DisposalItems on r.DisposalItemId equals item.ItemId
                        join w in _context.WasteTypes on item.WasteTypeId equals w.WasteTypeId
                        select new
                        {
                            Report = r,
                            session.SessionId,
                            session.BinId,
                            Item = item,
                            WasteName = w.Name
                        };

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(x => x.Report.ReviewDecision == status);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                var digits = new string(term.Where(char.IsDigit).ToArray());
                var hasNumber = int.TryParse(digits, out var number);

                var words = term.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                var matchedWasteTypes = WasteTypeNames.All
                    .Where(w => words.Any(word => w.Contains(word, StringComparison.OrdinalIgnoreCase))
                             || w.Contains(term, StringComparison.OrdinalIgnoreCase))
                    .ToList();

                if (hasNumber && matchedWasteTypes.Count > 0)
                {
                    query = query.Where(x =>
                        (x.Report.ReportId == number || x.SessionId == number || x.BinId == number) &&
                        matchedWasteTypes.Contains(x.WasteName.ToUpper()));
                }
                else if (hasNumber)
                {
                    query = query.Where(x => x.Report.ReportId == number || x.SessionId == number || x.BinId == number);
                }
                else if (term is "bin" or "smart" or "smart bin")
                {
                    // Matches bin name prefix
                }
                else
                {
                    query = query.Where(x => x.WasteName.ToLower().Contains(term));
                }
            }

            var asc = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
            query = sortBy?.ToLowerInvariant() switch
            {
                "mlconfidence" => asc
                    ? query.OrderBy(x => (double)(x.Item.AIConfidence ?? 0m)).ThenBy(x => x.Report.ReportId)
                    : query.OrderByDescending(x => (double)(x.Item.AIConfidence ?? 0m)).ThenByDescending(x => x.Report.ReportId),
                _ => asc
                    ? query.OrderBy(x => x.Report.CreatedAt).ThenBy(x => x.Report.ReportId)
                    : query.OrderByDescending(x => x.Report.CreatedAt).ThenByDescending(x => x.Report.ReportId)
            };

            var totalItems = await query.CountAsync(cancellationToken);

            var rows = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            var items = rows.Select(x => new InspectionListItemDto
            {
                ReportId = x.Report.ReportId,
                SessionId = x.SessionId,
                BinId = x.BinId,
                BinName = $"Bin#{x.BinId:D3}",
                ImageThumbnailUrl = x.Item.Image ?? string.Empty,
                MlPredictedWasteType = x.WasteName.ToUpperInvariant(),
                MlConfidence = x.Item.AIConfidence ?? 0m,
                UserFeedback = x.Report.Feedback,
                CreatedAt = x.Report.CreatedAt,
                ReviewDecision = x.Report.ReviewDecision == InspectionReviewDecision.Pending ? null : x.Report.ReviewDecision,
                RetrainingStatus = x.Report.RetrainingStatus
            }).ToList();

            return (items, totalItems);
        }

        public async Task<InspectionSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
        {
            var pending = await _context.InspectionReports
                .AsNoTracking()
                .CountAsync(r => r.ReviewDecision == InspectionReviewDecision.Pending, cancellationToken);

            var reviewed = await _context.InspectionReports
                .AsNoTracking()
                .CountAsync(r => r.ReviewDecision != InspectionReviewDecision.Pending, cancellationToken);

            var labelled = reviewed;

            return new InspectionSummaryDto
            {
                LabelledImages = labelled,
                PendingReviews = pending,
                ReviewedReports = reviewed,
                ImagesUntilNextRetraining = Math.Max(0, CatalogSettings.RetrainingThreshold - labelled),
                NextRetrainingThreshold = CatalogSettings.RetrainingThreshold
            };
        }

        public async Task<InspectionDetailDto?> GetDetailAsync(int reportId, CancellationToken cancellationToken = default)
        {
            var row = await (from r in _context.InspectionReports.AsNoTracking()
                             join s in _context.DisposalSurveys on r.SurveyId equals s.SurveyId
                             join session in _context.DisposalSessions on s.SessionId equals session.SessionId
                             join item in _context.DisposalItems on r.DisposalItemId equals item.ItemId
                             join w in _context.WasteTypes on item.WasteTypeId equals w.WasteTypeId
                             join u in _context.Users on session.UserId equals u.Id
                             where r.ReportId == reportId
                             select new
                             {
                                 r.ReportId,
                                 session.SessionId,
                                 session.BinId,
                                 RecyclerId = u.Id,
                                 RecyclerName = u.DisplayName,
                                 r.Feedback,
                                 WasteName = w.Name,
                                 item.EstimatedPoints,
                                 item.Image,
                                 r.ReviewDecision,
                                 r.RetrainingStatus,
                                 r.CreatedAt
                             })
                .FirstOrDefaultAsync(cancellationToken);

            if (row == null)
            {
                return null;
            }

            return new InspectionDetailDto
            {
                ReportId = row.ReportId,
                SessionId = row.SessionId,
                BinId = row.BinId,
                RecyclerId = row.RecyclerId,
                RecyclerName = row.RecyclerName,
                UserFeedback = row.Feedback,
                MlPredictedWasteType = row.WasteName.ToUpperInvariant(),
                EstimatedPoints = row.EstimatedPoints,
                ImageUrl = row.Image ?? string.Empty,
                ReviewDecision = row.ReviewDecision == InspectionReviewDecision.Pending ? null : row.ReviewDecision,
                RetrainingStatus = row.RetrainingStatus,
                CreatedAt = row.CreatedAt
            };
        }

        public async Task<InspectionReport?> GetByIdAsync(int reportId, CancellationToken cancellationToken = default)
        {
            return await _context.InspectionReports
                .FirstOrDefaultAsync(r => r.ReportId == reportId, cancellationToken);
        }

        public async Task<int?> GetSessionIdByReportIdAsync(int reportId, CancellationToken cancellationToken = default)
        {
            return await (from r in _context.InspectionReports.AsNoTracking()
                          join s in _context.DisposalSurveys.AsNoTracking() on r.SurveyId equals s.SurveyId
                          where r.ReportId == reportId
                          select (int?)s.SessionId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task AcquireSessionLockAsync(int sessionId, CancellationToken cancellationToken = default)
        {
            if (_context.Database.IsSqlServer())
            {
                await _context.Database.ExecuteSqlInterpolatedAsync(
                    $"SELECT 1 FROM DISPOSAL_SESSION WITH (UPDLOCK, HOLDLOCK) WHERE SessionId = {sessionId}",
                    cancellationToken);
            }
        }

        public async Task<bool> HasPendingReportsForSessionAsync(int sessionId, CancellationToken cancellationToken = default)
        {
            return await (from r in _context.InspectionReports.AsNoTracking()
                          join s in _context.DisposalSurveys.AsNoTracking() on r.SurveyId equals s.SurveyId
                          where s.SessionId == sessionId && r.ReviewDecision == InspectionReviewDecision.Pending
                          select r.ReportId)
                .AnyAsync(cancellationToken);
        }

        public async Task<(int? PointsAwarded, int? TransactionId)> GetSessionFinalizationInfoAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            var pointsAwarded = await _context.DisposalSessions
                .AsNoTracking()
                .Where(s => s.SessionId == sessionId)
                .Select(s => (int?)s.TotalPoints)
                .FirstOrDefaultAsync(cancellationToken);

            var transactionId = await _context.LedgerTransactions
                .AsNoTracking()
                .Where(lt => lt.SessionId == sessionId)
                .Select(lt => (int?)lt.TransactionId)
                .FirstOrDefaultAsync(cancellationToken);

            return (pointsAwarded, transactionId);
        }

        public async Task AddRangeAsync(IEnumerable<InspectionReport> reports, CancellationToken cancellationToken = default)
        {
            await _context.InspectionReports.AddRangeAsync(reports, cancellationToken);
        }

        public async Task<HashSet<int>> GetExistingReportItemIdsAsync(
            IEnumerable<int> itemIds,
            CancellationToken cancellationToken = default)
        {
            var ids = itemIds.Distinct().ToList();
            if (ids.Count == 0)
            {
                return new HashSet<int>();
            }

            var existing = await _context.InspectionReports
                .AsNoTracking()
                .Where(r => ids.Contains(r.DisposalItemId))
                .Select(r => r.DisposalItemId)
                .ToListAsync(cancellationToken);

            return existing.ToHashSet();
        }

        public async Task<List<SessionInspectionReportStatusDto>> GetSessionReportsForFinalizationAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            return await (from r in _context.InspectionReports.AsNoTracking()
                          join s in _context.DisposalSurveys.AsNoTracking() on r.SurveyId equals s.SurveyId
                          where s.SessionId == sessionId
                          select new SessionInspectionReportStatusDto
                          {
                              ReportId = r.ReportId,
                              ItemId = r.DisposalItemId,
                              IsResolved = r.ReviewDecision != InspectionReviewDecision.Pending,
                              IsAccepted = r.ReviewDecision == InspectionReviewDecision.Approved,
                              AdminConfirmedWasteTypeId = r.CorrectedWasteTypeId
                          })
                .ToListAsync(cancellationToken);
        }
    }
}