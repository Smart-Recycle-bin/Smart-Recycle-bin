using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Inspections;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Repositories.Inspections
{
    public class AdminInspectionRepository : IAdminInspectionRepository
    {
        private readonly AppDbContext _context;

        public AdminInspectionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(List<AdminInspectionReportListItemDto> Items, int TotalItems)> GetReportsPagedAsync(
            string? status,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            var query = _context.InspectionReports
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToLower();
                query = query.Where(r => r.Status.ToLower() == normalizedStatus);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                var hasNumericId = int.TryParse(s, out var parsedId);

                query = query.Where(r =>
                    (hasNumericId && (r.ReportId == parsedId || r.SessionId == parsedId || r.BinId == parsedId)) ||
                    (r.Bin != null && (
                        (r.Bin.Name != null && r.Bin.Name.Contains(s)) ||
                        r.Bin.SerialNumber.Contains(s) ||
                        (r.Bin.District != null && r.Bin.District.Contains(s)))) ||
                    (r.PredictedWasteType != null && r.PredictedWasteType.Name.Contains(s)) ||
                    (r.UserSelectedWasteType != null && r.UserSelectedWasteType.Name.Contains(s)) ||
                    (r.User != null && r.User.DisplayName.Contains(s)));
            }

            int totalItems = await query.CountAsync(cancellationToken);

            var projected = query.Select(r => new
            {
                r.ReportId,
                r.SessionId,
                r.BinId,
                BinName = r.Bin != null ? r.Bin.Name : null,
                r.ImageUrl,
                PredictedName = r.PredictedWasteType != null ? r.PredictedWasteType.Name : string.Empty,
                r.PredictedConfidence,
                SelectedName = r.UserSelectedWasteType != null ? r.UserSelectedWasteType.Name : string.Empty,
                r.CreatedAt,
                r.Status,
                r.ReviewDecision,
                r.RetrainingStatus
            });

            bool isDesc = string.Equals(sortDir?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);
            var normalizedSortBy = sortBy?.Trim().ToLowerInvariant();

            var orderedQuery = normalizedSortBy switch
            {
                "sessionid" => isDesc
                    ? projected.OrderByDescending(x => x.SessionId).ThenByDescending(x => x.ReportId)
                    : projected.OrderBy(x => x.SessionId).ThenBy(x => x.ReportId),
                "binid" => isDesc
                    ? projected.OrderByDescending(x => x.BinId).ThenByDescending(x => x.ReportId)
                    : projected.OrderBy(x => x.BinId).ThenBy(x => x.ReportId),
                "mlpredictedwastetype" => isDesc
                    ? projected.OrderByDescending(x => x.PredictedName).ThenByDescending(x => x.ReportId)
                    : projected.OrderBy(x => x.PredictedName).ThenBy(x => x.ReportId),
                "mlconfidence" => isDesc
                    ? projected.OrderByDescending(x => x.PredictedConfidence).ThenByDescending(x => x.ReportId)
                    : projected.OrderBy(x => x.PredictedConfidence).ThenBy(x => x.ReportId),
                "status" => isDesc
                    ? projected.OrderByDescending(x => x.Status).ThenByDescending(x => x.ReportId)
                    : projected.OrderBy(x => x.Status).ThenBy(x => x.ReportId),
                "date" or "createdat" => isDesc
                    ? projected.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.ReportId)
                    : projected.OrderBy(x => x.CreatedAt).ThenBy(x => x.ReportId),
                _ => projected.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.ReportId)
            };

            var rows = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            var items = rows.Select(x => new AdminInspectionReportListItemDto
            {
                ReportId = x.ReportId,
                AirId = null,
                SessionId = x.SessionId,
                BinId = x.BinId,
                BinName = string.IsNullOrWhiteSpace(x.BinName) ? $"Bin#{x.BinId:D3}" : x.BinName,
                ImageThumbnailUrl = string.IsNullOrWhiteSpace(x.ImageUrl) ? null : x.ImageUrl,
                MlPredictedWasteType = x.PredictedName,
                MlConfidence = x.PredictedConfidence,
                UserSelectedWasteType = x.SelectedName,
                UserFeedback = !string.IsNullOrWhiteSpace(x.SelectedName)
                    ? $"User selected {x.SelectedName} instead of {x.PredictedName}"
                    : "Classification disputed during survey",
                Date = x.CreatedAt,
                Status = x.Status,
                ReviewDecision = x.ReviewDecision,
                RetrainingStatus = x.RetrainingStatus
            }).ToList();

            return (items, totalItems);
        }

        public async Task<AdminInspectionSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
        {
            var counts = await _context.InspectionReports
                .AsNoTracking()
                .GroupBy(r => r.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var pendingCount = 0;
            var reviewedOnlyCount = 0;
            var sentToRetrainingCount = 0;

            foreach (var row in counts)
            {
                if (string.Equals(row.Status, InspectionReportStatus.Pending, StringComparison.OrdinalIgnoreCase))
                {
                    pendingCount += row.Count;
                }
                else if (string.Equals(row.Status, InspectionReportStatus.Reviewed, StringComparison.OrdinalIgnoreCase))
                {
                    reviewedOnlyCount += row.Count;
                }
                else if (string.Equals(row.Status, InspectionReportStatus.SentToRetraining, StringComparison.OrdinalIgnoreCase))
                {
                    sentToRetrainingCount += row.Count;
                }
            }

            // No external ML training dataset/threshold exists in this system; keep threshold metrics explicitly null.
            return new AdminInspectionSummaryDto
            {
                LabelledImagesCount = null,
                TargetImagesThreshold = null,
                RemainingUntilRetrain = null,
                PendingReviewCount = pendingCount,
                ReviewedCount = reviewedOnlyCount + sentToRetrainingCount,
                SentToRetrainingCount = sentToRetrainingCount
            };
        }

        public async Task<AdminInspectionReportDetailDto?> GetReportDetailAsync(
            int reportId,
            CancellationToken cancellationToken = default)
        {
            var row = await _context.InspectionReports
                .AsNoTracking()
                .Where(r => r.ReportId == reportId)
                .Select(r => new
                {
                    r.ReportId,
                    r.SessionId,
                    r.BinId,
                    BinName = r.Bin != null ? r.Bin.Name : null,
                    r.UserId,
                    UserDisplayName = r.User != null ? r.User.DisplayName : null,
                    UserEmail = r.User != null ? r.User.Email : null,
                    r.CreatedAt,
                    r.Status,
                    r.ImageUrl,
                    PredictedName = r.PredictedWasteType != null ? r.PredictedWasteType.Name : string.Empty,
                    SelectedName = r.UserSelectedWasteType != null ? r.UserSelectedWasteType.Name : string.Empty,
                    r.AiRating,
                    r.PredictedConfidence,
                    EstimatedPoints = r.Item != null ? r.Item.EstimatedPoints : 0,
                    r.ReviewDecision,
                    ConfirmedName = r.ConfirmedWasteType != null ? r.ConfirmedWasteType.Name : null,
                    r.AdminJustification,
                    r.ReviewedAt,
                    r.RetrainingStatus
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (row == null)
            {
                return null;
            }

            var userName = !string.IsNullOrWhiteSpace(row.UserDisplayName)
                ? row.UserDisplayName
                : (row.UserEmail ?? $"Citizen #{row.UserId}");

            var capturedFrames = string.IsNullOrWhiteSpace(row.ImageUrl)
                ? new List<string>()
                : new List<string> { row.ImageUrl };

            return new AdminInspectionReportDetailDto
            {
                ReportId = row.ReportId,
                AirId = null,
                SessionId = row.SessionId,
                BinId = row.BinId,
                BinName = string.IsNullOrWhiteSpace(row.BinName) ? $"Bin#{row.BinId:D3}" : row.BinName,
                UserName = userName,
                Date = row.CreatedAt,
                Status = row.Status,
                CapturedFrames = capturedFrames,
                UserSelectedWasteType = row.SelectedName,
                UserFeedback = !string.IsNullOrWhiteSpace(row.SelectedName)
                    ? $"User selected {row.SelectedName} instead of {row.PredictedName}"
                    : "Classification disputed during survey",
                AiRating = row.AiRating,
                MlModelVersion = null,
                PredictedWasteType = row.PredictedName,
                PredictedConfidence = row.PredictedConfidence,
                EstimatedPoints = row.EstimatedPoints,
                ClassConfidences = null,
                ReviewDecision = row.ReviewDecision,
                ConfirmedWasteType = row.ConfirmedName,
                AdminJustification = row.AdminJustification,
                ReviewedAt = row.ReviewedAt,
                RetrainingStatus = row.RetrainingStatus
            };
        }

        public async Task<List<AdminWasteTypeOptionDto>> GetWasteTypesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.WasteTypes
                .AsNoTracking()
                .OrderBy(wt => wt.WasteTypeId)
                .Select(wt => new AdminWasteTypeOptionDto
                {
                    WasteTypeId = wt.WasteTypeId,
                    Name = wt.Name,
                    Description = wt.Description,
                    BasePoints = wt.BasePoints
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<WasteType?> GetWasteTypeByIdAsync(int wasteTypeId, CancellationToken cancellationToken = default)
        {
            return await _context.WasteTypes
                .AsNoTracking()
                .FirstOrDefaultAsync(wt => wt.WasteTypeId == wasteTypeId, cancellationToken);
        }

        public async Task<InspectionReport?> GetReportStateAsync(int reportId, CancellationToken cancellationToken = default)
        {
            return await _context.InspectionReports
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ReportId == reportId, cancellationToken);
        }

        public async Task<bool> TryResolvePendingReportAsync(
            int reportId,
            string status,
            string reviewDecision,
            int? confirmedWasteTypeId,
            string adminJustification,
            int actorAdminId,
            DateTime reviewedAt,
            CancellationToken cancellationToken = default)
        {
            var rows = await _context.InspectionReports
                .Where(r => r.ReportId == reportId && r.Status == InspectionReportStatus.Pending)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(r => r.Status, status)
                    .SetProperty(r => r.ReviewDecision, reviewDecision)
                    .SetProperty(r => r.ConfirmedWasteTypeId, confirmedWasteTypeId)
                    .SetProperty(r => r.AdminJustification, adminJustification)
                    .SetProperty(r => r.ReviewedByAdminId, actorAdminId)
                    .SetProperty(r => r.ReviewedAt, reviewedAt),
                    cancellationToken);

            return rows > 0;
        }

        public async Task<bool> TryQueueReportForRetrainingAsync(
            int reportId,
            int actorAdminId,
            DateTime requestedAt,
            CancellationToken cancellationToken = default)
        {
            var rows = await _context.InspectionReports
                .Where(r =>
                    r.ReportId == reportId &&
                    r.Status == InspectionReportStatus.Reviewed &&
                    r.RetrainingStatus == InspectionRetrainingStatus.NotSent)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(r => r.Status, InspectionReportStatus.SentToRetraining)
                    .SetProperty(r => r.RetrainingStatus, InspectionRetrainingStatus.Queued)
                    .SetProperty(r => r.RetrainingRequestedByAdminId, actorAdminId)
                    .SetProperty(r => r.RetrainingRequestedAt, requestedAt),
                    cancellationToken);

            return rows > 0;
        }

        public async Task<(int PointsDelta, int TransactionId)?> GetSessionAwardLedgerAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            var entry = await _context.LedgerTransactions
                .AsNoTracking()
                .Where(lt => lt.SessionId == sessionId)
                .Select(lt => new { lt.PointsDelta, lt.TransactionId })
                .FirstOrDefaultAsync(cancellationToken);

            return entry == null ? null : (entry.PointsDelta, entry.TransactionId);
        }
    }
}
