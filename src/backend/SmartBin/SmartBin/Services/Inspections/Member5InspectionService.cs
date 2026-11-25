using SmartBin.Common;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Bins;
using SmartBin.Repositories.Inspections;
using SmartBin.Repositories.Notifications;
using SmartBin.Services.Surveys;

namespace SmartBin.Services.Inspections
{
    public class Member5InspectionService : IMember5InspectionService
    {
        private readonly IInspectionRepository _inspectionRepository;
        private readonly INotificationRepository _notificationRepository;
        private readonly IBinRepository _binRepository;
        private readonly IUnitOfWork _unitOfWork;

        public Member5InspectionService(
            IInspectionRepository inspectionRepository,
            INotificationRepository notificationRepository,
            IBinRepository binRepository,
            IUnitOfWork unitOfWork)
        {
            _inspectionRepository = inspectionRepository;
            _notificationRepository = notificationRepository;
            _binRepository = binRepository;
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

            var existingItemIds = await _inspectionRepository.GetExistingReportItemIdsAsync(
                request.DisputedItems.Select(i => i.ItemId),
                cancellationToken);

            if (existingItemIds.Count > 0)
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "CONFLICT",
                    "An inspection report already exists for one or more disputed items.");
            }

            var wasteTypesById = await _binRepository.GetWasteTypesDictionaryAsync(cancellationToken);
            var now = DateTime.UtcNow;

            var reports = request.DisputedItems.Select(item =>
            {
                var aiName = wasteTypesById.TryGetValue(item.AiWasteTypeId, out var aiWt)
                    ? aiWt.Name
                    : item.AiWasteTypeId.ToString();

                var userName = wasteTypesById.TryGetValue(item.UserSelectedWasteTypeId, out var userWt)
                    ? userWt.Name
                    : item.UserSelectedWasteTypeId.ToString();

                return new InspectionReport
                {
                    SurveyId = request.SurveyId,
                    DisposalItemId = item.ItemId,
                    Feedback = $"User corrected classification from {aiName} to {userName} (AI rating: {request.AiRating}/5).",
                    ReviewDecision = InspectionReviewDecision.Pending,
                    RetrainingStatus = RetrainingStatus.NotSent,
                    CreatedAt = now
                };
            }).ToList();

            await _inspectionRepository.AddRangeAsync(reports, cancellationToken);

            var adminIds = await _notificationRepository.GetUserIdsByRoleAsync(
                RoleNames.Admin,
                cancellationToken);

            var notification = new Notification
            {
                Title = "New inspection reports",
                Message = $"{reports.Count} disputed item(s) are waiting for review.",
                Type = "warning",
                TargetType = "ADMIN_BROADCAST",
                ResourceType = "DISPOSAL_SURVEY",
                ResourceId = request.SurveyId.ToString(),
                CreatedAt = now,
                Recipients = adminIds.Select(adminId => new NotificationRecipient
                {
                    UserId = adminId,
                    IsRead = false
                }).ToList()
            };

            await _notificationRepository.AddAsync(notification, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return reports.Select(r => r.ReportId).ToList();
        }

        public Task<List<SessionInspectionReportStatusDto>> GetSessionReportsAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            return _inspectionRepository.GetSessionReportsForFinalizationAsync(sessionId, cancellationToken);
        }
    }
}