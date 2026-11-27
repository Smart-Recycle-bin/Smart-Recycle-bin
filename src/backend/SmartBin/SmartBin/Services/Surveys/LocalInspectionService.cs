using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Services.Notifications;

namespace SmartBin.Services.Surveys
{
    public class LocalInspectionService : IMember5InspectionService
    {
        private readonly AppDbContext _context;
        private readonly IAdminNotificationService _notificationService;
        private readonly IUnitOfWork _unitOfWork;

        public LocalInspectionService(
            AppDbContext context,
            IAdminNotificationService notificationService,
            IUnitOfWork unitOfWork)
        {
            _context = context;
            _notificationService = notificationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<List<int>> CreateInspectionReportsAsync(
            CreateInspectionReportsRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (request.DisputedItems.Count == 0)
            {
                return new List<int>();
            }

            var binId = await _context.DisposalSessions
                .AsNoTracking()
                .Where(s => s.SessionId == request.SessionId)
                .Select(s => (int?)s.BinId)
                .FirstOrDefaultAsync(cancellationToken);

            if (!binId.HasValue)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Disposal session not found.");
            }

            var disputedItemIds = request.DisputedItems.Select(i => i.ItemId).Distinct().ToList();
            var existingReportsByItem = await _context.InspectionReports
                .AsNoTracking()
                .Where(r => disputedItemIds.Contains(r.ItemId))
                .ToDictionaryAsync(r => r.ItemId, r => r.ReportId, cancellationToken);

            var now = DateTime.UtcNow;
            var createdReports = new List<InspectionReport>();
            var reportIds = new List<int>();

            foreach (var item in request.DisputedItems)
            {
                if (existingReportsByItem.TryGetValue(item.ItemId, out var existingReportId))
                {
                    reportIds.Add(existingReportId);
                    continue;
                }

                var report = new InspectionReport
                {
                    ItemId = item.ItemId,
                    SurveyId = request.SurveyId,
                    SessionId = request.SessionId,
                    UserId = request.UserId,
                    BinId = binId.Value,
                    PredictedWasteTypeId = item.AiWasteTypeId,
                    UserSelectedWasteTypeId = item.UserSelectedWasteTypeId,
                    PredictedConfidence = item.AiConfidence,
                    ImageUrl = string.IsNullOrWhiteSpace(item.ImageUrl) ? null : item.ImageUrl.Trim(),
                    AiRating = request.AiRating,
                    Status = InspectionReportStatus.Pending,
                    RetrainingStatus = InspectionRetrainingStatus.NotSent,
                    CreatedAt = now
                };

                createdReports.Add(report);
            }

            if (createdReports.Count > 0)
            {
                await _context.InspectionReports.AddRangeAsync(createdReports, cancellationToken);
            }

            // Always persist pending changes (SurveyResponses + new InspectionReports) within caller's active transaction
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            foreach (var report in createdReports)
            {
                await _notificationService.PublishToAdminsAsync(
                    $"New AI review #{report.ReportId}",
                    $"Disputed classification flagged on Bin #{report.BinId} (Session #{report.SessionId}).",
                    AdminNotificationTypes.Warning,
                    AdminNotificationSources.InspectionReport,
                    report.ReportId.ToString(CultureInfo.InvariantCulture),
                    cancellationToken);
            }

            reportIds.AddRange(createdReports.Select(r => r.ReportId));
            return reportIds;
        }

        public async Task<List<SessionInspectionReportStatusDto>> GetSessionReportsAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            return await _context.InspectionReports
                .AsNoTracking()
                .Where(r => r.SessionId == sessionId)
                .OrderBy(r => r.ReportId)
                .Select(r => new SessionInspectionReportStatusDto
                {
                    ReportId = r.ReportId,
                    ItemId = r.ItemId,
                    IsResolved = r.Status != InspectionReportStatus.Pending,
                    IsAccepted = r.ReviewDecision == InspectionReviewDecision.Approved,
                    AdminConfirmedWasteTypeId = r.ConfirmedWasteTypeId
                })
                .ToListAsync(cancellationToken);
        }
    }
}
